import { addDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { userCommunicationMessages, userContacts, userConversations } from "./paths";
import type { CommunicationChannel, CommunicationMessage, ContactCategory, ReplySuggestions } from "../types/domain";

export async function upsertIncomingNotification(params: {
  userId: string;
  channel: CommunicationChannel;
  senderName: string;
  content: string;
  timestamp?: string;
  suggestions?: ReplySuggestions;
  aiSummary?: string;
}) {
  const contactId = await ensureContact(params.userId, params.senderName, params.channel);
  const conversationId = await ensureConversation({
    userId: params.userId,
    contactId,
    contactName: params.senderName,
    channel: params.channel,
    lastMessage: params.content
  });

  const replySuggestions = params.suggestions 
    ? [params.suggestions.short, params.suggestions.friendly, params.suggestions.professional] 
    : [];

  await addDoc(userCommunicationMessages(params.userId), {
    conversationId,
    contactId,
    channel: params.channel,
    direction: "incoming",
    senderName: params.senderName,
    sender: params.senderName,
    content: params.content,
    timestamp: params.timestamp || new Date().toISOString(),
    unread: true,
    archived: false,
    aiSummary: params.aiSummary || "",
    suggestions: params.suggestions,
    replySuggestions,
    source: params.channel === "whatsapp" ? "android_notification" : "manual",
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(userConversations(params.userId), conversationId), {
    lastMessage: params.content,
    lastMessageAt: params.timestamp || new Date().toISOString(),
    unreadCount: 1,
    updatedAt: serverTimestamp()
  });
}

export async function markMessageReadStatus(userId: string, messageId: string, unread: boolean) {
  await updateDoc(doc(userCommunicationMessages(userId), messageId), {
    unread,
    updatedAt: serverTimestamp()
  });
}

export async function archiveMessage(userId: string, messageId: string, archived: boolean) {
  await updateDoc(doc(userCommunicationMessages(userId), messageId), {
    archived,
    updatedAt: serverTimestamp()
  });
}

async function ensureContact(userId: string, senderName: string, channel: CommunicationChannel) {
  const existing = await getDocs(query(userContacts(userId), where("name", "==", senderName), limit(1)));

  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const category: ContactCategory = "Unknown";
  const contact = await addDoc(userContacts(userId), {
    name: senderName,
    category,
    preferredTone: "Friendly",
    relationship: "New contact",
    replyStyle: "Natural and concise",
    channelHandles: { [channel]: senderName },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return contact.id;
}

async function ensureConversation(params: {
  userId: string;
  contactId: string;
  contactName: string;
  channel: CommunicationChannel;
  lastMessage: string;
}) {
  const existing = await getDocs(
    query(
      userConversations(params.userId),
      where("contactId", "==", params.contactId),
      where("channel", "==", params.channel),
      limit(1)
    )
  );

  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const conversation = await addDoc(userConversations(params.userId), {
    contactId: params.contactId,
    contactName: params.contactName,
    channel: params.channel,
    unreadCount: 0,
    lastMessage: params.lastMessage,
    lastMessageAt: new Date().toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return conversation.id;
}

export const latestCommunicationMessagesQuery = (userId: string, count = 20) =>
  query(userCommunicationMessages(userId), orderBy("createdAt", "desc"), limit(count));
