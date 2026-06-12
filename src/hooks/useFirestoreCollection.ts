import { useEffect, useState } from "react";
import type { CollectionReference, DocumentData, Query } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";

type State<T> = {
  data: T[];
  loading: boolean;
  error: string | null;
};

export function useFirestoreCollection<T extends { id: string }>(
  source: CollectionReference<DocumentData> | Query<DocumentData> | null
) {
  const [state, setState] = useState<State<T>>({
    data: [],
    loading: Boolean(source),
    error: null
  });

  useEffect(() => {
    if (!source) {
      setState({ data: [], loading: false, error: null });
      return undefined;
    }

    setState((current) => ({ ...current, loading: true }));

    return onSnapshot(
      source,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data()
        })) as T[];

        setState({ data, loading: false, error: null });
      },
      (error) => {
        setState({ data: [], loading: false, error: error.message });
      }
    );
  }, [source]);

  return state;
}
