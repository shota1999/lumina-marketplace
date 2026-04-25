'use client';

import { ArrowLeft, ArrowUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Skeleton } from '@lumina/ui';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

interface ConversationDetail {
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
  messages: Message[];
  currentUserId: string;
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return (
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' +
    time
  );
}

function shouldShowTimestamp(
  current: Message,
  previous: Message | undefined,
): boolean {
  if (!previous) return true;
  const diff =
    new Date(current.createdAt).getTime() -
    new Date(previous.createdAt).getTime();
  return diff > 5 * 60 * 1000 || current.senderId !== previous.senderId;
}

function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-200px)] flex-col">
      {/* Top bar skeleton */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      {/* Messages skeleton */}
      <div className="flex-1 space-y-4 p-6">
        <div className="flex justify-start">
          <Skeleton className="h-10 w-48 rounded-2xl rounded-bl-sm" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-56 rounded-2xl rounded-br-sm" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-10 w-40 rounded-2xl rounded-bl-sm" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-16 w-64 rounded-2xl rounded-br-sm" />
        </div>
      </div>
      {/* Input skeleton */}
      <div className="border-t border-slate-100 p-4 dark:border-slate-800">
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  const [conversation, setConversation] = useState<ConversationDetail | null>(
    null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch conversation
  useEffect(() => {
    fetch(`/api/conversations/${conversationId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data) => {
        if (data?.success) {
          setConversation(data.data);
          setMessages(data.data.messages ?? []);
        }
      })
      .catch(() => {
        /* handled by empty state */
      })
      .finally(() => setLoading(false));
  }, [conversationId]);

  // Mark as read on mount
  useEffect(() => {
    if (!conversationId) return;
    fetch(`/api/conversations/${conversationId}/read`, {
      method: 'PATCH',
    }).catch(() => {
      /* silent */
    });
  }, [conversationId]);

  // Poll for new messages. Demo-mode polling — a production build would use SSE or WebSockets.
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(() => {
      fetch(`/api/conversations/${conversationId}`)
        .then((res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((data) => {
          if (data?.success && data.data.messages) {
            setMessages((prev) => {
              const newMessages = data.data.messages as Message[];
              if (newMessages.length !== prev.length) {
                return newMessages;
              }
              return prev;
            });
          }
        })
        .catch(() => {
          /* silent */
        });
    }, 20000);

    return () => clearInterval(interval);
  }, [conversationId]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || sending) return;

    setSending(true);
    setNewMessage('');

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderId: conversation?.currentUserId ?? '',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        },
      );
      const data = await res.json();
      if (data?.success && data.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMessage.id ? data.data : m)),
        );
      }
    } catch {
      // Remove optimistic message on failure
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimisticMessage.id),
      );
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <ChatSkeleton />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
          Conversation not found
        </h1>
        <p className="mb-6 text-slate-500 dark:text-slate-400">
          This conversation may have been deleted or you don&apos;t have access.
        </p>
        <Link
          href="/messages"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-50 px-10 py-4 text-sm font-bold text-white dark:text-slate-900 shadow-lg shadow-slate-900/10 transition-opacity hover:opacity-90"
        >
          Back to messages
        </Link>
      </div>
    );
  }

  const currentUserId = conversation.currentUserId;

  return (
    <div className="container py-8">
      <div className="mx-auto flex h-[calc(100vh-200px)] max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <Link
            href="/messages"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            aria-label="Back to messages"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
            {conversation.otherUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 dark:text-slate-50">
              {conversation.otherUser.name}
            </p>
            <Link
              href={`/listings/${conversation.listing.slug}`}
              className="text-xs text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              {conversation.listing.title}
            </Link>
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-5 py-6"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">
                No messages yet. Start the conversation below.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message, index) => {
                const isOwn = message.senderId === currentUserId;
                const prevMessage =
                  index > 0 ? messages[index - 1] : undefined;
                const showTime = shouldShowTimestamp(message, prevMessage);
                const isNewSender =
                  !prevMessage || prevMessage.senderId !== message.senderId;

                return (
                  <div key={message.id}>
                    {showTime && (
                      <p className="py-3 text-center text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold">
                        {formatMessageTime(message.createdAt)}
                      </p>
                    )}
                    <div
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isNewSender && !showTime ? 'mt-3' : 'mt-0.5'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${
                          isOwn
                            ? 'rounded-2xl rounded-br-sm bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900'
                            : 'rounded-2xl rounded-bl-sm bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-50/10"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-slate-50 dark:text-slate-900"
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
