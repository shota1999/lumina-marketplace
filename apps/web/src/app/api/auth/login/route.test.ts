import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
  createSession: vi.fn(),
}));

vi.mock('@lumina/db', () => ({
  getDb: vi.fn(),
  users: { email: 'email', id: 'id' },
  eq: vi.fn((...args: unknown[]) => args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  RATE_LIMITS: { login: {} },
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

import { POST } from './route';
import { verifyPassword, createSession } from '@/lib/auth';
import { getDb } from '@lumina/db';
import { checkRateLimit } from '@/lib/rate-limit';

const mockDb = {
  query: {
    users: { findFirst: vi.fn() },
  },
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
};

function createLoginRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
    });
  });

  it('returns 200 with user data on successful login', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      passwordHash: 'hashed-password',
    };
    mockDb.query.users.findFirst.mockResolvedValue(mockUser);
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (createSession as ReturnType<typeof vi.fn>).mockResolvedValue('session-token-123');

    const req = createLoginRequest({
      email: 'test@example.com',
      password: 'password123',
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    });
  });

  it('returns 401 when email does not exist in database', async () => {
    mockDb.query.users.findFirst.mockResolvedValue(null);

    const req = createLoginRequest({
      email: 'nonexistent@example.com',
      password: 'password123',
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 when password is wrong', async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      passwordHash: 'hashed-password',
    });
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const req = createLoginRequest({
      email: 'test@example.com',
      password: 'wrongpassword',
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 400 when required fields are missing', async () => {
    const reqNoEmail = createLoginRequest({ password: 'password123' });
    const responseNoEmail = await POST(reqNoEmail);
    const jsonNoEmail = await responseNoEmail.json();

    expect(responseNoEmail.status).toBe(400);
    expect(jsonNoEmail.success).toBe(false);
    expect(jsonNoEmail.error.code).toBe('VALIDATION_ERROR');

    const reqNoPassword = createLoginRequest({ email: 'test@example.com' });
    const responseNoPassword = await POST(reqNoPassword);
    const jsonNoPassword = await responseNoPassword.json();

    expect(responseNoPassword.status).toBe(400);
    expect(jsonNoPassword.success).toBe(false);

    const reqEmpty = createLoginRequest({});
    const responseEmpty = await POST(reqEmpty);
    const jsonEmpty = await responseEmpty.json();

    expect(responseEmpty.status).toBe(400);
    expect(jsonEmpty.success).toBe(false);
  });

  it('returns 429 when rate limited', async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      retryAfter: 60,
    });

    const req = createLoginRequest({
      email: 'test@example.com',
      password: 'password123',
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RATE_LIMITED');
  });

  it('calls createSession on successful login', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      passwordHash: 'hashed-password',
    };
    mockDb.query.users.findFirst.mockResolvedValue(mockUser);
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (createSession as ReturnType<typeof vi.fn>).mockResolvedValue('session-token-123');

    const req = createLoginRequest({
      email: 'test@example.com',
      password: 'password123',
    });
    await POST(req);

    expect(createSession).toHaveBeenCalledWith('user-1');
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when user has no passwordHash (OAuth-only user)', async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: 'user-2',
      email: 'oauth@example.com',
      name: 'OAuth User',
      role: 'user',
      passwordHash: null,
    });

    const req = createLoginRequest({
      email: 'oauth@example.com',
      password: 'password123',
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_CREDENTIALS');
  });
});
