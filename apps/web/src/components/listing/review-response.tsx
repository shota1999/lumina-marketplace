'use client';

import { Loader2, MessageSquare, Pencil, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { toast } from '@/hooks/use-toast';

interface ExistingResponse {
  id: string;
  body: string;
  hostName: string;
  hostAvatarUrl: string | null;
  createdAt: string;
}

interface ReviewResponseProps {
  reviewId: string;
  existingResponse?: ExistingResponse;
  isHost: boolean;
}

function formatResponseDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ReviewResponse({ reviewId, existingResponse, isHost }: ReviewResponseProps) {
  const router = useRouter();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [body, setBody] = useState(existingResponse?.body ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const endpoint = `/api/reviews/${reviewId}/response`;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = body.trim();
      if (trimmed.length === 0) {
        toast({
          title: 'Reply cannot be empty',
          variant: 'destructive',
        });
        return;
      }

      setSubmitting(true);
      try {
        const method = editMode ? 'PATCH' : 'POST';
        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: trimmed }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          const msg = data.error?.message ?? 'Failed to submit reply';
          toast({ title: 'Error', description: msg, variant: 'destructive' });
          return;
        }

        toast({
          title: editMode ? 'Reply updated' : 'Reply posted',
          description: editMode
            ? 'Your response has been updated'
            : 'Your response is now visible to guests',
        });
        setShowReplyForm(false);
        setEditMode(false);
        router.refresh();
      } catch {
        toast({
          title: 'Network error',
          description: 'Could not submit reply',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [body, editMode, endpoint, router],
  );

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.error?.message ?? 'Failed to delete reply';
        toast({ title: 'Error', description: msg, variant: 'destructive' });
        return;
      }

      toast({ title: 'Reply deleted' });
      setConfirmDelete(false);
      router.refresh();
    } catch {
      toast({
        title: 'Network error',
        description: 'Could not delete reply',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  }, [endpoint, router]);

  // Existing response display
  if (existingResponse && !editMode) {
    return (
      <div className="ml-8 mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Host Response
        </p>
        <div className="flex items-start gap-3">
          {existingResponse.hostAvatarUrl ? (
            <img
              src={existingResponse.hostAvatarUrl}
              alt={existingResponse.hostName}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              {getInitials(existingResponse.hostName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
                {existingResponse.hostName}
              </p>
              <span className="text-xs text-slate-400">
                {formatResponseDate(existingResponse.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {existingResponse.body}
            </p>
          </div>
        </div>

        {isHost && (
          <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setBody(existingResponse.body);
                setEditMode(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Are you sure?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Edit mode form
  if (editMode) {
    return (
      <div className="ml-8 mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Edit Response
          </p>
          <button
            type="button"
            onClick={() => setEditMode(false)}
            className="rounded-xl p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:focus:ring-slate-400"
            placeholder="Write your reply..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting || body.trim().length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // No response yet and user is host — show reply button / form
  if (!existingResponse && isHost) {
    if (!showReplyForm) {
      return (
        <div className="ml-8 mt-3">
          <button
            type="button"
            onClick={() => setShowReplyForm(true)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Reply
          </button>
        </div>
      );
    }

    return (
      <div className="ml-8 mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Your Response
          </p>
          <button
            type="button"
            onClick={() => {
              setShowReplyForm(false);
              setBody('');
            }}
            className="rounded-xl p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:focus:ring-slate-400"
            placeholder="Write your reply..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting || body.trim().length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post Reply'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReplyForm(false);
                setBody('');
              }}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Not a host and no existing response — render nothing
  return null;
}
