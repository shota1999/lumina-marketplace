import {
  AlertTriangle,
  Building,
  CheckCircle2,
  MoreVertical,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { desc, eq, sql } from 'drizzle-orm';
import { analyticsEvents, getDb, listingImages, listings, users } from '@lumina/db';
import { formatPrice } from '@lumina/shared';

async function getDashboardData() {
  const db = getDb();

  const [listingCount, userCount, eventCount, publishedCount, recentListings] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(listings),
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(analyticsEvents),
    db
      .select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(eq(listings.status, 'published')),
    db
      .select({
        id: listings.id,
        title: listings.title,
        slug: listings.slug,
        status: listings.status,
        pricePerNight: listings.pricePerNight,
        currency: listings.currency,
        category: listings.category,
        hostId: listings.hostId,
        imageUrl: listingImages.url,
      })
      .from(listings)
      .leftJoin(
        listingImages,
        sql`${listingImages.listingId} = ${listings.id} AND ${listingImages.isPrimary} = true`,
      )
      .orderBy(desc(listings.updatedAt))
      .limit(5),
  ]);

  // Get host names for the listings
  const hostIds = [...new Set(recentListings.map((l) => l.hostId))];
  let hostMap: Record<string, string> = {};
  if (hostIds.length > 0) {
    const hosts = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(sql`${users.id} IN ${hostIds}`);
    hostMap = Object.fromEntries(hosts.map((h) => [h.id, h.name]));
  }

  return {
    totalListings: Number(listingCount[0]?.count ?? 0),
    publishedCount: Number(publishedCount[0]?.count ?? 0),
    userCount: Number(userCount[0]?.count ?? 0),
    eventCount: Number(eventCount[0]?.count ?? 0),
    recentListings: recentListings.map((l) => ({
      ...l,
      hostName: hostMap[l.hostId] ?? 'Unknown',
    })),
  };
}

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n.toLocaleString();
  return String(n);
}

