import { addDoc, deleteDoc, doc, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { CalendarDays, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { userTasks } from "../../services/paths";
import type { Task } from "../../types/domain";
import { formatDate } from "../../utils/date";

type TaskFilter = "all" | "active" | "completed";

const filters: TaskFilter[] = ["all", "active", "completed"];

export function TasksPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const tasksQuery = useMemo(
    () => (user ? query(userTasks(user.uid), orderBy("createdAt", "desc")) : null),
    [user]
  );
  const { data: tasks } = useFirestoreCollection<Task>(tasksQuery);

  const visibleTasks = tasks.filter((task) => {
    if (filter === "all") return true;
    return task.status === filter;
  });

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !title.trim()) return;

    const payload = {
      title: title.trim(),
      notes: notes.trim(),
      dueDate: dueDate || null,
      updatedAt: serverTimestamp()
    };

    if (editingTask) {
      await updateDoc(doc(userTasks(user.uid), editingTask.id), payload);
    } else {
      await addDoc(userTasks(user.uid), {
        ...payload,
        status: "active",
        createdAt: serverTimestamp()
      });
    }

    resetForm();
  }

  function editTask(task: Task) {
    setEditingTask(task);
    setTitle(task.title);
    setNotes(task.notes || "");
    setDueDate(typeof task.dueDate === "string" ? task.dueDate : "");
  }

  function resetForm() {
    setEditingTask(null);
    setTitle("");
    setNotes("");
    setDueDate("");
  }

  async function toggleTask(task: Task) {
    if (!user) return;

    await updateDoc(doc(userTasks(user.uid), task.id), {
      status: task.status === "completed" ? "active" : "completed",
      updatedAt: serverTimestamp()
    });
  }

  async function removeTask(taskId: string) {
    if (!user) return;
    await deleteDoc(doc(userTasks(user.uid), taskId));
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[24rem_1fr]">
      <form onSubmit={(e) => void submitTask(e)} className="glass-panel h-fit rounded-[2rem] p-5">
        <p className="text-sm text-cyan-200">Task Management</p>
        <h1 className="mt-2 text-2xl font-semibold">{editingTask ? "Edit task" : "Create task"}</h1>
        <div className="mt-6 space-y-4">
          <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title" />
          <textarea
            className="field min-h-28 resize-none"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes"
          />
          <input className="field" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <div className="flex gap-3">
            <button type="submit" className="primary-button flex-1">
              <Plus className="h-4 w-4" />
              {editingTask ? "Save" : "Add Task"}
            </button>
            {editingTask && (
              <button type="button" onClick={resetForm} className="ghost-button">
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="glass-panel rounded-[2rem] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-cyan-200">Realtime Queue</p>
            <h2 className="mt-2 text-2xl font-semibold">Tasks</h2>
          </div>
          <div className="grid grid-cols-3 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-xl px-4 py-2 text-sm capitalize transition ${
                  filter === item ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {visibleTasks.length ? (
            visibleTasks.map((task) => (
              <article key={task.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => void toggleTask(task)}
                    className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl border transition ${
                      task.status === "completed"
                        ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-200"
                        : "border-white/15 bg-white/[0.04] text-slate-500"
                    }`}
                    aria-label="Toggle task status"
                  >
                    {task.status === "completed" && <Check className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-semibold ${task.status === "completed" ? "text-slate-500 line-through" : "text-white"}`}>
                      {task.title}
                    </h3>
                    {task.notes && <p className="mt-1 text-sm leading-6 text-slate-400">{task.notes}</p>}
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(task.dueDate)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => editTask(task)} className="icon-button" aria-label="Edit task">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => void removeTask(task.id)} className="icon-button" aria-label="Delete task">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <EmptyState icon={CalendarDays} title="No tasks found" text="Create a task, set a due date, and it will sync instantly across devices." />
          )}
        </div>
      </div>
    </section>
  );
}
