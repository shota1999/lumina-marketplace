import { NextRequest, NextResponse } from 'next/server';

import { getDb, bookings, listings } from '@lumina/db';
import { eq, and, sql, desc } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Host access required' }, 401);
    }

    const db = getDb();

    const results = await db
      .select({
        month: sql<string>`TO_CHAR(${bookings.createdAt}, 'YYYY-MM')`,
        amount: sql<string>`SUM(${bookings.totalPrice})`,
      })
      .from(bookings)
      .innerJoin(listings, eq(bookings.listingId, listings.id))
      .where(and(eq(listings.hostId, user.id), eq(bookings.status, 'confirmed')))
      .groupBy(sql`TO_CHAR(${bookings.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${bookings.createdAt}, 'YYYY-MM')`);

    const earnings = results.map((row) => ({
      month: row.month,
      amount: Number(row.amount),
    }));

    return successResponse(earnings);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch earnings' }, 500);
  }
}
