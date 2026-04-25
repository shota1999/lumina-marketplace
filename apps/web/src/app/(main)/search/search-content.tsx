'use client';

import { Bookmark, Filter, Loader2, RotateCcw, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import type { Listing, ListingCategory } from '@lumina/shared';
import { Badge, Input } from '@lumina/ui';

import { SearchBar } from '@/components/search/search-bar';
import { SearchFilters } from '@/components/search/search-filters';
import { SearchPagination } from '@/components/search/search-pagination';
import { SearchResults } from '@/components/search/search-results';
import { useSearch } from '@/hooks/use-search';
import { toast } from '@/hooks/use-toast';

export function SearchPageContent() {
  const {
    results,
    isLoading,
    isFetching,
    error,
    filters,
    hasActiveFilters,
    updateParams,
    clearFilters,
    setPage,
  } = useSearch();

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

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
        toast({ title: 'Sign in required', description: 'Please sign in to save searches', variant: 'destructive' });
        return;
      }
      if (!res.ok || !data.success) {
        toast({ title: 'Save failed', description: data.error?.message ?? 'Something went wrong', variant: 'destructive' });
        return;
      }
      toast({ title: 'Search saved', description: `"${saveName.trim()}" has been saved` });
      setSaveName('');
      setSaveOpen(false);
    } catch {
      toast({ title: 'Network error', description: 'Could not save search', variant: 'destructive' });
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
  const listings: Listing[] = (results?.hits ?? []).map((hit: Record<string, unknown>) => ({
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
      {/* Top bar */}
      <div className="sticky top-16 z-20 border-b border-slate-100 bg-white/85 px-8 py-5 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/85">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchBar defaultValue={filters.query} autoFocus={false} />
          </div>
          {hasActiveFilters && (
            <div className="relative hidden sm:block">
              {saveOpen ? (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Name this search..."
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveSearch()}
                    className="h-10 w-48 rounded-xl border-slate-200 dark:border-slate-700"
                    autoFocus
                  />
                  <button
                    disabled={saving || !saveName.trim()}
                    onClick={handleSaveSearch}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </button>
                  <button onClick={() => setSaveOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSaveOpen(true)}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-400 dark:hover:text-slate-50"
                >
                  <Bookmark className="h-4 w-4" />
                  Save search
                </button>
              )}
            </div>
          )}
        </div>

        {/* Active filter pills */}
        {filterPills.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {filterPills.map((pill) => (
              <span
                key={pill.label}
                className="group inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1 text-xs font-medium capitalize text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {pill.label}
                <button
                  onClick={pill.onRemove}
                  aria-label={`Remove ${pill.label}`}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-900 hover:text-white dark:text-slate-500 dark:hover:bg-slate-100 dark:hover:text-slate-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearFilters}
              className="group ml-1 inline-flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
            >
              <RotateCcw className="h-3 w-3 transition-transform group-hover:-rotate-180" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Mobile filter toggle */}
      <div className="border-b border-slate-100 px-8 py-3 lg:hidden dark:border-slate-800/60">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-400 dark:hover:text-slate-50"
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="default" className="ml-1 h-5 min-w-5 justify-center px-1.5 text-xs">
              {filterPills.length}
            </Badge>
          )}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div
          className={`${
            mobileFiltersOpen ? 'block' : 'hidden'
          } w-full shrink-0 border-r border-slate-100 bg-white/40 backdrop-blur-sm lg:block lg:w-[300px] dark:border-slate-800/60 dark:bg-slate-950/40`}
        >
          <div className="scrollbar-refined sticky top-16 h-[calc(100vh-64px)] overflow-y-auto overscroll-contain px-6 py-6">
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
        </div>

        {/* Results */}
        <div className="min-w-0 flex-1 px-8 py-8">
          <SearchResults
            listings={listings}
            totalHits={results?.totalHits ?? 0}
            isLoading={isLoading}
            isFetching={isFetching}
            error={error}
            processingTimeMs={results?.processingTimeMs}
            query={filters.query}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            onSearchArea={handleSearchArea}
          />
          <SearchPagination
            currentPage={results?.page ?? filters.page}
            totalPages={results?.totalPages ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
