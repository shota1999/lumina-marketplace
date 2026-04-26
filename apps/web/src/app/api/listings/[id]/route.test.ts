import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createTestRequest, parseResponse } from '@/test/helpers';

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    done: vi.fn(),
  }),
}));

vi.mock('@/lib/error-capture', () => ({
  captureError: vi.fn(),
}));

const mockFindFirst = vi.fn();
const mockSelect = vi.fn();
const mockFindMany = vi.fn();

vi.mock('@lumina/db', () => ({
  getDb: () => ({
    query: {
      listings: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
    },
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            orderBy: () => mockSelect(),
          }),
        }),
      }),
    }),
  }),
  listings: { slug: 'slug', status: 'status', category: 'category', id: 'id', rating: 'rating' },
  listingImages: {},
  reviews: {
    listingId: 'listingId',
    userId: 'userId',
    id: 'id',
    rating: 'rating',
    comment: 'comment',
    createdAt: 'createdAt',
  },
  users: { id: 'id', name: 'name', avatarUrl: 'avatarUrl' },
}));

const MOCK_LISTING = {
  id: '00000000-0000-0000-0000-000000000010',
  slug: 'ocean-villa',
  title: 'Ocean Villa',
  description: 'A beautiful ocean-front villa',
  category: 'villa',
  status: 'published',
  pricePerNight: '250.00',
  currency: 'USD',
  rating: '4.80',
  reviewCount: 5,
  address: '123 Ocean Dr',
  city: 'Malibu',
  state: 'CA',
  country: 'US',
  lat: '34.025',
  lng: '-118.779',
  maxGuests: 6,
  bedrooms: 3,
  bathrooms: 2,
  amenities: ['wifi', 'pool'],
  hostId: 'host-1',
  partnerId: null,
  featured: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  images: [
    {
      id: 'img-1',
      url: 'https://example.com/1.jpg',
      alt: 'Villa',
      width: 1200,
      height: 800,
      isPrimary: true,
      sortOrder: 0,
    },
  ],
};

describe('GET /api/listings/:slug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns listing data for valid slug', async () => {
    mockFindFirst.mockResolvedValueOnce(MOCK_LISTING);
    mockSelect.mockResolvedValueOnce([]); // reviews
    mockFindMany.mockResolvedValueOnce([]); // similar

    const { GET } = await import('./route');
    const req = createTestRequest('/api/listings/ocean-villa');
    const { status, body } = await parseResponse(
      await GET(req, { params: Promise.resolve({ id: 'ocean-villa' }) }),
    );

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.listing.slug).toBe('ocean-villa');
    expect(body.data.listing.pricePerNight).toBe(250);
    expect(body.data.listing.location.city).toBe('Malibu');
  });

  it('returns 404 for missing listing', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const { GET } = await import('./route');
    const req = createTestRequest('/api/listings/nonexistent');
    const { status, body } = await parseResponse(
      await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) }),
    );

    expect(status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
