'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

type ToastListener = (toasts: ToastData[]) => void;

let toasts: ToastData[] = [];
let listeners: ToastListener[] = [];
let counter = 0;

function emit() {
  for (const listener of listeners) {
    listener([...toasts]);
  }
}

export function toast(input: Omit<ToastData, 'id'>) {
  const id = String(++counter);
  const t: ToastData = { id, ...input };
  toasts = [...toasts, t];
  emit();

  const duration = input.duration ?? 4000;
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== id);
    emit();
  }, duration);

  return id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((x) => x.id !== id);
  emit();
}

export function useToast() {
  const [state, setState] = useState<ToastData[]>([]);

  useEffect(() => {
    listeners.push(setState);
    setState([...toasts]);
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);

  const dismiss = useCallback((id: string) => dismissToast(id), []);

  return { toasts: state, toast, dismiss };
}
