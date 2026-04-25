'use client';

import { Loader2, MapPin, Search, Tag, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

import { Button, Input } from '@lumina/ui';

import { useDebouncedValue } from '@/hooks/use-debounce';

interface Suggestion {
  listings: {
    type: 'listing';
    id: string;
    title: string;
    highlight: string;
    slug: string;
    category: string;
    city: string;
    country: string;
    pricePerNight: number;
  }[];
  locations: { type: 'location'; text: string }[];
  categories: { type: 'category'; text: string; value: string }[];
  total: number;
}

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  size?: 'default' | 'lg';
  onQueryChange?: (query: string) => void;
  autoFocus?: boolean;
}

export function SearchBar({
  defaultValue = '',
  placeholder = 'Search destinations, villas, experiences...',
  size = 'default',
  onQueryChange,
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultValue || searchParams.get('q') || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebouncedValue(query, 250);

  // Fetch suggestions on debounced query change
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions(null);
      return;
    }

    let cancelled = false;
    setSuggestLoading(true);

    fetch(`/api/search/suggest?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setSuggestions(json.data);
          setActiveIndex(-1);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSuggestLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allItems = suggestions
    ? [
        ...suggestions.categories.map((c) => ({ kind: 'category' as const, ...c })),
        ...suggestions.locations.map((l) => ({ kind: 'location' as const, ...l })),
        ...suggestions.listings.map((l) => ({ kind: 'listing' as const, ...l })),
      ]
    : [];

  const navigateToSearch = useCallback(
    (q: string, extra?: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) {
        params.set('q', q);
      } else {
        params.delete('q');
      }
      params.set('page', '1');
      if (extra) {
        for (const [k, v] of Object.entries(extra)) params.set(k, v);
      }
      setShowSuggestions(false);
      router.push(`/search?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      navigateToSearch(query);
      onQueryChange?.(query);
    },
    [query, navigateToSearch, onQueryChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!showSuggestions || allItems.length === 0) {
        if (e.key === 'ArrowDown' && suggestions) {
          setShowSuggestions(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % allItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev <= 0 ? allItems.length - 1 : prev - 1));
          break;
        case 'Escape':
          setShowSuggestions(false);
          setActiveIndex(-1);
          break;
        case 'Enter': {
          if (activeIndex >= 0 && activeIndex < allItems.length) {
            e.preventDefault();
            const item = allItems[activeIndex]!;
            if (item.kind === 'listing') {
              router.push(`/listings/${item.slug}`);
              setShowSuggestions(false);
            } else if (item.kind === 'location') {
              navigateToSearch(item.text);
            } else if (item.kind === 'category') {
              navigateToSearch('', { category: item.value });
            }
          }
          break;
        }
      }
    },
    [showSuggestions, allItems, activeIndex, router, navigateToSearch, suggestions],
  );

  const clearQuery = useCallback(() => {
    setQuery('');
    setSuggestions(null);
    inputRef.current?.focus();
  }, []);

  const isLg = size === 'lg';

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} role="search" aria-label="Search listings" className="flex w-full gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={showSuggestions && allItems.length > 0}
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            autoComplete="off"
            autoFocus={autoFocus}
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (suggestions && query.length >= 2) setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            className={isLg ? 'h-12 pl-10 pr-10 text-base' : 'pl-10 pr-10'}
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {suggestLoading && (
            <Loader2 className="absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button type="submit" size={isLg ? 'lg' : 'default'}>
          Search
        </Button>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && allItems.length > 0 && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-background shadow-lg"
        >
          {/* Category suggestions */}
          {suggestions!.categories.length > 0 && (
            <div className="border-b px-2 py-1.5">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Categories</p>
              {suggestions!.categories.map((cat, i) => {
                const globalIdx = i;
                return (
                  <button
                    key={cat.value}
                    role="option"
                    aria-selected={activeIndex === globalIdx}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      activeIndex === globalIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    }`}
                    onMouseEnter={() => setActiveIndex(globalIdx)}
                    onClick={() => navigateToSearch('', { category: cat.value })}
                  >
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    {cat.text}
                  </button>
                );
              })}
            </div>
          )}

          {/* Location suggestions */}
          {suggestions!.locations.length > 0 && (
            <div className="border-b px-2 py-1.5">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Destinations</p>
              {suggestions!.locations.map((loc, i) => {
                const globalIdx = suggestions!.categories.length + i;
                return (
                  <button
                    key={loc.text}
                    role="option"
                    aria-selected={activeIndex === globalIdx}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      activeIndex === globalIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    }`}
                    onMouseEnter={() => setActiveIndex(globalIdx)}
                    onClick={() => navigateToSearch(loc.text)}
                  >
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {loc.text}
                  </button>
                );
              })}
            </div>
          )}

          {/* Listing suggestions */}
          {suggestions!.listings.length > 0 && (
            <div className="px-2 py-1.5">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Listings</p>
              {suggestions!.listings.map((listing, i) => {
                const globalIdx =
                  suggestions!.categories.length + suggestions!.locations.length + i;
                return (
                  <Link
                    key={listing.id}
                    href={`/listings/${listing.slug}`}
                    role="option"
                    aria-selected={activeIndex === globalIdx}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                      activeIndex === globalIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    }`}
                    onMouseEnter={() => setActiveIndex(globalIdx)}
                    onClick={() => setShowSuggestions(false)}
                  >
                    <div className="min-w-0 flex-1">
                      {/* Safe: `highlight` is produced by Meilisearch's `_formatted` field, which wraps matches in <em> tags around values we control (listing titles). No user-supplied HTML reaches this prop. */}
                      <p
                        className="truncate font-medium"
                        dangerouslySetInnerHTML={{ __html: listing.highlight }}
                      />
                      <p className="text-xs text-muted-foreground">
                        {listing.city}, {listing.country} &middot; {listing.category}
                      </p>
                    </div>
                    <span className="ml-3 shrink-0 text-xs font-medium">
                      ${listing.pricePerNight}/night
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Total results teaser */}
          {suggestions!.total > 0 && (
            <button
              className="flex w-full items-center gap-2 border-t px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent/50"
              onClick={() => navigateToSearch(query)}
            >
              <Search className="h-3.5 w-3.5" />
              See all {suggestions!.total.toLocaleString()} results for &quot;{query}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
