'use client';

import { Building, Calendar, DollarSign, LayoutDashboard, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

import { RoleNav, type RoleNavTab } from './role-nav';

const TABS: RoleNavTab[] = [
  { href: '/host/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/host/listings', label: 'Listings', icon: Building },
  { href: '/host/bookings', label: 'Bookings', icon: Calendar },
  { href: '/host/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
];

export function HostNav() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [pendingBookings, setPendingBookings] = useState<number | undefined>(undefined);

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

    fetch('/api/host/bookings?status=pending', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.success) {
          setPendingBookings(Array.isArray(data.data) ? data.data.length : undefined);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const tabsWithBadge = TABS.map((tab) =>
    tab.href === '/host/bookings' && pendingBookings ? { ...tab, badge: pendingBookings } : tab,
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
      title={`Welcome back, ${user.name.split(' ')[0]}`}
      subtitle="Manage your listings, calendar, and earnings — all in one place."
      accent="host"
      tabs={tabsWithBadge}
    />
  );
}
