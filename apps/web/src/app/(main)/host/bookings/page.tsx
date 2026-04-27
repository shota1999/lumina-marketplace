'use client';

import { Calendar, CheckCircle2, Clock, Loader2, UserCircle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { formatPrice } from '@lumina/shared';
import { Badge, Button, Skeleton } from '@lumina/ui';

import { HostNav } from '@/components/dashboard/host-nav';
import { toast } from '@/hooks/use-toast';

interface HostBooking {
  id: string;
  guestName: string;
  guestEmail: string;
  listingTitle: string;
  listingId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; style: string }> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    style: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle2,
    style: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    style: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  },
};

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type Tab = 'all' | 'upcoming' | 'past' | 'pending';

export default function HostBookingsPage() {
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/host/bookings')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setBookings(data.data ?? []);
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load bookings', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(bookingId: string, action: 'approve' | 'decline') {
    setProcessingId(bookingId);
    try {
      const res = await fetch(`/api/host/bookings/${bookingId}/${action}`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: `${action} failed`,
          description: data.error?.message ?? 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, status: action === 'approve' ? 'confirmed' : 'cancelled' }
            : b,
        ),
      );
      toast({ title: `Booking ${action === 'approve' ? 'approved' : 'declined'}` });
    } catch {
      toast({
        title: 'Network error',
        description: `Could not ${action} booking`,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  }

  const now = new Date();
  const filteredBookings = bookings.filter((b) => {
    const endDate = new Date(b.endDate + 'T00:00:00');
    switch (activeTab) {
      case 'upcoming':
        return (b.status === 'confirmed' || b.status === 'pending') && endDate >= now;
      case 'past':
        return endDate < now;
      case 'pending':
        return b.status === 'pending';
      default:
        return true;
    }
  });

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: bookings.length },
    {
      key: 'upcoming',
      label: 'Upcoming',
      count: bookings.filter(
        (b) =>
          (b.status === 'confirmed' || b.status === 'pending') &&
          new Date(b.endDate + 'T00:00:00') >= now,
      ).length,
    },
    {
      key: 'past',
      label: 'Past',
      count: bookings.filter((b) => new Date(b.endDate + 'T00:00:00') < now).length,
    },
    {
      key: 'pending',
      label: 'Pending',
      count: bookings.filter((b) => b.status === 'pending').length,
    },
  ];

  if (loading) {
    return (
      <>
        <HostNav />
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
          <div className="mb-6 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-lg" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <HostNav />
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="mb-6">
          <p className="text-sm text-slate-500">
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} total
          </p>
        </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`ml-1.5 text-xs ${activeTab === tab.key ? 'opacity-70' : 'opacity-50'}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Booking Cards */}
      {filteredBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-800">
          <Calendar className="mb-4 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500">
            No {activeTab === 'all' ? '' : activeTab} bookings found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const config = (statusConfig[booking.status] ?? statusConfig['pending'])!;
            const StatusIcon = config.icon;
            const isProcessing = processingId === booking.id;

            return (
              <div
                key={booking.id}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Guest + Listing info */}
                  <div className="flex items-start gap-4">
                    {/* Avatar initial */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {booking.guestName
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">
                        {booking.guestName}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        {booking.listingTitle}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateShort(booking.startDate)} &ndash;{' '}
                          {formatDateShort(booking.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: price + status + actions */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                        {formatPrice(booking.totalPrice)}
                      </span>
                      <Badge className={config.style}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {config.label}
                      </Badge>
                    </div>

                    {booking.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAction(booking.id, 'approve')}
                          disabled={isProcessing}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                          {isProcessing ? (
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1.5 h-3 w-3" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(booking.id, 'decline')}
                          disabled={isProcessing}
                          className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <XCircle className="mr-1.5 h-3 w-3" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-3 border-t border-slate-50 pt-3 text-xs text-slate-400 dark:border-slate-800">
                  Booked{' '}
                  {new Date(booking.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  &middot; ID: {booking.id.slice(0, 8)}
                </p>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </>
  );
}
