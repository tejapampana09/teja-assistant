const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export async function fetchRecentEmails(userId: string): Promise<GmailMessage[]> {
  const res = await fetch(`${API_BASE_URL}/google/emails?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("unauthorized");
    }
    throw new Error("Failed to fetch emails");
  }
  return await res.json() as GmailMessage[];
}
