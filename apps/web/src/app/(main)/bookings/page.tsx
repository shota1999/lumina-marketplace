'use client';

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  ImageOff,
  Loader2,
  MapPin,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { formatPrice } from '@lumina/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@lumina/ui';

import { toast } from '@/hooks/use-toast';

interface BookingItem {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  startDate: string;
  endDate: string;
  totalPrice: number;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    slug: string;
    city: string;
    country: string;
    primaryImage: string | null;
  };
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = s.toLocaleDateString('en-US', opts);
  const endStr = e.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

function calculateNights(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    badge: 'outline' as const,
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
    badge: 'default' as const,
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
    badge: 'destructive' as const,
  },
};

function BookingCard({
  booking,
  onCancel,
}: {
  booking: BookingItem;
  onCancel?: (id: string) => void;
}) {
  const config = statusConfig[booking.status];
  const StatusIcon = config.icon;
  const nights = calculateNights(booking.startDate, booking.endDate);
  const isPast = new Date(booking.endDate + 'T00:00:00') < new Date();
  const canCancel = !isPast && (booking.status === 'pending' || booking.status === 'confirmed');
  const [cancelling, setCancelling] = useState(false);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative aspect-[16/9] w-full shrink-0 sm:aspect-square sm:w-48">
          {booking.listing.primaryImage ? (
            <Image
              src={booking.listing.primaryImage}
              alt={booking.listing.title}
              fill
              sizes="(max-width: 640px) 100vw, 192px"
              className="object-cover"
            />
          ) : (
            <div className="bg-muted flex h-full w-full items-center justify-center">
              <ImageOff className="text-muted-foreground h-8 w-8" />
            </div>
          )}
          {isPast && booking.status === 'confirmed' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="bg-background/90 rounded-full px-3 py-1 text-xs font-medium">
                Completed
              </span>
            </div>
          )}
        </div>

        {/* Details */}
        <CardContent className="flex flex-1 flex-col justify-between p-5">
          <div>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <Link
                  href={`/listings/${booking.listing.slug}`}
                  className="font-semibold hover:underline"
                >
                  {booking.listing.title}
                </Link>
                <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-sm">
                  <MapPin className="h-3 w-3" />
                  {booking.listing.city}, {booking.listing.country}
                </p>
              </div>
              <Badge variant={config.badge} className="shrink-0">
                <StatusIcon className="mr-1 h-3 w-3" />
                {config.label}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDateRange(booking.startDate, booking.endDate)}
              </span>
              <span className="text-muted-foreground">
                {nights} night{nights !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t pt-3">
            <div>
              <span className="text-lg font-bold">{formatPrice(booking.totalPrice)}</span>
              <span className="text-muted-foreground ml-1 text-sm">total</span>
            </div>
            <div className="flex gap-2">
              {canCancel && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={cancelling}
                  onClick={async () => {
                    setCancelling(true);
                    try {
                      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
                        method: 'POST',
                      });
                      const data = await res.json();
                      if (!res.ok || !data.success) {
                        toast({
                          title: 'Cancel failed',
                          description: data.error?.message ?? 'Something went wrong',
                          variant: 'destructive',
                        });
                        return;
                      }
                      toast({
                        title: 'Booking cancelled',
                        description: 'Your reservation has been cancelled',
                      });
                      onCancel?.(booking.id);
                    } catch {
                      toast({
                        title: 'Network error',
                        description: 'Could not cancel booking',
                        variant: 'destructive',
                      });
                    } finally {
                      setCancelling(false);
                    }
                  }}
                >
                  {cancelling ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : (
                    <XCircle className="mr-1.5 h-3 w-3" />
                  )}
                  Cancel
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href={`/listings/${booking.listing.slug}`}>
                  <ExternalLink className="mr-1.5 h-3 w-3" />
                  View listing
                </Link>
              </Button>
            </div>
          </div>

          <p className="text-muted-foreground mt-2 text-xs">
            Booked{' '}
            {new Date(booking.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            &middot; ID: {booking.id.slice(0, 8)}
          </p>
        </CardContent>
      </div>
    </Card>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = useCallback((id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' as const } : b)),
    );
  }, []);

  useEffect(() => {
    fetch('/api/bookings/my')
      .then((r) => {
        if (r.status === 401) {
          setError('UNAUTHORIZED');
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.success) setBookings(data.data);
      })
      .catch(() => setError('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  if (error === 'UNAUTHORIZED') {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <CalendarDays className="text-muted-foreground mb-4 h-12 w-12" />
        <h1 className="mb-2 text-2xl font-bold">Sign in to view bookings</h1>
        <p className="text-muted-foreground mb-6">
          You need to be signed in to see your booking history.
        </p>
        <Button asChild>
          <Link href="/auth/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const upcoming = bookings.filter(
    (b) =>
      (b.status === 'pending' || b.status === 'confirmed') &&
      new Date(b.endDate + 'T00:00:00') >= new Date(),
  );
  const past = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.endDate + 'T00:00:00') < new Date(),
  );
  const cancelled = bookings.filter((b) => b.status === 'cancelled');

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My bookings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <CalendarDays className="text-muted-foreground mb-4 h-12 w-12" />
          <h2 className="mb-2 text-lg font-semibold">No bookings yet</h2>
          <p className="text-muted-foreground mb-6 max-w-sm text-sm">
            When you book a listing, it will appear here. Start exploring extraordinary stays.
          </p>
          <Button asChild>
            <Link href="/search">Explore listings</Link>
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming">
              Upcoming{upcoming.length > 0 && ` (${upcoming.length})`}
            </TabsTrigger>
            <TabsTrigger value="past">Past{past.length > 0 && ` (${past.length})`}</TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled{cancelled.length > 0 && ` (${cancelled.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcoming.length === 0 ? (
              <EmptyTab message="No upcoming bookings" />
            ) : (
              upcoming.map((b) => <BookingCard key={b.id} booking={b} onCancel={handleCancel} />)
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {past.length === 0 ? (
              <EmptyTab message="No past bookings" />
            ) : (
              past.map((b) => <BookingCard key={b.id} booking={b} />)
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {cancelled.length === 0 ? (
              <EmptyTab message="No cancelled bookings" />
            ) : (
              cancelled.map((b) => <BookingCard key={b.id} booking={b} />)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
