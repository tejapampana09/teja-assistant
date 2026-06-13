import { useCallback, useEffect, useState } from "react";
import { AssistantBrainService } from "../services/AssistantBrainService";
import type { SmartSuggestion } from "../types/domain";

type State = {
  suggestions: SmartSuggestion[];
  loading: boolean;
  error: string | null;
};

/**
 * React hook that wraps AssistantBrainService.
 * Loads smart suggestions once on mount and exposes a refresh function.
 */
export function useAssistantBrain(userId: string | undefined) {
  const [state, setState] = useState<State>({
    suggestions: [],
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    if (!userId) return;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const brain = new AssistantBrainService(userId);
      const suggestions = await brain.getSmartSuggestions();
      setState({ suggestions, loading: false, error: null });
    } catch (err) {
      setState({
        suggestions: [],
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load suggestions",
      });
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, refresh: load };
}
