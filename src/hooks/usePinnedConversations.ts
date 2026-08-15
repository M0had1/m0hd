import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pinned-conversations';

const read = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

export const usePinnedConversations = () => {
  const [pinnedIds, setPinnedIds] = useState<string[]>(() =>
    typeof window === 'undefined' ? [] : read()
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedIds));
  }, [pinnedIds]);

  const isPinned = useCallback((id: string) => pinnedIds.includes(id), [pinnedIds]);

  const togglePin = useCallback((id: string) => {
    setPinnedIds(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [id, ...prev]));
  }, []);

  return { pinnedIds, isPinned, togglePin };
};
