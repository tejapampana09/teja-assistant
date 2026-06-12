import { addDoc, deleteDoc, doc, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { Brain, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { userMemories } from "../../services/paths";
import type { Memory, MemoryCategory } from "../../types/domain";
import { formatDateTime } from "../../utils/date";

const categories: MemoryCategory[] = ["Projects", "Goals", "Preferences", "Learning", "Personal Notes"];

export function MemoryPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<MemoryCategory>("Projects");
  const [search, setSearch] = useState("");
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);

  const memoryQuery = useMemo(
    () => (user ? query(userMemories(user.uid), orderBy("createdAt", "desc")) : null),
    [user]
  );
  const { data: memories } = useFirestoreCollection<Memory>(memoryQuery);

  const visibleMemories = memories.filter((memory) => {
    const haystack = `${memory.title} ${memory.content} ${memory.category}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  async function submitMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !title.trim() || !content.trim()) return;

    const payload = {
      title: title.trim(),
      content: content.trim(),
      category,
      updatedAt: serverTimestamp()
    };

    if (editingMemory) {
      await updateDoc(doc(userMemories(user.uid), editingMemory.id), payload);
    } else {
      await addDoc(userMemories(user.uid), {
        ...payload,
        createdAt: serverTimestamp()
      });
    }

    resetForm();
  }

  function editMemory(memory: Memory) {
    setEditingMemory(memory);
    setTitle(memory.title);
    setContent(memory.content);
    setCategory(memory.category);
  }

  function resetForm() {
    setEditingMemory(null);
    setTitle("");
    setContent("");
    setCategory("Projects");
  }

  async function removeMemory(memoryId: string) {
    if (!user) return;
    await deleteDoc(doc(userMemories(user.uid), memoryId));
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[24rem_1fr]">
      <form onSubmit={(e) => void submitMemory(e)} className="glass-panel h-fit rounded-[2rem] p-5">
        <p className="text-sm text-cyan-200">Memory System</p>
        <h1 className="mt-2 text-2xl font-semibold">{editingMemory ? "Edit memory" : "Create memory"}</h1>
        <div className="mt-6 space-y-4">
          <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Memory title" />
          <select className="field" value={category} onChange={(event) => setCategory(event.target.value as MemoryCategory)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <textarea
            className="field min-h-36 resize-none"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="What should Teja Assistant remember?"
          />
          <div className="flex gap-3">
            <button type="submit" className="primary-button flex-1">
              <Plus className="h-4 w-4" />
              {editingMemory ? "Save" : "Add Memory"}
            </button>
            {editingMemory && (
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
            <p className="text-sm text-cyan-200">Knowledge Vault</p>
            <h2 className="mt-2 text-2xl font-semibold">Memories</h2>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              className="bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search memories"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {visibleMemories.length ? (
            visibleMemories.map((memory) => (
              <article key={memory.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                      {memory.category}
                    </span>
                    <h3 className="mt-4 text-lg font-semibold">{memory.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{memory.content}</p>
                    <p className="mt-4 text-xs text-slate-500">{formatDateTime(memory.updatedAt || memory.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => editMemory(memory)} className="icon-button" aria-label="Edit memory">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => void removeMemory(memory.id)} className="icon-button" aria-label="Delete memory">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="xl:col-span-2">
              <EmptyState icon={Brain} title="No memories found" text="Add projects, goals, preferences, learning notes, or personal notes." />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
