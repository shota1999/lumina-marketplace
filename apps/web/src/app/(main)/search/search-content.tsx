'use client';

import {
  Bookmark,
  LayoutGrid,
  List,
  Loader2,
  MapIcon,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import type { Listing, ListingCategory } from '@lumina/shared';
import { Badge, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@lumina/ui';

import { SearchBar } from '@/components/search/search-bar';
import { SearchFilters } from '@/components/search/search-filters';
import { SearchResults, type ViewMode } from '@/components/search/search-results';
import { useSearch } from '@/hooks/use-search';
import { toast } from '@/hooks/use-toast';

export function SearchPageContent() {
  const {
    results,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    filters,
    hasActiveFilters,
    updateParams,
    clearFilters,
  } = useSearch();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<ViewMode>('split');

  const handleSaveSearch = useCallback(async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const params: Record<string, unknown> = {};
      if (filters.query) params.query = filters.query;
      if (filters.categories.length > 0) params.category = filters.categories;
      if (filters.priceMin > 0) params.priceMin = filters.priceMin;
      if (filters.priceMax > 0) params.priceMax = filters.priceMax;
      if (filters.guests > 0) params.guests = filters.guests;
      if (filters.bedrooms > 0) params.bedrooms = filters.bedrooms;
      if (filters.amenities.length > 0) params.amenities = filters.amenities;
      if (filters.sort !== 'relevance') params.sort = filters.sort;

      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveName.trim(), params, notifyOnNew: false }),
      });
      const data = await res.json();
      if (res.status === 401) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to save searches',
          variant: 'destructive',
        });
        return;
      }
      if (!res.ok || !data.success) {
        toast({
          title: 'Save failed',
          description: data.error?.message ?? 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Search saved', description: `"${saveName.trim()}" has been saved` });
      setSaveName('');
      setSaveOpen(false);
    } catch {
      toast({
        title: 'Network error',
        description: 'Could not save search',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [saveName, filters]);

  const handleSearchArea = useCallback(
    (bounds: { north: number; south: number; east: number; west: number }) => {
      updateParams({
        boundsN: String(bounds.north),
        boundsS: String(bounds.south),
        boundsE: String(bounds.east),
        boundsW: String(bounds.west),
      });
    },
    [updateParams],
  );

  // Transform hits to Listing shape
  const hitToListing = (hit: Record<string, unknown>): Listing => ({
    id: hit['id'] as string,
    title: hit['title'] as string,
    slug: hit['slug'] as string,
    description: hit['description'] as string,
    category: hit['category'] as ListingCategory,
    status: 'published' as const,
    pricePerNight: Number(hit['pricePerNight']),
    currency: (hit['currency'] as string) ?? 'USD',
    location: {
      address: '',
      city: (hit['city'] as string) ?? '',
      state: (hit['state'] as string) ?? '',
      country: (hit['country'] as string) ?? '',
      lat: (hit['_geo'] as { lat: number; lng: number })?.lat ?? 0,
      lng: (hit['_geo'] as { lat: number; lng: number })?.lng ?? 0,
    },
    amenities: (hit['amenities'] as string[]) ?? [],
    images: hit['primaryImageUrl']
      ? [
          {
            id: 'primary',
            url: hit['primaryImageUrl'] as string,
            alt: hit['title'] as string,
            width: 800,
            height: 600,
            isPrimary: true,
          },
        ]
      : [],
    maxGuests: Number(hit['maxGuests']) || 0,
    bedrooms: Number(hit['bedrooms']) || 0,
    bathrooms: Number(hit['bathrooms']) || 0,
    rating: Number(hit['rating']) || 0,
    reviewCount: Number(hit['reviewCount']) || 0,
    hostId: '',
    partnerId: null,
    featured: Boolean(hit['featured']),
    createdAt: String(hit['createdAt'] ?? ''),
    updatedAt: '',
  });

  const listings: Listing[] = (results?.hits ?? []).map(hitToListing);
  const batches = (results?.pages ?? []).map((p) => ({
    page: p.page,
    listings: p.hits.map(hitToListing),
  }));

  // Active filter pills
  const filterPills: { label: string; onRemove: () => void }[] = [];
  if (filters.location) {
    filterPills.push({
      label: filters.location,
      onRemove: () => updateParams({ location: null }),
    });
  }
  if (filters.query) {
    filterPills.push({
      label: `"${filters.query}"`,
      onRemove: () => updateParams({ q: null }),
    });
  }
  for (const cat of filters.categories) {
    filterPills.push({
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      onRemove: () => {
        const updated = filters.categories.filter((c) => c !== cat);
        updateParams({ category: updated.length > 0 ? updated : null });
      },
    });
  }
  if (filters.priceMin > 0 || filters.priceMax > 0) {
    filterPills.push({
      label: `$${filters.priceMin || 0}–$${filters.priceMax || '∞'}`,
      onRemove: () => updateParams({ priceMin: null, priceMax: null }),
    });
  }
  if (filters.checkIn || filters.checkOut) {
    const fmt = (iso: string) => {
      if (!iso) return '?';
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
    filterPills.push({
      label: `${fmt(filters.checkIn)} – ${fmt(filters.checkOut)}`,
      onRemove: () => updateParams({ checkIn: null, checkOut: null }),
    });
  }
  if (filters.guests > 0) {
    filterPills.push({
      label: `${filters.guests}+ guests`,
      onRemove: () => updateParams({ guests: null }),
    });
  }
  if (filters.bedrooms > 0) {
    filterPills.push({
      label: `${filters.bedrooms}+ bedrooms`,
      onRemove: () => updateParams({ bedrooms: null }),
    });
  }
  for (const am of filters.amenities) {
    filterPills.push({
      label: am.replace(/-/g, ' '),
      onRemove: () => {
        const updated = filters.amenities.filter((a) => a !== am);
        updateParams({ amenity: updated.length > 0 ? updated : null });
      },
    });
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      {/* Unified header: search + chips + filters + save on one row */}
      <div className="px-6 pt-6 md:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
          <div className="w-full shrink-0 sm:w-auto sm:flex-none sm:basis-[28rem]">
            <SearchBar defaultValue={filters.query} size="compact" autoFocus={false} />
          </div>

          {/* Active filter chips, inline */}
          {filterPills.length > 0 && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {filterPills.map((pill) => (
                <span
                  key={pill.label}
                  className="group inline-flex items-center gap-1 rounded-full bg-slate-900 py-1 pl-3 pr-1 text-xs font-medium capitalize text-white dark:bg-slate-50 dark:text-slate-900"
                >
                  {pill.label}
                  <button
                    onClick={pill.onRemove}
                    aria-label={`Remove ${pill.label}`}
                    className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-white/70 transition-all hover:bg-white/20 hover:text-white dark:text-slate-900/60 dark:hover:bg-slate-900/15 dark:hover:text-slate-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={clearFilters}
                className="group inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
              >
                <RotateCcw className="h-3 w-3 transition-transform group-hover:-rotate-180" />
                Clear all
              </button>
            </div>
          )}

          {/* Spacer pushes filter/save to the right when there are no chips */}
          {filterPills.length === 0 && <div className="flex-1" />}

          {/* Filters button */}
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="relative flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-400 dark:hover:text-slate-50"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2.25} />
            <span className="hidden sm:inline">Filters</span>
            {filterPills.length > 0 && (
              <Badge
                variant="default"
                className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px]"
              >
                {filterPills.length}
              </Badge>
            )}
          </button>

          {/* Save search */}
          {hasActiveFilters && (
            <div className="hidden shrink-0 sm:block">
              {saveOpen ? (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Name this search..."
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveSearch()}
                    className="h-11 w-48 rounded-xl border-slate-200 px-4 dark:border-slate-700"
                    autoFocus
                  />
                  <button
                    disabled={saving || !saveName.trim()}
                    onClick={handleSaveSearch}
                    className="flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </button>
                  <button
                    onClick={() => setSaveOpen(false)}
                    aria-label="Cancel"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSaveOpen(true)}
                  className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-400 dark:hover:text-slate-50"
                >
                  <Bookmark className="h-4 w-4" strokeWidth={2.25} />
                  <span className="hidden md:inline">Save</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tight sub-row: result count + view toggles, sits right above cards */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {results && results.loadedCount < results.totalHits
                ? `${results.loadedCount.toLocaleString()} of ${results.totalHits.toLocaleString()}`
                : (results?.totalHits ?? 0).toLocaleString()}{' '}
              result{(results?.totalHits ?? 0) !== 1 ? 's' : ''}
            </span>
            {results?.processingTimeMs !== undefined && results.processingTimeMs > 0 && (
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400 sm:inline">
                {results.processingTimeMs}ms
              </span>
            )}
            {isFetching && !isFetchingNextPage && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            )}
          </div>
          <div className="flex items-center gap-0.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <ViewToggle active={view === 'grid'} onClick={() => setView('grid')} label="Grid view">
              <LayoutGrid className="h-3.5 w-3.5" />
            </ViewToggle>
            <ViewToggle active={view === 'list'} onClick={() => setView('list')} label="List view">
              <List className="h-3.5 w-3.5" />
            </ViewToggle>
            <ViewToggle active={view === 'split'} onClick={() => setView('split')} label="Map view">
              <MapIcon className="h-3.5 w-3.5" />
            </ViewToggle>
          </div>
        </div>
      </div>

      {/* Results — full width, no sidebar, no extra divider */}
      <div className="px-6 pb-12 pt-6 md:px-8">
        <SearchResults
          listings={listings}
          batches={batches}
          totalHits={results?.totalHits ?? 0}
          isLoading={isLoading}
          error={error}
          query={filters.query}
          hasActiveFilters={hasActiveFilters}
          view={view}
          onClearFilters={clearFilters}
          onSearchArea={handleSearchArea}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
        />
      </div>

      {/* Filters slide-over */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden border-slate-200/80 bg-slate-50 p-0 dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader className="shrink-0 border-b border-slate-200/80 bg-white px-7 py-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-slate-50 dark:text-slate-900">
                <SlidersHorizontal className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div className="text-left">
                <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  Refine your stay
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {(results?.totalHits ?? 0).toLocaleString()} matching listings
                  {hasActiveFilters && ` · ${filterPills.length} filter${filterPills.length !== 1 ? 's' : ''} applied`}
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="scrollbar-refined min-h-0 flex-1 overflow-y-auto px-7 py-6">
            <SearchFilters
              filters={filters}
              facets={results?.facets ?? null}
              facetStats={results?.facetStats}
              hasActiveFilters={hasActiveFilters}
              onUpdate={updateParams}
              onClear={clearFilters}
              isLoading={isLoading}
            />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200/80 bg-white px-7 py-4 dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 underline-offset-4 transition-colors hover:bg-slate-100 hover:text-slate-900 hover:underline disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            >
              Clear all
            </button>
            <button
              onClick={() => setFiltersOpen(false)}
              className="rounded-xl bg-slate-900 px-7 py-3 text-sm font-bold tracking-tight text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.98] dark:bg-slate-50 dark:text-slate-900"
            >
              Show {results?.totalHits ?? 0} result{(results?.totalHits ?? 0) !== 1 ? 's' : ''}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
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
