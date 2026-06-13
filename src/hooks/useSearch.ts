import { useState, useMemo } from 'react';
import { useFirestoreCollection } from './useFirestoreCollection';
import { query, orderBy } from 'firebase/firestore';
import { userTasks, userMemories, userCommunicationMessages } from '../services/paths';
import { useAuth } from '../context/AuthContext';
import { Task, Memory, CommunicationMessage } from '../types/domain';

export type SearchResult = {
  id: string;
  type: 'task' | 'memory' | 'message';
  title: string;
  subtitle: string;
  url: string;
  date: Date | null;
};

export function useSearch() {
  const { user } = useAuth();
  const [queryText, setQueryText] = useState('');

  const tasksQuery = useMemo(() => user ? query(userTasks(user.uid), orderBy("createdAt", "desc")) : null, [user]);
  const memoryQuery = useMemo(() => user ? query(userMemories(user.uid), orderBy("createdAt", "desc")) : null, [user]);
  const messageQuery = useMemo(() => user ? query(userCommunicationMessages(user.uid), orderBy("createdAt", "desc")) : null, [user]);

  const { data: tasks } = useFirestoreCollection<Task>(tasksQuery);
  const { data: memories } = useFirestoreCollection<Memory>(memoryQuery);
  const { data: messages } = useFirestoreCollection<CommunicationMessage>(messageQuery);

  const results: SearchResult[] = useMemo(() => {
    if (!queryText.trim() || !user) return [];

    const lowerQuery = queryText.toLowerCase();
    const matches: SearchResult[] = [];

    tasks.forEach(task => {
      if (task.title.toLowerCase().includes(lowerQuery) || task.notes?.toLowerCase().includes(lowerQuery)) {
        matches.push({
          id: task.id,
          type: 'task',
          title: task.title,
          subtitle: task.status,
          url: '/tasks',
          date: task.createdAt ? (task.createdAt as any).toDate?.() || new Date(task.createdAt as any) : null
        });
      }
    });

    memories.forEach(memory => {
      if (memory.title.toLowerCase().includes(lowerQuery) || memory.content.toLowerCase().includes(lowerQuery) || memory.category.toLowerCase().includes(lowerQuery)) {
        matches.push({
          id: memory.id,
          type: 'memory',
          title: memory.title,
          subtitle: memory.category,
          url: '/memories',
          date: memory.createdAt ? (memory.createdAt as any).toDate?.() || new Date(memory.createdAt as any) : null
        });
      }
    });

    messages.forEach(msg => {
       if (msg.content.toLowerCase().includes(lowerQuery) || msg.senderName.toLowerCase().includes(lowerQuery)) {
           matches.push({
               id: msg.id,
               type: 'message',
               title: msg.senderName,
               subtitle: msg.content,
               url: '/communication',
               date: msg.createdAt ? (msg.createdAt as any).toDate?.() || new Date(msg.createdAt as any) : null
           })
       }
    })

    return matches.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.getTime() - a.date.getTime();
    });

  }, [queryText, tasks, memories, messages, user]);

  return {
    queryText,
    setQueryText,
    results
  };
}
