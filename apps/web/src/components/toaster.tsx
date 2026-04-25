'use client';

import { Toast, ToastClose, ToastDescription, ToastTitle } from '@lumina/ui';

import { useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <>
      {toasts.map((t) => (
        <Toast key={t.id} variant={t.variant}>
          <div className="grid gap-1">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
    </>
  );
}
