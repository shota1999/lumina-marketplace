'use client';

import {
  CalendarDays,
  Check,
  ChevronDown,
  Heart,
  Loader2,
  LogIn,
  Minus,
  Plus,
  Share2,
  Shield,
  Star,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { formatPrice } from '@lumina/shared';
import { Button } from '@lumina/ui';

import { DateRangePicker, toIsoDate, type DateRangeValue } from '@/components/date-range-picker';
import { useAnalytics } from '@/hooks/use-analytics';
import { useFavorites } from '@/hooks/use-favorites';
import { toast } from '@/hooks/use-toast';

interface BookingSidebarProps {
  listingId: string;
  pricePerNight: number;
  currency: string;
  rating: number;
  reviewCount: number;
  maxGuests: number;
}

type BookingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'pending'; bookingId: string; nights: number; totalPrice: number }
  | { status: 'confirming' }
  | { status: 'confirmed'; bookingId: string; nights: number; totalPrice: number }
  | { status: 'error'; message: string };

function getDefaultCheckin(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0]!;
}

function getDefaultCheckout(): string {
  const d = new Date();
  d.setDate(d.getDate() + 12);
  return d.toISOString().split('T')[0]!;
}

export function BookingSidebar({
  listingId,
  pricePerNight,
  currency,
  rating,
  reviewCount,
  maxGuests,
}: BookingSidebarProps) {
  const { track } = useAnalytics();
  const { toggle: toggleFavorite, isFavorited } = useFavorites();
  const saved = isFavorited(listingId);
  const searchParams = useSearchParams();

  const initialCheckin = (() => {
    const fromUrl = searchParams.get('checkIn');
    return fromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl) ? fromUrl : getDefaultCheckin();
  })();
  const initialCheckout = (() => {
    const fromUrl = searchParams.get('checkOut');
    return fromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl) ? fromUrl : getDefaultCheckout();
  })();
  const initialGuests = (() => {
    const fromUrl = Number(searchParams.get('guests'));
    if (Number.isFinite(fromUrl) && fromUrl > 0) {
      return Math.min(maxGuests, Math.max(1, fromUrl));
    }
    return Math.min(maxGuests, 1);
  })();

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    checkIn: initialCheckin,
    checkOut: initialCheckout,
  });
  const checkin = dateRange.checkIn ?? '';
  const checkout = dateRange.checkOut ?? '';
  const [guests, setGuests] = useState(initialGuests);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!guestsOpen) return;
    const handlePointer = (e: MouseEvent) => {
      if (!guestsRef.current?.contains(e.target as Node)) setGuestsOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGuestsOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [guestsOpen]);
  const [bookingState, setBookingState] = useState<BookingState>({ status: 'idle' });
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!listingId) return;
    const start = toIsoDate(new Date());
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    const end = toIsoDate(endDate);

    fetch(`/api/listings/${listingId}/availability?startDate=${start}&endDate=${end}`, {
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          res: {
            success?: boolean;
            data?: {
              blocks?: Array<{ startDate: string; endDate: string }>;
              bookedDates?: Array<{ startDate: string; endDate: string }>;
            };
          } | null,
        ) => {
          if (!res?.success || !res.data) return;
          const set = new Set<string>();
          const addRange = (startIso: string, endIso: string, inclusive: boolean) => {
            const s = new Date(startIso);
            const e = new Date(endIso);
            const cursor = new Date(s);
            while (inclusive ? cursor <= e : cursor < e) {
              set.add(toIsoDate(cursor));
              cursor.setDate(cursor.getDate() + 1);
            }
          };
          // Host-blocked dates are inclusive on both ends
          for (const b of res.data.blocks ?? []) addRange(b.startDate, b.endDate, true);
          // Bookings: check-out day is free for turnover (exclusive)
          for (const b of res.data.bookedDates ?? []) addRange(b.startDate, b.endDate, false);
          setUnavailable(set);
        },
      )
      .catch(() => {});
  }, [listingId]);

  const nights = useMemo(() => {
    if (!checkin || !checkout) return 0;
    const start = new Date(checkin);
    const end = new Date(checkout);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [checkin, checkout]);

  const cleaningFee = 150;
  const serviceFee = Math.round(pricePerNight * nights * 0.12);
  const subtotal = pricePerNight * nights;
  const total = subtotal + cleaningFee + serviceFee;

  const dateError = useMemo(() => {
    if (!checkin || !checkout) return null;
    const start = new Date(checkin);
    const end = new Date(checkout);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (start < now) return 'Check-in cannot be in the past';
    if (start >= end) return 'Check-out must be after check-in';
    return null;
  }, [checkin, checkout]);

  const handleReserve = useCallback(async () => {
    if (dateError || nights <= 0) return;

    setBookingState({ status: 'loading' });

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, startDate: checkin, endDate: checkout, guests }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg =
          data.error?.code === 'UNAUTHORIZED'
            ? 'LOGIN_REQUIRED'
            : (data.error?.message ?? 'Something went wrong');
        setBookingState({ status: 'error', message: msg });
        if (msg !== 'LOGIN_REQUIRED') {
          toast({ title: 'Reservation failed', description: msg, variant: 'destructive' });
        }
        return;
      }

      track('conversion', { listingId, bookingId: data.data.id, step: 'reserved' });
      // Navigate directly to Stripe checkout — booking is in `pending` state
      // until payment completes, at which point the webhook (or the
      // confirmation page's verifyCheckoutSession fallback) flips it to
      // `confirmed`.
      window.location.href = `/bookings/${data.data.id}/checkout`;
    } catch {
      setBookingState({ status: 'error', message: 'Network error. Please try again.' });
      toast({
        title: 'Network error',
        description: 'Could not reach the server. Please try again.',
        variant: 'destructive',
      });
    }
  }, [listingId, checkin, checkout, guests, dateError, nights]);

  const handleConfirm = useCallback(async () => {
    if (bookingState.status !== 'pending') return;

    const { bookingId, nights: n, totalPrice: tp } = bookingState;
    setBookingState({ status: 'confirming' });

    try {
      const res = await fetch(`/api/bookings/${bookingId}/confirm`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.error?.message ?? 'Confirmation failed';
        setBookingState({ status: 'error', message: msg });
        toast({ title: 'Confirmation failed', description: msg, variant: 'destructive' });
        return;
      }

      setBookingState({ status: 'confirmed', bookingId, nights: n, totalPrice: tp });
      toast({
        title: 'Booking confirmed!',
        description: 'Your reservation is all set. Have a great stay!',
      });
    } catch {
      setBookingState({ status: 'error', message: 'Network error. Please try again.' });
      toast({
        title: 'Network error',
        description: 'Could not reach the server. Please try again.',
        variant: 'destructive',
      });
    }
  }, [bookingState]);

  // Login required prompt
  if (bookingState.status === 'error' && bookingState.message === 'LOGIN_REQUIRED') {
    return (
      <div className="sticky top-28 rounded-2xl border border-slate-200/50 bg-white p-8 shadow-[0px_20px_40px_-10px_rgba(3,7,18,0.06)] dark:border-slate-800/50 dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <LogIn className="h-7 w-7 text-slate-500" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
            Sign in to book
          </h3>
          <p className="mb-4 text-sm text-slate-500">
            Create an account or sign in to reserve this listing.
          </p>
          <Button className="w-full rounded-xl" size="lg" asChild>
            <a href="/auth/login">Sign in</a>
          </Button>
          <button
            className="mt-3 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            onClick={() => setBookingState({ status: 'idle' })}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Pending state — confirm booking
  if (bookingState.status === 'pending' || bookingState.status === 'confirming') {
    const isPending = bookingState.status === 'pending';
    const bId = isPending ? bookingState.bookingId : '';
    const bNights = isPending ? bookingState.nights : 0;
    const bTotal = isPending ? bookingState.totalPrice : 0;

    return (
      <div className="sticky top-28 rounded-2xl border border-slate-200/50 bg-white p-8 shadow-[0px_20px_40px_-10px_rgba(3,7,18,0.06)] dark:border-slate-800/50 dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30">
            <Shield className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
            Confirm your booking
          </h3>
          <p className="mb-1 text-sm text-slate-500">
            {bNights} night{bNights !== 1 ? 's' : ''} &middot; {formatPrice(bTotal, currency)}
          </p>
          <p className="mb-4 text-xs text-slate-400">Booking ID: {bId.slice(0, 8)}</p>
          <button
            className="w-full rounded-xl bg-slate-900 py-4 text-lg font-bold text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900"
            disabled={bookingState.status === 'confirming'}
            onClick={handleConfirm}
          >
            {bookingState.status === 'confirming' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirming...
              </span>
            ) : (
              'Confirm booking'
            )}
          </button>
          <p className="mt-2 text-xs text-slate-400">No payment required — this is a simulation</p>
          {isPending && (
            <button
              className="mt-3 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              onClick={() => setBookingState({ status: 'idle' })}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // Confirmed state
  if (bookingState.status === 'confirmed') {
    return (
      <div className="sticky top-28 rounded-2xl border border-slate-200/50 bg-white p-8 shadow-[0px_20px_40px_-10px_rgba(3,7,18,0.06)] dark:border-slate-800/50 dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/30">
            <Check className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
            Booking confirmed!
          </h3>
          <p className="mb-4 text-sm text-slate-500">
            {bookingState.nights} night{bookingState.nights !== 1 ? 's' : ''} &middot;{' '}
            {formatPrice(bookingState.totalPrice, currency)}
          </p>
          <p className="text-xs text-slate-400">Booking ID: {bookingState.bookingId.slice(0, 8)}</p>
          <button
            className="mt-4 w-full rounded-xl border border-slate-900 py-3 font-bold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => setBookingState({ status: 'idle' })}
          >
            Book another stay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-28 rounded-2xl border border-slate-200/50 bg-white p-8 shadow-[0px_20px_40px_-10px_rgba(3,7,18,0.06)] dark:border-slate-800/50 dark:bg-slate-900">
      {/* Price header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {formatPrice(pricePerNight, currency)}
          </span>
          <span className="text-slate-500 dark:text-slate-400"> / night</span>
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {rating.toFixed(2)}
        </div>
      </div>

      {/* Date & guest picker — structured border box */}
      <div className="relative z-10 mb-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          unavailable={unavailable}
          align="right"
          renderTrigger={({ toggleOpen, value }) => (
            <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={toggleOpen}
                className="cursor-pointer rounded-tl-xl border-r border-slate-200 p-3 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:border-slate-700 dark:hover:bg-slate-800/50 dark:focus:bg-slate-800/50"
              >
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-50">
                  Check-in
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  {value.checkIn
                    ? new Date(value.checkIn).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Add date'}
                </span>
              </button>
              <button
                type="button"
                onClick={toggleOpen}
                className="cursor-pointer rounded-tr-xl p-3 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:hover:bg-slate-800/50 dark:focus:bg-slate-800/50"
              >
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-50">
                  Checkout
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  {value.checkOut
                    ? new Date(value.checkOut).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Add date'}
                </span>
              </button>
            </div>
          )}
        />
        <div ref={guestsRef} className="relative">
          <button
            type="button"
            onClick={() => setGuestsOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={guestsOpen}
            className="flex w-full items-center justify-between rounded-b-xl p-3 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:hover:bg-slate-800/50 dark:focus:bg-slate-800/50"
          >
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-50">
                Guests
              </span>
              <span className="mt-0.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {guests} {guests === 1 ? 'guest' : 'guests'}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${
                guestsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {guestsOpen && (
            <div
              role="dialog"
              aria-label="Select number of guests"
              className="absolute right-0 top-full z-[60] mt-3 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Guests</p>
                  <p className="mt-0.5 text-xs text-slate-500">Maximum {maxGuests}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGuests((n) => Math.max(1, n - 1))}
                    disabled={guests <= 1}
                    aria-label="Decrease guests"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                    {guests}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGuests((n) => Math.min(maxGuests, n + 1))}
                    disabled={guests >= maxGuests}
                    aria-label="Increase guests"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setGuestsOpen(false)}
                  className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {dateError && <p className="mb-3 text-xs text-red-500">{dateError}</p>}

      {/* Reserve button */}
      <button
        id="reserve"
        className="mb-4 w-full rounded-xl bg-slate-900 py-4 text-lg font-bold text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900"
        disabled={!!dateError || nights <= 0 || bookingState.status === 'loading'}
        onClick={handleReserve}
      >
        {bookingState.status === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reserving...
          </span>
        ) : (
          'Reserve Now'
        )}
      </button>
      <p className="mb-6 text-center text-sm text-slate-500">You won&apos;t be charged yet</p>

      {/* Error */}
      {bookingState.status === 'error' && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
          {bookingState.message}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setBookingState({ status: 'idle' })}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Price breakdown */}
      {nights > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between text-slate-700 dark:text-slate-300">
            <span className="underline decoration-slate-300/30">
              {formatPrice(pricePerNight, currency)} x {nights} night{nights !== 1 ? 's' : ''}
            </span>
            <span>{formatPrice(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-slate-700 dark:text-slate-300">
            <span className="underline decoration-slate-300/30">Cleaning fee</span>
            <span>{formatPrice(cleaningFee, currency)}</span>
          </div>
          <div className="flex justify-between text-slate-700 dark:text-slate-300">
            <span className="underline decoration-slate-300/30">Lumina Service fee</span>
            <span>{formatPrice(serviceFee, currency)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200/50 pt-4 text-lg font-bold text-slate-900 dark:border-slate-800/50 dark:text-slate-50">
            <span>Total</span>
            <span>{formatPrice(total, currency)}</span>
          </div>
        </div>
      )}

      {/* Trust badge */}
      <div className="mt-8 flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
        <Shield className="h-5 w-5 shrink-0 fill-slate-600 text-slate-600 dark:fill-slate-400 dark:text-slate-400" />
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-900 dark:text-slate-50">
            Grand Reserve Guarantee.
          </span>{' '}
          We cover every booking so you can travel with confidence.
        </p>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex justify-center gap-2">
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
          onClick={() => toggleFavorite(listingId)}
        >
          <Heart className={`h-4 w-4 ${saved ? 'fill-red-500 text-red-500' : ''}`} />
          {saved ? 'Saved' : 'Save'}
        </button>
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href).then(
              () => toast({ title: 'Link copied', description: 'Share this listing with friends' }),
              () => toast({ title: 'Could not copy link', variant: 'destructive' }),
            );
          }}
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>
    </div>
  );
}
