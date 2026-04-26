import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createTestRequest, parseResponse, TEST_USER } from '@/test/helpers';

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, resetAt: 0 }),
  RATE_LIMITS: { reviewCreate: { max: 5, windowSec: 60 } },
}));

const mockGetCurrentUser = vi.fn().mockResolvedValue(null);
vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

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
  captureBusinessFailure: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  audit: vi.fn(),
}));

// Mock next/cache since revalidateTag is not available in test context
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

const LISTING_ID = '00000000-0000-0000-0000-000000000010';
const REVIEW_ID = '00000000-0000-0000-0000-000000000050';

// Mock DB
const mockFindFirstListing = vi.fn();
const mockFindFirstReview = vi.fn();
const mockInsertReturning = vi.fn();
const mockUpdateReturning = vi.fn();

vi.mock('@lumina/db', () => ({
  getDb: () => ({
    query: {
      listings: { findFirst: (...args: unknown[]) => mockFindFirstListing(...args) },
      reviews: { findFirst: (...args: unknown[]) => mockFindFirstReview(...args) },
    },
    insert: () => ({
      values: () => ({
        returning: () => mockInsertReturning(),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => mockUpdateReturning(),
        }),
      }),
    }),
  }),
  reviews: {},
  listings: {},
}));

const VALID_REVIEW = {
  listingId: LISTING_ID,
  rating: 5,
  comment: 'This was an amazing stay, would highly recommend!',
};

describe('POST /api/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    const { POST } = await import('./route');
    const req = createTestRequest('/api/reviews', { method: 'POST', body: VALID_REVIEW });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects invalid payload with 400', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(TEST_USER);
    const { POST } = await import('./route');
    const req = createTestRequest('/api/reviews', {
      method: 'POST',
      body: { listingId: 'not-uuid', rating: 6, comment: '' },
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a valid review and returns 201', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(TEST_USER);
    mockFindFirstListing.mockResolvedValueOnce({ id: LISTING_ID, slug: 'test-listing' });
    mockFindFirstReview.mockResolvedValueOnce(null); // no existing review
    mockInsertReturning.mockResolvedValueOnce([
      {
        id: REVIEW_ID,
        listingId: LISTING_ID,
        userId: TEST_USER.id,
        rating: 5,
        comment: VALID_REVIEW.comment,
        createdAt: new Date('2024-06-01'),
      },
    ]);
    mockUpdateReturning.mockResolvedValueOnce([{ slug: 'test-listing' }]);

    const { POST } = await import('./route');
    const req = createTestRequest('/api/reviews', { method: 'POST', body: VALID_REVIEW });
    const { status, body } = await parseResponse(await POST(req));

    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.rating).toBe(5);
    expect(body.data.id).toBe(REVIEW_ID);
  });

  it('prevents duplicate review with 409', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(TEST_USER);
    mockFindFirstListing.mockResolvedValueOnce({ id: LISTING_ID });
    mockFindFirstReview.mockResolvedValueOnce({ id: 'existing-review' }); // already reviewed

    const { POST } = await import('./route');
    const req = createTestRequest('/api/reviews', { method: 'POST', body: VALID_REVIEW });
    const { status, body } = await parseResponse(await POST(req));

    expect(status).toBe(409);
    expect(body.error.code).toBe('DUPLICATE');
  });
});
