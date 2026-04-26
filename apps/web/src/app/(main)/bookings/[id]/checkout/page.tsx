'use client';

import { ArrowLeft, CalendarDays, CreditCard, Loader2, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { formatPrice } from '@lumina/shared';

import { toast } from '@/hooks/use-toast';

interface BookingDetails {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  guests: number;
  totalPrice: number;
  listing: {
    id: string;
    title: string;
    slug: string;
    city: string;
    country: string;
    primaryImage: string | null;
    pricePerNight: number;
    currency: string;
  };
}

interface PriceQuote {
  nights: number;
  pricePerNight: number;
  subtotal: number;
  serviceFee: number;
  total: number;
  currency: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CheckoutPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const bookingId = params.id;
  const canceled = searchParams.get('canceled') === '1';

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [priceQuote, setPriceQuote] = useState<PriceQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (canceled) {
      toast({
        title: 'Payment canceled',
        description: 'You can review the details below and try paying again when ready.',
      });
    }
  }, [canceled]);

  useEffect(() => {
    if (!bookingId) return;

    async function fetchBookingDetails() {
      try {
        const res = await fetch(`/api/payments/${bookingId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          const msg = data.error?.message ?? 'Failed to load booking details';
          setError(msg);
          toast({
            title: 'Error',
            description: msg,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const raw = data.data as BookingDetails;
        // Coerce numerics defensively — Drizzle's decimal returns strings.
        const bookingData: BookingDetails = {
          ...raw,
          totalPrice: Number(raw.totalPrice),
          guests: Number(raw.guests),
          listing: {
            ...raw.listing,
            pricePerNight: Number(raw.listing.pricePerNight),
          },
        };
        setBooking(bookingData);

        // Fetch price quote (may 4xx if schema requires guests — fallback handles it)
        let quoteData: { success?: boolean; data?: PriceQuote } | null = null;
        try {
          const quoteRes = await fetch(
            `/api/listings/${bookingData.listing.id}/price-quote?` +
              new URLSearchParams({
                startDate: bookingData.startDate,
                endDate: bookingData.endDate,
                guests: String(bookingData.guests),
              }),
          );
          if (quoteRes.ok) {
            quoteData = await quoteRes.json();
          }
        } catch {
          // Non-JSON or network — fall through to local calc
        }

        if (quoteData?.success && quoteData.data) {
          setPriceQuote(quoteData.data);
        } else {
          // Fallback: compute from booking data
          const start = new Date(bookingData.startDate + 'T00:00:00');
          const end = new Date(bookingData.endDate + 'T00:00:00');
          const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          const pricePerNight = Number(bookingData.listing.pricePerNight);
          const subtotal = pricePerNight * nights;
          const serviceFee = Math.round(subtotal * 0.12);
          setPriceQuote({
            nights,
            pricePerNight,
            subtotal,
            serviceFee,
            total: subtotal + serviceFee,
            currency: bookingData.listing.currency,
          });
        }
      } catch {
        setError('Network error. Please try again.');
        toast({
          title: 'Network error',
          description: 'Could not load booking details.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchBookingDetails();
  }, [bookingId]);

  const handleProceedToPayment = useCallback(async () => {
    if (!bookingId) return;

    setPaying(true);

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.error?.message ?? 'Failed to create checkout session';
        toast({
          title: 'Payment error',
          description: msg,
          variant: 'destructive',
        });
        setPaying(false);
        return;
      }

      window.location.href = data.data.sessionUrl;
    } catch {
      toast({
        title: 'Network error',
        description: 'Could not initiate payment. Please try again.',
        variant: 'destructive',
      });
      setPaying(false);
    }
  }, [bookingId]);

  // Loading state
  if (loading) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-20">
        <div className="w-full max-w-3xl">
          {/* Back link skeleton */}
          <div className="mb-8 h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

          <div className="grid gap-8 lg:grid-cols-5">
            {/* Left column skeleton */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
                <div className="mb-6 h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-4">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" />
                </div>
              </div>
            </div>

            {/* Right column skeleton */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
                <div className="space-y-4">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" />
                  <div className="mt-6 h-12 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-20">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/30">
            <CreditCard className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-50">
            Checkout Error
          </h1>
          <p className="mb-6 text-sm text-red-600 dark:text-red-400">
            {error ?? 'Booking not found.'}
          </p>
          <Link
            href="/bookings"
            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:brightness-110 dark:bg-slate-50 dark:text-slate-900"
          >
            Return to Bookings
          </Link>
        </div>
      </div>
    );
  }

  const currency = priceQuote?.currency ?? booking.listing.currency ?? 'USD';

  return (
    <div className="container max-w-4xl py-8 lg:py-12">
      {/* Back link */}
      <Link
        href="/bookings"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to bookings
      </Link>

      {/* Page title */}
      <h1 className="mb-8 text-2xl font-bold text-slate-900 dark:text-slate-50">
        Confirm &amp; pay
      </h1>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left column — Booking summary */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            {/* Listing name */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Property
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">
              {booking.listing.title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {booking.listing.city}, {booking.listing.country}
            </p>

            {/* Divider */}
            <div className="my-6 border-t border-slate-100 dark:border-slate-800" />

            {/* Dates */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Check-in
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {formatDate(booking.startDate)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Check-out
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {formatDate(booking.endDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-slate-100 dark:border-slate-800" />

            {/* Guests */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Guests
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {booking.guests} guest{booking.guests !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-slate-100 dark:border-slate-800" />

            {/* Booking ID */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Booking ID
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                {booking.id}
              </p>
            </div>

            {/* Trust badge */}
            <div className="mt-8 flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <Shield className="h-5 w-5 shrink-0 fill-slate-600 text-slate-600 dark:fill-slate-400 dark:text-slate-400" />
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-900 dark:text-slate-50">Secure Payment.</span>{' '}
                Your payment is processed securely through Stripe. We never store your card details.
              </p>
            </div>
          </div>
        </div>

        {/* Right column — Price breakdown & Pay button */}
        <div className="lg:col-span-2">
          <div className="sticky top-28 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Price Details
            </p>

            {priceQuote ? (
              <div className="mt-4 space-y-4">
                {/* Nightly breakdown */}
                <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                  <span className="underline decoration-slate-300/30">
                    {formatPrice(priceQuote.pricePerNight, currency)} x {priceQuote.nights} night
                    {priceQuote.nights !== 1 ? 's' : ''}
                  </span>
                  <span>{formatPrice(priceQuote.subtotal, currency)}</span>
                </div>

                {/* Service fee */}
                <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                  <span className="underline decoration-slate-300/30">Lumina Service fee</span>
                  <span>{formatPrice(priceQuote.serviceFee, currency)}</span>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 dark:border-slate-800" />

                {/* Total */}
                <div className="flex items-center justify-between text-lg font-bold text-slate-900 dark:text-slate-50">
                  <span>Total</span>
                  <span>{formatPrice(priceQuote.total, currency)}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800/50" />
              </div>
            )}

            {/* Stripe test-mode hint */}
            <div className="mt-6 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed dark:border-amber-700/50 dark:bg-amber-950/20">
              <p className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                Test mode
              </p>
              <p className="text-amber-900/80 dark:text-amber-200/80">
                Use Stripe&apos;s test card on the next screen:
              </p>
              <ul className="mt-1.5 space-y-0.5 font-mono text-[11px] text-amber-900 dark:text-amber-100">
                <li>
                  Card: <span className="font-bold">4242 4242 4242 4242</span>
                </li>
                <li>Expiry: any future date (e.g. 12&nbsp;/&nbsp;34)</li>
                <li>CVC: any 3 digits · ZIP: any 5 digits</li>
              </ul>
            </div>

            {/* Pay button */}
            <button
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-base font-bold text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900"
              disabled={paying || !priceQuote}
              onClick={handleProceedToPayment}
            >
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Proceed to Payment
                </>
              )}
            </button>

            <p className="mt-3 text-center text-xs text-slate-400">
              You will be redirected to Stripe for secure payment
            </p>

            {/* Stripe badge */}
            <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <Shield className="h-3.5 w-3.5" />
              <span>Secured by Stripe</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
