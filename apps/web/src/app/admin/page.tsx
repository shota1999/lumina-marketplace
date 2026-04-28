import { ImageOff } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { desc, sql } from 'drizzle-orm';
import { getDb, listingImages, listings, users } from '@lumina/db';
import { formatPrice } from '@lumina/shared';

import { DashboardOverview } from './dashboard-overview';

async function getRecentListings() {
  const db = getDb();
  const recentListings = await db
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
    .limit(5);

  const hostIds = [...new Set(recentListings.map((l) => l.hostId))];
  let hostMap: Record<string, string> = {};
  if (hostIds.length > 0) {
    const hosts = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(sql`${users.id} IN ${hostIds}`);
    hostMap = Object.fromEntries(hosts.map((h) => [h.id, h.name]));
  }

  return recentListings.map((l) => ({ ...l, hostName: hostMap[l.hostId] ?? 'Unknown' }));
}

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const recentListings = await getRecentListings();

  return (
    <>
      {/* Live overview (stats + revenue + activity feed, all from /api/admin/overview) */}
      <DashboardOverview />

      {/* Recently updated listings — server-rendered for SEO/perf */}
      <section className="overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between bg-white/50 px-8 py-6 backdrop-blur-sm dark:bg-slate-900/50">
          <div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Recently updated listings
            </h4>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Latest changes from hosts across the marketplace
            </p>
          </div>
          <Link
            href="/admin/listings"
            className="text-xs font-bold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            Manage all →
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
                  Host
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/30 dark:bg-slate-900/30">
              {recentListings.map((listing) => (
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
                            <ImageOff className="h-4 w-4" />
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
                </tr>
              ))}
              {recentListings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-sm text-slate-400">
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    draft: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };

  const labels: Record<string, string> = {
    published: 'LIVE',
    draft: 'DRAFT',
    archived: 'ARCHIVED',
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[10px] font-bold ${styles[status] ?? styles['draft']}`}
    >
      {labels[status] ?? status.toUpperCase()}
    </span>
  );
}
