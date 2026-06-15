import { Activity, CheckCircle2, Clock3, FolderKanban, ListChecks, MessageSquare, Send, Sparkles } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { limit, orderBy, query } from "firebase/firestore";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { useAuth } from "../../context/AuthContext";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { userMemories, userMessages, userTasks, userCommunicationMessages } from "../../services/paths";
import type { ChatMessage, Memory, Task, CommunicationMessage } from "../../types/domain";
import { formatDateTime, getGreeting } from "../../utils/date";
import { checkGoogleConnection } from "../../services/googleAuth";
import { fetchUpcomingEvents, CalendarEvent } from "../../services/calendar";
import { fetchRecentEmails, GmailMessage } from "../../services/gmail";
import { SmartSuggestionsPanel } from "./SmartSuggestionsPanel";

const MailIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
);

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
);

const ExternalLinkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
);

export function DashboardPage() {
  const { user } = useAuth();
  const tasksQuery = useMemo(() => user ? query(userTasks(user.uid), orderBy("createdAt", "desc")) : null, [user]);
  const memoryQuery = useMemo(() => user ? query(userMemories(user.uid), orderBy("createdAt", "desc")) : null, [user]);
  const messageQuery = useMemo(() => user ? query(userMessages(user.uid), orderBy("createdAt", "desc"), limit(5)) : null, [user]);
  const commMessagesQuery = useMemo(() => user ? query(userCommunicationMessages(user.uid), orderBy("createdAt", "desc")) : null, [user]);

  const { data: tasks } = useFirestoreCollection<Task>(tasksQuery);
  const { data: memories } = useFirestoreCollection<Memory>(memoryQuery);
  const { data: messages } = useFirestoreCollection<ChatMessage>(messageQuery);
  const { data: commMessages } = useFirestoreCollection<CommunicationMessage>(commMessagesQuery);

  const [googleConnected, setGoogleConnected] = useState<boolean>(false);
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingGoogle, setLoadingGoogle] = useState<boolean>(false);

  const completed = tasks.filter((task) => task.status === "completed").length;
  const activeProjects = memories.filter((memory) => memory.category === "Projects").length;

  const todayCommStats = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    const todayMsgs = commMessages.filter((m) => {
      const dateStr = m.timestamp || m.createdAt;
      if (!dateStr) return false;
      const t = typeof dateStr === 'string' ? new Date(dateStr).getTime() : (dateStr as any).seconds ? (dateStr as any).seconds * 1000 : 0;
      return t >= startOfToday;
    });

    const counts: Record<string, number> = { whatsapp: 0, gmail: 0, instagram: 0, sms: 0, call: 0 };
    todayMsgs.forEach((msg) => {
      if (counts[msg.channel] !== undefined) {
        counts[msg.channel]++;
      }
    });

    const unreads = commMessages.filter((m) => m.direction === 'incoming' && m.unread !== false && !m.archived);

    // AI Communication summary
    let summaryText = "No notifications today.";
    if (todayMsgs.length > 0) {
      const activeSenders = Array.from(new Set(todayMsgs.map((m) => m.senderName || m.sender).filter(Boolean)));
      summaryText = `Received ${todayMsgs.length} messages today from ${activeSenders.join(", ")}.`;
    } else if (unreads.length > 0) {
      summaryText = `You have ${unreads.length} unread notifications waiting.`;
    }

    // Most Important Message (the latest incoming unread message)
    const mostImportant = unreads[0] || null;

    return {
      whatsapp: counts.whatsapp,
      gmail: counts.gmail,
      instagram: counts.instagram,
      sms: counts.sms,
      call: counts.call,
      totalToday: todayMsgs.length,
      unreads: unreads.length,
      summaryText,
      mostImportant
    };
  }, [commMessages]);

  useEffect(() => {
    if (!user) return;
    
    const loadGoogleData = async () => {
      try {
        setLoadingGoogle(true);
        const connected = await checkGoogleConnection(user.uid);
        setGoogleConnected(connected);
        if (connected) {
          const [fetchedEmails, fetchedEvents] = await Promise.all([
            fetchRecentEmails(user.uid).catch(() => []),
            fetchUpcomingEvents(user.uid).catch(() => [])
          ]);
          setEmails(fetchedEmails);
          setEvents(fetchedEvents);
        }
      } catch (err) {
        console.error("Error loading Google data on dashboard:", err);
      } finally {
        setLoadingGoogle(false);
      }
    };

    void loadGoogleData();
  }, [user]);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="glass-panel relative overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="absolute right-8 top-8 hidden h-28 w-28 rounded-full border border-cyan-200/50 bg-cyan-400/10 shadow-[0_0_70px_rgba(34,211,238,0.7)] animate-float md:block" />
          <p className="text-sm text-cyan-200">Personal command center</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-5xl">{getGreeting()}, {user?.displayName?.split(' ')[0] || "Teja"}</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Here is your realtime overview for tasks, memories, and AI conversations.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/chat" className="primary-button">
              <Send className="h-4 w-4" />
              Open Chat
            </Link>
            <Link to="/tasks" className="ghost-button">
              <ListChecks className="h-4 w-4" />
              Add Task
            </Link>
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Assistant Status</h2>
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">Online</span>
          </div>
          <div className="space-y-4">
            <StatusRow label="Auth" value="Google secured" />
            <StatusRow label="Database" value="Firestore realtime" />
            <StatusRow label="AI Layer" value="API-ready" />
          </div>
        </div>
      </section>

      {/* AI Communication Hub Overview */}
      <section className="grid gap-5 md:grid-cols-2">
        {/* Today's Communication Summary */}
        <div className="glass-panel rounded-[2rem] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-cyan-200" />
              Communication Summary
            </h2>
            <span className="text-xs bg-cyan-400/10 text-cyan-200 border border-cyan-400/20 px-2.5 py-1 rounded-full font-semibold">
              Today
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">WhatsApp</span>
              <span className="text-2xl font-bold mt-1 text-white">{todayCommStats.whatsapp}</span>
            </div>
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">Gmail</span>
              <span className="text-2xl font-bold mt-1 text-white">{todayCommStats.gmail}</span>
            </div>
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">Instagram</span>
              <span className="text-2xl font-bold mt-1 text-white">{todayCommStats.instagram}</span>
            </div>
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">SMS</span>
              <span className="text-2xl font-bold mt-1 text-white">{todayCommStats.sms}</span>
            </div>
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">Calls</span>
              <span className="text-2xl font-bold mt-1 text-white">{todayCommStats.call}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-cyan-400/5 border border-cyan-400/10 p-4 space-y-1">
            <p className="text-xs font-semibold text-cyan-200 uppercase tracking-wider">AI Inbox Overview</p>
            <p className="text-sm text-slate-300 leading-relaxed">{todayCommStats.summaryText}</p>
          </div>
        </div>

        {/* Most Important Message */}
        <div className="glass-panel rounded-[2rem] p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-300" />
              Most Important Message
            </h2>
            <Link to="/comms" className="text-xs text-cyan-200 hover:underline">
              Inbox
            </Link>
          </div>

          {todayCommStats.mostImportant ? (
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm">{todayCommStats.mostImportant.senderName || todayCommStats.mostImportant.sender}</span>
                  <span className="text-[10px] bg-yellow-500/15 text-yellow-300 border border-yellow-500/20 px-2 py-0.5 rounded-full uppercase shrink-0 font-semibold">
                    {todayCommStats.mostImportant.channel}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-2 line-clamp-2">{todayCommStats.mostImportant.content}</p>
              </div>
              {todayCommStats.mostImportant.aiSummary && (
                <div className="text-xs bg-black/20 p-2.5 rounded-xl text-yellow-200/80 border border-white/5 mt-2">
                  <strong>Brief:</strong> {todayCommStats.mostImportant.aiSummary}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl p-6 text-center flex-1">
              <p className="text-sm text-slate-500">No urgent unread messages needing attention.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Tasks" value={tasks.length} hint={`${tasks.length - completed} active`} icon={ListChecks} />
        <StatCard label="Completed Tasks" value={completed} hint="Marked done" icon={CheckCircle2} tone="green" />
        <StatCard label="Active Projects" value={activeProjects} hint="From memories" icon={FolderKanban} tone="violet" />
        <StatCard label="Recent Activity" value={messages.length} hint="Latest chat messages" icon={Activity} tone="orange" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Recent Activity</h2>
            <Link to="/chat" className="text-sm text-cyan-200 hover:text-cyan-100">View chat</Link>
          </div>
          {messages.length ? (
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="capitalize text-cyan-200">{message.role}</span>
                    <span>{formatDateTime(message.createdAt)}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-300">{message.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={MessageSquare} title="No chat activity yet" text="Start a conversation and your latest messages will appear here." />
          )}
        </div>

        <div className="glass-panel rounded-[2rem] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Focus Queue</h2>
            <Link to="/tasks" className="text-sm text-cyan-200 hover:text-cyan-100">Manage</Link>
          </div>
          {tasks.length ? (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Clock3 className="h-4 w-4 text-cyan-200" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-slate-500">{task.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Sparkles} title="Your focus queue is clear" text="Add tasks with due dates to plan the day." />
          )}
        </div>
      </section>

      {user && (
         <section className="mt-4">
            <SmartSuggestionsPanel userId={user.uid} />
         </section>
      )}

      {/* Google Agenda Section */}
      <section className="grid gap-5 md:grid-cols-2">
        {/* Google Calendar */}
        <div className="glass-panel rounded-[2rem] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-purple-400" />
              <h2 className="font-semibold">Google Calendar Agenda</h2>
            </div>
            {googleConnected && (
              <span className="text-xs text-slate-400">Next 7 days</span>
            )}
          </div>

          {!googleConnected ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-sm text-slate-400">Calendar integration is not configured.</p>
              <Link to="/integrations" className="mt-3 flex items-center gap-1.5 text-xs font-bold text-cyan-200 hover:underline">
                Connect Google Account <ExternalLinkIcon className="h-3 w-3" />
              </Link>
            </div>
          ) : loadingGoogle ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" />
            </div>
          ) : events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-medium text-white line-clamp-1">{event.title}</p>
                    <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full shrink-0">
                      Event
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {new Date(event.start).toLocaleString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </p>
                  {event.location && (
                    <p className="text-[11px] text-slate-500 truncate">📍 {event.location}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">No upcoming meetings or events found.</p>
            </div>
          )}
        </div>

        {/* Gmail */}
        <div className="glass-panel rounded-[2rem] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MailIcon className="h-5 w-5 text-blue-400" />
              <h2 className="font-semibold">Recent Unread Emails</h2>
            </div>
            {googleConnected && (
              <span className="text-xs text-slate-400">Syncing live</span>
            )}
          </div>

          {!googleConnected ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-sm text-slate-400">Gmail integration is not configured.</p>
              <Link to="/integrations" className="mt-3 flex items-center gap-1.5 text-xs font-bold text-cyan-200 hover:underline">
                Connect Google Account <ExternalLinkIcon className="h-3 w-3" />
              </Link>
            </div>
          ) : loadingGoogle ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" />
            </div>
          ) : emails.length > 0 ? (
            <div className="space-y-3">
              {emails.map((email) => (
                <div key={email.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-xs font-semibold text-cyan-200 truncate">{email.from}</p>
                    <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full shrink-0">
                      Unread
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white line-clamp-1">{email.subject}</p>
                  <p className="text-xs text-slate-400 line-clamp-1">{email.snippet}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">Your inbox is clear! No unread emails.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-100">{value}</span>
    </div>
  );
}
