import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@lumina/db', () => ({
  getDb: vi.fn(),
  users: { email: 'email', id: 'id' },
  favorites: { userId: 'userId', listingId: 'listingId', id: 'id' },
  listings: { status: 'status', slug: 'slug', id: 'id' },
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  RATE_LIMITS: {},
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
vi.mock('@/lib/idempotency', () => ({ checkIdempotency: vi.fn() }));

import { GET, POST } from './route';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@lumina/db';

const mockDb = {
  query: {
    users: { findFirst: vi.fn() },
    favorites: { findMany: vi.fn(), findFirst: vi.fn() },
  },
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  delete: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
};

const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'user' };

describe('GET /api/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  });

  it('returns user favorites on success', async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const mockFavorites = [
      {
        id: 'fav-1',
        listingId: 'listing-1',
        listing: { id: 'listing-1', title: 'Beautiful Villa', slug: 'beautiful-villa', images: [] },
      },
      {
        id: 'fav-2',
        listingId: 'listing-2',
        listing: { id: 'listing-2', title: 'Cozy Apartment', slug: 'cozy-apartment', images: [] },
      },
    ];
    mockDb.query.favorites.findMany.mockResolvedValue(mockFavorites);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeInstanceOf(Array);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].listing.title).toBe('Beautiful Villa');
  });

  it('returns 401 when not authenticated', async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns empty array when user has no favorites', async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    mockDb.query.favorites.findMany.mockResolvedValue([]);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
  });
});

describe('POST /api/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  });

  it('adds a new favorite and returns 201 with action added', async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    // No existing favorite
    mockDb.query.favorites.findFirst.mockResolvedValue(null);
    mockDb.returning.mockResolvedValue([
      { id: 'fav-new', userId: 'user-1', listingId: 'listing-1' },
    ]);

    const req = new NextRequest('http://localhost/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: 'listing-1' }),
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.action).toBe('added');
    expect(json.data.favorite).toBeDefined();
  });

  it('removes an existing favorite and returns 200 with action removed', async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    // Existing favorite found
    mockDb.query.favorites.findFirst.mockResolvedValue({
      id: 'fav-existing',
      userId: 'user-1',
      listingId: 'listing-1',
    });
    mockDb.where.mockResolvedValue([{ id: 'fav-existing' }]);

    const req = new NextRequest('http://localhost/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: 'listing-1' }),
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.action).toBe('removed');
  });

  it('returns 401 when not authenticated', async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: 'listing-1' }),
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 when listingId is missing', async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const req = new NextRequest('http://localhost/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when listingId is empty string', async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const req = new NextRequest('http://localhost/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: '' }),
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });
});
