import React from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAssistantBrain } from "../../hooks/useAssistantBrain";
import type { SmartSuggestion } from "../../types/domain";

const ACTION_COLORS: Record<SmartSuggestion["action"], string> = {
  chat: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100 hover:border-cyan-300/40 hover:bg-cyan-400/20",
  task: "border-violet-300/20 bg-violet-400/10 text-violet-100 hover:border-violet-300/40 hover:bg-violet-400/20",
  memory: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:border-emerald-300/40 hover:bg-emerald-400/20",
  communication: "border-orange-300/20 bg-orange-400/10 text-orange-100 hover:border-orange-300/40 hover:bg-orange-400/20",
};

const ACTION_ROUTES: Record<SmartSuggestion["action"], string> = {
  chat: "/chat",
  task: "/tasks",
  memory: "/memories",
  communication: "/communication",
};

export function SmartSuggestionsPanel({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { suggestions, loading, error, refresh } = useAssistantBrain(userId);

  function handleSuggestion(s: SmartSuggestion) {
    const route = ACTION_ROUTES[s.action];
    if (s.action === "chat" && s.actionParam) {
      navigate(route, { state: { prefill: s.actionParam } });
    } else {
      navigate(route);
    }
  }

  return (
    <div className="glass-panel rounded-[2rem] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-300" />
          <h2 className="font-semibold">AI Suggestions</h2>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="icon-button h-9 w-9"
          aria-label="Refresh suggestions"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
          Brain is thinking...
        </div>
      ) : error ? (
        <p className="text-sm text-slate-500">Could not load suggestions. Check your connection.</p>
      ) : (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSuggestion(s)}
              className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${ACTION_COLORS[s.action]}`}
            >
              {s.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
