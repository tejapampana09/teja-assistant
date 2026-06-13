import { addDoc, deleteDoc, doc, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { Bot, Inbox, MessageCircle, Pencil, Plus, Send, Trash2, UserRound, CheckCheck } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { upsertIncomingNotification } from "../../services/communication";
import { userCommunicationMessages, userContacts, userConversations } from "../../services/paths";
import { generateReplySuggestions } from "../../services/replySuggestions";
import type {
  CommunicationConversation,
  CommunicationMessage,
  ContactCategory,
  ContactProfile,
  ReplySuggestions
} from "../../types/domain";
import { formatDateTime } from "../../utils/date";

const categories: ContactCategory[] = ["Friend", "Family", "Faculty", "Recruiter", "Unknown"];
const tones: ContactProfile["preferredTone"][] = ["Short", "Friendly", "Professional"];

export function CommunicationPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [creatingNotification, setCreatingNotification] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<ContactProfile | null>(null);
  const [contactDraft, setContactDraft] = useState({
    name: "",
    category: "Unknown" as ContactCategory,
    preferredTone: "Friendly" as ContactProfile["preferredTone"],
    relationship: "",
    replyStyle: ""
  });

  const conversationsQuery = useMemo(
    () => (user ? query(userConversations(user.uid), orderBy("updatedAt", "desc")) : null),
    [user]
  );
  const contactsQuery = useMemo(() => (user ? query(userContacts(user.uid), orderBy("name", "asc")) : null), [user]);
  const messagesQuery = useMemo(
    () => (user ? query(userCommunicationMessages(user.uid), orderBy("createdAt", "desc")) : null),
    [user]
  );

  const { data: conversations } = useFirestoreCollection<CommunicationConversation>(conversationsQuery);
  const { data: contacts } = useFirestoreCollection<ContactProfile>(contactsQuery);
  const { data: messages } = useFirestoreCollection<CommunicationMessage>(messagesQuery);

  const selectedMessages = selectedConversationId
    ? messages.filter((item) => item.conversationId === selectedConversationId)
    : messages;

  async function createIncomingNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !senderName.trim() || !message.trim()) return;

    setCreatingNotification(true);
    try {
      const suggestions = await safeGenerateSuggestions(message, "Unknown");
      await upsertIncomingNotification({
        userId: user.uid,
        channel: "whatsapp",
        senderName: senderName.trim(),
        content: message.trim(),
        timestamp: new Date().toISOString(),
        suggestions
      });
      setSenderName("");
      setMessage("");
      success("Notification sent");
    } catch (error) {
      console.error(error);
      toastError("Failed to send notification");
    } finally {
      setCreatingNotification(false);
    }
  }

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !contactDraft.name.trim()) return;

    const payload = {
      ...contactDraft,
      name: contactDraft.name.trim(),
      relationship: contactDraft.relationship.trim() || "Not set",
      replyStyle: contactDraft.replyStyle.trim() || "Natural and concise",
      updatedAt: serverTimestamp()
    };

    try {
      if (editingContact) {
        await updateDoc(doc(userContacts(user.uid), editingContact.id), payload);
      } else {
        await addDoc(userContacts(user.uid), {
          ...payload,
          channelHandles: {},
          createdAt: serverTimestamp()
        });
      }

      resetContactForm();
      success("Contact saved");
    } catch (error) {
      console.error(error);
      toastError("Failed to save contact");
    }
  }

  function editContact(contact: ContactProfile) {
    setEditingContact(contact);
    setContactDraft({
      name: contact.name,
      category: contact.category,
      preferredTone: contact.preferredTone,
      relationship: contact.relationship,
      replyStyle: contact.replyStyle
    });
  }

  function resetContactForm() {
    setEditingContact(null);
    setContactDraft({
      name: "",
      category: "Unknown",
      preferredTone: "Friendly",
      relationship: "",
      replyStyle: ""
    });
  }

  async function removeContact(contactId: string) {
    if (!user) return;
    if (!window.confirm("Delete this contact?")) return;
    try {
      await deleteDoc(doc(userContacts(user.uid), contactId));
      success("Contact deleted");
    } catch (error) {
      console.error(error);
      toastError("Failed to delete contact");
    }
  }

  async function removeMessage(messageId: string) {
    if (!user) return;
    try {
      await deleteDoc(doc(userCommunicationMessages(user.uid), messageId));
    } catch (error) {
      console.error(error);
    }
  }

  async function clearAllMessages() {
    if (!user) return;
    if (!window.confirm("Are you sure you want to delete all messages in this view?")) return;
    try {
      for (const msg of selectedMessages) {
        await deleteDoc(doc(userCommunicationMessages(user.uid), msg.id));
      }
      success("All messages cleared");
    } catch (error) {
      console.error(error);
      toastError("Failed to clear messages");
    }
  }

  return (
    <section className="space-y-5">
      <div className="glass-panel rounded-[2rem] p-6">
        <p className="text-sm text-cyan-200">Communication Hub</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Unified inbox intelligence</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Phase 2 stores WhatsApp-style notifications and prepares the same architecture for Gmail, LinkedIn, and Telegram. No auto-send is implemented.
            </p>
          </div>
          <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
            Suggestions only
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[23rem_1fr_24rem]">
        <aside className="space-y-5">
          <form onSubmit={(event) => void createIncomingNotification(event)} className="glass-panel rounded-[2rem] p-5">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-cyan-200" />
              <h2 className="font-semibold">WhatsApp Notification Test</h2>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Simulates the Android notification listener payload while the mobile app is not connected.
            </p>
            <div className="mt-5 space-y-3">
              <input className="field" value={senderName} onChange={(event) => setSenderName(event.target.value)} placeholder="Sender name" />
              <textarea
                className="field min-h-28 resize-none"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Incoming message"
              />
              <button type="submit" disabled={creatingNotification} className="primary-button w-full">
                <Bot className="h-4 w-4" />
                Generate Suggestions
              </button>
            </div>
          </form>

          <div className="glass-panel rounded-[2rem] p-5">
            <h2 className="font-semibold">Conversations</h2>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => setSelectedConversationId(null)}
                className={`w-full rounded-2xl p-4 text-left text-sm transition ${
                  selectedConversationId === null ? "bg-cyan-400/15 text-cyan-100" : "bg-white/[0.04] text-slate-300"
                }`}
              >
                All messages
              </button>
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`w-full rounded-2xl border border-white/10 p-4 text-left transition ${
                    selectedConversationId === conversation.id ? "bg-cyan-400/15 text-cyan-100" : "bg-white/[0.04] text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{conversation.contactName}</span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase">{conversation.channel}</span>
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs text-slate-500">{conversation.lastMessage}</p>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="glass-panel rounded-[2rem] p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Inbox</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">{selectedMessages.length} messages</span>
              {selectedMessages.length > 0 && (
                <button type="button" onClick={clearAllMessages} className="ghost-button h-8 px-3 text-xs text-red-400 hover:bg-red-400/10 hover:text-red-300">
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                  Clear All
                </button>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {selectedMessages.length ? (
              selectedMessages.map((item) => <MessageCard key={item.id} message={item} onRemove={() => removeMessage(item.id)} />)
            ) : (
              <EmptyState icon={Inbox} title="No communication messages yet" text="Use the notification test form or connect the Android notification listener later." />
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <form onSubmit={(event) => void saveContact(event)} className="glass-panel rounded-[2rem] p-5">
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-cyan-200" />
              <h2 className="font-semibold">{editingContact ? "Edit Contact" : "Contact Profile"}</h2>
            </div>
            <div className="mt-5 space-y-3">
              <input className="field" value={contactDraft.name} onChange={(event) => setContactDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Name" />
              <select className="field" value={contactDraft.category} onChange={(event) => setContactDraft((current) => ({ ...current, category: event.target.value as ContactCategory }))}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select className="field" value={contactDraft.preferredTone} onChange={(event) => setContactDraft((current) => ({ ...current, preferredTone: event.target.value as ContactProfile["preferredTone"] }))}>
                {tones.map((item) => <option key={item}>{item}</option>)}
              </select>
              <input className="field" value={contactDraft.relationship} onChange={(event) => setContactDraft((current) => ({ ...current, relationship: event.target.value }))} placeholder="Relationship" />
              <input className="field" value={contactDraft.replyStyle} onChange={(event) => setContactDraft((current) => ({ ...current, replyStyle: event.target.value }))} placeholder="Reply style" />
              <div className="flex gap-3">
                <button type="submit" className="primary-button flex-1">
                  <Plus className="h-4 w-4" />
                  Save
                </button>
                {editingContact && <button type="button" className="ghost-button" onClick={resetContactForm}>Cancel</button>}
              </div>
            </div>
          </form>

          <div className="glass-panel rounded-[2rem] p-5">
            <h2 className="font-semibold">Contacts</h2>
            <div className="mt-4 space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{contact.category} - {contact.preferredTone}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="icon-button h-9 w-9 rounded-xl" onClick={() => editContact(contact)} aria-label="Edit contact">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="icon-button h-9 w-9 rounded-xl" onClick={() => void removeContact(contact.id)} aria-label="Delete contact">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function MessageCard({ message, onRemove }: { message: CommunicationMessage; onRemove: () => void }) {
  return (
    <article className="group rounded-3xl border border-white/10 bg-white/[0.045] p-5 relative">
      <button 
        onClick={onRemove}
        className="absolute top-4 right-4 p-2 text-slate-500 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
        title="Clear message"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between pr-8">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{message.senderName}</span>
            <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] uppercase text-emerald-200">{message.channel}</span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase text-slate-300">{message.source}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{message.content}</p>
          <p className="mt-3 text-xs text-slate-500">{formatDateTime(message.timestamp || message.createdAt)}</p>
        </div>
      </div>
      {message.suggestions && <SuggestionGrid suggestions={message.suggestions} originalMessage={message} />}
    </article>
  );
}

function SuggestionGrid({ suggestions, originalMessage }: { suggestions: ReplySuggestions; originalMessage: CommunicationMessage }) {
  const { user } = useAuth();
  const [sending, setSending] = useState<string | null>(null);

  async function handleSendReply(label: string, text: string) {
    if (!user || !originalMessage.contactId) return;
    setSending(label);
    
    try {
      await addDoc(userCommunicationMessages(user.uid), {
        contactId: originalMessage.contactId,
        senderName: originalMessage.senderName,
        content: text,
        channel: originalMessage.channel,
        source: 'web_app',
        direction: 'outgoing',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      // Clear suggestions or just let the user see it's sent
      setTimeout(() => setSending(null), 1500);
    } catch (error) {
      console.error("Failed to send reply:", error);
      setSending(null);
    }
  }

  const items = [
    ["Short", suggestions.short],
    ["Friendly", suggestions.friendly],
    ["Professional", suggestions.professional]
  ];

  return (
    <div className="mt-5 grid gap-3 md:grid-cols-3">
      {items.map(([label, text]) => (
        <div key={label} className="flex flex-col justify-between rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-cyan-200">
              <Bot className="h-3.5 w-3.5" />
              {label}
            </div>
            <p className="text-sm leading-6 text-slate-200">{text}</p>
          </div>
          <button 
            onClick={() => handleSendReply(label, text)}
            disabled={sending === label}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500/20 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {sending === label ? "Sending..." : "Send Reply"}
          </button>
        </div>
      ))}
    </div>
  );
}

async function safeGenerateSuggestions(message: string, relationship: string) {
  try {
    return await generateReplySuggestions(message, relationship);
  } catch {
    return {
      short: "Almost bro.",
      friendly: "Almost bro, testing chesthunna.",
      professional: "The project is nearly complete. Currently testing."
    };
  }
}
