'use client';

import { ChevronDown, ChevronUp, Minus, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { AMENITIES } from '@lumina/shared';
import type { SearchFacets } from '@lumina/shared';
import { Checkbox, Slider } from '@lumina/ui';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'villa', label: 'Villa' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'treehouse', label: 'Treehouse' },
  { value: 'boat', label: 'Boat' },
  { value: 'castle', label: 'Castle' },
  { value: 'farmhouse', label: 'Farmhouse' },
  { value: 'penthouse', label: 'Penthouse' },
] as const;

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating_desc', label: 'Top Rated' },
  { value: 'newest', label: 'Newest' },
];

interface FilterState {
  categories: string[];
  amenities: string[];
  priceMin: number;
  priceMax: number;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  sort: string;
}

interface SearchFiltersProps {
  filters: FilterState;
  facets: SearchFacets | null;
  facetStats?: { pricePerNight?: { min: number; max: number } };
  hasActiveFilters: boolean;
  onUpdate: (updates: Record<string, string | string[] | null>, resetPage?: boolean) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function SearchFilters({
  filters,
  facets,
  facetStats,
  hasActiveFilters,
  onUpdate,
  onClear,
}: SearchFiltersProps) {
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const priceFloor = facetStats?.pricePerNight?.min ?? 0;
  const priceCeil = facetStats?.pricePerNight?.max ?? 10000;
  const priceMin = filters.priceMin || priceFloor;
  const priceMax = filters.priceMax || priceCeil;

  const categoryCounts = facets?.category ?? {};
  const amenityCounts = facets?.amenities ?? {};

  const toggleCategory = useCallback(
    (category: string) => {
      if (category === 'all') {
        onUpdate({ category: null });
        return;
      }
      const updated = filters.categories.includes(category)
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category];
      onUpdate({ category: updated.length > 0 ? updated : null });
    },
    [filters.categories, onUpdate],
  );

  const toggleAmenity = useCallback(
    (amenity: string) => {
      const updated = filters.amenities.includes(amenity)
        ? filters.amenities.filter((a) => a !== amenity)
        : [...filters.amenities, amenity];
      onUpdate({ amenity: updated.length > 0 ? updated : null });
    },
    [filters.amenities, onUpdate],
  );

  const visibleAmenities = showAllAmenities ? AMENITIES : AMENITIES.slice(0, 8);

