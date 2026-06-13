import type { ChatMessage } from "../types/domain";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * Send messages to the AI with an optional enriched system prompt.
 * When memoryContext / systemOverride is provided (from AssistantBrainService),
 * it replaces the default generic system prompt.
 */
export async function requestAssistantReply(
  messages: ChatMessage[],
  systemOverride?: string
): Promise<string> {
  const systemPrompt =
    systemOverride ??
    "You are Teja Assistant, a concise personal productivity AI for Teja. Help with tasks, study planning, project tracking, memories, and communication drafts. Do not claim unavailable integrations are active.";

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to contact assistant service.");
  }

  const data = (await response.json()) as { reply?: string };
  return data.reply?.trim() || "I am ready, but I could not generate a response right now.";
}
