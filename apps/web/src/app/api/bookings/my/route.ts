import { desc, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

import { getDb, bookings, listings, listingImages } from '@lumina/db';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in to view bookings' }, 401);
    }

    const db = getDb();

    const userBookings = await db.query.bookings.findMany({
      where: eq(bookings.userId, user.id),
      with: {
        listing: {
          with: { images: true },
        },
      },
      orderBy: [desc(bookings.createdAt)],
    });

    const data = userBookings.map((b) => ({
      id: b.id,
      status: b.status,
      startDate: b.startDate,
      endDate: b.endDate,
      totalPrice: Number(b.totalPrice),
      createdAt: b.createdAt.toISOString(),
      listing: {
        id: b.listing.id,
        title: b.listing.title,
        slug: b.listing.slug,
        city: b.listing.city,
        country: b.listing.country,
        primaryImage:
          b.listing.images.find((i) => i.isPrimary)?.url ?? b.listing.images[0]?.url ?? null,
      },
    }));

    return successResponse(data);
  } catch {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch bookings' }, 500);
  }
}
