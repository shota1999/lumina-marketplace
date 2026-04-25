'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import type { SearchFacets } from '@lumina/shared';

import { useAnalytics } from './use-analytics';

export interface SearchResponse {
  hits: Record<string, unknown>[];
  totalHits: number;
  page: number;
  totalPages: number;
  facets: SearchFacets;
  facetStats?: { pricePerNight?: { min: number; max: number } };
  processingTimeMs: number;
}

function buildApiUrl(params: URLSearchParams): string {
  return `/api/search?${params.toString()}`;
}

export function useSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { track } = useAnalytics();

  const queryKey = useMemo(() => ['search', searchParams.toString()], [searchParams]);

  const { data, isLoading, isFetching, error } = useQuery<SearchResponse>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(buildApiUrl(searchParams));
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Search failed');

      // Fire analytics for search
      const q = searchParams.get('q');
      if (q) {
        track('search', {
          query: q,
          totalHits: json.data.totalHits,
          filters: Object.fromEntries(searchParams.entries()),
        });
      }

      return json.data as SearchResponse;
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    retry: 1,
  });

  const updateParams = useCallback(
    (updates: Record<string, string | string[] | null>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        params.delete(key);
        if (value === null) continue;
        if (Array.isArray(value)) {
          for (const v of value) params.append(key, v);
        } else {
          params.set(key, value);
        }
      }
      if (resetPage) params.set('page', '1');
      router.push(`/search?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const setQuery = useCallback(
    (q: string) => {
      updateParams({ q: q || null });
    },
    [updateParams],
  );

  const setPage = useCallback(
    (page: number) => {
      updateParams({ page: String(page) }, false);
    },
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    const q = searchParams.get('q');
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    router.push(`/search?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Parse current filter state from URL
  const filters = useMemo(() => ({
    query: searchParams.get('q') ?? '',
    location: searchParams.get('location') ?? '',
    categories: searchParams.getAll('category'),
    amenities: searchParams.getAll('amenity'),
    priceMin: Number(searchParams.get('priceMin')) || 0,
    priceMax: Number(searchParams.get('priceMax')) || 0,
    guests: Number(searchParams.get('guests')) || 0,
    bedrooms: Number(searchParams.get('bedrooms')) || 0,
    bathrooms: Number(searchParams.get('bathrooms')) || 0,
    checkIn: searchParams.get('checkIn') ?? '',
    checkOut: searchParams.get('checkOut') ?? '',
    sort: searchParams.get('sort') ?? 'relevance',
    page: Number(searchParams.get('page')) || 1,
    view: (searchParams.get('view') as 'grid' | 'list' | 'map') ?? 'grid',
  }), [searchParams]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.categories.length > 0 ||
      filters.amenities.length > 0 ||
      Boolean(filters.location) ||
      Boolean(filters.checkIn) ||
      Boolean(filters.checkOut) ||
      filters.priceMin > 0 ||
      filters.priceMax > 0 ||
      filters.guests > 0 ||
      filters.bedrooms > 0 ||
      filters.bathrooms > 0
    );
  }, [filters]);

  return {
    results: data ?? null,
    isLoading,
    isFetching,
    error,
    filters,
    hasActiveFilters,
    updateParams,
    setQuery,
    setPage,
    clearFilters,
  };
}
