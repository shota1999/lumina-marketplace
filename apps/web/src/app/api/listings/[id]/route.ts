import { eq, and, ne, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { getDb, listings, listingImages, reviews, users } from '@lumina/db';

import { captureError } from '@/lib/error-capture';
import { createRequestLogger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Transforms a raw DB listing row + images into the API response shape. */
function serializeListing(
  row: typeof listings.$inferSelect,
  images: (typeof listingImages.$inferSelect)[],
) {
  return {
    ...row,
    pricePerNight: Number(row.pricePerNight),
    rating: Number(row.rating),
    location: {
      address: row.address,
      city: row.city,
      state: row.state,
      country: row.country,
      lat: Number(row.lat),
      lng: Number(row.lng),
    },
    images: images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      width: img.width,
      height: img.height,
      isPrimary: img.isPrimary,
    })),
  };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'GET /api/listings/:slug' });

  try {
    const slug = (await params).id;
    log.info('Listing fetch', { slug });
    const db = getDb();

    // Support lookup by slug or UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    const listing = await db.query.listings.findFirst({
      where: and(
        isUuid ? eq(listings.id, slug) : eq(listings.slug, slug),
        eq(listings.status, 'published'),
      ),
      with: { images: true },
    });

    if (!listing) {
      log.done(404);
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } },
        { status: 404 },
      );
    }

    // Fetch reviews with author info
    const reviewRows = await db
      .select({
        id: reviews.id,
        listingId: reviews.listingId,
        userId: reviews.userId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        authorName: users.name,
        authorAvatar: users.avatarUrl,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.listingId, listing.id))
      .orderBy(desc(reviews.createdAt));

    // Fetch similar listings (same category, different id, limit 3)
    const similar = await db.query.listings.findMany({
      where: and(
        eq(listings.status, 'published'),
        eq(listings.category, listing.category),
        ne(listings.id, listing.id),
      ),
      with: { images: true },
      orderBy: [desc(listings.rating)],
      limit: 3,
    });

    log.done(200);
    return NextResponse.json({
      success: true,
      data: {
        listing: serializeListing(listing, listing.images),
        reviews: reviewRows.map((r) => ({
          id: r.id,
          listingId: r.listingId,
          userId: r.userId,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
          author: { name: r.authorName, avatarUrl: r.authorAvatar },
        })),
        similar: similar.map((s) => serializeListing(s, s.images)),
      },
    });
  } catch (error) {
    captureError(error, { requestId, route: 'GET /api/listings/:slug' });
    log.done(500);
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch listing' } },
      { status: 500 },
    );
  }
}
