import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import {
  analyticsEvents,
  bookings,
  getDb,
  identityVerifications,
  listings,
  payments,
  users,
} from '@lumina/db';

import { getCurrentUser } from '@/lib/auth';

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 },
    );
  }

  const db = getDb();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    listingTotals,
    publishedCount,
    userTotals,
    eventCount,
    pendingVerifications,
    bookingTotals,
    revenueRows,
    recentListings,
    recentUsers,
    recentBookings,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        last30: sql<number>`count(*) filter (where ${listings.createdAt} >= ${thirtyDaysAgo.toISOString()})::int`,
        prev30: sql<number>`count(*) filter (where ${listings.createdAt} >= ${sixtyDaysAgo.toISOString()} and ${listings.createdAt} < ${thirtyDaysAgo.toISOString()})::int`,
      })
      .from(listings),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(listings)
      .where(eq(listings.status, 'published')),
    db
      .select({
        total: sql<number>`count(*)::int`,
        last30: sql<number>`count(*) filter (where ${users.createdAt} >= ${thirtyDaysAgo.toISOString()})::int`,
        prev30: sql<number>`count(*) filter (where ${users.createdAt} >= ${sixtyDaysAgo.toISOString()} and ${users.createdAt} < ${thirtyDaysAgo.toISOString()})::int`,
      })
      .from(users),
    db
      .select({
        total: sql<number>`count(*)::int`,
        last30: sql<number>`count(*) filter (where ${analyticsEvents.createdAt} >= ${thirtyDaysAgo.toISOString()})::int`,
        prev30: sql<number>`count(*) filter (where ${analyticsEvents.createdAt} >= ${sixtyDaysAgo.toISOString()} and ${analyticsEvents.createdAt} < ${thirtyDaysAgo.toISOString()})::int`,
      })
      .from(analyticsEvents),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(identityVerifications)
      .where(eq(identityVerifications.status, 'pending')),
    db
      .select({
        total: sql<number>`count(*)::int`,
        confirmed: sql<number>`count(*) filter (where ${bookings.status} = 'confirmed')::int`,
        pending: sql<number>`count(*) filter (where ${bookings.status} = 'pending')::int`,
        last30: sql<number>`count(*) filter (where ${bookings.createdAt} >= ${thirtyDaysAgo.toISOString()})::int`,
      })
      .from(bookings),
    // Revenue grouped by month for last 6 months — uses payments table when present, falls back to bookings.totalPrice
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${payments.createdAt}), 'YYYY-MM')`,
        gross: sql<number>`coalesce(sum(case when ${payments.status} in ('succeeded','partially_refunded') then ${payments.amount}::numeric else 0 end), 0)::float`,
        refunded: sql<number>`coalesce(sum(${payments.refundedAmount}::numeric), 0)::float`,
        count: sql<number>`count(*) filter (where ${payments.status} in ('succeeded','partially_refunded'))::int`,
      })
      .from(payments)
      .where(gte(payments.createdAt, sixMonthsAgo))
      .groupBy(sql`date_trunc('month', ${payments.createdAt})`)
      .orderBy(sql`date_trunc('month', ${payments.createdAt})`),
    db
      .select({
        id: listings.id,
        title: listings.title,
        slug: listings.slug,
        status: listings.status,
        category: listings.category,
        createdAt: listings.createdAt,
        hostId: listings.hostId,
      })
      .from(listings)
      .orderBy(desc(listings.createdAt))
      .limit(5),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5),
    db
      .select({
        id: bookings.id,
        listingId: bookings.listingId,
        listingTitle: listings.title,
        listingSlug: listings.slug,
        userId: bookings.userId,
        userName: users.name,
        status: bookings.status,
        totalPrice: bookings.totalPrice,
        currency: listings.currency,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .innerJoin(listings, eq(listings.id, bookings.listingId))
      .innerJoin(users, eq(users.id, bookings.userId))
      .orderBy(desc(bookings.createdAt))
      .limit(5),
  ]);

  // Build 6-month revenue series (fill gaps with zero so the chart looks continuous)
  const revenueMap = new Map(revenueRows.map((r) => [r.month, r]));
  const revenueSeries: Array<{ month: string; label: string; gross: number; refunded: number; net: number; count: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const row = revenueMap.get(key);
    const gross = Number(row?.gross ?? 0);
    const refunded = Number(row?.refunded ?? 0);
    revenueSeries.push({
      month: key,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      gross,
      refunded,
      net: gross - refunded,
      count: Number(row?.count ?? 0),
    });
  }

  // Build a unified activity feed from heterogeneous sources
  type ActivityItem = {
    id: string;
    kind: 'listing' | 'user' | 'booking';
    title: string;
    subtitle: string;
    href: string;
    createdAt: string;
  };
  const activity: ActivityItem[] = [
    ...recentListings.map((l) => ({
      id: `listing:${l.id}`,
      kind: 'listing' as const,
      title: 'New listing published',
      subtitle: `${l.title} · ${l.category}`,
      href: `/listings/${l.slug}`,
      createdAt: l.createdAt.toISOString(),
    })),
    ...recentUsers.map((u) => ({
      id: `user:${u.id}`,
      kind: 'user' as const,
      title: u.role === 'admin' ? 'New admin' : u.role === 'host' ? 'New host' : 'New user registration',
      subtitle: `${u.name} · ${u.email}`,
      href: `/admin/users`,
      createdAt: u.createdAt.toISOString(),
    })),
    ...recentBookings.map((b) => ({
      id: `booking:${b.id}`,
      kind: 'booking' as const,
      title: b.status === 'confirmed' ? 'Booking confirmed' : b.status === 'cancelled' ? 'Booking cancelled' : 'New booking pending',
      subtitle: `${b.userName} · ${b.listingTitle} · ${b.currency} ${Number(b.totalPrice).toLocaleString()}`,
      href: `/listings/${b.listingSlug}`,
      createdAt: b.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 8);

  const listingTot = listingTotals[0] ?? { total: 0, last30: 0, prev30: 0 };
  const userTot = userTotals[0] ?? { total: 0, last30: 0, prev30: 0 };
  const eventTot = eventCount[0] ?? { total: 0, last30: 0, prev30: 0 };
  const bookingTot = bookingTotals[0] ?? { total: 0, confirmed: 0, pending: 0, last30: 0 };

  return NextResponse.json(
    {
      success: true,
      data: {
        stats: {
          listings: {
            total: Number(listingTot.total),
            published: Number(publishedCount[0]?.count ?? 0),
            last30: Number(listingTot.last30),
            delta: pctChange(Number(listingTot.last30), Number(listingTot.prev30)),
          },
          users: {
            total: Number(userTot.total),
            last30: Number(userTot.last30),
            delta: pctChange(Number(userTot.last30), Number(userTot.prev30)),
          },
          events: {
            total: Number(eventTot.total),
            last30: Number(eventTot.last30),
            delta: pctChange(Number(eventTot.last30), Number(eventTot.prev30)),
          },
          bookings: {
            total: Number(bookingTot.total),
            confirmed: Number(bookingTot.confirmed),
            pending: Number(bookingTot.pending),
            last30: Number(bookingTot.last30),
          },
          pendingVerifications: Number(pendingVerifications[0]?.count ?? 0),
        },
        revenue: {
          series: revenueSeries,
          totalGross: revenueSeries.reduce((s, r) => s + r.gross, 0),
          totalNet: revenueSeries.reduce((s, r) => s + r.net, 0),
          totalRefunded: revenueSeries.reduce((s, r) => s + r.refunded, 0),
        },
        activity,
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
