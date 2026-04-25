'use client';

import { ArrowRight, Bath, BedDouble, Heart, MapPin, Star, Users } from 'lucide-react';
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

export function ListingCard({
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
                <span className="font-normal text-slate-400">
                  ({listing.reviewCount})
                </span>
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
      className="group flex overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg hover:ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
    >
      {/* Image */}
      <div className="relative w-64 shrink-0 overflow-hidden sm:w-72">
        {primaryImage && !imgError ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt || listing.title}
            fill
            sizes="288px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-100 dark:bg-slate-800">
            <span className="text-xs font-medium text-slate-400">No image</span>
          </div>
        )}

        {/* Favorite button */}
        {onFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavorite(listing.id);
            }}
            aria-label={isFavorited ? `Remove ${listing.title} from favorites` : `Add ${listing.title} to favorites`}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-all hover:scale-110 hover:bg-white/30"
          >
            <Heart
              aria-hidden="true"
              className={`h-4 w-4 ${
                isFavorited
                  ? 'fill-red-500 text-red-500'
                  : 'text-white drop-shadow-sm'
              }`}
            />
          </button>
        )}

        {/* Featured badge */}
        {listing.featured && (
          <div className="absolute left-3 top-3 rounded-full bg-amber-500/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            Featured
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-6">
        <div>
          {/* Top row: title + rating */}
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold capitalize text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {listing.category}
                </span>
              </div>
              <h3 className="line-clamp-1 text-lg font-bold text-slate-900 dark:text-slate-50">
                {listing.title}
              </h3>
            </div>
            {listing.rating > 0 && (
              <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 dark:bg-amber-950/30">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  {Number(listing.rating).toFixed(1)}
                </span>
                {listing.reviewCount > 0 && (
                  <span className="text-xs text-amber-600/60 dark:text-amber-400/50">
                    ({listing.reviewCount})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Location */}
          <p className="mb-3 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5" />
            {listing.location.city}, {listing.location.country}
          </p>

          {/* Description preview */}
          {listing.description && (
            <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {listing.description}
            </p>
          )}
        </div>

        {/* Bottom area: meta + price (separated rows so they never crowd) */}
        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <BedDouble className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              {listing.bedrooms} bed{listing.bedrooms !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Bath className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              {listing.bathrooms} bath{listing.bathrooms !== 1 ? 's' : ''}
            </span>
            <span
              className={`flex items-center gap-1.5 text-xs font-medium ${
                partyTooBig
                  ? 'text-amber-600'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Users
                className={`h-4 w-4 ${
                  partyTooBig ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              {partyGuests !== null
                ? `Your party ${partyGuests} of ${listing.maxGuests}`
                : `${listing.maxGuests} guest${listing.maxGuests !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              {nights && total !== null ? (
                <>
                  <span className="block text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                    {formatPrice(total, listing.currency)}
                    <span className="ml-1 text-xs font-medium text-slate-400">
                      total · {nights} {nights === 1 ? 'night' : 'nights'}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    {formatPrice(listing.pricePerNight, listing.currency)} / night
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                    {formatPrice(listing.pricePerNight, listing.currency)}
                    <span className="ml-1 text-xs font-medium text-slate-400">/ night</span>
                  </span>
                </>
              )}
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition-transform group-hover:scale-110 dark:bg-slate-50 dark:text-slate-900">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
