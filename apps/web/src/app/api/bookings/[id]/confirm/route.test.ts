import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createTestRequest, parseResponse, TEST_USER, TEST_USER_2 } from '@/test/helpers';

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, resetAt: 0 }),
  RATE_LIMITS: { bookingConfirm: { max: 10, windowSec: 60 } },
}));

const mockGetCurrentUser = vi.fn().mockResolvedValue(null);
vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

const mockConfirmBooking = vi.fn();
vi.mock('@/lib/services/booking', () => ({
  confirmBooking: (...args: unknown[]) => mockConfirmBooking(...args),
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

vi.mock('@/lib/metrics', () => ({
  metricSuccess: vi.fn(),
  metricFailure: vi.fn(),
}));

const BOOKING_ID = '00000000-0000-0000-0000-000000000099';

describe('POST /api/bookings/:id/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    const { POST } = await import('./route');
    const req = createTestRequest(`/api/bookings/${BOOKING_ID}/confirm`, { method: 'POST' });
    const { status, body } = await parseResponse(
      await POST(req, { params: Promise.resolve({ id: BOOKING_ID }) }),
    );
    expect(status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('allows owner to confirm their booking', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(TEST_USER);
    mockConfirmBooking.mockResolvedValueOnce({ success: true });

    const { POST } = await import('./route');
    const req = createTestRequest(`/api/bookings/${BOOKING_ID}/confirm`, { method: 'POST' });
    const { status, body } = await parseResponse(
      await POST(req, { params: Promise.resolve({ id: BOOKING_ID }) }),
    );

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockConfirmBooking).toHaveBeenCalledWith(BOOKING_ID, TEST_USER.id, expect.any(Object));
  });

  it('rejects non-owner with NOT_FOUND (does not leak existence)', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(TEST_USER_2);
    mockConfirmBooking.mockResolvedValueOnce({
      success: false,
      code: 'NOT_FOUND',
      message: 'Booking not found',
    });

    const { POST } = await import('./route');
    const req = createTestRequest(`/api/bookings/${BOOKING_ID}/confirm`, { method: 'POST' });
    const { status, body } = await parseResponse(
      await POST(req, { params: Promise.resolve({ id: BOOKING_ID }) }),
    );

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('rejects invalid booking id', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(TEST_USER);
    mockConfirmBooking.mockResolvedValueOnce({
      success: false,
      code: 'NOT_FOUND',
      message: 'Booking not found',
    });

    const { POST } = await import('./route');
    const req = createTestRequest('/api/bookings/nonexistent/confirm', { method: 'POST' });
    const { status, body } = await parseResponse(
      await POST(req, { params: Promise.resolve({ id: 'nonexistent' }) }),
    );

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
