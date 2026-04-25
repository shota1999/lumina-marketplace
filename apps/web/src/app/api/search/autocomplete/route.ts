import { eq, ilike, or, desc } from 'drizzle-orm';
import { NextRequest } from 'next/server';

import { getDb, listings, listingImages } from '@lumina/db';
import { autocompleteSchema } from '@lumina/shared';

import { errorResponse, successResponse } from '@/lib/api-response';
import { captureError } from '@/lib/error-capture';
import { createRequestLogger } from '@/lib/logger';

/**
 * GET /api/search/autocomplete – Search listings by title, city, or country.
 * Returns grouped destinations and individual listing results.
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'GET /api/search/autocomplete' });

  try {
    const url = new URL(request.url);
    const rawParams = {
      q: url.searchParams.get('q') ?? '',
      limit: url.searchParams.get('limit') ?? undefined,
    };

    const parsed = autocompleteSchema.safeParse(rawParams);
    if (!parsed.success) {
      log.done(400);
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const { q, limit } = parsed.data;
    const pattern = `%${q}%`;
    const db = getDb();

    // Find matching published listings
    const matchedListings = await db.query.listings.findMany({
      where: or(
        ilike(listings.title, pattern),
        ilike(listings.city, pattern),
        ilike(listings.country, pattern),
      ),
      with: {
        images: true,
      },
      orderBy: [desc(listings.rating)],
      limit,
    });

    // Build deduplicated destinations
    const seenDestinations = new Set<string>();
    const destinations: { city: string; country: string; count: number }[] = [];

    for (const listing of matchedListings) {
      const key = `${listing.city}|${listing.country}`;
      if (!seenDestinations.has(key)) {
        seenDestinations.add(key);
        const count = matchedListings.filter(
          (l) => l.city === listing.city && l.country === listing.country,
        ).length;
        destinations.push({ city: listing.city, country: listing.country, count });
      }
    }

    // Build listing results with primary image
    const listingResults = matchedListings.map((listing) => {
      const primaryImage = listing.images.find((img) => img.isPrimary) ?? listing.images[0];
      return {
        id: listing.id,
        title: listing.title,
        slug: listing.slug,
        city: listing.city,
        country: listing.country,
        category: listing.category,
        pricePerNight: listing.pricePerNight,
        imageUrl: primaryImage?.url ?? null,
      };
    });

    log.info('Autocomplete results', { q, destinations: destinations.length, listings: listingResults.length });
    log.done(200);

    return successResponse({ destinations, listings: listingResults });
  } catch (error) {
    captureError(error, { requestId, route: 'GET /api/search/autocomplete' });
    log.done(500);
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch autocomplete results' }, 500);
  }
}
