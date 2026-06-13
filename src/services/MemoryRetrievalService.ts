import { getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { userMemories } from "./paths";
import type { Memory, MemoryCategory, MemoryImportance } from "../types/domain";

// ─── Scoring ───────────────────────────────────────────────────────────────────

const IMPORTANCE_WEIGHT: Record<MemoryImportance, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Score a memory by keyword overlap with the user's query.
 * Higher score = more relevant.
 */
function scoreMemory(memory: Memory, queryLower: string): number {
  const haystack = `${memory.title} ${memory.content} ${memory.category} ${(memory.tags ?? []).join(" ")}`.toLowerCase();
  const words = queryLower
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const overlap = words.filter((w) => haystack.includes(w)).length;
  const importanceBoost = IMPORTANCE_WEIGHT[memory.importance ?? "low"];
  return overlap * 2 + importanceBoost;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Retrieve the top N memories most relevant to the user's current query.
 * Falls back to top memories by importance if query is empty.
 */
export async function retrieveRelevantMemories(
  userId: string,
  userQuery: string,
  maxResults = 8
): Promise<Memory[]> {
  try {
    // Fetch up to 60 recent memories (avoid full collection scans)
    const snapshot = await getDocs(
      query(userMemories(userId), orderBy("updatedAt", "desc"), limit(60))
    );

    const memories = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Memory[];

    if (!userQuery.trim()) {
      // No query — return top by importance
      return memories
        .sort((a, b) => IMPORTANCE_WEIGHT[b.importance ?? "low"] - IMPORTANCE_WEIGHT[a.importance ?? "low"])
        .slice(0, maxResults);
    }

    const queryLower = userQuery.toLowerCase();

    return memories
      .map((m) => ({ memory: m, score: scoreMemory(m, queryLower) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ memory }) => memory);
  } catch (error) {
    console.error("[MemoryRetrievalService] Failed to retrieve memories:", error);
    return [];
  }
}

/**
 * Retrieve all high-importance memories across categories for baseline context.
 */
export async function getHighImportanceMemories(userId: string): Promise<Memory[]> {
  try {
    const snapshot = await getDocs(
      query(
        userMemories(userId),
        where("importance", "==", "high"),
        orderBy("updatedAt", "desc"),
        limit(10)
      )
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Memory[];
  } catch {
    return [];
  }
}

/**
 * Format retrieved memories into a context string for AI system prompts.
 */
export function formatMemoriesForContext(memories: Memory[]): string {
  if (memories.length === 0) return "";

  const grouped: Partial<Record<MemoryCategory, Memory[]>> = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category]!.push(m);
  }

  const sections = Object.entries(grouped).map(([cat, items]) => {
    const lines = items!.map((m) => `  - ${m.title}: ${m.content}`).join("\n");
    return `[${cat}]\n${lines}`;
  });

  return sections.join("\n\n");
}
