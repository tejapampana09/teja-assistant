import type { FirestoreDate } from "../types/domain";

export function toDate(value: FirestoreDate): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") return value ? new Date(value) : null;
  if ("toDate" in value) return value.toDate();
  return null;
}

export function formatDate(value: FirestoreDate) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "No due date";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function formatDateTime(value: FirestoreDate) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "Just now";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
