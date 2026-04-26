import { and, eq, gte, lte, ilike, or, sql, desc, asc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { bookings, getDb, listings, listingImages } from '@lumina/db';
import { searchParamsSchema, MEILISEARCH_INDEX } from '@lumina/shared';

import { withSpan, SpanAttr } from '@lumina/telemetry';

import { captureError } from '@/lib/error-capture';
import { getMeiliClient } from '@/lib/meilisearch';
import { createRequestLogger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { generateEmbedding } from '@/lib/services/ai';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'GET /api/search' });

  try {
    const rl = await checkRateLimit(request, 'search', RATE_LIMITS.search);
    if (!rl.allowed) {
      log.done(429);
      return NextResponse.json(
        {
          success: false,
          error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
        },
        { status: 429 },
      );
    }

    const url = new URL(request.url);
    const rawParams: Record<string, unknown> = {};

    for (const [key, value] of url.searchParams.entries()) {
      if (value === '') continue;
      if (key === 'category' || key === 'amenity') {
        const target = key === 'amenity' ? 'amenities' : key;
        const existing = rawParams[target];
        rawParams[target] = Array.isArray(existing) ? [...existing, value] : [value];
      } else if (key === 'q') {
        rawParams['query'] = value;
      } else {
        rawParams[key] = value;
      }
    }

    const parsed = searchParamsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid search params' } },
        { status: 400 },
      );
    }

    const params = parsed.data;

    // Auto-promote `q` to a strict `location` filter when it exactly matches
    // a known city or country in the catalog. This prevents fuzzy search from
    // returning unrelated cities when the user types a real destination name.
    if (params.query && !params.location) {
      const promoted = await promoteQueryToLocation(params.query);
      if (promoted) {
        params.location = promoted;
        params.query = undefined;
      }
    }

    // Resolve listings unavailable for the requested date range, if any.
    let unavailableListingIds: string[] = [];
    if (params.checkIn && params.checkOut && params.checkOut > params.checkIn) {
      unavailableListingIds = await findUnavailableListingIds(params.checkIn, params.checkOut);
    }

    // For natural language queries, try semantic search first (pgvector embeddings)
    if (params.query && isNaturalLanguageQuery(params.query) && process.env['OPENAI_API_KEY']) {
      try {
        const result = await withSpan(
          'search.query',
          {
            [SpanAttr.SEARCH_QUERY]: params.query,
            [SpanAttr.SEARCH_ENGINE]: 'semantic',
          },
          () => searchViaSemantic(params, unavailableListingIds),
        );
        log.done(200);
        return NextResponse.json({ success: true, data: result });
      } catch (semanticError) {
        captureError(semanticError, {
          requestId,
          route: 'GET /api/search',
          fallback: 'meilisearch',
        });
        // Fall through to Meilisearch
      }
    }

    // Try Meilisearch (primary for keyword search)
    try {
      const result = await withSpan(
        'search.query',
        {
          [SpanAttr.SEARCH_QUERY]: params.query ?? '',
          [SpanAttr.SEARCH_ENGINE]: 'meilisearch',
        },
        async () => {
          const r = await searchViaMeilisearch(params, unavailableListingIds);
          return r;
        },
      );
      log.done(200);
      return NextResponse.json({ success: true, data: result });
    } catch (meiliError) {
      captureError(meiliError, { requestId, route: 'GET /api/search', fallback: 'db' });
      // Fall through to DB fallback
    }

    // DB fallback when Meilisearch is unavailable
    const result = await withSpan(
      'search.query',
      {
        [SpanAttr.SEARCH_QUERY]: params.query ?? '',
        [SpanAttr.SEARCH_ENGINE]: 'database',
      },
      () => searchViaDatabase(params, unavailableListingIds),
    );
    log.done(200);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    captureError(error, { requestId, route: 'GET /api/search' });
    log.done(500);
    return NextResponse.json(
      { success: false, error: { code: 'SEARCH_ERROR', message: 'Search failed' } },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Meilisearch path (primary)
// ---------------------------------------------------------------------------
async function searchViaMeilisearch(
  params: ReturnType<typeof searchParamsSchema.parse>,
  unavailableListingIds: string[] = [],
) {
  const client = getMeiliClient();
  const index = client.index(MEILISEARCH_INDEX);

  const filter: string[] = [];
  if (params.category?.length) {
    filter.push(`category IN [${params.category.map((c) => `"${c}"`).join(', ')}]`);
  }
  if (params.priceMin !== undefined) {
    filter.push(`pricePerNight >= ${params.priceMin}`);
  }
  if (params.priceMax !== undefined) {
    filter.push(`pricePerNight <= ${params.priceMax}`);
  }
  if (params.guests !== undefined) {
    filter.push(`maxGuests >= ${params.guests}`);
  }
  if (params.bedrooms !== undefined) {
    filter.push(`bedrooms >= ${params.bedrooms}`);
  }
  if (params.bathrooms !== undefined) {
    filter.push(`bathrooms >= ${params.bathrooms}`);
  }
  if (params.amenities?.length) {
    for (const amenity of params.amenities) {
      filter.push(`amenities = "${amenity}"`);
    }
  }
  if (params.location) {
    const loc = params.location.replace(/"/g, '\\"');
    filter.push(`(city = "${loc}" OR country = "${loc}")`);
  }
  if (params.bounds) {
    filter.push(
      `_geo(${params.bounds.south}, ${params.bounds.west}, ${params.bounds.north}, ${params.bounds.east})`,
    );
  }

  const sortMap: Record<string, string[]> = {
    price_asc: ['pricePerNight:asc'],
    price_desc: ['pricePerNight:desc'],
    rating_desc: ['rating:desc', 'reviewCount:desc'],
    newest: ['createdAt:desc'],
    relevance: [],
  };

  const results = await index.search(params.query ?? '', {
    filter: filter.length > 0 ? filter : undefined,
    sort: sortMap[params.sort] ?? [],
    page: params.page,
    hitsPerPage: params.limit,
    facets: ['category', 'amenities', 'city', 'country'],
    attributesToHighlight: ['title', 'description'],
  });

  const facetStats = (results as Record<string, unknown>)['facetStats'] as
    | Record<string, { min: number; max: number }>
    | undefined;

  let hits = results.hits;
  let totalHits = results.totalHits ?? 0;
  if (unavailableListingIds.length > 0) {
    const blocked = new Set(unavailableListingIds);
    const before = hits.length;
    hits = hits.filter((h) => !blocked.has(String((h as { id?: unknown }).id ?? '')));
    totalHits = Math.max(0, totalHits - (before - hits.length));
  }

  return {
    hits,
    totalHits,
    page: results.page ?? params.page,
    totalPages: results.totalPages ?? 0,
    facets: {
      category: results.facetDistribution?.['category'] ?? {},
      amenities: results.facetDistribution?.['amenities'] ?? {},
      city: results.facetDistribution?.['city'] ?? {},
      country: results.facetDistribution?.['country'] ?? {},
      priceRange: facetStats?.['pricePerNight'] ?? { min: 0, max: 10000 },
    },
    facetStats: facetStats ?? {},
    processingTimeMs: results.processingTimeMs,
  };
}

// ---------------------------------------------------------------------------
// Database fallback (when Meilisearch is down or not indexed)
// ---------------------------------------------------------------------------
async function searchViaDatabase(
  params: ReturnType<typeof searchParamsSchema.parse>,
  unavailableListingIds: string[] = [],
) {
  const startMs = Date.now();
  const db = getDb();
  const limit = params.limit ?? 24;
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [eq(listings.status, 'published')];

  if (params.query) {
    const q = `%${params.query}%`;
    conditions.push(
      or(
        ilike(listings.title, q),
        ilike(listings.description, q),
        ilike(listings.city, q),
        ilike(listings.country, q),
      )!,
    );
  }
  if (params.location) {
    const loc = `%${params.location}%`;
    conditions.push(or(ilike(listings.city, loc), ilike(listings.country, loc))!);
  }
  if (unavailableListingIds.length > 0) {
    conditions.push(
      sql`${listings.id} NOT IN (${sql.join(
        unavailableListingIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  }
  if (params.category?.length) {
    conditions.push(
      or(
        ...params.category.map((c) =>
          eq(listings.category, c as (typeof listings.category.enumValues)[number]),
        ),
      )!,
    );
  }
  if (params.priceMin !== undefined) {
    conditions.push(gte(listings.pricePerNight, String(params.priceMin)));
  }
  if (params.priceMax !== undefined) {
    conditions.push(lte(listings.pricePerNight, String(params.priceMax)));
  }
  if (params.guests !== undefined) {
    conditions.push(gte(listings.maxGuests, params.guests));
  }
  if (params.bedrooms !== undefined) {
    conditions.push(gte(listings.bedrooms, params.bedrooms));
  }
  if (params.bathrooms !== undefined) {
    conditions.push(gte(listings.bathrooms, params.bathrooms));
  }

  const where = and(...conditions);

  // Sort
  const sortMap = {
    price_asc: asc(listings.pricePerNight),
    price_desc: desc(listings.pricePerNight),
    rating_desc: desc(listings.rating),
    newest: desc(listings.createdAt),
    relevance: desc(listings.featured),
  };
  const orderBy = sortMap[params.sort as keyof typeof sortMap] ?? desc(listings.featured);

  // Count total
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(where);
  const totalHits = countResult?.count ?? 0;

  // Fetch page
  const rows = await db.query.listings.findMany({
    where,
    orderBy: () => [orderBy],
    limit,
    offset,
    with: { images: { limit: 1, orderBy: (imgs, { asc: a }) => [a(imgs.sortOrder)] } },
  });

  // Transform to Meilisearch-compatible hit shape
  const hits = rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    pricePerNight: Number(row.pricePerNight),
    currency: row.currency,
    city: row.city,
    state: row.state,
    country: row.country,
    _geo: { lat: Number(row.lat), lng: Number(row.lng) },
    amenities: row.amenities,
    maxGuests: row.maxGuests,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    rating: Number(row.rating),
    reviewCount: row.reviewCount,
    featured: row.featured,
    primaryImageUrl: row.images[0]?.url ?? null,
    createdAt: row.createdAt.getTime(),
  }));

  // Build facets from full result set
  const facetRows = await db
    .select({
      category: listings.category,
      city: listings.city,
      country: listings.country,
    })
    .from(listings)
    .where(where);

  const categoryFacet: Record<string, number> = {};
  const cityFacet: Record<string, number> = {};
  const countryFacet: Record<string, number> = {};
  for (const r of facetRows) {
    categoryFacet[r.category] = (categoryFacet[r.category] ?? 0) + 1;
    cityFacet[r.city] = (cityFacet[r.city] ?? 0) + 1;
    countryFacet[r.country] = (countryFacet[r.country] ?? 0) + 1;
  }

  return {
    hits,
    totalHits,
    page,
    totalPages: Math.ceil(totalHits / limit),
    facets: {
      category: categoryFacet,
      amenities: {},
      city: cityFacet,
      country: countryFacet,
      priceRange: { min: 0, max: 10000 },
    },
    facetStats: {},
    processingTimeMs: Date.now() - startMs,
  };
}

// ---------------------------------------------------------------------------
// Semantic search via pgvector (natural language queries)
// ---------------------------------------------------------------------------

/**
 * Detects if a query is natural language (vs keyword search).
 * Natural language queries benefit from semantic/embedding search.
 */
async function findUnavailableListingIds(checkIn: string, checkOut: string): Promise<string[]> {
  try {
    const db = getDb();
    const rows = await db
      .selectDistinct({ id: bookings.listingId })
      .from(bookings)
      .where(
        sql`${bookings.status} IN ('pending', 'confirmed') AND ${bookings.startDate} < ${checkOut} AND ${bookings.endDate} > ${checkIn}`,
      );
    return rows.map((r) => String(r.id));
  } catch {
    return [];
  }
}

async function promoteQueryToLocation(query: string): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  try {
    const db = getDb();
    const [row] = await db
      .select({ city: listings.city, country: listings.country })
      .from(listings)
      .where(
        sql`${listings.status} = 'published' AND (LOWER(${listings.city}) = LOWER(${trimmed}) OR LOWER(${listings.country}) = LOWER(${trimmed}))`,
      )
      .limit(1);
    if (!row) return null;
    return row.city.toLowerCase() === trimmed.toLowerCase() ? row.city : row.country;
  } catch {
    return null;
  }
}

function isNaturalLanguageQuery(query: string): boolean {
  const words = query.trim().split(/\s+/);
  // Heuristic: 4+ words or contains common natural language indicators
  if (words.length >= 4) return true;
  const nlIndicators = [
    'with',
    'near',
    'for',
    'that',
    'has',
    'where',
    'cozy',
    'quiet',
    'romantic',
    'family',
    'luxury',
    'peaceful',
    'modern',
    'rustic',
  ];
  return words.some((w) => nlIndicators.includes(w.toLowerCase()));
}

async function searchViaSemantic(
  params: ReturnType<typeof searchParamsSchema.parse>,
  unavailableListingIds: string[] = [],
) {
  const startMs = Date.now();

  if (!params.query || !process.env['OPENAI_API_KEY']) {
    throw new Error('Semantic search requires a query and OPENAI_API_KEY');
  }

  const queryEmbedding = await generateEmbedding(params.query);
  const db = getDb();
  const limit = params.limit ?? 24;
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;

  // Build filter conditions
  const conditions = [eq(listings.status, 'published'), sql`${listings.embedding} IS NOT NULL`];

  if (params.category?.length) {
    conditions.push(
      or(
        ...params.category.map((c) =>
          eq(listings.category, c as (typeof listings.category.enumValues)[number]),
        ),
      )!,
    );
  }
  if (params.priceMin !== undefined) {
    conditions.push(gte(listings.pricePerNight, String(params.priceMin)));
  }
  if (params.priceMax !== undefined) {
    conditions.push(lte(listings.pricePerNight, String(params.priceMax)));
  }
  if (params.guests !== undefined) {
    conditions.push(gte(listings.maxGuests, params.guests));
  }
  if (params.location) {
    const loc = `%${params.location}%`;
    conditions.push(or(ilike(listings.city, loc), ilike(listings.country, loc))!);
  }
  if (unavailableListingIds.length > 0) {
    conditions.push(
      sql`${listings.id} NOT IN (${sql.join(
        unavailableListingIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  }

  const vectorStr = `[${queryEmbedding.join(',')}]`;

  // Query with cosine similarity, ordered by relevance
  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      slug: listings.slug,
      description: listings.description,
      category: listings.category,
      pricePerNight: listings.pricePerNight,
      currency: listings.currency,
      city: listings.city,
      state: listings.state,
      country: listings.country,
      lat: listings.lat,
      lng: listings.lng,
      amenities: listings.amenities,
      maxGuests: listings.maxGuests,
      bedrooms: listings.bedrooms,
      bathrooms: listings.bathrooms,
      rating: listings.rating,
      reviewCount: listings.reviewCount,
      featured: listings.featured,
      createdAt: listings.createdAt,
      similarity: sql<number>`1 - (${listings.embedding} <=> ${vectorStr}::vector)`.as(
        'similarity',
      ),
    })
    .from(listings)
    .where(and(...conditions))
    .orderBy(sql`${listings.embedding} <=> ${vectorStr}::vector`)
    .limit(limit)
    .offset(offset);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(and(...conditions));
  const totalHits = countResult?.count ?? 0;

  const hits = rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    pricePerNight: Number(row.pricePerNight),
    currency: row.currency,
    city: row.city,
    state: row.state,
    country: row.country,
    _geo: { lat: Number(row.lat), lng: Number(row.lng) },
    amenities: row.amenities,
    maxGuests: row.maxGuests,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    rating: Number(row.rating),
    reviewCount: row.reviewCount,
    featured: row.featured,
    primaryImageUrl: null,
    createdAt: row.createdAt.getTime(),
    _semanticScore: row.similarity,
  }));

  return {
    hits,
    totalHits,
    page,
    totalPages: Math.ceil(totalHits / limit),
    facets: {
      category: {},
      amenities: {},
      city: {},
      country: {},
      priceRange: { min: 0, max: 10000 },
    },
    facetStats: {},
    processingTimeMs: Date.now() - startMs,
    searchEngine: 'semantic' as const,
  };
}
