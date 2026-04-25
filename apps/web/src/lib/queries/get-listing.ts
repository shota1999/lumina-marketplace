import { unstable_cache } from 'next/cache';
import { and, desc, eq, ne } from 'drizzle-orm';

import { getDb, listings, listingImages, reviews, users } from '@lumina/db';
import type { Listing, ListingImage, Review } from '@lumina/shared';

/** Transform a raw DB row into the Listing type used by the frontend. */
function toListing(
  row: typeof listings.$inferSelect,
  images: (typeof listingImages.$inferSelect)[],
): Listing {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    status: row.status,
    pricePerNight: Number(row.pricePerNight),
    currency: row.currency,
    location: {
      address: row.address,
      city: row.city,
      state: row.state,
      country: row.country,
      lat: Number(row.lat),
      lng: Number(row.lng),
    },
    amenities: row.amenities,
    images: images.map(
      (img): ListingImage => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        width: img.width,
        height: img.height,
        isPrimary: img.isPrimary,
      }),
    ),
    maxGuests: row.maxGuests,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    rating: Number(row.rating),
    reviewCount: row.reviewCount,
    hostId: row.hostId,
    partnerId: row.partnerId,
    featured: row.featured,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface ListingPageData {
  listing: Listing;
  reviews: Review[];
  similar: Listing[];
}

async function fetchListingBySlug(slug: string): Promise<ListingPageData | null> {
  const db = getDb();

  const row = await db.query.listings.findFirst({
    where: and(eq(listings.slug, slug), eq(listings.status, 'published')),
    with: { images: true },
  });

  if (!row) return null;

  const listing = toListing(row, row.images);

  // Run reviews + similar queries in parallel
  const [reviewRows, similarRows] = await Promise.all([
    db
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
      .where(eq(reviews.listingId, row.id))
      .orderBy(desc(reviews.createdAt)),

    db.query.listings.findMany({
      where: and(
        eq(listings.status, 'published'),
        eq(listings.category, row.category),
        ne(listings.id, row.id),
      ),
      with: { images: true },
      orderBy: [desc(listings.rating)],
      limit: 3,
    }),
  ]);

  const listingReviews: Review[] = reviewRows.map((r) => ({
    id: r.id,
    listingId: r.listingId,
    userId: r.userId,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    author: { name: r.authorName, avatarUrl: r.authorAvatar },
  }));

  const similar = similarRows.map((s) => toListing(s, s.images));

  return { listing, reviews: listingReviews, similar };
}

/**
 * Fetch a published listing by slug with its images, reviews, and similar listings.
 * Cached for 60s, revalidated on review/booking creation via tag.
 */
export const getListingBySlug = (slug: string) =>
  unstable_cache(fetchListingBySlug, ['listing', slug], {
    revalidate: 60,
    tags: [`listing:${slug}`],
  })(slug);
