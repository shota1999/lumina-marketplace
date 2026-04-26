'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import type { SearchFacets } from '@lumina/shared';

import { useAnalytics } from './use-analytics';

export interface SearchPage {
  hits: Record<string, unknown>[];
  totalHits: number;
  page: number;
  totalPages: number;
  facets: SearchFacets;
  facetStats?: { pricePerNight?: { min: number; max: number } };
  processingTimeMs: number;
}

export interface SearchResponse extends SearchPage {
  /** Number of hits currently loaded across all fetched pages. */
  loadedCount: number;
  /** Per-page batches in the order they were fetched — used to render page dividers. */
  pages: SearchPage[];
}

export function useSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { track } = useAnalytics();

  // Stable filter signature — page is managed by the infinite query, not the URL.
  const filtersKey = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    return params.toString();
  }, [searchParams]);

  const queryKey = useMemo(() => ['search', filtersKey], [filtersKey]);

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery<SearchPage>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams(filtersKey);
      params.set('page', String(pageParam));
      const res = await fetch(`/api/search?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Search failed');

      if (pageParam === 1) {
        const q = params.get('q');
        if (q) {
          track('search', {
            query: q,
            totalHits: json.data.totalHits,
            filters: Object.fromEntries(params.entries()),
          });
        }
      }
      return json.data as SearchPage;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    retry: 1,
  });

  const aggregatedHits = useMemo(
    () => data?.pages.flatMap((p) => p.hits) ?? [],
    [data],
  );

  const results: SearchResponse | null = useMemo(() => {
    if (!data || data.pages.length === 0) return null;
    const first = data.pages[0]!;
    const last = data.pages[data.pages.length - 1]!;
    return {
      hits: aggregatedHits,
      totalHits: last.totalHits,
      page: last.page,
      totalPages: last.totalPages,
      facets: first.facets,
      facetStats: first.facetStats,
      processingTimeMs: last.processingTimeMs,
      loadedCount: aggregatedHits.length,
      pages: [...data.pages],
    };
  }, [data, aggregatedHits]);

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
      // Infinite scroll owns paging — keep `page` out of the URL.
      if (resetPage) params.delete('page');
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

  const clearFilters = useCallback(() => {
    const q = searchParams.get('q');
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    router.push(`/search?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Parse current filter state from URL
  const filters = useMemo(
    () => ({
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
    }),
    [searchParams],
  );

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
    results,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage: Boolean(hasNextPage),
    fetchNextPage: loadMore,
    error,
    filters,
    hasActiveFilters,
    updateParams,
    setQuery,
    clearFilters,
  };
}
