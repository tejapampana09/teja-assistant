import { addDoc, deleteDoc, doc, orderBy, query, serverTimestamp } from "firebase/firestore";
import { 
  Bot, 
  Inbox, 
  MessageCircle, 
  Send, 
  Trash2, 
  Mail, 
  Archive, 
  Search, 
  MessageSquare, 
  Instagram, 
  ExternalLink,
  Sparkles,
  Loader2,
  Phone,
  Calendar,
  BellRing,
  CheckSquare
} from "lucide-react";
import { FormEvent, useMemo, useState, useRef, useEffect } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { markMessageReadStatus, archiveMessage } from "../../services/communication";
import { userCommunicationMessages, userConversations, userTasks } from "../../services/paths";
import { requestAssistantReply } from "../../services/ai";
import type {
  CommunicationConversation,
  CommunicationMessage
} from "../../types/domain";
import { formatDateTime } from "../../utils/date";

const channelIcons: Record<string, any> = {
  whatsapp: MessageCircle,
  gmail: Mail,
  instagram: Instagram,
  sms: MessageSquare,
  call: Phone,
  manual: MessageCircle
};

const openAppUrls: Record<string, string> = {
  whatsapp: "https://web.whatsapp.com/",
  gmail: "https://mail.google.com/",
  instagram: "https://instagram.com/",
  sms: "sms:"
};

