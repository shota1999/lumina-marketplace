'use client';

import {
  CheckCircle2,
  DollarSign,
  Inbox,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Star,
  Wallet,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Button, Skeleton } from '@lumina/ui';

import { toast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  data?: Record<string, unknown>;
}

const iconMap: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  booking_confirmed: {
    icon: CheckCircle2,
    bg: 'bg-green-100 dark:bg-green-950/30',
    color: 'text-green-600 dark:text-green-400',
  },
  booking_cancelled: {
    icon: XCircle,
    bg: 'bg-red-100 dark:bg-red-950/30',
    color: 'text-red-600 dark:text-red-400',
  },
  new_message: {
    icon: MessageSquare,
    bg: 'bg-blue-100 dark:bg-blue-950/30',
    color: 'text-blue-600 dark:text-blue-400',
  },
  new_review: {
    icon: Star,
    bg: 'bg-amber-100 dark:bg-amber-950/30',
    color: 'text-amber-600 dark:text-amber-400',
  },
  payment_received: {
    icon: DollarSign,
    bg: 'bg-emerald-100 dark:bg-emerald-950/30',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  payout_sent: {
    icon: Wallet,
    bg: 'bg-purple-100 dark:bg-purple-950/30',
    color: 'text-purple-600 dark:text-purple-400',
  },
  verification_update: {
    icon: ShieldCheck,
    bg: 'bg-slate-100 dark:bg-slate-800',
    color: 'text-slate-600 dark:text-slate-400',
  },
};

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getNavigationPath(notification: Notification): string {
  const data = notification.data ?? {};
  switch (notification.type) {
    case 'booking_confirmed':
    case 'booking_cancelled':
      return data.bookingId ? `/bookings` : '/bookings';
    case 'new_message':
      return data.conversationId ? `/messages/${data.conversationId}` : '/messages';
    case 'new_review':
      return data.listingSlug ? `/listings/${data.listingSlug}` : '/host/listings';
    case 'payment_received':
    case 'payout_sent':
      return '/host/earnings';
    case 'verification_update':
      return '/account/verification';
    default:
      return '/notifications';
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setNotifications(data.data ?? []);
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'Failed to load notifications',
          variant: 'destructive',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
      const data = await res.json();
      if (res.ok && data?.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
        );
        toast({ title: 'All notifications marked as read' });
      }
    } catch {
      toast({ title: 'Error', description: 'Could not mark all as read', variant: 'destructive' });
    } finally {
      setMarkingAll(false);
    }
  }, []);

  const handleClick = useCallback(async (notification: Notification) => {
    if (!notification.readAt) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, { method: 'PATCH' });
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        );
      } catch {
        // silently fail — navigation still works
      }
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (loading) {
    return (
      <div className="container max-w-2xl py-8">
        <Skeleton className="mb-2 h-10 w-56" />
        <Skeleton className="mb-8 h-5 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-slate-500">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markingAll}>
            {markingAll ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-20 text-center dark:border-slate-800">
          <Inbox className="mb-4 h-12 w-12 text-slate-400" />
          <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
            All caught up!
          </h2>
          <p className="text-sm text-slate-400">No notifications to display right now.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const meta = iconMap[notification.type] ?? iconMap.verification_update!;
            const Icon = meta.icon;
            const path = getNavigationPath(notification);

            return (
              <Link
                key={notification.id}
                href={path}
                onClick={() => handleClick(notification)}
                className="group flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md hover:ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
              >
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
                >
                  <Icon className={`h-5 w-5 ${meta.color}`} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    {notification.title}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {notification.body}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {getTimeAgo(notification.createdAt)}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notification.readAt && (
                  <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
