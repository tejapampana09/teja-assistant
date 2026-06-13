import { getDocs, limit, orderBy, query } from "firebase/firestore";
import { formatMemoriesForContext, retrieveRelevantMemories } from "./MemoryRetrievalService";
import { userCommunicationMessages, userTasks } from "./paths";
import type { AssistantContext, ChatMessage, Memory, SmartSuggestion, Task } from "../types/domain";
import { formatDate } from "../utils/date";
import { fetchRecentEmails } from "./gmail";
import { fetchUpcomingEvents } from "./calendar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// ─── Context Assembly ──────────────────────────────────────────────────────────

function formatEmails(emails: any[]): string {
  if (emails.length === 0) return "No unread emails.";
  return emails
    .map((e) => `From: ${e.from}\nSubject: ${e.subject}\nSnippet: ${e.snippet}\n---`)
    .join("\n");
}

function formatEvents(events: any[]): string {
  if (events.length === 0) return "No upcoming events.";
  return events
    .map((e) => `Event: ${e.title}\nWhen: ${e.start} to ${e.end}\nLocation: ${e.location}\nDescription: ${e.description}\n---`)
    .join("\n");
}

function formatActiveTasks(tasks: Task[]): string {
  const active = tasks.filter((t) => t.status === "active");
  if (active.length === 0) return "No active tasks.";

  const now = new Date();
  const overdue = active.filter(
    (t) => t.dueDate && new Date(String(t.dueDate)) < now
  );
  const upcoming = active
    .filter((t) => !overdue.includes(t))
    .sort((a, b) => String(a.dueDate ?? "9999").localeCompare(String(b.dueDate ?? "9999")))
    .slice(0, 10);

  const lines: string[] = [];

  if (overdue.length > 0) {
    lines.push(`OVERDUE (${overdue.length}):`);
    overdue.forEach((t) => {
      const p = t.priority ?? "medium";
      lines.push(`  [${p.toUpperCase()}] ${t.title} — due ${formatDate(t.dueDate)}`);
    });
  }

  if (upcoming.length > 0) {
    lines.push(`UPCOMING:`);
    upcoming.forEach((t) => {
      const p = t.priority ?? "medium";
      const due = t.dueDate ? `due ${formatDate(t.dueDate)}` : "no deadline";
      lines.push(`  [${p.toUpperCase()}] ${t.title} — ${due}`);
    });
  }

  return lines.join("\n");
}

function formatRecentConversations(messages: { senderName: string; content: string; direction: string }[]): string {
  if (messages.length === 0) return "No recent messages.";
  return messages
    .slice(0, 5)
    .map((m) => `${m.direction === "incoming" ? m.senderName : "You"}: ${m.content.slice(0, 120)}`)
    .join("\n");
}

// ─── Core Service ──────────────────────────────────────────────────────────────

