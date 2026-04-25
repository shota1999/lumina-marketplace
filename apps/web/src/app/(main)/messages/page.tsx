'use client';

import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Skeleton } from '@lumina/ui';

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
  };
  listing: {
    id: string;
    title: string;
    slug: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 dark:bg-slate-900">
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/conversations')
      .then((res) => {
        if (res.status === 401) {
          setError('UNAUTHORIZED');
          return null;
        }
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data) => {
        if (data?.success) {
          setConversations(data.data);
        }
      })
      .catch(() => setError('Failed to load conversations'))
      .finally(() => setLoading(false));
  }, []);

  if (error === 'UNAUTHORIZED') {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
          <MessageSquare className="h-9 w-9 text-slate-400 dark:text-slate-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
          Sign in to view messages
        </h1>
        <p className="mb-6 text-slate-500 dark:text-slate-400">
          You need to be signed in to access your conversations.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-50 px-10 py-4 text-sm font-bold text-white dark:text-slate-900 shadow-lg shadow-slate-900/10 transition-opacity hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-16">
        <Skeleton className="mb-2 h-10 w-48" />
        <Skeleton className="mb-12 h-5 w-72" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ConversationSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-16">
      {/* Header */}
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-2">
          Messages
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Your conversations with hosts and guests.
        </p>
      </header>

      {conversations.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-32 text-center max-w-md mx-auto">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
            <MessageSquare className="h-9 w-9 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">
            No messages yet
          </h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
            Start a conversation by contacting a host on any listing page.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-50 px-10 py-4 text-sm font-bold text-white dark:text-slate-900 shadow-lg shadow-slate-900/10 transition-opacity hover:opacity-90"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold mb-4">
            All conversations
          </p>
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
              className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md hover:ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
            >
              {/* Avatar */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                {conversation.otherUser.name.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 dark:text-slate-50">
                      {conversation.otherUser.name}
                    </span>
                    <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                      {conversation.listing.title}
                    </span>
                  </div>
                  {conversation.lastMessage && (
                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                      {timeAgo(conversation.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {conversation.lastMessage && (
                  <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                    {conversation.lastMessage.content}
                  </p>
                )}
              </div>

              {/* Unread badge */}
              {conversation.unreadCount > 0 && (
                <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[11px] font-bold text-white dark:bg-slate-50 dark:text-slate-900">
                  {conversation.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
