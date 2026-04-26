'use client';

import {
  ArrowUpDown,
  BedDouble,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Home,
  RotateCcw,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { AMENITIES } from '@lumina/shared';
import type { SearchFacets } from '@lumina/shared';
import { Slider } from '@lumina/ui';

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
    <aside className="space-y-3">
      {hasActiveFilters && (
        <div className="-mt-2 flex justify-end">
          <button
            onClick={onClear}
            className="group inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 transition-all hover:bg-slate-900 hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-50 dark:hover:text-slate-900"
          >
            <RotateCcw className="h-3 w-3 transition-transform group-hover:-rotate-180" />
            Reset all
          </button>
        </div>
      )}

      {/* Sort */}
      <FilterSection title="Sort by" icon={ArrowUpDown} defaultOpen>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ sort: opt.value })}
              className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                filters.sort === opt.value
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-50 dark:text-slate-900'
                  : 'border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-400 dark:hover:text-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Price range */}
      <FilterSection title="Price per night" icon={DollarSign} defaultOpen>
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
      <FilterSection title="Property type" icon={Home} defaultOpen>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const isAll = cat.value === 'all';
            const isActive = isAll
              ? filters.categories.length === 0
              : filters.categories.includes(cat.value);
            const count = isAll ? null : (categoryCounts[cat.value] ?? 0);
            return (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
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
                  <span
                    className={`ml-1.5 text-[10px] ${isActive ? 'text-white/60 dark:text-slate-900/50' : 'text-slate-400 dark:text-slate-500'}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Guests + Bedrooms (side by side) */}
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-6">
        <FilterSection title="Guests" icon={Users} defaultOpen>
          <PillCounter
            value={filters.guests}
            options={GUEST_OPTIONS}
            onChange={(v) => onUpdate({ guests: v > 0 ? String(v) : null })}
          />
        </FilterSection>
        <FilterSection title="Bedrooms" icon={BedDouble} defaultOpen>
          <PillCounter
            value={filters.bedrooms}
            options={BEDROOM_OPTIONS}
            onChange={(v) => onUpdate({ bedrooms: v > 0 ? String(v) : null })}
          />
        </FilterSection>
      </div>

      {/* Amenities */}
      <FilterSection title="Amenities" icon={Sparkles} defaultOpen>
        <div className="flex flex-wrap gap-1.5">
          {visibleAmenities.map((amenity) => {
            const count = amenityCounts[amenity] ?? 0;
            const isChecked = filters.amenities.includes(amenity);
            const disabled = count === 0 && !isChecked;
            return (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                disabled={disabled}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-colors ${
                  isChecked
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-50 dark:text-slate-900'
                    : disabled
                      ? 'border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-400 dark:hover:text-slate-50'
                }`}
              >
                {amenity.replace(/-/g, ' ')}
                {count > 0 && (
                  <span
                    className={`text-[10px] ${
                      isChecked
                        ? 'text-white/60 dark:text-slate-900/50'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {AMENITIES.length > 8 && (
          <button
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
            onClick={() => setShowAllAmenities(!showAllAmenities)}
          >
            {showAllAmenities ? (
              <>
                Show less <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Show all ({AMENITIES.length}) <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </FilterSection>
    </aside>
  );
}

const GUEST_OPTIONS = [
  { value: 0, label: 'Any' },
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 4, label: '4+' },
  { value: 6, label: '6+' },
  { value: 8, label: '8+' },
  { value: 10, label: '10+' },
];

const BEDROOM_OPTIONS = [
  { value: 0, label: 'Any' },
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
  { value: 5, label: '5+' },
];

function PillCounter({
  value,
  options,
  onChange,
}: {
  value: number;
  options: { value: number; label: string }[];
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`min-w-[3rem] rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              isActive
                ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-100 dark:bg-slate-50 dark:text-slate-900'
                : 'border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-400 dark:hover:text-slate-50'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900/40">
      <button
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center justify-between rounded-md transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-slate-900 group-hover:text-white dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-50 dark:group-hover:text-slate-900">
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700 transition-colors group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-slate-50">
            {title}
          </h3>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-all duration-300 group-hover:text-slate-700 dark:group-hover:text-slate-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="animate-in fade-in slide-in-from-top-1 mt-4 duration-200">{children}</div>
      )}
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
  const [range, setRange] = useState<[number, number]>([clamp(activeMin), clamp(activeMax)]);

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