export class AssistantBrainService {
  private readonly userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Assemble the full assistant context: memories, tasks, conversations, user profile.
   */
  async assembleContext(userMessage: string): Promise<AssistantContext> {
    const [relevantMemories, taskSnapshot, msgSnapshot, emailsResult, eventsResult] = await Promise.allSettled([
      retrieveRelevantMemories(this.userId, userMessage, 8),
      getDocs(query(userTasks(this.userId), orderBy("updatedAt", "desc"), limit(30))),
      getDocs(
        query(userCommunicationMessages(this.userId), orderBy("createdAt", "desc"), limit(10))
      ),
      fetchRecentEmails(this.userId),
      fetchUpcomingEvents(this.userId)
    ]);

    const memories =
      relevantMemories.status === "fulfilled" ? relevantMemories.value : ([] as Memory[]);

    const tasks: Task[] =
      taskSnapshot.status === "fulfilled"
        ? taskSnapshot.value.docs.map((d) => ({ id: d.id, ...d.data() } as Task))
        : [];

    const commsMessages =
      msgSnapshot.status === "fulfilled"
        ? msgSnapshot.value.docs.map(
            (d) => d.data() as { senderName: string; content: string; direction: string }
          )
        : [];

    const unreadEmails =
      emailsResult.status === "fulfilled" ? formatEmails(emailsResult.value) : "No unread emails (or Google not connected).";

    const upcomingEvents =
      eventsResult.status === "fulfilled" ? formatEvents(eventsResult.value) : "No upcoming events (or Google not connected).";

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      memories: formatMemoriesForContext(memories),
      activeTasks: formatActiveTasks(tasks),
      recentConversations: formatRecentConversations(commsMessages),
      userProfile: "Name: Teja. Student & developer. Uses this assistant for study, tasks, and communication management.",
      currentDateTime: dateStr,
      unreadEmails,
      upcomingEvents
    };
  }

  /**
   * Build the enriched system prompt injecting all context.
   */
  buildSystemPrompt(ctx: AssistantContext): string {
    const parts: string[] = [
      `You are Teja Assistant — a highly capable, context-aware personal AI for Teja.`,
      `Current date/time: ${ctx.currentDateTime}`,
      ``,
      `== USER PROFILE ==`,
      ctx.userProfile,
    ];

    if (ctx.memories) {
      parts.push(``, `== MEMORIES ==`, ctx.memories);
    }

    if (ctx.activeTasks) {
      parts.push(``, `== ACTIVE TASKS ==`, ctx.activeTasks);
    }

    if (ctx.upcomingEvents && ctx.upcomingEvents !== "No upcoming events (or Google not connected).") {
      parts.push(``, `== UPCOMING CALENDAR EVENTS ==`, ctx.upcomingEvents);
    }

    if (ctx.unreadEmails && ctx.unreadEmails !== "No unread emails (or Google not connected).") {
      parts.push(``, `== UNREAD GMAIL EMAILS ==`, ctx.unreadEmails);
    }

    if (ctx.recentConversations && ctx.recentConversations !== "No recent messages.") {
      parts.push(``, `== RECENT COMMUNICATIONS ==`, ctx.recentConversations);
    }

    parts.push(
      ``,
      `== INSTRUCTIONS ==`,
      `- Always respond in the context of Teja's actual data above.`,
      `- Reference specific tasks, memories, or messages when relevant.`,
      `- Be concise, direct, and actionable.`,
      `- If suggesting tasks, be specific about titles and priorities.`,
      `- Never fabricate data not present in the context.`
    );

    return parts.join("\n");
  }

  /**
   * Generate proactive smart suggestions based on current context.
   */
  async getSmartSuggestions(): Promise<SmartSuggestion[]> {
    try {
      const ctx = await this.assembleContext("");
      const systemPrompt = this.buildSystemPrompt(ctx);

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content:
                'Based on my current tasks, memories, and messages, generate exactly 4 short proactive suggestions I should act on right now. Format as JSON array: [{"id":"1","text":"...","action":"chat|task|memory|communication","actionParam":"optional prefill"}]. Keep each suggestion under 12 words. Be specific to my actual data.',
            },
          ],
        }),
      });

      if (!response.ok) return this.fallbackSuggestions();

      const data = (await response.json()) as { reply?: string };
      const raw = data.reply?.trim() ?? "";

      // Parse JSON array from the reply
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) return this.fallbackSuggestions();

      const parsed = JSON.parse(match[0]) as SmartSuggestion[];
      return parsed.slice(0, 4);
    } catch {
      return this.fallbackSuggestions();
    }
  }

  private fallbackSuggestions(): SmartSuggestion[] {
    return [
      { id: "1", text: "Review your active tasks", action: "task" },
      { id: "2", text: "Add a new memory or note", action: "memory" },
      { id: "3", text: "Check unread messages", action: "communication" },
      { id: "4", text: "Ask me to plan your day", action: "chat", actionParam: "Plan my day based on my current tasks and priorities" },
    ];
  }
}
