import {
  ArrowUpRight,
  BarChart3,
  Eye,
  Globe,
  Heart,
  MousePointerClick,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';

import { desc, eq, gte, sql } from 'drizzle-orm';

import { analyticsEvents, getDb, listings } from '@lumina/db';

import { ConversionFunnelChart, EventDistributionChart, EventTrendChart } from './analytics-charts';
import { ExportButton } from './export-button';

const EVENT_LABELS: Record<string, { label: string; icon: typeof Eye }> = {
  listing_view: { label: 'Property View', icon: Eye },
  favorite_add: { label: 'Wishlist Add', icon: Heart },
  conversion: { label: 'Booking Initiation', icon: MousePointerClick },
  listing_click: { label: 'Inquiry Sent', icon: Send },
  compare_add: { label: 'Share Listing', icon: Share2 },
};

const PIE_COLORS = ['#0f172a', '#2563eb', '#16a34a', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

export default async function AdminAnalyticsPage() {
  const db = getDb();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [eventsByType, recentEvents, regionActivity, dailyTrend] = await Promise.all([
    db
      .select({
        type: analyticsEvents.type,
        count: sql<number>`count(*)`,
      })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.createdAt, sevenDaysAgo))
      .groupBy(analyticsEvents.type)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        id: analyticsEvents.id,
        type: analyticsEvents.type,
        createdAt: analyticsEvents.createdAt,
        data: analyticsEvents.data,
      })
      .from(analyticsEvents)
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(5),
    db
      .select({
        country: listings.country,
        city: listings.city,
        count: sql<number>`count(*)`,
      })
      .from(analyticsEvents)
      .innerJoin(
        listings,
        eq(listings.id, sql`(${analyticsEvents.data}->>'listingId')::uuid`),
      )
      .where(gte(analyticsEvents.createdAt, sevenDaysAgo))
      .groupBy(listings.country, listings.city)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    // Daily time-series for last 30 days
    db
      .select({
        day: sql<string>`to_char(${analyticsEvents.createdAt}, 'YYYY-MM-DD')`,
        total: sql<number>`count(*)`,
        conversions: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'conversion')`,
        searches: sql<number>`count(*) filter (where ${analyticsEvents.type} = 'search')`,
      })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.createdAt, thirtyDaysAgo))
      .groupBy(sql`to_char(${analyticsEvents.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${analyticsEvents.createdAt}, 'YYYY-MM-DD')`),
  ]);

  const totalEvents = eventsByType.reduce((sum, e) => sum + Number(e.count), 0);
  const searchCount = Number(eventsByType.find((e) => e.type === 'search')?.count ?? 0);
  const conversionCount = Number(eventsByType.find((e) => e.type === 'conversion')?.count ?? 0);
  const conversionRate = totalEvents > 0 ? ((conversionCount / totalEvents) * 100).toFixed(1) : '0';

  // Build daily trend data for chart
  const trendData = dailyTrend.map((d) => ({
    date: d.day.slice(5), // MM-DD
    events: Number(d.total),
    conversions: Number(d.conversions),
    searches: Number(d.searches),
  }));

  // Build bars for "Events by type" — pick top 5 known types
  const maxCount = eventsByType.length > 0 ? Number(eventsByType[0]!.count) : 1;
  const bars = Object.entries(EVENT_LABELS).map(([type, meta]) => {
    const found = eventsByType.find((e) => e.type === type);
    const count = Number(found?.count ?? 0);
    const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
    return { ...meta, type, count, pct };
  });

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Last 7 days performance
          </p>
        </div>
        <ExportButton data={bars.map((b) => ({ type: b.type, label: b.label, count: b.count }))} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          label="Total Events"
          value={totalEvents.toLocaleString()}
          badge="+12%"
          badgePositive
          icon={BarChart3}
        />
        <StatCard
          label="Searches"
          value={searchCount.toLocaleString()}
          badge="+8.4%"
          badgePositive
          icon={Search}
        />
        <div className="rounded-xl bg-slate-900 p-6 dark:bg-slate-50">
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-white/10 p-2 dark:bg-slate-900/10">
              <TrendingUp className="h-5 w-5 text-white dark:text-slate-900" />
            </div>
            <span className="rounded bg-white/20 px-2 py-1 text-xs font-bold text-white dark:bg-slate-900/20 dark:text-slate-900">
              +0.5%
            </span>
          </div>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/50 dark:text-slate-900/50">
            Conversions
          </p>
          <h3 className="text-3xl font-bold tracking-tight text-white dark:text-slate-900">
            {conversionRate}%
          </h3>
        </div>
      </div>

      {/* Events by Type + Live Activity */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Events by Type */}
        <div className="rounded-xl bg-white p-8 shadow-sm lg:col-span-8 dark:bg-slate-900">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                Events by Type
              </h4>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Distribution of tracked interactions
              </p>
            </div>
            <button className="rounded-lg bg-slate-50 px-4 py-2 text-xs font-bold shadow-sm transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700">
              View Details
            </button>
          </div>
          <div className="space-y-6">
            {bars.map((bar) => {
              const Icon = bar.icon;
              return (
                <div key={bar.type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-slate-50 p-1.5 dark:bg-slate-800">
                        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {bar.label}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                      {bar.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-slate-900 transition-all dark:bg-slate-300"
                      style={{ width: `${Math.max(bar.pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {eventsByType.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-400">
                No events recorded yet.
              </p>
            )}
          </div>
        </div>

        {/* Live Activity */}
        <div className="rounded-xl bg-white p-8 shadow-sm lg:col-span-4 dark:bg-slate-900">
          <div className="mb-8 flex items-center justify-between">
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Live Activity
            </h4>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>
          </div>
          <div className="space-y-6">
            {recentEvents.length > 0 ? (
              recentEvents.map((event) => (
                <ActivityItem
                  key={event.id}
                  type={event.type}
                  createdAt={event.createdAt}
                />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No recent activity.</p>
            )}
          </div>
        </div>
      </section>

      {/* Regional Activity */}
      <section className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-900">
        <div className="flex items-center justify-between px-8 py-6">
          <div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Regional Activity
            </h4>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Listing interactions by location — last 7 days
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Globe className="h-3.5 w-3.5" />
            Live
          </div>
        </div>
        <div className="px-8 pb-8">
          {regionActivity.length > 0 ? (
            <div className="space-y-4">
              {(() => {
                const maxRegionCount = Number(regionActivity[0]!.count);
                return regionActivity.map((region) => {
                  const pct = Math.round((Number(region.count) / maxRegionCount) * 100);
                  return (
                    <div key={`${region.country}-${region.city}`} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800">
                            <Globe className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                              {region.city}
                            </span>
                            <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                              {region.country}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                          {Number(region.count).toLocaleString()}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-slate-900 transition-all dark:bg-slate-300"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="text-center">
                <Globe className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  No regional data yet
                </p>
                <p className="mt-1 text-xs text-slate-400/60 dark:text-slate-500/60">
                  Geographic data will populate as listing interactions are tracked
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Recharts — Time Series + Funnel + Pie */}
      <EventTrendChart data={trendData} />

      <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ConversionFunnelChart
          data={[
            { name: 'Listing Views', value: Number(eventsByType.find((e) => e.type === 'listing_view')?.count ?? 0), fill: '#0f172a' },
            { name: 'Favorites', value: Number(eventsByType.find((e) => e.type === 'favorite_add')?.count ?? 0), fill: '#2563eb' },
            { name: 'Inquiries', value: Number(eventsByType.find((e) => e.type === 'listing_click')?.count ?? 0), fill: '#f59e0b' },
            { name: 'Bookings', value: conversionCount, fill: '#16a34a' },
          ]}
        />
        <EventDistributionChart
          data={eventsByType.slice(0, 7).map((e, i) => ({
            name: EVENT_LABELS[e.type]?.label ?? e.type.replace(/_/g, ' '),
            value: Number(e.count),
            fill: PIE_COLORS[i % PIE_COLORS.length]!,
          }))}
        />
      </section>
    </>
  );
}

function StatCard({
  label,
  value,
  badge,
  badgePositive,
  icon: Icon,
}: {
  label: string;
  value: string;
  badge: string;
  badgePositive?: boolean;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
          <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </div>
        <span
          className={`rounded px-2 py-1 text-xs font-bold ${
            badgePositive
              ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500/70 dark:text-slate-400/70">
        {label}
      </p>
      <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        {value}
      </h3>
    </div>
  );
}

const ACTIVITY_META: Record<string, { label: string; icon: typeof Eye; iconBg: string }> = {
  conversion: {
    label: 'New Booking',
    icon: MousePointerClick,
    iconBg: 'bg-green-50 dark:bg-green-950/30',
  },
  search: {
    label: 'Search Performed',
    icon: Search,
    iconBg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  listing_view: {
    label: 'Property Viewed',
    icon: Eye,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
  },
  listing_click: {
    label: 'Listing Clicked',
    icon: ArrowUpRight,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
  },
  favorite_add: {
    label: 'Added to Wishlist',
    icon: Heart,
    iconBg: 'bg-rose-50 dark:bg-rose-950/30',
  },
  favorite_remove: {
    label: 'Removed from Wishlist',
    icon: Heart,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
  },
  filter_apply: {
    label: 'Filter Applied',
    icon: SlidersHorizontal,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
  },
  compare_add: {
    label: 'Added to Compare',
    icon: Share2,
    iconBg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  compare_remove: {
    label: 'Removed from Compare',
    icon: Share2,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
  },
};

function ActivityItem({ type, createdAt }: { type: string; createdAt: Date }) {
  const meta = ACTIVITY_META[type] ?? {
    label: type.replace(/_/g, ' '),
    icon: BarChart3,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
  };
  const Icon = meta.icon;
  const timeAgo = getTimeAgo(createdAt);

  return (
    <div className="flex gap-4">
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${meta.iconBg}`}
      >
        <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
          {meta.label}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{timeAgo}</p>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}
