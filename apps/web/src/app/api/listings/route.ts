import { eq, desc, and, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { getDb, listings, listingImages } from '@lumina/db';
import { createListingSchema, PAGINATION, slugify } from '@lumina/shared';

import { getCurrentUser } from '@/lib/auth';
import { enqueueIndexingJob } from '@/lib/queue';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || PAGINATION.defaultPage);
    const limit = Math.min(
      PAGINATION.maxPageSize,
      Number(url.searchParams.get('limit')) || PAGINATION.defaultPageSize,
    );
    const offset = (page - 1) * limit;

    const db = getDb();

    const [data, countResult] = await Promise.all([
      db.query.listings.findMany({
        where: eq(listings.status, 'published'),
        with: { images: true },
        orderBy: [desc(listings.featured), desc(listings.createdAt)],
        limit,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` }).from(listings).where(eq(listings.status, 'published')),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return NextResponse.json({
      success: true,
      data: {
        data: data.map((l) => ({
          ...l,
          pricePerNight: Number(l.pricePerNight),
          rating: Number(l.rating),
          lat: Number(l.lat),
          lng: Number(l.lng),
          location: {
            address: l.address,
            city: l.city,
            state: l.state,
            country: l.country,
            lat: Number(l.lat),
            lng: Number(l.lng),
          },
        })),
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch listings', { error: String(error) });
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch listings' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authorized' } },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = createListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const slug = slugify(input.title) + '-' + Date.now().toString(36);
    const db = getDb();

    const [listing] = await db
      .insert(listings)
      .values({
        title: input.title,
        slug,
        description: input.description,
        category: input.category,
        pricePerNight: String(input.pricePerNight),
        currency: input.currency,
        address: input.location.address,
        city: input.location.city,
        state: input.location.state,
        country: input.location.country,
        lat: String(input.location.lat),
        lng: String(input.location.lng),
        amenities: input.amenities,
        maxGuests: input.maxGuests,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        hostId: user.id,
        partnerId: input.partnerId ?? null,
      })
      .returning();

    // Queue indexing job with trace propagation
    if (listing) {
      await enqueueIndexingJob('index-listing', { listingId: listing.id, action: 'upsert' });
    }

    return NextResponse.json({ success: true, data: listing }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create listing', { error: String(error) });
    return NextResponse.json(
      { success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create listing' } },
      { status: 500 },
    );
  }
}
