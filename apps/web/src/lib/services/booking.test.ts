import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB
const mockFindFirst = vi.fn();
const mockInsertReturning = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock('@lumina/db', () => ({
  getDb: () => ({
    query: {
      listings: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
      bookings: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
    },
    insert: () => ({
      values: () => ({
        returning: () => mockInsertReturning(),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => mockUpdateWhere(),
      }),
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
  listings: { id: 'id', status: 'status' },
}));

vi.mock('@/lib/audit', () => ({
  audit: vi.fn(),
}));

vi.mock('@/lib/error-capture', () => ({
  captureBusinessFailure: vi.fn(),
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

describe('confirmBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success for already-confirmed booking (idempotent)', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'booking-1',
      userId: 'user-1',
      status: 'confirmed',
    });

    const { confirmBooking } = await import('./booking');
    const result = await confirmBooking('booking-1', 'user-1');
    expect(result.success).toBe(true);
    // Should NOT call update since already confirmed
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('rejects cancelled booking with INVALID_STATUS', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'booking-1',
      userId: 'user-1',
      status: 'cancelled',
    });

    const { confirmBooking } = await import('./booking');
    const result = await confirmBooking('booking-1', 'user-1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_STATUS');
    }
  });

  it('confirms pending booking and writes audit log', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'booking-1',
      userId: 'user-1',
      status: 'pending',
    });
    mockUpdateWhere.mockResolvedValueOnce(undefined);

    const { confirmBooking } = await import('./booking');
    const { audit } = await import('@/lib/audit');
    const result = await confirmBooking('booking-1', 'user-1', { requestId: 'req-123' });

    expect(result.success).toBe(true);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'booking.confirmed',
        userId: 'user-1',
        requestId: 'req-123',
        resourceId: 'booking-1',
      }),
    );
  });
});
