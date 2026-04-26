'use client';

import { Bath, BedDouble, Heart, MapPin, Star, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { type Listing, formatPrice } from '@lumina/shared';

import { useAnalytics } from '@/hooks/use-analytics';

function useStayNights(): number | null {
  const params = useSearchParams();
  const ci = params.get('checkIn');
  const co = params.get('checkOut');
  if (!ci || !co) return null;
  const a = new Date(`${ci}T00:00:00`);
  const b = new Date(`${co}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const nights = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return nights > 0 ? nights : null;
}

function useListingHref(slug: string): string {
  const params = useSearchParams();
  const carry = new URLSearchParams();
  for (const key of ['checkIn', 'checkOut', 'guests'] as const) {
    const v = params.get(key);
    if (v) carry.set(key, v);
  }
  const qs = carry.toString();
  return qs ? `/listings/${slug}?${qs}` : `/listings/${slug}`;
}

function useSelectedGuests(): number | null {
  const params = useSearchParams();
  const raw = params.get('guests');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface ListingCardProps {
  listing: Listing;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
  onCompare?: (id: string) => void;
  isComparing?: boolean;
}

export function ListingCard({ listing, onFavorite, isFavorited = false }: ListingCardProps) {
  const [imgError, setImgError] = useState(false);
  const { track } = useAnalytics();
  const primaryImage = listing.images.find((img) => img.isPrimary) ?? listing.images[0];
  const nights = useStayNights();
  const total = nights ? Number(listing.pricePerNight) * nights : null;
  const href = useListingHref(listing.slug);
  const partyGuests = useSelectedGuests();
  const partyTooBig = partyGuests !== null && partyGuests > listing.maxGuests;

  return (
    <Link
      href={href}
      onClick={() => track('listing_click', { listingId: listing.id })}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgb(15_23_42_/_0.18)] hover:ring-slate-300/80 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
    >
      {/* Image */}
      <div className="relative aspect-[3/2] overflow-hidden">
        {primaryImage && !imgError ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt || listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-100 dark:bg-slate-800">
            <span className="text-xs font-medium text-slate-400">No image</span>
          </div>
        )}

        {/* Inner border for image polish */}
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />

        {/* Featured + Category badges (top-left) */}
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          {listing.featured && (
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-600 shadow-sm ring-1 ring-amber-100">
              Featured
            </span>
          )}
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700 shadow-sm backdrop-blur-sm">
            {listing.category}
          </span>
        </div>

        {/* Favorite button */}
        {onFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavorite(listing.id);
            }}
            aria-label={
              isFavorited
                ? `Remove ${listing.title} from favorites`
                : `Add ${listing.title} to favorites`
            }
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95"
          >
            <Heart
              aria-hidden="true"
              strokeWidth={2.25}
              className={`h-[17px] w-[17px] transition-colors ${
                isFavorited ? 'fill-rose-500 text-rose-500' : 'text-slate-700'
              }`}
            />
          </button>
        )}
      </div>

      {/* Info — generous padding, full-width text rows */}
      <div className="flex flex-grow flex-col gap-2.5 p-5">
        {/* Title (full width, allows two lines so long names aren't cropped) */}
        <h3 className="line-clamp-2 min-h-[2.6em] text-[15px] font-semibold leading-snug tracking-tight text-slate-900 dark:text-slate-50">
          {listing.title}
        </h3>

        {/* Location + rating on one row, wrapping if needed */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="flex min-w-0 items-center gap-1 text-[13px] text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {listing.location.city}, {listing.location.country}
            </span>
          </p>
          {listing.rating > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-slate-900 dark:text-slate-50">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {Number(listing.rating).toFixed(2)}
              {listing.reviewCount > 0 && (
                <span className="font-normal text-slate-400">({listing.reviewCount})</span>
              )}
            </span>
          )}
        </div>

        {/* Meta — wraps gracefully instead of being clipped */}
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500 dark:text-slate-400">
          <li>
            {listing.bedrooms} {listing.bedrooms === 1 ? 'bed' : 'beds'}
          </li>
          <li className="text-slate-300 dark:text-slate-600">·</li>
          <li>
            {listing.bathrooms} {listing.bathrooms === 1 ? 'bath' : 'baths'}
          </li>
          <li className="text-slate-300 dark:text-slate-600">·</li>
          <li>
            {partyGuests !== null
              ? `Your party ${partyGuests} of ${listing.maxGuests}`
              : `Up to ${listing.maxGuests} guests`}
          </li>
        </ul>
        {partyTooBig && (
          <p className="-mt-1 text-[11px] font-medium text-amber-600">
            Sleeps only {listing.maxGuests}
          </p>
        )}

        {/* Price footer */}
        <div className="mt-auto border-t border-slate-100 pt-4 dark:border-slate-800">
          {nights && total !== null ? (
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {formatPrice(total, listing.currency)}
                <span className="ml-1 text-xs font-medium text-slate-400">
                  total · {nights} {nights === 1 ? 'night' : 'nights'}
                </span>
              </span>
              <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {formatPrice(listing.pricePerNight, listing.currency)} / night
              </span>
            </div>
          ) : (
            <span className="flex items-baseline gap-1">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {formatPrice(listing.pricePerNight, listing.currency)}
              </span>
              <span className="text-xs font-medium text-slate-400">/ night</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ListingCardHorizontal({
  listing,
  onFavorite,
  isFavorited = false,
}: ListingCardProps) {
  const [imgError, setImgError] = useState(false);
  const { track } = useAnalytics();
  const primaryImage = listing.images.find((img) => img.isPrimary) ?? listing.images[0];
  const nights = useStayNights();
  const total = nights ? Number(listing.pricePerNight) * nights : null;
  const href = useListingHref(listing.slug);
  const partyGuests = useSelectedGuests();
  const partyTooBig = partyGuests !== null && partyGuests > listing.maxGuests;

  return (
    <Link
      href={href}
      onClick={() => track('listing_click', { listingId: listing.id })}
      className="group flex h-44 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-18px_rgba(15,23,42,0.18)] hover:ring-slate-300/80 sm:h-48 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
    >
      {/* Image (fixed-ratio square-ish panel) */}
      <div className="relative aspect-[4/3] h-full shrink-0 overflow-hidden">
        {primaryImage && !imgError ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt || listing.title}
            fill
            sizes="280px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-100 dark:bg-slate-800">
            <span className="text-xs font-medium text-slate-400">No image</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />

        {listing.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-600 shadow-sm ring-1 ring-amber-100">
            Featured
          </span>
        )}

        {onFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavorite(listing.id);
            }}
            aria-label={
              isFavorited
                ? `Remove ${listing.title} from favorites`
                : `Add ${listing.title} to favorites`
            }
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95"
          >
            <Heart
              aria-hidden="true"
              strokeWidth={2.25}
              className={`h-[17px] w-[17px] transition-colors ${
                isFavorited ? 'fill-rose-500 text-rose-500' : 'text-slate-700'
              }`}
            />
          </button>
        )}
      </div>

      {/* Content (compact, no description, no separate arrow CTA) */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-5">
        {/* Top: category + rating row, then title */}
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              {listing.category}
            </span>
            {listing.rating > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {Number(listing.rating).toFixed(1)}
                {listing.reviewCount > 0 && (
                  <span className="font-normal text-slate-400">({listing.reviewCount})</span>
                )}
              </span>
            )}
          </div>
          <h3 className="line-clamp-1 text-[17px] font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            {listing.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 truncate text-[13px] text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {listing.location.city}, {listing.location.country}
          </p>
        </div>

        {/* Meta */}
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500 dark:text-slate-400">
          <li className="flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            {listing.bedrooms} bed{listing.bedrooms !== 1 ? 's' : ''}
          </li>
          <li className="flex items-center gap-1.5">
            <Bath className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            {listing.bathrooms} bath{listing.bathrooms !== 1 ? 's' : ''}
          </li>
          <li className={`flex items-center gap-1.5 ${partyTooBig ? 'text-amber-600' : ''}`}>
            <Users
              className={`h-3.5 w-3.5 ${partyTooBig ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}
            />
            {partyGuests !== null
              ? `${partyGuests} / ${listing.maxGuests}`
              : `${listing.maxGuests}`}
          </li>
        </ul>

        {/* Price footer */}
        <div className="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          {nights && total !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {formatPrice(total, listing.currency)}
              </span>
              <span className="text-[11px] font-medium text-slate-400">total · {nights}n</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {formatPrice(listing.pricePerNight, listing.currency)}
              </span>
              <span className="text-[11px] font-medium text-slate-400">/ night</span>
            </div>
          )}
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 transition-colors group-hover:text-slate-900 dark:group-hover:text-slate-50">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