  return (
    <aside className="space-y-1">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Filters
          </h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="group inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-all hover:bg-slate-900 hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-50 dark:hover:text-slate-900"
          >
            <RotateCcw className="h-3 w-3 transition-transform group-hover:-rotate-180" />
            Clear filters
          </button>
        )}
      </div>

      {/* Sort */}
      <FilterSection title="Sort by" defaultOpen>
        <div className="space-y-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ sort: opt.value })}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-[13px] transition-colors ${
                filters.sort === opt.value
                  ? 'bg-slate-900 font-semibold text-white dark:bg-slate-50 dark:text-slate-900'
                  : 'font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Price range */}
      <FilterSection title="Price per night" defaultOpen>
        <PriceRange
          floor={Math.floor(priceFloor)}
          ceil={Math.ceil(priceCeil) || 10000}
          activeMin={priceMin}
          activeMax={priceMax}
          onCommit={(min, max) =>
            onUpdate({
              priceMin: min > priceFloor ? String(min) : null,
              priceMax: max < priceCeil ? String(max) : null,
            })
          }
        />
      </FilterSection>

      {/* Categories */}
      <FilterSection title="Property type" defaultOpen>
        <div className="grid grid-cols-2 gap-1.5">
          {CATEGORIES.map((cat) => {
            const isAll = cat.value === 'all';
            const isActive = isAll ? filters.categories.length === 0 : filters.categories.includes(cat.value);
            const count = isAll ? null : (categoryCounts[cat.value] ?? 0);
            return (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className={`rounded-lg border px-3 py-2.5 text-[12px] font-semibold transition-all ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-100 dark:bg-slate-50 dark:text-slate-900'
                    : count === 0 && !isAll
                      ? 'border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-400 dark:hover:text-slate-50'
                }`}
                disabled={!isAll && count === 0 && !isActive}
              >
                {cat.label}
                {count !== null && count > 0 && (
                  <span className={`ml-1 text-[10px] ${isActive ? 'text-white/60 dark:text-slate-900/50' : 'text-slate-400 dark:text-slate-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Guests */}
      <FilterSection title="Guests" defaultOpen>
        <Stepper
          name="guests"
          value={filters.guests}
          label={filters.guests > 0 ? `${filters.guests}+ guests` : 'Any'}
          onDecrement={() => onUpdate({ guests: filters.guests > 1 ? String(filters.guests - 1) : null })}
          onIncrement={() => onUpdate({ guests: String((filters.guests || 0) + 1) })}
          disableDecrement={filters.guests <= 0}
        />
      </FilterSection>

      {/* Bedrooms */}
      <FilterSection title="Bedrooms" defaultOpen>
        <Stepper
          name="bedrooms"
          value={filters.bedrooms}
          label={filters.bedrooms > 0 ? `${filters.bedrooms}+ bedrooms` : 'Any'}
          onDecrement={() => onUpdate({ bedrooms: filters.bedrooms > 1 ? String(filters.bedrooms - 1) : null })}
          onIncrement={() => onUpdate({ bedrooms: String((filters.bedrooms || 0) + 1) })}
          disableDecrement={filters.bedrooms <= 0}
        />
      </FilterSection>

      {/* Amenities */}
      <FilterSection title="Amenities">
        <div className="space-y-0.5">
          {visibleAmenities.map((amenity) => {
            const count = amenityCounts[amenity] ?? 0;
            const isChecked = filters.amenities.includes(amenity);
            return (
              <label
                key={amenity}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                  count === 0 && !isChecked ? 'opacity-30' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleAmenity(amenity)}
                    disabled={count === 0 && !isChecked}
                  />
                  <span className="capitalize text-slate-700 dark:text-slate-300">
                    {amenity.replace(/-/g, ' ')}
                  </span>
                </div>
                {count > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {count}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        {AMENITIES.length > 8 && (
          <button
            className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
            onClick={() => setShowAllAmenities(!showAllAmenities)}
          >
            {showAllAmenities ? (
              <>Show less <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Show all ({AMENITIES.length}) <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        )}
      </FilterSection>
    </aside>
  );
}

function FilterSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-100/80 py-5 last:border-0 dark:border-slate-800/40">
      <button
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center justify-between rounded-md py-1 transition-colors hover:text-slate-900 dark:hover:text-slate-50"
      >
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-50">
          {title}
        </h3>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-all duration-300 group-hover:text-slate-700 dark:group-hover:text-slate-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="mt-4 animate-in fade-in slide-in-from-top-1 duration-200">{children}</div>}
    </div>
  );
}

function PriceRange({
  floor,
  ceil,
  activeMin,
  activeMax,
  onCommit,
}: {
  floor: number;
  ceil: number;
  activeMin: number;
  activeMax: number;
  onCommit: (min: number, max: number) => void;
}) {
  const safeCeil = ceil > floor ? ceil : floor + 1;
  const clamp = useCallback(
    (n: number) => Math.min(safeCeil, Math.max(floor, n)),
    [floor, safeCeil],
  );
  const [range, setRange] = useState<[number, number]>([
    clamp(activeMin),
    clamp(activeMax),
  ]);

  useEffect(() => {
    setRange([clamp(activeMin), clamp(activeMax)]);
  }, [activeMin, activeMax, clamp]);

  return (
    <>
      <Slider
        aria-label="Price range"
        min={floor}
        max={safeCeil}
        step={25}
        value={range}
        onValueChange={(v) => {
          if (v.length >= 2) setRange([v[0]!, v[1]!]);
        }}
        onValueCommit={(v) => {
          if (v.length >= 2) onCommit(v[0]!, v[1]!);
        }}
      />
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-center dark:bg-slate-800">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Min</p>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
            ${range[0].toLocaleString()}
          </p>
        </div>
        <div className="h-px w-4 bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-center dark:bg-slate-800">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Max</p>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
            ${range[1].toLocaleString()}
            {range[1] >= safeCeil ? '+' : ''}
          </p>
        </div>
      </div>
    </>
  );
}

function Stepper({
  name,
  value,
  label,
  onDecrement,
  onIncrement,
  disableDecrement,
}: {
  name: string;
  value: number;
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
  disableDecrement: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-3">
        <button
          aria-label={`Decrease ${name}`}
          onClick={onDecrement}
          disabled={disableDecrement}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-all hover:border-slate-400 hover:bg-white active:scale-95 disabled:opacity-30 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span
          aria-label={`${name} value`}
          className="w-5 text-center text-sm font-bold text-slate-900 dark:text-slate-50"
        >
          {value || 0}
        </span>
        <button
          aria-label={`Increase ${name}`}
          onClick={onIncrement}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-all hover:border-slate-400 hover:bg-white active:scale-95 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
