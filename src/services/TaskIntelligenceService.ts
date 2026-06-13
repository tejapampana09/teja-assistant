import { getDocs, limit, orderBy, query } from "firebase/firestore";
import { userTasks } from "./paths";
import type { Task, TaskPriority } from "../types/domain";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// ─── Analysis Helpers ──────────────────────────────────────────────────────────

export function getOverdueTasks(tasks: Task[]): Task[] {
  const now = new Date();
  return tasks.filter(
    (t) => t.status === "active" && t.dueDate && new Date(String(t.dueDate)) < now
  );
}

export function getTasksByPriority(tasks: Task[], priority: TaskPriority): Task[] {
  return tasks.filter((t) => t.status === "active" && t.priority === priority);
}

export function formatTasksForContext(tasks: Task[]): string {
  if (tasks.length === 0) return "No active tasks.";
  return tasks
    .filter((t) => t.status === "active")
    .map((t) => `- [${(t.priority ?? "medium").toUpperCase()}] ${t.title}${t.dueDate ? ` (due: ${String(t.dueDate).slice(0, 10)})` : ""}`)
    .join("\n");
}

// ─── AI-Powered Task Suggestions ───────────────────────────────────────────────

export type SuggestedTask = {
  title: string;
  notes: string;
  priority: TaskPriority;
  dueDate?: string;
};

/**
 * Ask the AI to analyze recent chat messages and extract actionable tasks.
 */
export async function suggestTasksFromConversation(
  userId: string,
  recentMessages: Array<{ role: string; content: string }>
): Promise<SuggestedTask[]> {
  if (recentMessages.length === 0) return [];

  const conversationText = recentMessages
    .slice(-10)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  try {
    const response = await fetch(`${API_BASE_URL}/suggest-tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation: conversationText }),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as { tasks?: SuggestedTask[] };
    return (data.tasks ?? []).slice(0, 5);
  } catch {
    return [];
  }
}
