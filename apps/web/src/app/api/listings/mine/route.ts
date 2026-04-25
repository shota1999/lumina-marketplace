import { eq, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getDb, listings, listingImages } from '@lumina/db';

import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authorized' } },
        { status: 401 },
      );
    }

    const db = getDb();
    const data = await db.query.listings.findMany({
      where: eq(listings.hostId, user.id),
      with: { images: true },
      orderBy: [desc(listings.createdAt)],
    });

    return NextResponse.json({
      success: true,
      data: data.map((l) => ({
        id: l.id,
        title: l.title,
        slug: l.slug,
        category: l.category,
        status: l.status,
        pricePerNight: Number(l.pricePerNight),
        currency: l.currency,
        city: l.city,
        country: l.country,
        rating: Number(l.rating),
        reviewCount: l.reviewCount,
        maxGuests: l.maxGuests,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        primaryImage: l.images?.find((i: { isPrimary: boolean }) => i.isPrimary)?.url
          ?? l.images?.[0]?.url
          ?? null,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch host listings', { error: String(error) });
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch listings' } },
      { status: 500 },
    );
  }
}
