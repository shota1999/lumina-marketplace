'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { toast } from '@/hooks/use-toast';

const MAX_COMPARE = 4;
const STORAGE_KEY = 'lumina_compare';

let cachedRaw: string | null = null;
let cachedSnapshot: string[] = [];
const SERVER_SNAPSHOT: string[] = [];

function getSnapshot(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY) ?? '[]';
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedSnapshot = JSON.parse(raw) as string[];
    } catch {
      cachedSnapshot = [];
    }
  }
  return cachedSnapshot;
}

function getServerSnapshot(): string[] {
  return SERVER_SNAPSHOT;
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit() {
  listeners.forEach((cb) => cb());
}

function setItems(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  cachedRaw = null;
  emit();
}

export function useCompare() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((id: string) => {
    const current = getSnapshot();
    if (current.includes(id)) {
      setItems(current.filter((i) => i !== id));
      toast({ title: 'Removed from compare' });
    } else if (current.length < MAX_COMPARE) {
      setItems([...current, id]);
      toast({
        title: 'Added to compare',
        description: `${current.length + 1} of ${MAX_COMPARE} slots used`,
      });
    } else {
      toast({
        title: 'Compare list full',
        description: `Maximum ${MAX_COMPARE} listings can be compared`,
        variant: 'destructive',
      });
    }
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    toast({ title: 'Compare list cleared' });
  }, []);

  const isComparing = useCallback((id: string) => getSnapshot().includes(id), []);

  return { items, toggle, clear, isComparing, isFull: items.length >= MAX_COMPARE };
}
