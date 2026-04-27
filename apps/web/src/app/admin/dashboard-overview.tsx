'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  Building,
  CalendarCheck,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Skeleton } from '@lumina/ui';

interface OverviewData {
  stats: {
    listings: { total: number; published: number; last30: number; delta: number | null };
    users: { total: number; last30: number; delta: number | null };
    events: { total: number; last30: number; delta: number | null };
    bookings: { total: number; confirmed: number; pending: number; last30: number };
    pendingVerifications: number;
  };
  revenue: {
    series: Array<{ month: string; label: string; gross: number; refunded: number; net: number; count: number }>;
    totalGross: number;
    totalNet: number;
    totalRefunded: number;
  };
  activity: Array<{
    id: string;
    kind: 'listing' | 'user' | 'booking';
    title: string;
    subtitle: string;
    href: string;
    createdAt: string;
  }>;
}

const ACTIVITY_META: Record<OverviewData['activity'][number]['kind'], { icon: typeof Building; bg: string }> = {
  listing: { icon: Building, bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  user: { icon: UserPlus, bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  booking: { icon: CalendarCheck, bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
};

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n.toLocaleString();
  return String(n);
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        New
      </span>
    );
  }
  const positive = value >= 0;
  return (
    <span
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-bold ${
        positive
          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {positive ? '+' : ''}
      {value}%
    </span>
  );
}

export function DashboardOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/admin/overview', { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled) {
          if (json.success) setData(json.data);
          else setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (loading && !data) {
    return (
      <>
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </section>
        <section className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <Skeleton className="h-[400px] rounded-xl lg:col-span-8" />
          <Skeleton className="h-[400px] rounded-xl lg:col-span-4" />
        </section>
      </>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
        Failed to load overview data. Try refreshing the page.
      </div>
    );
  }

  const { stats, revenue, activity } = data;

  const statCards = [
    {
      label: 'Total Listings',
      value: formatLargeNumber(stats.listings.total),
      sub: `${stats.listings.published} live`,
      icon: Building,
      delta: stats.listings.delta,
    },
    {
      label: 'Active Users',
      value: formatLargeNumber(stats.users.total),
      sub: `${stats.users.last30} new in 30d`,
      icon: Users,
      delta: stats.users.delta,
    },
    {
      label: 'Confirmed Bookings',
      value: formatLargeNumber(stats.bookings.confirmed),
      sub: `${stats.bookings.pending} pending`,
      icon: CheckCircle2,
      delta: null,
      pending: stats.bookings.pending > 0,
    },
    {
      label: 'Events Tracked',
      value: formatLargeNumber(stats.events.total),
      sub: `${formatLargeNumber(stats.events.last30)} in 30d`,
      icon: TrendingUp,
      delta: stats.events.delta,
    },
  ];

  return (
    <>
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                  <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                </div>
                {stat.delta !== undefined && stat.delta !== null ? (
                  <DeltaBadge value={stat.delta} />
                ) : stat.pending ? (
                  <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    Action needed
                  </span>
                ) : (
                  <DeltaBadge value={stat.delta ?? null} />
                )}
              </div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500/70 dark:text-slate-400/70">
                {stat.label}
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {stat.value}
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{stat.sub}</p>
            </div>
          );
        })}
      </section>

      {stats.pendingVerifications > 0 && (
        <Link
          href="/admin/verifications"
          className="flex items-center justify-between rounded-xl border border-amber-200/70 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-amber-900/30 dark:from-amber-950/30 dark:to-orange-950/20"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/40">
              <ShieldCheck className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {stats.pendingVerifications} verification{stats.pendingVerifications === 1 ? '' : 's'} awaiting review
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/70">
                Click to approve or reject pending host identity submissions
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-5 w-5 text-amber-700 dark:text-amber-300" />
        </Link>
      )}

      <section className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="flex min-h-[400px] flex-col rounded-xl bg-white p-8 shadow-sm lg:col-span-8 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">Revenue · last 6 months</h4>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Net of refunds — succeeded payments only
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                {formatCurrency(revenue.totalNet)}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                gross {formatCurrency(revenue.totalGross)}
                {revenue.totalRefunded > 0 ? ` · refunded ${formatCurrency(revenue.totalRefunded)}` : ''}
              </p>
            </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenue.series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => formatCurrency(Number(v))} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => formatCurrency(Number(v ?? 0))}
                />
                <Area type="monotone" dataKey="net" stroke="#0f172a" strokeWidth={2} fill="url(#revGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm lg:col-span-4 dark:bg-slate-900">
          <div className="mb-8 flex items-center justify-between">
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">Recent Activity</h4>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>
          </div>
          <div className="space-y-6">
            {activity.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No activity yet.</p>
            ) : (
              activity.map((item) => {
                const meta = ACTIVITY_META[item.kind];
                const Icon = meta.icon;
                return (
                  <Link key={item.id} href={item.href} className="flex gap-4 transition-opacity hover:opacity-80">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{item.title}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {timeAgo(item.createdAt)}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>
    </>
  );
}
