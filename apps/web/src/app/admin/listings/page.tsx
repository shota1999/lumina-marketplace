'use client';

import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  MoreVertical,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Skeleton } from '@lumina/ui';

import { toast } from '@/hooks/use-toast';

interface AdminListing {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string;
  featured: boolean;
  pricePerNight: string;
  currency: string;
  updatedAt: string;
  images: { url: string; alt: string; isPrimary: boolean }[];
}

interface PaginatedResponse {
  data: AdminListing[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const fetchListings = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/listings?page=${p}&limit=${pageSize}`);
        const json = await res.json();
        const data = json.data as PaginatedResponse | undefined;
        setListings(data?.data ?? []);
        setTotal(data?.total ?? 0);
        setPage(data?.page ?? p);
      } catch {
        setListings([]);
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    fetchListings(1);
  }, [fetchListings]);

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await fetch('/api/admin/reindex', { method: 'POST' });
      toast({ title: 'Reindex triggered', description: 'Search index rebuild has started.' });
    } catch {
      toast({ title: 'Reindex failed', variant: 'destructive' });
    } finally {
      setReindexing(false);
    }
  };

  const toggleFeatured = async (id: string, featured: boolean) => {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, featured: !featured } : l)));
    try {
      const res = await fetch('/api/admin/listings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, featured: !featured }),
      });
      const json = await res.json();
      if (!json.success) {
        setListings((prev) => prev.map((l) => (l.id === id ? { ...l, featured } : l)));
        toast({
          title: 'Could not update',
          description: json.error?.message ?? 'Action blocked',
          variant: 'destructive',
        });
      }
    } catch {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, featured } : l)));
    }
  };

  const togglePublished = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: nextStatus } : l)));
    try {
      const res = await fetch('/api/admin/listings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const json = await res.json();
      if (!json.success) {
        setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: currentStatus } : l)));
        toast({
          title: 'Could not change status',
          description: json.error?.message ?? 'Action blocked',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: nextStatus === 'published' ? 'Listing published' : 'Listing unpublished',
        description: 'Search index will refresh shortly.',
      });
    } catch {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: currentStatus } : l)));
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  // Filter by search query client-side
  const filtered = searchQuery
    ? listings.filter(
        (l) =>
          l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : listings;

  // Stats
  const publishedCount = listings.filter((l) => l.status === 'published').length;
  const draftCount = listings.filter((l) => l.status === 'draft').length;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <StatCard label="Total Assets" value={total.toLocaleString()} />
        <StatCard label="Active Now" value={publishedCount.toLocaleString()} />
        <StatCard
          label="Pending Approval"
          value={draftCount.toLocaleString()}
          valueColor={draftCount > 0 ? 'text-red-500' : undefined}
        />
        <StatCard label="This Page" value={`${filtered.length} of ${listings.length}`} />
      </div>

      {/* Search + Reindex bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border-none bg-slate-50 py-2.5 pl-10 pr-4 text-sm transition-all focus:ring-2 focus:ring-slate-900/10 sm:w-80 dark:bg-slate-800 dark:text-slate-50"
          />
        </div>
        <button
          onClick={handleReindex}
          disabled={reindexing}
          className="flex items-center gap-2 rounded-lg bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-100 active:scale-95 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700"
        >
          <RefreshCw className={`h-4 w-4 ${reindexing ? 'animate-spin' : ''}`} />
          {reindexing ? 'Reindexing...' : 'Trigger Reindex'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="space-y-0 divide-y divide-slate-50 dark:divide-slate-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-5">
                <Skeleton className="h-12 w-16 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-6 w-11" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-20 text-center text-sm text-slate-400">
            {searchQuery ? 'No listings match your search.' : 'No listings yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Asset Detail
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Category
                  </th>
                  <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Featured
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Pricing
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filtered.map((listing) => {
                  const primaryImage =
                    listing.images?.find((img) => img.isPrimary) ?? listing.images?.[0];
                  return (
                    <tr
                      key={listing.id}
                      className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                            {primaryImage ? (
                              <Image
                                src={primaryImage.url}
                                alt={primaryImage.alt || listing.title}
                                width={64}
                                height={48}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ImageOff className="h-4 w-4 text-slate-300" />
                              </div>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/listings/${listing.slug}`}
                              className="font-bold text-slate-900 hover:underline dark:text-slate-50"
                            >
                              {listing.title}
                            </Link>
                            <p className="text-[11px] text-slate-400">
                              ID: {listing.id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={listing.status} />
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center rounded-md border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          {listing.category}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => toggleFeatured(listing.id, listing.featured)}
                          className="inline-flex items-center justify-center transition-transform hover:scale-110"
                          title={listing.featured ? 'Remove from featured' : 'Mark as featured'}
                        >
                          <Star
                            className={`h-5 w-5 ${
                              listing.featured
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200 dark:text-slate-600'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-bold text-slate-900 dark:text-slate-50">
                          ${Number(listing.pricePerNight).toLocaleString()}
                          <span className="text-[10px] font-medium italic text-slate-400">
                            /night
                          </span>
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => togglePublished(listing.id, listing.status)}
                            title={listing.status === 'published' ? 'Unpublish' : 'Publish'}
                            className="relative inline-flex cursor-pointer items-center"
                          >
                            <input
                              type="checkbox"
                              checked={listing.status === 'published'}
                              readOnly
                              className="peer sr-only"
                            />
                            <span className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-slate-900 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700 dark:peer-checked:bg-slate-300" />
                          </button>
                          <Link
                            href={`/listings/${listing.slug}`}
                            className="text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-slate-50"
                            title="View on site"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > pageSize && (
          <div className="flex items-center justify-between border-t border-slate-50 bg-slate-50/30 px-6 py-6 dark:border-slate-800 dark:bg-slate-800/30">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of{' '}
              {total.toLocaleString()} listings
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchListings(page - 1)}
                disabled={page <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:bg-white disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-2 text-slate-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => fetchListings(p as number)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold transition-all ${
                      p === page
                        ? 'bg-slate-900 text-white shadow-md dark:bg-slate-50 dark:text-slate-900'
                        : 'border border-slate-200 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                onClick={() => fetchListings(page + 1)}
                disabled={page >= totalPages}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:bg-white disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <h3 className={`text-2xl font-black ${valueColor ?? 'text-slate-900 dark:text-slate-50'}`}>
        {value}
      </h3>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    draft: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
        styles[status] ?? styles.draft
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');

  pages.push(total);
  return pages;
}
