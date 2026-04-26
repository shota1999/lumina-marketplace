/**
 * E2E flow tests — exercise the full request/response cycle through
 * multiple route handlers in sequence, simulating real user journeys.
 *
 * These still mock the DB/Redis layer (no live infra needed), but
 * test the composition of route handlers, auth, validation, and
 * business logic together.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Shared mocks ---

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, resetAt: 0 }),
  RATE_LIMITS: {
    bookingCreate: { max: 10, windowSec: 60 },
    bookingConfirm: { max: 10, windowSec: 60 },
    reviewCreate: { max: 5, windowSec: 60 },
    search: { max: 60, windowSec: 60 },
  },
}));

const mockGetCurrentUser = vi.fn();
vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
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
  captureBusinessFailure: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  audit: vi.fn(),
}));

vi.mock('@/lib/idempotency', () => ({
  checkIdempotencyKey: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/metrics', () => ({
  metricSuccess: vi.fn(),
  metricFailure: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

// --- DB mocks ---

const mockBookingsFindFirst = vi.fn();
const mockListingsQueryFindFirst = vi.fn();
const mockListingsQueryFindMany = vi.fn();
const mockReviewsFindFirst = vi.fn();
const mockInsertValues: Record<string, (...args: unknown[]) => void> = {};
const mockUpdateSet = vi.fn();

vi.mock('@lumina/db', () => ({
  getDb: () => ({
    query: {
      listings: {
        findFirst: (...args: unknown[]) => mockListingsQueryFindFirst(...args),
        findMany: (...args: unknown[]) => mockListingsQueryFindMany(...args),
      },
      bookings: { findFirst: (...args: unknown[]) => mockBookingsFindFirst(...args) },
      reviews: { findFirst: (...args: unknown[]) => mockReviewsFindFirst(...args) },
    },
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            orderBy: () => Promise.resolve([]),
          }),
        }),
      }),
    }),
    insert: () => ({
      values: (data: Record<string, unknown>) => {
        // Track what was inserted
        const table = data.listingId
          ? data.rating !== undefined
            ? 'reviews'
            : 'bookings'
          : 'other';
        mockInsertValues[table]?.(data);
        return {
          returning: () => {
            if (table === 'bookings') {
              return Promise.resolve([
                {
                  id: 'booking-e2e',
                  listingId: data.listingId,
                  userId: data.userId,
                  startDate: data.startDate,
                  endDate: data.endDate,
                  totalPrice: data.totalPrice,
                  status: 'pending',
                },
              ]);
            }
            if (table === 'reviews') {
              return Promise.resolve([
                {
                  id: 'review-e2e',
                  listingId: data.listingId,
                  userId: data.userId,
                  rating: data.rating,
                  comment: data.comment,
                  createdAt: new Date(),
                },
              ]);
            }
            return Promise.resolve([]);
          },
        };
      },
    }),
    update: () => ({
      set: (data: unknown) => {
        mockUpdateSet(data);
        return {
          where: () => ({
            returning: () => Promise.resolve([{ slug: 'ocean-villa' }]),
          }),
        };
      },
    }),
  }),
  bookings: {
    id: 'id',
    listingId: 'listingId',
    status: 'status',
    startDate: 'startDate',
    endDate: 'endDate',
    userId: 'userId',
  },
  listings: { id: 'id', slug: 'slug', status: 'status', category: 'category', rating: 'rating' },
  listingImages: {},
  reviews: {
    id: 'id',
    listingId: 'listingId',
    userId: 'userId',
    rating: 'rating',
    comment: 'comment',
    createdAt: 'createdAt',
  },
  users: { id: 'id', name: 'name', avatarUrl: 'avatarUrl' },
}));

// --- Helpers ---

function makeReq(path: string, opts: { method?: string; body?: unknown } = {}) {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method: opts.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
  };
  if (opts.body) init.body = JSON.stringify(opts.body);
  return new NextRequest(new URL(path, 'http://localhost:3000'), init);
}

async function parse(res: Response) {
  return { status: res.status, body: await res.json() };
}

const TEST_USER = {
  id: 'user-e2e-1',
  name: 'E2E User',
  email: 'e2e@lumina.dev',
  avatarUrl: null,
  role: 'user',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const LISTING = {
  id: '00000000-0000-0000-0000-0000000000e2',
  slug: 'ocean-villa',
  title: 'Ocean Villa',
  description: 'Stunning ocean views',
  category: 'villa',
  status: 'published',
  pricePerNight: '200.00',
  currency: 'USD',
  rating: '4.50',
  reviewCount: 3,
  maxGuests: 6,
  bedrooms: 3,
  bathrooms: 2,
  amenities: ['wifi', 'pool'],
  address: '123 Beach Rd',
  city: 'Malibu',
  state: 'CA',
  country: 'US',
  lat: '34.025',
  lng: '-118.779',
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('E2E: Search → Listing → Booking → Confirm', () => {
  it('completes the full booking flow', async () => {
    // Step 1: View listing detail
    mockListingsQueryFindFirst.mockResolvedValueOnce(LISTING);
    mockListingsQueryFindMany.mockResolvedValueOnce([]); // similar

    const { GET: getListingDetail } = await import('@/app/api/listings/[id]/route');
    const listingRes = await parse(
      await getListingDetail(makeReq('/api/listings/ocean-villa'), {
        params: Promise.resolve({ id: 'ocean-villa' }),
      }),
    );

    expect(listingRes.status).toBe(200);
    expect(listingRes.body.data.listing.slug).toBe('ocean-villa');
    const listingId = listingRes.body.data.listing.id;

    // Step 2: Create booking (authenticated)
    mockGetCurrentUser.mockResolvedValueOnce(TEST_USER);
    // Mock listing lookup inside booking service
    mockListingsQueryFindFirst.mockResolvedValueOnce(LISTING);
    // No overlapping bookings
    mockBookingsFindFirst.mockResolvedValueOnce(null);

    const { POST: createBooking } = await import('@/app/api/bookings/route');
    const bookingRes = await parse(
      await createBooking(
        makeReq('/api/bookings', {
          method: 'POST',
          body: { listingId, startDate: '2026-07-01', endDate: '2026-07-05', guests: 2 },
        }),
      ),
    );

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.data.status).toBe('pending');
    const bookingId = bookingRes.body.data.id;

    // Step 3: Confirm booking
    mockGetCurrentUser.mockResolvedValueOnce(TEST_USER);
    mockBookingsFindFirst.mockResolvedValueOnce({
      id: bookingId,
      userId: TEST_USER.id,
      status: 'pending',
    });

    const { POST: confirmBooking } = await import('@/app/api/bookings/[id]/confirm/route');
    const confirmRes = await parse(
      await confirmBooking(makeReq(`/api/bookings/${bookingId}/confirm`, { method: 'POST' }), {
        params: Promise.resolve({ id: bookingId }),
      }),
    );

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);
  });
});

describe('E2E: Unauthenticated booking shows login prompt', () => {
  it('returns 401 for unauthenticated booking attempt', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const { POST } = await import('@/app/api/bookings/route');
    const res = await parse(
      await POST(
        makeReq('/api/bookings', {
          method: 'POST',
          body: {
            listingId: '00000000-0000-0000-0000-0000000000e2',
            startDate: '2026-07-01',
            endDate: '2026-07-05',
            guests: 2,
          },
        }),
      ),
    );

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toContain('Sign in');
  });
});

describe('E2E: Submit review flow', () => {
  it('creates review and returns with author info', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(TEST_USER);
    // Listing exists
    mockListingsQueryFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-0000000000e2',
      slug: 'ocean-villa',
    });
    // No existing review
    mockReviewsFindFirst.mockResolvedValueOnce(null);

    const { POST } = await import('@/app/api/reviews/route');
    const res = await parse(
      await POST(
        makeReq('/api/reviews', {
          method: 'POST',
          body: {
            listingId: '00000000-0000-0000-0000-0000000000e2',
            rating: 4,
            comment: 'Really enjoyed our stay at this beautiful villa',
          },
        }),
      ),
    );

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(4);
    expect(res.body.data.author.name).toBe(TEST_USER.name);
  });
});
