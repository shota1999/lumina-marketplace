'use client';

import {
  Bell,
  Bookmark,
  Calendar,
  Heart,
  ListChecks,
  MessageSquare,
  User as UserIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { RoleNav, type RoleNavTab } from './role-nav';

const TABS: RoleNavTab[] = [
  { href: '/account', label: 'Profile', icon: UserIcon, exact: true },
  { href: '/bookings', label: 'Trips', icon: Calendar },
  { href: '/favorites', label: 'Favorites', icon: Heart },
  { href: '/wishlists', label: 'Wishlists', icon: Bookmark },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/notifications', label: 'Inbox', icon: Bell },
  { href: '/account/verification', label: 'Verify', icon: ListChecks },
];

export function GuestNav() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [unread, setUnread] = useState<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.success) {
          setUser({ name: data.data.name, email: data.data.email });
        }
      })
      .catch(() => {});

    fetch('/api/notifications/unread-count', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.success && typeof data.data?.count === 'number') {
          setUnread(data.data.count);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const tabsWithBadge = TABS.map((tab) =>
    tab.href === '/notifications' && unread ? { ...tab, badge: unread } : tab,
  );

  if (!user) {
    return (
      <div className="border-b border-slate-200/60 bg-white/70 px-6 pt-8 pb-12 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70 lg:px-10">
        <div className="mx-auto h-32 max-w-7xl animate-pulse rounded-2xl bg-slate-100/60 dark:bg-slate-800/40" />
      </div>
    );
  }

  return (
    <RoleNav
      title={`Hi, ${user.name.split(' ')[0]}`}
      subtitle="Manage your trips, favorites, and account preferences."
      accent="guest"
      tabs={tabsWithBadge}
    />
  );
}
