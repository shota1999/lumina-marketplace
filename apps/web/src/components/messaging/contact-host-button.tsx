'use client';

import { Loader2, MessageSquare, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { toast } from '@/hooks/use-toast';

interface ContactHostButtonProps {
  listingId: string;
  hostName?: string;
}

export function ContactHostButton({ listingId, hostName }: ContactHostButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, message: message.trim() }),
      });
      const json = await res.json();
      if (res.status === 401) {
        toast({ title: 'Sign in required', description: 'Please sign in to contact the host', variant: 'destructive' });
        return;
      }
      if (!res.ok || !json.success) {
        toast({ title: 'Failed to send', description: json.error?.message ?? 'Something went wrong', variant: 'destructive' });
        return;
      }
      router.push(`/messages/${json.data.conversationId}`);
    } catch {
      toast({ title: 'Network error', description: 'Could not send message', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }, [message, listingId, router]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700"
      >
        <MessageSquare className="h-4 w-4" />
        Contact {hostName ?? 'Host'}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Message {hostName ?? 'the host'}
        </p>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Hi! I'm interested in your listing..."
        rows={3}
        className="w-full resize-none rounded-lg border-none bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:bg-slate-900 dark:text-slate-50"
      />
      <button
        onClick={handleSend}
        disabled={sending || !message.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
        {sending ? 'Sending...' : 'Send Message'}
      </button>
    </div>
  );
}
