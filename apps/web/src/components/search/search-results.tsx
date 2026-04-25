'use client';

import { AlertTriangle, LayoutGrid, List, Loader2, MapIcon, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';

import type { Listing } from '@lumina/shared';
import { Skeleton } from '@lumina/ui';

import { ListingCard, ListingCardHorizontal } from '@/components/listing/listing-card';
import { ListingMap } from '@/components/map/listing-map';
import { useFavorites } from '@/hooks/use-favorites';

type ViewMode = 'grid' | 'list' | 'split';

interface SearchResultsProps {
  listings: Listing[];
  totalHits: number;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
  processingTimeMs?: number;
  query?: string;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onSearchArea?: (bounds: { north: number; south: number; east: number; west: number }) => void;
}

export function SearchResults({
  listings,
  totalHits,
  isLoading,
  isFetching,
  error,
  processingTimeMs,
  query,
  hasActiveFilters,
  onClearFilters,
  onBoundsChange,
  onSearchArea,
}: SearchResultsProps) {
  const [view, setView] = useState<ViewMode>('split');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const { toggle: toggleFav, isFavorited } = useFavorites();
  const listRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const activeHighlightId = hoveredId ?? focusedId;

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
        <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-50">Search unavailable</h3>
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
        <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-50">No results found</h3>
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

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-900 dark:text-slate-50">{totalHits.toLocaleString()}</span>{' '}
            result{totalHits !== 1 ? 's' : ''}
          </p>
          {processingTimeMs !== undefined && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400 dark:bg-slate-800">
              {processingTimeMs}ms
            </span>
          )}
          {isFetching && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <ViewToggle active={view === 'grid'} onClick={() => setView('grid')}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </ViewToggle>
          <ViewToggle active={view === 'list'} onClick={() => setView('list')}>
            <List className="h-3.5 w-3.5" />
          </ViewToggle>
          <ViewToggle active={view === 'split'} onClick={() => setView('split')}>
            <MapIcon className="h-3.5 w-3.5" />
          </ViewToggle>
        </div>
      </div>

      {/* Content */}
      {view === 'split' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Cards panel — scrollable */}
          <div className="scrollbar-refined space-y-4 overflow-y-auto pr-2 lg:col-span-7 lg:max-h-[calc(100vh-200px)]">
            {listings.map((listing) => (
              <div
                key={listing.id}
                ref={(el) => setCardRef(listing.id, el)}
                onMouseEnter={() => setHoveredId(listing.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`rounded-xl transition-all duration-200 ${
                  activeHighlightId === listing.id
                    ? 'ring-2 ring-primary/30 shadow-md scale-[1.01]'
                    : 'hover:shadow-sm'
                }`}
              >
                <ListingCardHorizontal
                  listing={listing}
                  onFavorite={toggleFav}
                  isFavorited={isFavorited(listing.id)}
                />
              </div>
            ))}
          </div>
          {/* Map panel */}
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
      ) : (
        view === 'list' ? (
          <div className="space-y-4">
            {listings.map((listing) => (
              <ListingCardHorizontal
                key={listing.id}
                listing={listing}
                onFavorite={toggleFav}
                isFavorited={isFavorited(listing.id)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onFavorite={toggleFav}
                isFavorited={isFavorited(listing.id)}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center rounded-lg p-2 transition-all ${
        active
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50'
          : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
      }`}
    >
      {children}
    </button>
  );
}

function SearchResultsSkeleton() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
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
