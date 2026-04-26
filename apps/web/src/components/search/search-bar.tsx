'use client';

import { ArrowRight, Loader2, MapPin, Search, Tag, X } from 'lucide-react';
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

import { cn } from '@lumina/ui';

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
  size?: 'compact' | 'default' | 'lg';
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
  const isCompact = size === 'compact';

  const formClassName = isCompact
    ? 'group relative flex h-12 w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white pl-4 pr-1.5 transition-all duration-200 hover:border-slate-300 focus-within:border-slate-900 focus-within:shadow-[0_4px_16px_-4px_rgba(15,23,42,0.12)] focus-within:ring-2 focus-within:ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:focus-within:border-slate-50 dark:focus-within:ring-slate-50/10'
    : cn(
        'group relative flex w-full items-center overflow-hidden rounded-full border border-slate-200 bg-white pr-1.5 shadow-[0_4px_16px_-6px_rgba(15,23,42,0.08)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_8px_28px_-8px_rgba(15,23,42,0.16)] focus-within:border-slate-900 focus-within:shadow-[0_10px_32px_-8px_rgba(15,23,42,0.22)] focus-within:ring-4 focus-within:ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:focus-within:border-slate-50 dark:focus-within:ring-slate-50/5',
        isLg ? 'h-16 pl-6' : 'h-12 pl-5',
      );

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={handleSubmit}
        role="search"
        aria-label="Search listings"
        className={formClassName}
      >
        <Search
          className={cn(
            'shrink-0 text-slate-400 transition-colors duration-200 group-focus-within:text-slate-900 dark:group-focus-within:text-slate-50',
            isLg ? 'h-5 w-5' : 'h-4 w-4',
          )}
          strokeWidth={2.25}
        />
        <input
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
          className={cn(
            'min-w-0 flex-1 border-0 bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-slate-500',
            isLg ? 'h-full px-4 text-base' : isCompact ? 'h-full text-sm' : 'h-full px-3 text-sm',
          )}
        />
        {suggestLoading && (
          <Loader2
            className={cn('shrink-0 animate-spin text-slate-400', isLg ? 'h-4 w-4' : 'h-3.5 w-3.5')}
          />
        )}
        {query && !suggestLoading && (
          <button
            type="button"
            onClick={clearQuery}
            aria-label="Clear search"
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
              isLg ? 'mr-1 h-9 w-9' : 'h-7 w-7',
              !isCompact && !isLg && 'mr-1',
            )}
          >
            <X className={isLg ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
          </button>
        )}
        {isCompact ? (
          <button
            type="submit"
            aria-label="Search"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md active:scale-[0.95] dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Search"
            className={cn(
              'flex shrink-0 items-center justify-center gap-2 rounded-full bg-slate-900 font-bold text-white shadow-sm transition-all duration-300 hover:bg-slate-800 hover:shadow-md active:scale-[0.97] dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200',
              isLg ? 'h-[3.25rem] px-7 text-sm' : 'h-9 px-5 text-sm',
            )}
          >
            <Search className={isLg ? 'h-4 w-4' : 'h-3.5 w-3.5'} strokeWidth={2.5} />
            <span className="hidden sm:inline">Search</span>
          </button>
        )}
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && allItems.length > 0 && (
        <div
          id="search-suggestions"
          role="listbox"
          className="bg-background absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border shadow-lg"
        >
          {/* Category suggestions */}
          {suggestions!.categories.length > 0 && (
            <div className="border-b px-2 py-1.5">
              <p className="text-muted-foreground px-2 py-1 text-xs font-medium">Categories</p>
              {suggestions!.categories.map((cat, i) => {
                const globalIdx = i;
                return (
                  <button
                    key={cat.value}
                    role="option"
                    aria-selected={activeIndex === globalIdx}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      activeIndex === globalIdx
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                    }`}
                    onMouseEnter={() => setActiveIndex(globalIdx)}
                    onClick={() => navigateToSearch('', { category: cat.value })}
                  >
                    <Tag className="text-muted-foreground h-3.5 w-3.5" />
                    {cat.text}
                  </button>
                );
              })}
            </div>
          )}

          {/* Location suggestions */}
          {suggestions!.locations.length > 0 && (
            <div className="border-b px-2 py-1.5">
              <p className="text-muted-foreground px-2 py-1 text-xs font-medium">Destinations</p>
              {suggestions!.locations.map((loc, i) => {
                const globalIdx = suggestions!.categories.length + i;
                return (
                  <button
                    key={loc.text}
                    role="option"
                    aria-selected={activeIndex === globalIdx}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      activeIndex === globalIdx
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                    }`}
                    onMouseEnter={() => setActiveIndex(globalIdx)}
                    onClick={() => navigateToSearch(loc.text)}
                  >
                    <MapPin className="text-muted-foreground h-3.5 w-3.5" />
                    {loc.text}
                  </button>
                );
              })}
            </div>
          )}

          {/* Listing suggestions */}
          {suggestions!.listings.length > 0 && (
            <div className="px-2 py-1.5">
              <p className="text-muted-foreground px-2 py-1 text-xs font-medium">Listings</p>
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
                      activeIndex === globalIdx
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
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
                      <p className="text-muted-foreground text-xs">
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
              className="text-muted-foreground hover:bg-accent/50 flex w-full items-center gap-2 border-t px-4 py-2.5 text-sm"
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
