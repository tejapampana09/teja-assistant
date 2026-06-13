import type { Timestamp } from "firebase/firestore";

export type FirestoreDate = Timestamp | Date | string | null | undefined;

// ─── Task ──────────────────────────────────────────────────────────────────────

export type TaskStatus = "active" | "completed";
export type TaskPriority = "low" | "medium" | "high";
export type TaskRecurrence = "none" | "daily" | "weekly" | "monthly";

export type Task = {
  id: string;
  title: string;
  notes?: string;
  dueDate?: FirestoreDate;
  status: TaskStatus;
  priority: TaskPriority;
  recurrence: TaskRecurrence;
  progress?: number; // 0–100
  aiSuggested?: boolean;
  completedAt?: FirestoreDate;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
};

// ─── Memory ────────────────────────────────────────────────────────────────────

export type MemoryCategory =
  | "Personal"
  | "Work"
  | "Study"
  | "Projects"
  | "Contacts"
  | "Preferences";

export type MemoryImportance = "low" | "medium" | "high";

export type Memory = {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  tags?: string[];
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
};

// ─── Chat ──────────────────────────────────────────────────────────────────────

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: FirestoreDate;
};

// ─── Communication ─────────────────────────────────────────────────────────────

export type IntegrationKey =
  | "voice"
  | "whatsapp"
  | "gmail"
  | "calendar"
  | "linkedin"
  | "coding"
  | "study"
  | "agent";

export type VoiceSettings = {
  enabled: boolean;
  language: string;
  rate: number;
  pitch: number;
  voiceName?: string;
};

export type CommunicationChannel = "whatsapp" | "gmail" | "linkedin" | "telegram" | "manual";

export type ContactCategory = "Friend" | "Family" | "Faculty" | "Recruiter" | "Unknown";

export type ContactProfile = {
  id: string;
  name: string;
  category: ContactCategory;
  preferredTone: "Short" | "Friendly" | "Professional";
  relationship: string;
  replyStyle: string;
  channelHandles?: Partial<Record<CommunicationChannel, string>>;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
};

export type ReplySuggestions = {
  short: string;
  friendly: string;
  professional: string;
};

export type MessageUrgency = "low" | "medium" | "high";

export type MessageAiAnalysis = {
  sentiment: "positive" | "neutral" | "negative" | "urgent";
  urgency: MessageUrgency;
  summary: string;
};

export type CommunicationConversation = {
  id: string;
  contactId?: string;
  contactName: string;
  channel: CommunicationChannel;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt?: FirestoreDate;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
};

export type CommunicationMessage = {
  id: string;
  conversationId: string;
  contactId?: string;
  channel: CommunicationChannel;
  direction: "incoming" | "outgoing";
  senderName: string;
  content: string;
  timestamp?: FirestoreDate;
  suggestions?: ReplySuggestions;
  aiAnalysis?: MessageAiAnalysis;
  priority?: MessageUrgency;
  source: "manual" | "android_notification" | "future_integration";
  createdAt?: FirestoreDate;
};

// ─── Daily Briefing ────────────────────────────────────────────────────────────

export type DailyBriefing = {
  pendingTasks: number;
  unreadMessages: number;
  upcomingDeadline: string;
  studyGoal: string;
  importantMessages: CommunicationMessage[];
};

// ─── Assistant Brain ───────────────────────────────────────────────────────────

export type AssistantContext = {
  memories: string;
  activeTasks: string;
  recentConversations: string;
  userProfile: string;
  currentDateTime: string;
  unreadEmails?: string;
  upcomingEvents?: string;
};

export type SmartSuggestion = {
  id: string;
  text: string;
  action: "chat" | "task" | "memory" | "communication";
  actionParam?: string;
};
