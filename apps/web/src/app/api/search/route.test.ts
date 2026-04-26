import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@lumina/db', () => ({
  getDb: vi.fn(),
  listings: {
    status: 'status',
    slug: 'slug',
    id: 'id',
    title: 'title',
    category: 'category',
    description: 'description',
    city: 'city',
    country: 'country',
    pricePerNight: 'pricePerNight',
    maxGuests: 'maxGuests',
    bedrooms: 'bedrooms',
    bathrooms: 'bathrooms',
    rating: 'rating',
    featured: 'featured',
    createdAt: 'createdAt',
    lat: 'lat',
    lng: 'lng',
    state: 'state',
    currency: 'currency',
    amenities: 'amenities',
    reviewCount: 'reviewCount',
  },
  listingImages: { url: 'url', sortOrder: 'sortOrder' },
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  or: vi.fn((...args: unknown[]) => args),
  ilike: vi.fn((...args: unknown[]) => args),
  gte: vi.fn((...args: unknown[]) => args),
  lte: vi.fn((...args: unknown[]) => args),
  sql: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
}));

vi.mock('@lumina/shared', () => ({
  searchParamsSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { query: '', page: 1, limit: 24, sort: 'relevance' },
    }),
  },
  MEILISEARCH_INDEX: 'listings',
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  RATE_LIMITS: { search: {} },
}));

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    done: vi.fn(),
  }),
  logger: { error: vi.fn() },
}));

vi.mock('@/lib/error-capture', () => ({ captureError: vi.fn() }));
vi.mock('@/lib/metrics', () => ({ trackMetric: vi.fn() }));

vi.mock('@/lib/meilisearch', () => ({
  getMeiliClient: vi.fn(),
}));

import { GET } from './route';
import { getDb } from '@lumina/db';
import { searchParamsSchema } from '@lumina/shared';
import { checkRateLimit } from '@/lib/rate-limit';
import { getMeiliClient } from '@/lib/meilisearch';

const mockDb = {
  query: {
    listings: { findMany: vi.fn() },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
};

function createMeiliMock(results: Record<string, unknown>) {
  const mockSearch = vi.fn().mockResolvedValue(results);
  const mockIndex = { search: mockSearch };
  (getMeiliClient as ReturnType<typeof vi.fn>).mockReturnValue({
    index: vi.fn().mockReturnValue(mockIndex),
  });
  return mockSearch;
}

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
    });
  });

  it('returns search results from Meilisearch', async () => {
    const mockSearchResults = {
      hits: [
        { id: 'listing-1', title: 'Luxury Villa', category: 'villa', pricePerNight: 500 },
        { id: 'listing-2', title: 'Beach Villa', category: 'villa', pricePerNight: 350 },
      ],
      totalHits: 2,
      page: 1,
      totalPages: 1,
      processingTimeMs: 12,
      facetDistribution: { category: { villa: 2 }, amenities: {}, city: {}, country: {} },
    };

    (searchParamsSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: { query: 'villa', page: 1, limit: 24, sort: 'relevance' },
    });

    createMeiliMock(mockSearchResults);

    const req = new NextRequest('http://localhost/api/search?query=villa');
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.hits).toHaveLength(2);
    expect(json.data.totalHits).toBe(2);
  });

  it('filters by property type (category)', async () => {
    const mockSearchResults = {
      hits: [{ id: 'listing-1', title: 'Luxury Villa', category: 'villa', pricePerNight: 500 }],
      totalHits: 1,
      page: 1,
      totalPages: 1,
      processingTimeMs: 8,
      facetDistribution: { category: { villa: 1 }, amenities: {}, city: {}, country: {} },
    };

    (searchParamsSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: { query: '', category: ['villa'], page: 1, limit: 24, sort: 'relevance' },
    });

    const mockSearch = createMeiliMock(mockSearchResults);

    const req = new NextRequest('http://localhost/api/search?category=villa');
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.hits).toHaveLength(1);
    expect(mockSearch).toHaveBeenCalled();

    // Verify the filter was passed to Meilisearch
    const searchCall = mockSearch.mock.calls[0];
    expect(searchCall).toBeDefined();
    expect(searchCall![1].filter).toBeDefined();
    expect(searchCall![1].filter).toContainEqual(expect.stringContaining('category'));
  });

  it('handles empty results gracefully', async () => {
    const emptyResults = {
      hits: [],
      totalHits: 0,
      page: 1,
      totalPages: 0,
      processingTimeMs: 3,
      facetDistribution: { category: {}, amenities: {}, city: {}, country: {} },
    };

    (searchParamsSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: { query: 'nonexistentproperty12345', page: 1, limit: 24, sort: 'relevance' },
    });

    createMeiliMock(emptyResults);

    const req = new NextRequest('http://localhost/api/search?query=nonexistentproperty12345');
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.hits).toEqual([]);
    expect(json.data.totalHits).toBe(0);
  });

  it('returns 400 for invalid query parameters', async () => {
    (searchParamsSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: false,
      error: { issues: [{ message: 'Invalid parameter' }] },
    });

    const req = new NextRequest('http://localhost/api/search?page=-1&limit=abc');
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 429 when rate limited', async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      retryAfter: 30,
    });

    const req = new NextRequest('http://localhost/api/search?query=villa');
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RATE_LIMITED');
  });

  it('falls back to database when Meilisearch is unavailable', async () => {
    (searchParamsSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: { query: 'villa', page: 1, limit: 24, sort: 'relevance' },
    });

    // Meilisearch throws
    (getMeiliClient as ReturnType<typeof vi.fn>).mockReturnValue({
      index: vi.fn().mockReturnValue({
        search: vi.fn().mockRejectedValue(new Error('Meilisearch unavailable')),
      }),
    });

    // DB fallback: count query returns via the chained select().from().where()
    mockDb.where.mockResolvedValue([{ count: 1 }]);

    const dbRow = {
      id: 'listing-1',
      title: 'Villa from DB',
      slug: 'villa-from-db',
      description: 'A villa',
      category: 'villa',
      pricePerNight: '300',
      currency: 'USD',
      city: 'Bali',
      state: 'Bali',
      country: 'Indonesia',
      lat: '-8.3405',
      lng: '115.0920',
      amenities: ['wifi'],
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1,
      rating: '4.5',
      reviewCount: 10,
      featured: true,
      createdAt: new Date('2024-01-01'),
      images: [{ url: 'https://example.com/img.jpg', sortOrder: 0 }],
    };
    mockDb.query.listings.findMany.mockResolvedValue([dbRow]);

    const req = new NextRequest('http://localhost/api/search?query=villa');
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.hits).toBeDefined();
  });
});