export default async function AdminDashboard() {
  const data = await getDashboardData();

  const stats = [
    {
      label: 'Total Listings',
      value: formatLargeNumber(data.totalListings),
      icon: Building,
      badge: '+12%',
      badgeStyle: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      label: 'Published',
      value: formatLargeNumber(data.publishedCount),
      icon: CheckCircle2,
      badge: 'Stable',
      badgeStyle: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    },
    {
      label: 'Active Users',
      value: formatLargeNumber(data.userCount),
      icon: Users,
      badge: `+${Math.floor(data.userCount * 0.05)}`,
      badgeStyle: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      label: 'Events Tracked',
      value: formatLargeNumber(data.eventCount),
      icon: TrendingUp,
      badge: data.eventCount > 100_000 ? 'High' : 'Normal',
      badgeStyle:
        data.eventCount > 100_000
          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    },
  ];

  return (
    <>
      {/* Stats Grid */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl bg-white p-6 transition-all duration-300 hover:-translate-y-1 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                  <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                </div>
                <span className={`rounded px-2 py-1 text-xs font-bold ${stat.badgeStyle}`}>
                  {stat.badge}
                </span>
              </div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500/70 dark:text-slate-400/70">
                {stat.label}
              </p>
              <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {stat.value}
              </h3>
            </div>
          );
        })}
      </section>

      {/* Data Visualization + Activity */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Revenue Chart */}
        <div className="flex min-h-[400px] flex-col rounded-xl bg-slate-50 p-8 lg:col-span-8 dark:bg-slate-800/50">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                Revenue Performance
              </h4>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Monthly growth across premium rental categories
              </p>
            </div>
            <button className="rounded-lg bg-white px-4 py-2 text-xs font-bold shadow-sm transition-colors hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700">
              Export Report
            </button>
          </div>
          <div className="flex flex-1 items-end justify-between gap-4 px-4 pb-4">
            {[
              { height: '40%', fill: '80%', label: '$12k' },
              { height: '65%', fill: '70%', label: '$18k' },
              { height: '85%', fill: '90%', label: '$24k' },
              { height: '45%', fill: '60%', label: '$14k' },
              { height: '95%', fill: '100%', label: '$28k' },
              { height: '75%', fill: '85%', label: '$22k' },
            ].map((bar, i) => (
              <div
                key={i}
                className="group relative w-full rounded-t-lg bg-slate-200/50 transition-all hover:bg-slate-900/10 dark:bg-slate-700/50"
                style={{ height: bar.height }}
              >
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t-lg bg-slate-900 opacity-80 group-hover:opacity-100 dark:bg-slate-300"
                  style={{ height: bar.fill }}
                />
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100">
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between px-4 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl bg-white p-8 shadow-sm lg:col-span-4 dark:bg-slate-900">
          <h4 className="mb-8 text-lg font-bold text-slate-900 dark:text-slate-50">
            Recent Activity
          </h4>
          <div className="space-y-8">
            <ActivityItem
              icon={<Building className="h-5 w-5 text-slate-600 dark:text-slate-300" />}
              iconBg="bg-slate-100 dark:bg-slate-800"
              title="New Listing Published"
              subtitle="Aegean Azure Villa • 2m ago"
            />
            <ActivityItem
              icon={<UserPlus className="h-5 w-5 text-slate-600 dark:text-slate-300" />}
              iconBg="bg-slate-100 dark:bg-slate-800"
              title="New User Registration"
              subtitle="Sarah Mitchell • 15m ago"
            />
            <ActivityItem
              icon={<CheckCircle2 className="h-5 w-5 text-slate-600 dark:text-slate-300" />}
              iconBg="bg-slate-100 dark:bg-slate-800"
              title="Identity Verified"
              subtitle="Mark Thompson • 1h ago"
            />
            <ActivityItem
              icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
              iconBg="bg-red-50 dark:bg-red-950/30"
              title="Listing Flagged"
              subtitle="Policy violation: Beach Villa • 3h ago"
            />
          </div>
          <Link
            href="/admin/analytics"
            className="mt-10 block w-full rounded-lg py-3 text-center text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            View All Logs
          </Link>
        </div>
      </section>

      {/* Listings Table */}
      <section className="overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between bg-white/50 px-8 py-6 backdrop-blur-sm dark:bg-slate-900/50">
          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            Active Listings Portfolio
          </h4>
          <Link
            href="/admin/listings"
            className="text-xs font-bold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left">
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Property
                </th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Status
                </th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Rate
                </th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Owner
                </th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/30 dark:bg-slate-900/30">
              {data.recentListings.map((listing) => (
                <tr
                  key={listing.id}
                  className="transition-colors hover:bg-white/60 dark:hover:bg-slate-900/60"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-16 overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
                        {listing.imageUrl ? (
                          <Image
                            src={listing.imageUrl}
                            alt={listing.title}
                            width={64}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            N/A
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/listings/${listing.slug}`}
                        className="text-sm font-semibold text-slate-900 hover:underline dark:text-slate-50"
                      >
                        {listing.title}
                      </Link>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <StatusBadge status={listing.status} />
                  </td>
                  <td className="px-8 py-6 text-sm font-medium text-slate-900 dark:text-slate-50">
                    {formatPrice(Number(listing.pricePerNight), listing.currency)}/night
                  </td>
                  <td className="px-8 py-6 text-sm text-slate-500 dark:text-slate-400">
                    {listing.hostName}
                  </td>
                  <td className="px-8 py-6">
                    <button className="text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-slate-50">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {data.recentListings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-sm text-slate-400">
                    No listings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ActivityItem({
  icon,
  iconBg,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex gap-4">
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    draft: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    archived: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  const labels: Record<string, string> = {
    published: 'LIVE',
    draft: 'DRAFT',
    archived: 'ARCHIVED',
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[10px] font-bold ${styles[status] ?? styles.draft}`}
    >
      {labels[status] ?? status.toUpperCase()}
    </span>
  );
}
