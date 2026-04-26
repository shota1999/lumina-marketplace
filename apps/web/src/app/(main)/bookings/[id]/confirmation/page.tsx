'use client';

import { CalendarDays, CheckCircle2, Loader2, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { formatPrice } from '@lumina/shared';

interface BookingDetails {
  id: string;
  status: string;
  listingTitle: string;
  startDate: string;
  endDate: string;
  guests: number;
  totalPrice: number;
  currency: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BookingConfirmationPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const bookingId = params.id;
  const sessionId = searchParams.get('session_id');

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    async function fetchBooking() {
      try {
        const url = sessionId
          ? `/api/payments/${bookingId}?session_id=${sessionId}`
          : `/api/payments/${bookingId}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error?.message ?? 'Failed to load booking details');
          return;
        }

        setBooking(data.data);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [bookingId, sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[70vh]">
      {/* Decorative gradient */}
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-slate-50 to-transparent dark:from-slate-950/60 dark:to-transparent" />

      <div className="relative flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-lg">
          {/* Main confirmation card */}
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            {/* Success icon */}
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
                <CheckCircle2
                  className="h-12 w-12 text-slate-900 dark:text-slate-100"
                  strokeWidth={1.5}
                />
              </div>
            </div>

            {/* Heading */}
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Booking Confirmed!
            </h1>

            {/* Subtitle */}
            <p className="mb-8 text-slate-500 dark:text-slate-400">
              Your reservation has been confirmed. You&apos;ll receive a confirmation email shortly.
            </p>

            {/* Booking summary */}
            {booking && !error ? (
              <div className="mb-8 rounded-2xl bg-slate-50 p-6 text-left ring-1 ring-slate-100 dark:bg-slate-800/50 dark:ring-slate-700/50">
                <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Booking Summary
                </p>

                {/* Listing name */}
                <p className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {booking.listingTitle}
                </p>

                <div className="space-y-3">
                  {/* Dates */}
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Dates
                      </p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {formatDate(booking.startDate)} &ndash; {formatDate(booking.endDate)}
                      </p>
                    </div>
                  </div>

                  {/* Guests */}
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Guests
                      </p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {booking.guests} guest{booking.guests !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Total Paid
                    </p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
                      {formatPrice(booking.totalPrice, booking.currency)}
                    </p>
                  </div>
                </div>
              </div>
            ) : error ? (
              <p className="mb-8 text-sm text-slate-400 dark:text-slate-500">
                {bookingId && <>Booking reference: {bookingId.slice(0, 8).toUpperCase()}</>}
              </p>
            ) : null}

            {/* CTA buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/bookings"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                View My Bookings
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Continue Browsing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
