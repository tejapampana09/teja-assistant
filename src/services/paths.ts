import { collection, doc } from "firebase/firestore";
import { db } from "./firebase";

export const userDoc = (userId: string) => doc(db, "users", userId);
export const userTasks = (userId: string) => collection(userDoc(userId), "tasks");
export const userMemories = (userId: string) => collection(userDoc(userId), "memories");
export const userMessages = (userId: string) => collection(userDoc(userId), "messages");
export const userContacts = (userId: string) => collection(userDoc(userId), "contacts");
export const userConversations = (userId: string) => collection(userDoc(userId), "conversations");
export const userCommunicationMessages = (userId: string) =>
  collection(userDoc(userId), "communicationMessages");
export const userNotifications = (userId: string) =>
  collection(userDoc(userId), "notifications");
export const userVoiceSettings = (userId: string) =>
  doc(userDoc(userId), "settings", "voice");
