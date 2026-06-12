import { Activity, CheckCircle2, Clock3, FolderKanban, ListChecks, MessageSquare, Send, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { limit, orderBy, query } from "firebase/firestore";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { useAuth } from "../../context/AuthContext";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { userMemories, userMessages, userTasks } from "../../services/paths";
import type { ChatMessage, Memory, Task } from "../../types/domain";
import { formatDateTime } from "../../utils/date";

export function DashboardPage() {
  const { user } = useAuth();
  const tasksQuery = useMemo(() => user ? query(userTasks(user.uid), orderBy("createdAt", "desc")) : null, [user]);
  const memoryQuery = useMemo(() => user ? query(userMemories(user.uid), orderBy("createdAt", "desc")) : null, [user]);
  const messageQuery = useMemo(() => user ? query(userMessages(user.uid), orderBy("createdAt", "desc"), limit(5)) : null, [user]);

  const { data: tasks } = useFirestoreCollection<Task>(tasksQuery);
  const { data: memories } = useFirestoreCollection<Memory>(memoryQuery);
  const { data: messages } = useFirestoreCollection<ChatMessage>(messageQuery);

  const completed = tasks.filter((task) => task.status === "completed").length;
  const activeProjects = memories.filter((memory) => memory.category === "Projects").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="glass-panel relative overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="absolute right-8 top-8 hidden h-28 w-28 rounded-full border border-cyan-200/50 bg-cyan-400/10 shadow-[0_0_70px_rgba(34,211,238,0.7)] animate-float md:block" />
          <p className="text-sm text-cyan-200">Personal command center</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-5xl">Good Morning, Teja</h1>
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
