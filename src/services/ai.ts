import type { ChatMessage } from "../types/domain";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function requestAssistantReply(messages: ChatMessage[]) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      system:
        "You are Teja Assistant, a concise personal productivity AI for Teja. Help with tasks, study planning, project tracking, memories, and communication drafts. Do not claim unavailable integrations are active."
    })
  });

  if (!response.ok) {
    throw new Error("Unable to contact assistant service.");
  }

  const data = (await response.json()) as { reply?: string };
  return data.reply?.trim() || "I am ready, but I could not generate a response right now.";
}
