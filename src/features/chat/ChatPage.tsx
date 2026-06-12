import { addDoc, orderBy, query, serverTimestamp } from "firebase/firestore";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { requestAssistantReply } from "../../services/ai";
import { userMessages } from "../../services/paths";
import type { ChatMessage } from "../../types/domain";

const starterPrompts = [
  "Plan my study time today",
  "Summarize my active tasks",
  "Help me organize project memories"
];

export function ChatPage() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const messagesQuery = useMemo(
    () => (user ? query(userMessages(user.uid), orderBy("createdAt", "asc")) : null),
    [user]
  );
  const { data: messages, loading } = useFirestoreCollection<ChatMessage>(messagesQuery);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();

    if (!user || !trimmed || sending) return;

    setContent("");
    setSending(true);

    const optimisticMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date()
    };

    try {
      await addDoc(userMessages(user.uid), {
        role: "user",
        content: trimmed,
        createdAt: serverTimestamp()
      });

      const reply = await requestAssistantReply([...messages, optimisticMessage]);

      await addDoc(userMessages(user.uid), {
        role: "assistant",
        content: reply,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      await addDoc(userMessages(user.uid), {
        role: "assistant",
        content:
          error instanceof Error
            ? `I could not reach the AI service yet: ${error.message}`
            : "I could not reach the AI service yet.",
        createdAt: serverTimestamp()
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="grid h-[calc(100vh-8rem)] gap-5 lg:grid-cols-[1fr_22rem]">
      <div className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-[2rem]">
        <div className="border-b border-white/10 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-cyan-200">AI Chat</p>
              <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Talk to Teja Assistant</h1>
            </div>
            <div className="hidden rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100 sm:block">
              History saved
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <EmptyState icon={Loader2} title="Loading conversation" text="Fetching your realtime message history." />
          ) : messages.length ? (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {sending && (
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
                  Teja Assistant is thinking...
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          ) : (
            <EmptyState icon={Sparkles} title="Start your assistant thread" text="Ask about tasks, study planning, project tracking, or anything you want Teja Assistant to remember later." />
          )}
        </div>

        <form onSubmit={submitMessage} className="border-t border-white/10 p-4 md:p-5">
          <div className="flex gap-3 rounded-3xl border border-white/10 bg-slate-950/65 p-2">
            <input
              className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-slate-500"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Type your message or ask anything..."
            />
            <button type="submit" disabled={!content.trim() || sending} className="primary-button rounded-2xl px-4">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </div>

      <aside className="hidden space-y-5 lg:block">
        <div className="glass-panel rounded-[2rem] p-5">
          <h2 className="font-semibold">Quick Prompts</h2>
          <div className="mt-4 space-y-3">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setContent(prompt)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left text-sm text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
        <div className="glass-panel rounded-[2rem] p-5">
          <h2 className="font-semibold">Future-ready AI layer</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The chat calls a backend API wrapper, so future OpenAI, voice, and autonomous agent features can be added without exposing provider keys in the browser.
          </p>
        </div>
      </aside>
    </section>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-200">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={`max-w-[82%] rounded-3xl border px-5 py-4 text-sm leading-6 ${
          isUser
            ? "border-cyan-300/20 bg-cyan-400/15 text-cyan-50"
            : "border-white/10 bg-white/[0.06] text-slate-200"
        }`}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/10 text-slate-200">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
