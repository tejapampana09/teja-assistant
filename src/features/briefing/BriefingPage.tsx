import { orderBy, query } from "firebase/firestore";
import { BookOpenCheck, CalendarClock, Inbox, ListChecks, SunMedium } from "lucide-react";
import { useMemo } from "react";
import { StatCard } from "../../components/ui/StatCard";
import { useAuth } from "../../context/AuthContext";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { latestCommunicationMessagesQuery } from "../../services/communication";
import { buildDailyBriefing } from "../../services/dailyBriefing";
import { userTasks } from "../../services/paths";
import type { CommunicationMessage, Task } from "../../types/domain";
import { formatDateTime, getGreeting } from "../../utils/date";

export function BriefingPage() {
  const { user } = useAuth();
  const tasksQuery = useMemo(() => (user ? query(userTasks(user.uid), orderBy("createdAt", "desc")) : null), [user]);
  const messagesQuery = useMemo(() => (user ? latestCommunicationMessagesQuery(user.uid, 20) : null), [user]);

  const { data: tasks } = useFirestoreCollection<Task>(tasksQuery);
  const { data: messages } = useFirestoreCollection<CommunicationMessage>(messagesQuery);
  const briefing = buildDailyBriefing(tasks, messages);

  return (
    <section className="space-y-5">
      <div className="glass-panel relative overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="absolute right-8 top-8 hidden h-28 w-28 rounded-full border border-yellow-200/40 bg-yellow-300/10 shadow-[0_0_70px_rgba(250,204,21,0.35)] md:block" />
        <p className="text-sm text-cyan-200">Daily Briefing</p>
        <h1 className="mt-3 text-3xl font-semibold md:text-5xl">{getGreeting()} {user?.displayName?.split(' ')[0] || "Teja"}.</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Here is the morning snapshot from your tasks, communication hub, deadlines, and study goals.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Tasks" value={briefing.pendingTasks} hint="Pending tasks" icon={ListChecks} />
        <StatCard label="Unread Messages" value={briefing.unreadMessages} hint="Incoming messages" icon={Inbox} tone="violet" />
        <StatCard label="Upcoming Deadline" value={briefing.upcomingDeadline === "No deadline set" ? "None" : "1"} hint={briefing.upcomingDeadline} icon={CalendarClock} tone="orange" />
        <StatCard label="Study Goal" value="1h" hint={briefing.studyGoal} icon={BookOpenCheck} tone="green" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <div className="glass-panel rounded-[2rem] p-5">
          <h2 className="font-semibold">Important Messages</h2>
          <div className="mt-5 space-y-3">
            {briefing.importantMessages.length ? (
              briefing.importantMessages.map((message) => (
                <article key={message.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-medium">{message.senderName}</span>
                    <span className="text-xs text-slate-500">{formatDateTime(message.timestamp || message.createdAt)}</span>
                  </div>
                  <p className="text-sm leading-6 text-slate-400">{message.content}</p>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-400">
                No important messages yet.
              </p>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-5">
          <div className="flex items-center gap-3 text-cyan-200">
            <SunMedium className="h-5 w-5" />
            <h2 className="font-semibold text-white">Generated Brief</h2>
          </div>
          <div className="mt-5 rounded-3xl border border-cyan-300/15 bg-cyan-400/10 p-5 text-sm leading-7 text-slate-200">
            {getGreeting()} {user?.displayName?.split(' ')[0] || "Teja"}.
            <br />
            Today's Tasks: {briefing.pendingTasks}
            <br />
            Unread Messages: {briefing.unreadMessages}
            <br />
            Upcoming Deadline: {briefing.upcomingDeadline}
            <br />
            Study Goal: {briefing.studyGoal}
          </div>
        </div>
      </div>
    </section>
  );
}
