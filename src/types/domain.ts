import type { Timestamp } from "firebase/firestore";

export type FirestoreDate = Timestamp | Date | string | null | undefined;

export type TaskStatus = "active" | "completed";

export type Task = {
  id: string;
  title: string;
  notes?: string;
  dueDate?: FirestoreDate;
  status: TaskStatus;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
};

export type MemoryCategory =
  | "Projects"
  | "Goals"
  | "Preferences"
  | "Learning"
  | "Personal Notes";

export type Memory = {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: FirestoreDate;
};

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
  source: "manual" | "android_notification" | "future_integration";
  createdAt?: FirestoreDate;
};

export type DailyBriefing = {
  pendingTasks: number;
  unreadMessages: number;
  upcomingDeadline: string;
  studyGoal: string;
  importantMessages: CommunicationMessage[];
};
