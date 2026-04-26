'use client';

import { Loader2, MapPin, Search } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDebouncedValue } from '@/hooks/use-debounce';

interface DestinationResult {
  city: string;
  country: string;
  listingCount: number;
}

interface ListingResult {
  id: string;
  title: string;
  slug: string;
  city: string;
  pricePerNight: number;
  imageUrl: string | null;
}

interface AutocompleteData {
  destinations: DestinationResult[];
  listings: ListingResult[];
}

interface SearchAutocompleteProps {
  onSelect?: (value: string) => void;
  className?: string;
}

export function SearchAutocomplete({ onSelect, className }: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AutocompleteData | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  // Fetch autocomplete results
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/search/autocomplete?q=${encodeURIComponent(debouncedQuery)}&limit=5`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setResults(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }, []);

  const handleDestinationClick = useCallback(
    (city: string) => {
      setOpen(false);
      setQuery(city);
      onSelect?.(city);
      router.push(`/search?location=${encodeURIComponent(city)}`);
    },
    [onSelect, router],
  );

  const handleListingClick = useCallback(
    (slug: string, title: string) => {
      setOpen(false);
      setQuery(title);
      onSelect?.(title);
      router.push(`/listings/${slug}`);
    },
    [onSelect, router],
  );

  const hasResults = results && (results.destinations.length > 0 || results.listings.length > 0);
  const noResults = results && results.destinations.length === 0 && results.listings.length === 0;
  const showDropdown = open && debouncedQuery.length >= 2;

  return (
    <div ref={containerRef} className={`relative w-full ${className ?? ''}`}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown && hasResults ? true : undefined}
          aria-autocomplete="list"
          aria-controls="autocomplete-dropdown"
          autoComplete="off"
          placeholder="Search destinations or listings..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.length >= 2) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-slate-400"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          id="autocomplete-dropdown"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {loading && !results && (
            <div className="flex items-center justify-center px-4 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          )}

          {noResults && !loading && (
            <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No results for &apos;{debouncedQuery}&apos;
            </div>
          )}

          {hasResults && (
            <>
              {/* Destinations section */}
              {results.destinations.length > 0 && (
                <div className="border-b border-slate-100 px-2 py-2 dark:border-slate-800">
                  <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Destinations
                  </p>
                  {results.destinations.map((dest) => (
                    <button
                      key={`${dest.city}-${dest.country}`}
                      type="button"
                      role="option"
                      onClick={() => handleDestinationClick(dest.city)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                        <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                          {dest.city}, {dest.country}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {dest.listingCount} {dest.listingCount === 1 ? 'listing' : 'listings'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Listings section */}
              {results.listings.length > 0 && (
                <div className="px-2 py-2">
                  <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Listings
                  </p>
                  {results.listings.map((listing) => (
                    <button
                      key={listing.id}
                      type="button"
                      role="option"
                      onClick={() => handleListingClick(listing.slug, listing.title)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                        {listing.imageUrl ? (
                          <Image
                            src={listing.imageUrl}
                            alt={listing.title}
                            width={56}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Search className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                          {listing.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{listing.city}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-slate-900 dark:text-slate-50">
                        ${listing.pricePerNight}
                        <span className="text-xs font-normal text-slate-400">/night</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