export function CommunicationPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  
  // Navigation & selection states
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"all" | "whatsapp" | "instagram" | "sms" | "gmail" | "call">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Custom typing reply state
  const [customReplyText, setCustomReplyText] = useState("");
  const [sendingCustomReply, setSendingCustomReply] = useState(false);
  
  // AI Conversation Summary states
  const [threadSummary, setThreadSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  // AI smart actions detection from message content
  const [creatingAction, setCreatingAction] = useState<string | null>(null);

  // Chat thread scrolling ref
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Firestore queries
  const conversationsQuery = useMemo(
    () => (user ? query(userConversations(user.uid), orderBy("updatedAt", "desc")) : null),
    [user]
  );
  const messagesQuery = useMemo(
    () => (user ? query(userCommunicationMessages(user.uid), orderBy("createdAt", "desc")) : null),
    [user]
  );

  const { data: conversations } = useFirestoreCollection<CommunicationConversation>(conversationsQuery);
  const { data: messages } = useFirestoreCollection<CommunicationMessage>(messagesQuery);

  // Auto scroll chat thread to bottom on load/update
  useEffect(() => {
    if (selectedConversationId && threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversationId, messages]);

  // Reset thread summary on conversation swap
  useEffect(() => {
    setThreadSummary(null);
  }, [selectedConversationId]);

  // Find active selected conversation
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  // Retrieve current conversation messages sorted oldest to newest (chat stream)
  const conversationMessages = useMemo(() => {
    if (!selectedConversationId) return [];
    return messages
      .filter((m) => m.conversationId === selectedConversationId && !m.archived)
      .sort((a, b) => {
        const tA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt as any)?.seconds ? (a.createdAt as any).seconds * 1000 : 0;
        const tB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt as any)?.seconds ? (b.createdAt as any).seconds * 1000 : 0;
        return tA - tB;
      });
  }, [messages, selectedConversationId]);

  // General Filtered notifications (Unified stream when no conversation is selected)
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (msg.archived) return false;
      if (selectedTab !== "all" && msg.channel !== selectedTab) return false;
      
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const contentMatch = msg.content?.toLowerCase().includes(q);
        const nameMatch = msg.senderName?.toLowerCase().includes(q) || msg.sender?.toLowerCase().includes(q);
        if (!contentMatch && !nameMatch) return false;
      }
      return true;
    });
  }, [messages, selectedTab, searchQuery]);

  async function handleSendCustomReply(event?: FormEvent) {
    if (event) event.preventDefault();
    if (!user || !customReplyText.trim() || !selectedConversationId || !activeConversation) return;

    setSendingCustomReply(true);
    try {
      await addDoc(userCommunicationMessages(user.uid), {
        contactId: activeConversation.contactId || "",
        conversationId: selectedConversationId,
        senderName: activeConversation.contactName,
        content: customReplyText.trim(),
        channel: activeConversation.channel,
        source: 'web_app',
        direction: 'outgoing',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setCustomReplyText("");
      success("Reply sent");
    } catch (err) {
      console.error(err);
      toastError("Failed to send reply");
    } finally {
      setSendingCustomReply(false);
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

  async function removeConversation(conversationId: string) {
    if (!user) return;
    if (!window.confirm("Delete this conversation and all its messages?")) return;
    try {
      await deleteDoc(doc(userConversations(user.uid), conversationId));
      
      const relatedMessages = messages.filter((msg) => msg.conversationId === conversationId);
      for (const msg of relatedMessages) {
        await deleteDoc(doc(userCommunicationMessages(user.uid), msg.id));
      }
      
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
      success("Conversation deleted");
    } catch (error) {
      console.error(error);
      toastError("Failed to delete conversation");
    }
  }

  async function clearAllChats() {
    if (!user) return;
    if (!window.confirm("Are you sure you want to permanently clear all conversations and message logs?")) return;

    try {
      for (const msg of messages) {
        await deleteDoc(doc(userCommunicationMessages(user.uid), msg.id));
      }
      for (const convo of conversations) {
        await deleteDoc(doc(userConversations(user.uid), convo.id));
      }
      setSelectedConversationId(null);
      setThreadSummary(null);
      success("All conversations and messages cleared");
    } catch (error) {
      console.error(error);
      toastError("Failed to clear conversations");
    }
  }

  async function handleSummarizeConversation() {
    if (!selectedConversationId || conversationMessages.length === 0) return;

    setSummarizing(true);
    try {
      const chatLogs = conversationMessages
        .map(m => `${m.direction === 'outgoing' ? 'Outgoing' : m.senderName || 'Sender'}: ${m.content}`)
        .join("\n");

      const systemPrompt = "You are an AI assistant. You will be provided with a transcript of a chat conversation (which could be a group chat). Summarize the main topics discussed, decisions made, and any action items in a concise, bulleted format. Keep it under 100 words. Address the summary directly to Teja.";

      const summary = await requestAssistantReply([
        { id: crypto.randomUUID(), role: "user", content: `Here is the conversation log:\n\n${chatLogs}` }
      ], systemPrompt);

      setThreadSummary(summary);
      success("Conversation summarized");
    } catch (err) {
      console.error(err);
      toastError("Failed to summarize conversation");
    } finally {
      setSummarizing(false);
    }
  }

  async function archiveMessageItem(messageId: string) {
    if (!user) return;
    try {
      await archiveMessage(user.uid, messageId, true);
      success("Message archived");
    } catch (error) {
      console.error(error);
      toastError("Failed to archive message");
    }
  }

  async function clearAllMessages() {
    if (!user) return;
    if (!window.confirm("Are you sure you want to delete all messages in this view?")) return;
    try {
      for (const msg of filteredMessages) {
        await deleteDoc(doc(userCommunicationMessages(user.uid), msg.id));
      }
      success("All messages cleared");
    } catch (error) {
      console.error(error);
      toastError("Failed to clear messages");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="glass-panel rounded-[2rem] p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-cyan-400/5 blur-[80px] pointer-events-none rounded-full" />
        <div className="flex flex-col gap-4 relative z-10 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Communication Center</p>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-1">Inbox Workspace</h1>
            <p className="max-w-2xl text-slate-400 text-xs mt-1">
              Review and reply to incoming messages across WhatsApp, Instagram, and SMS, assisted by AI reply recommendations.
            </p>
          </div>
          {(conversations.length > 0 || messages.length > 0) && (
            <button
              onClick={() => void clearAllChats()}
              className="ghost-button py-2 px-3.5 text-xs flex items-center gap-1.5 rounded-xl border border-white/10 text-red-400 hover:bg-red-500/10 shrink-0 self-start md:self-center"
              title="Clear All Chats"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear All Chats
            </button>
          )}
        </div>
      </div>

      {/* Core Grid Workspace */}
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        
        {/* Left Sidebar: Conversations list */}
        <div className="space-y-4">
          <div className="glass-panel rounded-[2rem] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Chats</h2>
              {selectedConversationId && (
                <button onClick={() => setSelectedConversationId(null)} className="text-[11px] text-cyan-300 hover:underline">
                  Show All
                </button>
              )}
            </div>

            {/* Platform Filter Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-white/5 pb-3">
              {(["all", "whatsapp", "instagram", "call", "sms"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setSelectedTab(tab); setSelectedConversationId(null); }}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold capitalize transition ${
                    selectedTab === tab 
                      ? "bg-cyan-400/20 text-cyan-100" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                className="field pl-9 py-2 text-xs"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Convos Listing */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedConversationId(null)}
                className={`w-full rounded-2xl p-3 text-left text-xs font-semibold transition border ${
                  selectedConversationId === null 
                    ? "bg-cyan-400/10 text-cyan-100 border-cyan-400/25" 
                    : "bg-white/[0.02] border-transparent text-slate-300 hover:bg-white/[0.05]"
                }`}
              >
                Unified Stream ({filteredMessages.length})
              </button>

              {conversations
                .filter((convo) => {
                  const matchesTab = selectedTab === "all" || convo.channel === selectedTab;
                  const matchesSearch = convo.contactName.toLowerCase().includes(searchQuery.toLowerCase());
                  return matchesTab && matchesSearch;
                })
                .map((conversation) => {
                  const Icon = channelIcons[conversation.channel] || MessageCircle;
                  const isSelected = selectedConversationId === conversation.id;
                  return (
                    <div key={conversation.id} className="relative group w-full">
                      <button
                        type="button"
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className={`w-full rounded-2xl border text-left p-3.5 pr-10 transition ${
                          isSelected 
                            ? "bg-cyan-400/10 text-cyan-100 border-cyan-400/25 shadow-glow" 
                            : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate">{conversation.contactName}</span>
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] uppercase flex items-center gap-1 font-semibold text-slate-400 shrink-0">
                            <Icon className="h-2.5 w-2.5" />
                            {conversation.channel}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{conversation.lastMessage}</p>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeConversation(conversation.id);
                        }}
                        className="absolute top-4 right-3.5 p-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/25 opacity-0 group-hover:opacity-100 transition"
                        title="Delete Convo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Pane: Thread view or Unified Feed */}
        <div className="min-w-0">
          {selectedConversationId ? (
            
            // ─── ACTIVE CHAT THREAD ───
            <div className="glass-panel rounded-[2rem] flex flex-col h-[640px] overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-white/10 bg-slate-950/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/10 border border-cyan-400/30 flex items-center justify-center text-sm font-bold text-cyan-200">
                    {(activeConversation?.contactName || "U").slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm leading-none">{activeConversation?.contactName}</h2>
                    <p className="text-[11px] text-slate-500 mt-1 capitalize">{activeConversation?.channel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {conversationMessages.length > 0 && (
                    <button
                      onClick={() => void handleSummarizeConversation()}
                      disabled={summarizing}
                      className="ghost-button py-2 px-3 text-xs flex items-center gap-1.5 border border-white/10 transition shrink-0 text-yellow-300 hover:bg-yellow-500/10"
                      title="Summarize conversation"
                    >
                      {summarizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Summarize Chat
                    </button>
                  )}
                  {activeConversation && openAppUrls[activeConversation.channel] && (
                    <a 
                      href={openAppUrls[activeConversation.channel]}
                      target="_blank"
                      rel="noreferrer"
                      className="ghost-button py-2 px-3 text-xs flex items-center gap-1 border border-white/10 transition shrink-0 text-cyan-200"
                    >
                      Open App
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <button 
                    onClick={() => setSelectedConversationId(null)}
                    className="ghost-button py-2 px-3 text-xs border border-white/10 transition shrink-0 text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Optional Thread Summary */}
              {threadSummary && (
                <div className="mx-4 mt-4 p-4 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 text-xs text-slate-200 relative shrink-0">
                  <button 
                    onClick={() => setThreadSummary(null)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-white text-[10px]"
                  >
                    ✕
                  </button>
                  <div className="flex items-center gap-1.5 font-semibold text-cyan-200 mb-1.5">
                    <Bot className="h-3.5 w-3.5" />
                    AI Conversation Summary
                  </div>
                  <p className="whitespace-pre-line leading-relaxed">{threadSummary}</p>
                </div>
              )}

              {/* AI Smart Actions — detect actionable content in last message */}
              {(() => {
                const lastMsg = conversationMessages.length > 0
                  ? conversationMessages[conversationMessages.length - 1]
                  : null;
                if (!lastMsg || lastMsg.direction === 'outgoing') return null;

                const content = (lastMsg.content || "").toLowerCase();
                const hasMeeting = /meet|meeting|call|zoom|tomorrow|today|\d{1,2}(am|pm|:\d{2})/.test(content);
                const hasReminder = /remind|don't forget|remember|follow up|follow-up/.test(content);
                const hasTask = /send|submit|complete|finish|do|make|check|review|update|fix/.test(content);

                if (!hasMeeting && !hasReminder && !hasTask) return null;

                async function createSmartAction(type: string) {
                  if (!user) return;
                  setCreatingAction(type);
                  try {
                    const contentText = lastMsg!.content || "";
                    if (type === 'task') {
                      await addDoc(
                        userTasks(user.uid),
                        { title: contentText.slice(0, 80), notes: `From ${activeConversation?.contactName} via ${activeConversation?.channel}`, status: 'pending', priority: 'medium', createdAt: serverTimestamp() }
                      );
                      success("Task created!");
                    } else if (type === 'reminder') {
                      await addDoc(
                        userTasks(user.uid),
                        { title: `Reminder: ${contentText.slice(0, 60)}`, notes: `From ${activeConversation?.contactName}`, status: 'pending', priority: 'high', createdAt: serverTimestamp() }
                      );
                      success("Reminder created!");
                    } else if (type === 'calendar') {
                      success("Open Google Calendar to create event (integration via Settings → Google)");
                    }
                  } catch (e) { console.error(e); }
                  finally { setCreatingAction(null); }
                }

                return (
                  <div className="mx-4 mt-3 shrink-0">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                      <p className="text-[9px] uppercase font-bold text-slate-500 mb-2 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-yellow-400" /> AI Detected Actions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {hasMeeting && (
                          <button onClick={() => void createSmartAction('calendar')} disabled={!!creatingAction}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-semibold hover:bg-blue-500/20 transition disabled:opacity-50">
                            <Calendar className="h-3 w-3" /> Create Event
                          </button>
                        )}
                        {hasReminder && (
                          <button onClick={() => void createSmartAction('reminder')} disabled={!!creatingAction}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold hover:bg-amber-500/20 transition disabled:opacity-50">
                            <BellRing className="h-3 w-3" /> {creatingAction === 'reminder' ? 'Creating…' : 'Set Reminder'}
                          </button>
                        )}
                        {hasTask && (
                          <button onClick={() => void createSmartAction('task')} disabled={!!creatingAction}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-500/20 transition disabled:opacity-50">
                            <CheckSquare className="h-3 w-3" /> {creatingAction === 'task' ? 'Creating…' : 'Create Task'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Messages container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20">
                {conversationMessages.map((item) => {
                  const isOutgoing = item.direction === 'outgoing';
                  return (
                    <div key={item.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} group relative`}>
                      <div className="relative max-w-[75%]">
                        <div className={`absolute top-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isOutgoing ? '-left-14' : '-right-14'}`}>
                          <button
                            onClick={() => removeMessage(item.id)}
                            className="p-1 text-slate-400 hover:text-red-400 bg-white/5 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        <div className={`rounded-[1.7rem] px-4.5 py-3 text-sm leading-relaxed ${
                          isOutgoing 
                            ? 'rounded-tr-sm bg-gradient-to-br from-cyan-400/90 to-blue-500 text-slate-950 font-medium' 
                            : 'rounded-tl-sm border border-white/10 bg-white/[0.04] text-slate-200'
                        }`}>
                          <p>{item.content}</p>
                          {item.aiSummary && !isOutgoing && (
                            <div className="mt-2 text-[11px] border-t border-white/10 pt-2 text-cyan-200/80">
                              <strong>AI Summary:</strong> {item.aiSummary}
                            </div>
                          )}
                          <span className={`text-[9px] block mt-1.5 text-right ${isOutgoing ? 'text-slate-950/60' : 'text-slate-500'}`}>
                            {formatDateTime(item.timestamp || item.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>

              {/* AI suggestions & Composer */}
              <div className="p-4 border-t border-white/10 bg-slate-950/40 space-y-4 shrink-0">
                
                {/* AI Reply recommendations — show when last message is incoming */}
                {(() => {
                  const lastMsg = conversationMessages.length > 0 
                    ? conversationMessages[conversationMessages.length - 1] 
                    : null;
                  
                  if (!lastMsg || lastMsg.direction === 'outgoing') return null;

                  const replySuggestions = lastMsg.replySuggestions;
                  const suggestions = lastMsg.suggestions;

                  let items: [string, string][] = [];
                  if (replySuggestions && replySuggestions.length >= 1) {
                    const labels = ["Short", "Friendly", "Professional"];
                    items = replySuggestions.slice(0, 3).map((text, i) => [labels[i] || `Reply ${i+1}`, text] as [string, string]);
                  } else if (suggestions) {
                    if (suggestions.short) items.push(["Short", suggestions.short]);
                    if (suggestions.friendly) items.push(["Friendly", suggestions.friendly]);
                    if (suggestions.professional) items.push(["Professional", suggestions.professional]);
                  }

                  return (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-bold text-cyan-300 flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5" />
                        AI Reply Suggestions
                        {items.length === 0 && <Loader2 className="h-3 w-3 animate-spin ml-1 opacity-60" />}
                      </p>
                      {items.length > 0 ? (
                        <div className="grid gap-2 md:grid-cols-3">
                          {items.map(([label, text]) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => {
                                setCustomReplyText(text);
                                success("Copied to composer. Click send.");
                              }}
                              className="text-left rounded-xl border border-cyan-400/20 bg-cyan-400/5 hover:bg-cyan-400/10 p-3 text-xs transition"
                            >
                              <span className="font-semibold text-cyan-200 block mb-1">{label}</span>
                              <p className="text-slate-300 line-clamp-2">{text}</p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">Generating suggestions…</p>
                      )}
                    </div>
                  );
                })()}

                {/* composer input */}
                <form onSubmit={(e) => void handleSendCustomReply(e)} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="field py-2.5 text-xs"
                    placeholder="Type reply and hit send..."
                    value={customReplyText}
                    onChange={(e) => setCustomReplyText(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={sendingCustomReply || !customReplyText.trim()}
                    className="primary-button p-2.5 h-[42px] w-[42px] rounded-xl shrink-0"
                    title="Send Reply"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            
            // ─── UNIFIED MESSAGE FEED ───
            <div className="glass-panel rounded-[2rem] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-cyan-200" />
                  Unified Message Stream
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{filteredMessages.length} messages</span>
                  {filteredMessages.length > 0 && (
                    <button type="button" onClick={clearAllMessages} className="ghost-button h-8 px-3 text-xs text-red-400 hover:bg-red-400/10 hover:text-red-300">
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                {filteredMessages.length ? (
                  filteredMessages.map((item) => {
                    const Icon = channelIcons[item.channel] || MessageCircle;
                    const appUrl = openAppUrls[item.channel];
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.conversationId) {
                            setSelectedConversationId(item.conversationId);
                          }
                        }}
                        className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 relative group flex flex-col justify-between hover:border-cyan-400/30 transition cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-white">{item.senderName || item.sender}</span>
                              <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[9px] uppercase text-cyan-200 flex items-center gap-1 font-semibold">
                                <Icon className="h-2.5 w-2.5" />
                                {item.channel}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">{formatDateTime(item.timestamp || item.createdAt)}</span>
                          </div>
                          <p className="text-xs text-slate-300 mt-2 line-clamp-2">{item.content}</p>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-500 uppercase">source: {item.source}</span>
                            {appUrl && (
                              <a 
                                href={appUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] text-slate-400 hover:text-cyan-200 flex items-center gap-0.5 font-semibold transition"
                              >
                                Open App <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); void archiveMessageItem(item.id); }}
                              className="p-1 text-slate-400 hover:text-white"
                              title="Archive"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); void removeMessage(item.id); }}
                              className="p-1 text-slate-400 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState icon={Inbox} title="No incoming alerts" text="Your live message stream is clear." />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
