import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createTestRequest, parseResponse, TEST_USER } from '@/test/helpers';

// Mock rate limiting to always allow
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, resetAt: 0 }),
  RATE_LIMITS: { bookingCreate: { max: 10, windowSec: 60 } },
}));

// Mock auth — default unauthenticated, override per test
const mockGetCurrentUser = vi.fn().mockResolvedValue(null);
vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

// Mock booking service
const mockCreateBooking = vi.fn();
vi.mock('@/lib/services/booking', () => ({
  createBooking: (...args: unknown[]) => mockCreateBooking(...args),
}));

// Mock logger
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

vi.mock('@/lib/idempotency', () => ({
  checkIdempotencyKey: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/metrics', () => ({
  metricSuccess: vi.fn(),
  metricFailure: vi.fn(),
}));

const VALID_BOOKING = {
  listingId: '00000000-0000-0000-0000-000000000010',
  startDate: '2026-06-01',
  endDate: '2026-06-05',
  guests: 2,
};

describe('POST /api/bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    const { POST } = await import('./route');
    const req = createTestRequest('/api/bookings', { method: 'POST', body: VALID_BOOKING });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects invalid dates with validation error', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(TEST_USER);
    const { POST } = await import('./route');
    const req = createTestRequest('/api/bookings', {
      method: 'POST',
      body: { ...VALID_BOOKING, startDate: 'not-a-date' },
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a valid booking and returns 201', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(TEST_USER);
    mockCreateBooking.mockResolvedValueOnce({
      success: true,
      booking: {
        id: 'booking-1',
        listingId: VALID_BOOKING.listingId,
        startDate: VALID_BOOKING.startDate,
        endDate: VALID_BOOKING.endDate,
        nights: 4,
        totalPrice: 800,
        status: 'pending',
      },
    });

    const { POST } = await import('./route');
    const req = createTestRequest('/api/bookings', { method: 'POST', body: VALID_BOOKING });
    const { status, body } = await parseResponse(await POST(req));

    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('booking-1');
    expect(body.data.status).toBe('pending');
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        ...VALID_BOOKING,
        userId: TEST_USER.id,
      }),
    );
  });

  it('rejects overlapping booking with 409', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(TEST_USER);
    mockCreateBooking.mockResolvedValueOnce({
      success: false,
      code: 'UNAVAILABLE',
      message: 'These dates are not available',
    });

    const { POST } = await import('./route');
    const req = createTestRequest('/api/bookings', { method: 'POST', body: VALID_BOOKING });
    const { status, body } = await parseResponse(await POST(req));

    expect(status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAVAILABLE');
  });
});
