import type { ReplySuggestions } from "../types/domain";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function generateReplySuggestions(message: string, relationship = "Unknown") {
  const response = await fetch(`${API_BASE_URL}/reply-suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, relationship })
  });

  if (!response.ok) {
    throw new Error("Unable to generate reply suggestions.");
  }

  return (await response.json()) as ReplySuggestions;
}
