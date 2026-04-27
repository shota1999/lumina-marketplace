'use client';

import { ArrowRight, Building, Calendar, DollarSign, Loader2, Star } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { formatPrice } from '@lumina/shared';
import { Badge, Button, Card, CardContent, Skeleton } from '@lumina/ui';

import { HostNav } from '@/components/dashboard/host-nav';

interface DashboardStats {
  totalEarnings: number;
  upcomingBookings: number;
  activeListings: number;
  averageRating: number;
}

interface RecentBooking {
  id: string;
  guestName: string;
  listingTitle: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  totalPrice: number;
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
};

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
}) {
  return (
    <Card className="rounded-2xl shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {value}
            </p>
            {trend && <p className="mt-1 text-xs text-slate-500">{trend}</p>}
          </div>
          <div className="rounded-xl bg-slate-900 p-2.5 dark:bg-slate-100">
            <Icon className="h-4 w-4 text-white dark:text-slate-900" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function HostDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, bookingsRes] = await Promise.all([
          fetch('/api/host/dashboard'),
          fetch('/api/host/bookings?limit=5'),
        ]);

        if (statsRes.status === 401 || bookingsRes.status === 401) {
          setError('UNAUTHORIZED');
          return;
        }

        const statsData = await statsRes.json();
        const bookingsData = await bookingsRes.json();

        if (statsData?.success) setStats(statsData.data);
        if (bookingsData?.success) setBookings(bookingsData.data ?? []);
      } catch {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (error === 'UNAUTHORIZED') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <Building className="mb-4 h-12 w-12 text-slate-300" />
        <h1 className="mb-2 text-2xl font-bold">Host access required</h1>
        <p className="mb-6 text-slate-500">Sign in to access your host dashboard.</p>
        <Button asChild>
          <Link href="/auth/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <HostNav />
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="mb-4 h-6 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-14 rounded-xl" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <HostNav />
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">

      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Earnings"
          value={formatPrice(stats?.totalEarnings ?? 0)}
          icon={DollarSign}
        />
        <StatCard
          label="Upcoming Bookings"
          value={String(stats?.upcomingBookings ?? 0)}
          icon={Calendar}
        />
        <StatCard
          label="Active Listings"
          value={String(stats?.activeListings ?? 0)}
          icon={Building}
        />
        <StatCard
          label="Average Rating"
          value={(stats?.averageRating ?? 0).toFixed(1)}
          icon={Star}
        />
      </div>

      {/* Recent Bookings */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Recent Bookings
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/host/bookings" className="gap-1.5 text-slate-500">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {bookings.length === 0 ? (
          <Card className="rounded-2xl shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">No bookings yet</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Guest
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Listing
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Dates
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {bookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                        {booking.guestName}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-400">
                        {booking.listingTitle}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-400">
                        {formatDateShort(booking.startDate)} &ndash;{' '}
                        {formatDateShort(booking.endDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Badge className={statusColors[booking.status] ?? ''}>
                          {booking.status}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-slate-900 dark:text-slate-100">
                        {formatPrice(booking.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              label: 'Add Listing',
              href: '/host/listings',
              description: 'Create a new property listing',
              icon: Building,
            },
            {
              label: 'View Calendar',
              href: '/host/bookings',
              description: 'Check your availability',
              icon: Calendar,
            },
            {
              label: 'View Earnings',
              href: '/host/earnings',
              description: 'Track your revenue',
              icon: DollarSign,
            },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="rounded-2xl shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md hover:ring-slate-200 dark:ring-slate-800 dark:hover:ring-slate-700">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800">
                    <action.icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {action.label}
                    </p>
                    <p className="text-xs text-slate-500">{action.description}</p>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 text-slate-300" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      </div>
    </>
  );
}

