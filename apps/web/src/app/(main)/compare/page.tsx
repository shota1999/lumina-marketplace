'use client';

import { Check, GitCompareArrows, ImageOff, Minus, Star, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { Listing } from '@lumina/shared';
import { formatPrice } from '@lumina/shared';
import { Skeleton } from '@lumina/ui';

import { useCompare } from '@/hooks/use-compare';

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'High-Speed Wifi',
  pool: 'Private Pool',
  kitchen: "Chef's Kitchen",
  parking: 'Free Parking',
  'air-conditioning': 'Air Conditioning',
  heating: 'Heating',
  washer: 'Washer & Dryer',
  gym: 'Fitness Center',
  'hot-tub': 'Hot Tub',
  fireplace: 'Fireplace',
  tv: 'Smart TV',
  'pet-friendly': 'Pet Friendly',
  'beach-access': 'Beach Access',
  balcony: 'Balcony / Terrace',
  'ev-charger': 'EV Charger',
  concierge: 'Concierge Service',
  elevator: 'Elevator',
  'bbq-grill': 'BBQ Grill',
  sauna: 'Sauna',
  'game-room': 'Game Room',
};

function getAmenityLabel(amenity: string): string {
  return (
    AMENITY_LABELS[amenity] ?? amenity.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export default function ComparePage() {
  const { items, clear, toggle } = useCompare();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items.length === 0) {
      setListings([]);
      setLoading(false);
      return;
    }

    async function fetchListings() {
      setLoading(true);
      try {
        const responses = await Promise.all(
          items.map((id) => fetch(`/api/listings/${id}`).then((r) => r.json())),
        );
        const fetched = responses
          .filter((r) => r.success)
          .map((r) => {
            const raw = r.data?.listing ?? r.data;
            return raw as Listing;
          })
          .filter(Boolean);
        setListings(fetched);
      } catch {
        setListings([]);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, [items]);

  // Empty state
  if (!loading && items.length === 0) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-[1400px] flex-col items-center justify-center px-8 py-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <GitCompareArrows className="h-9 w-9 text-slate-400 dark:text-slate-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
          Compare listings
        </h1>
        <p className="mb-8 max-w-md text-slate-500 dark:text-slate-400">
          Add up to 4 listings from the search results to compare them side by side.
        </p>
        <Link
          href="/search"
          className="inline-flex items-center rounded-lg bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-all hover:opacity-90 dark:bg-slate-50 dark:text-slate-900"
        >
          Browse Rentals
        </Link>
      </main>
    );
  }

  // Loading state
  if (loading) {
    return (
      <main className="mx-auto max-w-[1400px] px-8 py-12">
        <div className="mb-16 flex items-end justify-between">
          <div>
            <Skeleton className="mb-2 h-12 w-72" />
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-xl md:grid-cols-4">
          {Array.from({ length: items.length || 2 }).map((_, i) => (
            <div key={i} className="space-y-4 bg-white p-6 dark:bg-slate-900">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="space-y-6 pt-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-8 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-12 w-full" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // Best value calculations
  const lowestPrice = Math.min(...listings.map((l) => l.pricePerNight));
  const highestRating = Math.max(...listings.map((l) => l.rating));
  const allAmenities = [...new Set(listings.flatMap((l) => l.amenities))].sort();

  return (
    <main className="mx-auto max-w-[1400px] px-8 py-12">
      {/* Header */}
      <header className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="mb-2 text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-slate-50">
            Compare Selections
          </h1>
          <p className="font-medium text-slate-500 dark:text-slate-400">
            {listings.length} of 4 slots used
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/search"
            className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-600 dark:text-slate-50 dark:hover:bg-slate-800"
          >
            Add more
          </Link>
          <button
            onClick={clear}
            className="rounded-lg px-4 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            Clear all
          </button>
        </div>
      </header>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-xl bg-slate-50 shadow-sm md:grid-cols-4 dark:bg-slate-800/50">
        {listings.map((listing, index) => {
          const primaryImage = listing.images.find((img) => img.isPrimary) ?? listing.images[0];
          const isBestPrice = listing.pricePerNight === lowestPrice && listings.length > 1;
          const isBestRating =
            listing.rating === highestRating && listing.rating > 0 && listings.length > 1;
          const isEvenCol = index % 2 === 1;

          return (
            <div
              key={listing.id}
              className={`group relative flex flex-col p-6 ${
                isEvenCol ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900'
              }`}
            >
              {/* Remove button */}
              <button
                onClick={() => toggle(listing.id)}
                className="absolute right-8 top-8 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Image */}
              <div className="mb-6 aspect-[4/3] overflow-hidden rounded-lg">
                {primaryImage ? (
                  <Image
                    src={primaryImage.url}
                    alt={primaryImage.alt || listing.title}
                    width={primaryImage.width}
                    height={primaryImage.height}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800">
                    <ImageOff className="h-8 w-8 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Title + Location */}
              <Link href={`/listings/${listing.slug}`} className="hover:underline">
                <h3 className="mb-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                  {listing.title}
                </h3>
              </Link>
              <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
                {listing.location.city}, {listing.location.country}
              </p>

              <div className="space-y-8">
                {/* Price */}
                <div
                  className={`-mx-6 flex flex-col gap-1 border-t border-slate-200/50 px-6 py-4 dark:border-slate-700/30 ${
                    isBestPrice ? 'bg-green-50/50 dark:bg-green-950/20' : ''
                  }`}
                >
                  {isBestPrice && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-700 dark:text-green-400">
                      Best Price
                    </span>
                  )}
                  <span
                    className={`text-2xl font-black ${
                      isBestPrice
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-slate-900 dark:text-slate-50'
                    }`}
                  >
                    {formatPrice(listing.pricePerNight, listing.currency)}{' '}
                    <span
                      className={`text-sm font-normal ${isBestPrice ? '' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                      / night
                    </span>
                  </span>
                </div>

                {/* Rating */}
                <div
                  className={`-mx-6 flex flex-col gap-1 border-t border-slate-200/50 px-6 py-4 dark:border-slate-700/30 ${
                    isBestRating ? 'bg-green-50/50 dark:bg-green-950/20' : ''
                  }`}
                >
                  {isBestRating && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-700 dark:text-green-400">
                      Highest Rated
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span
                      className={`font-bold ${
                        isBestRating
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-slate-900 dark:text-slate-50'
                      }`}
                    >
                      {listing.rating > 0 ? Number(listing.rating).toFixed(2) : 'N/A'}
                    </span>
                    {listing.reviewCount > 0 && (
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        ({listing.reviewCount})
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-y-6">
                  <div className="flex flex-col">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Beds
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {listing.bedrooms}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Baths
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {listing.bathrooms}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Guests
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {listing.maxGuests}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Type
                    </span>
                    <span className="font-medium capitalize text-slate-900 dark:text-slate-50">
                      {listing.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty slots */}
        {listings.length < 4 &&
          Array.from({ length: 4 - listings.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="group flex flex-col items-center justify-center border-2 border-dashed border-slate-200 p-6 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform group-hover:scale-110 dark:bg-slate-800 dark:text-slate-400">
                <GitCompareArrows className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-50">
                Add a listing
              </h3>
              <p className="mb-8 px-4 text-center text-sm text-slate-500 dark:text-slate-400">
                Compare more options to find your perfect stay.
              </p>
              <Link
                href="/search"
                className="rounded-lg bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-all active:scale-95 dark:bg-slate-50 dark:text-slate-900"
              >
                Browse Rentals
              </Link>
            </div>
          ))}
      </div>

      {/* Amenities Comparison Section */}
      {listings.length > 0 && allAmenities.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-10 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Amenities Checklist
          </h2>
          <div className="grid grid-cols-1 border-t border-slate-200/50 md:grid-cols-4 dark:border-slate-700/30">
            {allAmenities.map((amenity) => (
              <AmenityRow
                key={amenity}
                label={getAmenityLabel(amenity)}
                listings={listings}
                amenity={amenity}
              />
            ))}
          </div>
        </section>
      )}

      {/* CTA Strip */}
      {listings.length > 0 && (
        <div className="mt-20 flex flex-col items-center justify-between gap-6 rounded-2xl bg-slate-100/60 p-8 md:flex-row dark:bg-slate-800/40">
          <div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Found your dream getaway?
            </h4>
            <p className="text-slate-600 dark:text-slate-400">
              Secure your dates before someone else does.
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/search"
              className="rounded-lg border border-slate-300 bg-white px-8 py-3 text-sm font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
            >
              Book Consultation
            </Link>
            <Link
              href="/search"
              className="rounded-lg bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:opacity-90 dark:bg-slate-50 dark:text-slate-900"
            >
              Instant Book
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

function AmenityRow({
  label,
  listings,
  amenity,
}: {
  label: string;
  listings: Listing[];
  amenity: string;
}) {
  return (
    <>
      <div className="flex items-center border-t border-slate-200/50 py-6 text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-1 dark:border-slate-700/30 dark:text-slate-400">
        {label}
      </div>
      {listings.map((listing, index) => {
        const has = listing.amenities.includes(amenity);
        const isEvenCol = index % 2 === 1;
        return (
          <div
            key={listing.id}
            className={`flex items-center justify-center border-l border-t border-slate-200/50 py-6 dark:border-slate-700/30 ${
              isEvenCol ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''
            }`}
          >
            {has ? (
              <Check className="h-5 w-5 font-bold text-green-600 dark:text-green-400" />
            ) : (
              <Minus className="h-5 w-5 text-slate-300 dark:text-slate-600" />
            )}
          </div>
        );
      })}
      {/* Fill empty amenity columns for empty slots */}
      {listings.length < 4 &&
        Array.from({ length: 4 - listings.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="border-l border-t border-slate-200/50 py-6 dark:border-slate-700/30"
          />
        ))}
    </>
  );
}
