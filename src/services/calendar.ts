const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
}

export async function fetchUpcomingEvents(userId: string): Promise<CalendarEvent[]> {
  const res = await fetch(`${API_BASE_URL}/google/events?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("unauthorized");
    }
    throw new Error("Failed to fetch calendar events");
  }
  return await res.json() as CalendarEvent[];
}
