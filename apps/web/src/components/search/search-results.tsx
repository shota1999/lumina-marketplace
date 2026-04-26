'use client';

import { AlertTriangle, Loader2, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Listing } from '@lumina/shared';
import { Skeleton } from '@lumina/ui';

import { ListingCard, ListingCardHorizontal } from '@/components/listing/listing-card';
import { ListingMap } from '@/components/map/listing-map';
import { useFavorites } from '@/hooks/use-favorites';

export type ViewMode = 'grid' | 'list' | 'split';

interface PageBatch {
  page: number;
  listings: Listing[];
}

interface SearchResultsProps {
  listings: Listing[];
  batches: PageBatch[];
  totalHits: number;
  isLoading?: boolean;
  error?: Error | null;
  query?: string;
  hasActiveFilters?: boolean;
  view: ViewMode;
  onClearFilters?: () => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onSearchArea?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export function SearchResults({
  listings,
  batches,
  totalHits,
  isLoading,
  error,
  query,
  hasActiveFilters,
  view,
  onClearFilters,
  onBoundsChange,
  onSearchArea,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: SearchResultsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const { toggle: toggleFav, isFavorited } = useFavorites();
  const listRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const splitScrollRef = useRef<HTMLDivElement | null>(null);

  const activeHighlightId = hoveredId ?? focusedId;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !onLoadMore) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const root = view === 'split' ? splitScrollRef.current : null;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            onLoadMore();
          }
        }
      },
      { root, rootMargin: '320px 0px', threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [view, hasNextPage, isFetchingNextPage, onLoadMore]);

  const handleMarkerClick = useCallback((listing: Listing) => {
    setFocusedId(listing.id);
    const el = listRefs.current.get(listing.id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  const handleMarkerHover = useCallback((id: string | null) => {
    setFocusedId(id);
  }, []);

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      listRefs.current.set(id, el);
    } else {
      listRefs.current.delete(id);
    }
  }, []);

  if (isLoading) {
    return <SearchResultsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50/30 py-20 text-center dark:border-red-900/30 dark:bg-red-950/10">
        <div className="mb-5 rounded-full bg-red-100 p-4 dark:bg-red-950/30">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-50">
          Search unavailable
        </h3>
        <p className="mb-8 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {error.message === 'Search failed'
            ? 'The search service is temporarily unavailable. Please try again in a moment.'
            : error.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-95 dark:bg-slate-50 dark:text-slate-900"
        >
          Retry
        </button>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-24 text-center dark:border-slate-800">
        <div className="mb-5 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
          <SearchX className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-50">
          No results found
        </h3>
        <p className="mb-8 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {query
            ? `No listings match "${query}"${hasActiveFilters ? ' with the current filters' : ''}. Try broadening your search.`
            : hasActiveFilters
              ? 'No listings match the current filters. Try removing some filters.'
              : 'Browse our collection by searching above.'}
        </p>
        <div className="flex gap-3">
          {query && (
            <Link
              href="/search"
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-slate-50 dark:hover:bg-slate-800"
            >
              Clear search
            </Link>
          )}
          {hasActiveFilters && onClearFilters && (
            <button
              onClick={onClearFilters}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-95 dark:bg-slate-50 dark:text-slate-900"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    );
  }

  const showSentinel = hasNextPage && !!onLoadMore;

  // Compute the running offset so the divider can show "25 – 30 of 30".
  const runningOffsets: number[] = [];
  let acc = 0;
  for (const b of batches) {
    runningOffsets.push(acc);
    acc += b.listings.length;
  }

  const renderBatchedList = (
    cardRenderer: (listing: Listing, index: number) => React.ReactNode,
    options: { wrapperClass: string; dividerVariant: 'list' | 'grid' },
  ) => (
    <>
      {batches.map((batch, batchIdx) => {
        const startIdx = runningOffsets[batchIdx]!;
        const endIdx = startIdx + batch.listings.length;
        return (
          <div key={`page-${batch.page}`}>
            {batchIdx > 0 && (
              <PageDivider
                page={batch.page}
                from={startIdx + 1}
                to={endIdx}
                total={totalHits}
                variant={options.dividerVariant}
              />
            )}
            <div className={options.wrapperClass}>
              {batch.listings.map((listing, i) => (
                <div
                  key={listing.id}
                  className={batchIdx > 0 ? 'animate-fade-in-up' : undefined}
                  style={
                    batchIdx > 0
                      ? { animationDelay: `${Math.min(i * 30, 360)}ms` }
                      : undefined
                  }
                >
                  {cardRenderer(listing, startIdx + i)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <div>
      {view === 'split' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div
            ref={splitScrollRef}
            className="scrollbar-refined overflow-y-auto pr-2 lg:col-span-7 lg:max-h-[calc(100vh-200px)]"
          >
            {batches.map((batch, batchIdx) => {
              const startIdx = runningOffsets[batchIdx]!;
              const endIdx = startIdx + batch.listings.length;
              return (
                <div key={`page-${batch.page}`}>
                  {batchIdx > 0 && (
                    <PageDivider
                      page={batch.page}
                      from={startIdx + 1}
                      to={endIdx}
                      total={totalHits}
                      variant="list"
                    />
                  )}
                  <div className="space-y-4">
                    {batch.listings.map((listing, i) => (
                      <div
                        key={listing.id}
                        ref={(el) => setCardRef(listing.id, el)}
                        onMouseEnter={() => setHoveredId(listing.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={`rounded-xl transition-all duration-200 ${
                          batchIdx > 0 ? 'animate-fade-in-up' : ''
                        } ${
                          activeHighlightId === listing.id
                            ? 'ring-primary/30 scale-[1.01] shadow-md ring-2'
                            : 'hover:shadow-sm'
                        }`}
                        style={
                          batchIdx > 0
                            ? { animationDelay: `${Math.min(i * 30, 360)}ms` }
                            : undefined
                        }
                      >
                        <ListingCardHorizontal
                          listing={listing}
                          onFavorite={toggleFav}
                          isFavorited={isFavorited(listing.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {isFetchingNextPage && (
              <SkeletonBatch
                nextPage={(batches[batches.length - 1]?.page ?? 0) + 1}
                variant="list"
                count={3}
              />
            )}
            <InfiniteFooter
              sentinelRef={showSentinel ? sentinelRef : undefined}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={onLoadMore}
              loadedCount={listings.length}
              totalHits={totalHits}
              variant="list"
            />
          </div>
          <div className="sticky top-20 h-[calc(100vh-200px)] overflow-hidden rounded-2xl shadow-sm lg:col-span-5">
            <ListingMap
              listings={listings}
              onBoundsChange={onBoundsChange}
              highlightedId={activeHighlightId}
              onMarkerClick={handleMarkerClick}
              onMarkerHover={handleMarkerHover}
              searchThisArea={!!onSearchArea}
              onSearchArea={onSearchArea}
            />
          </div>
        </div>
      ) : view === 'list' ? (
        <>
          {renderBatchedList(
            (listing) => (
              <ListingCardHorizontal
                listing={listing}
                onFavorite={toggleFav}
                isFavorited={isFavorited(listing.id)}
              />
            ),
            { wrapperClass: 'space-y-4', dividerVariant: 'list' },
          )}
          {isFetchingNextPage && (
            <SkeletonBatch
              nextPage={(batches[batches.length - 1]?.page ?? 0) + 1}
              variant="list"
              count={3}
            />
          )}
          <InfiniteFooter
            sentinelRef={showSentinel ? sentinelRef : undefined}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={onLoadMore}
            loadedCount={listings.length}
            totalHits={totalHits}
            variant="list"
          />
        </>
      ) : (
        <>
          {renderBatchedList(
            (listing) => (
              <ListingCard
                listing={listing}
                onFavorite={toggleFav}
                isFavorited={isFavorited(listing.id)}
              />
            ),
            {
              wrapperClass: 'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3',
              dividerVariant: 'grid',
            },
          )}
          {isFetchingNextPage && (
            <SkeletonBatch
              nextPage={(batches[batches.length - 1]?.page ?? 0) + 1}
              variant="grid"
              count={6}
            />
          )}
          <InfiniteFooter
            sentinelRef={showSentinel ? sentinelRef : undefined}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={onLoadMore}
            loadedCount={listings.length}
            totalHits={totalHits}
            variant="grid"
          />
        </>
      )}
    </div>
  );
}

function PageDivider({
  page,
  from,
  to,
  total,
  variant,
}: {
  page: number;
  from: number;
  to: number;
  total: number;
  variant: 'grid' | 'list';
}) {
  return (
    <div
      className={`flex items-center gap-3 ${variant === 'grid' ? 'my-8' : 'my-6'}`}
      role="separator"
      aria-label={`Page ${page}`}
    >
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-700" />
      <div className="flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-sm dark:bg-slate-50 dark:text-slate-900">
        <span>Page {page}</span>
        <span className="text-white/60 dark:text-slate-900/50">·</span>
        <span className="font-mono normal-case tracking-normal">
          {from}–{to} of {total}
        </span>
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-700" />
    </div>
  );
}

function SkeletonBatch({
  nextPage,
  variant,
  count,
}: {
  nextPage: number;
  variant: 'grid' | 'list';
  count: number;
}) {
  return (
    <div>
      <div className={`flex items-center gap-3 ${variant === 'grid' ? 'my-8' : 'my-6'}`}>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-700" />
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Loading page {nextPage}</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-700" />
      </div>
      {variant === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800"
            >
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="space-y-3 px-5 py-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800"
            >
              <Skeleton className="aspect-[4/3] w-48 shrink-0 rounded-xl" />
              <div className="flex flex-1 flex-col justify-center gap-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfiniteFooter({
  sentinelRef,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  loadedCount,
  totalHits,
  variant,
}: {
  sentinelRef?: React.RefObject<HTMLDivElement | null>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore?: () => void;
  loadedCount: number;
  totalHits: number;
  variant: 'grid' | 'list';
}) {
  if (!hasNextPage && !isFetchingNextPage) {
    return (
      <div
        className={`flex flex-col items-center gap-2 ${variant === 'grid' ? 'mt-12' : 'mt-8'}`}
      >
        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          <span className="h-px w-12 bg-slate-200 dark:bg-slate-700" />
          End of results
          <span className="h-px w-12 bg-slate-200 dark:bg-slate-700" />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          You&apos;ve seen all {totalHits.toLocaleString()} results
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      {sentinelRef && <div ref={sentinelRef} aria-hidden className="h-px w-full" />}
      {!isFetchingNextPage && onLoadMore && (
        <>
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-400"
          >
            Load more
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Showing {loadedCount} of {totalHits.toLocaleString()} — keep scrolling for more
          </p>
        </>
      )}
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800"
          >
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="space-y-3 px-5 py-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
