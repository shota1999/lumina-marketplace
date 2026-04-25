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
  users: { email: 'email', id: 'id', name: 'name', role: 'role' },
  eq: vi.fn((...args: unknown[]) => args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  RATE_LIMITS: { register: {} },
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
import { hashPassword, createSession } from '@/lib/auth';
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

function createRegisterRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
    });
  });

  it('returns 201 with user data on successful registration', async () => {
    const newUser = {
      id: 'new-user-1',
      email: 'new@example.com',
      name: 'New User',
      role: 'user',
    };

    mockDb.query.users.findFirst.mockResolvedValue(null);
    (hashPassword as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-password');
    mockDb.returning.mockResolvedValue([newUser]);
    (createSession as ReturnType<typeof vi.fn>).mockResolvedValue('session-token-123');

    const req = createRegisterRequest({
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      id: 'new-user-1',
      email: 'new@example.com',
      name: 'New User',
      role: 'user',
    });
  });

  it('returns 409 when email already exists', async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: 'existing-user',
      email: 'taken@example.com',
    });

    const req = createRegisterRequest({
      name: 'New User',
      email: 'taken@example.com',
      password: 'password123',
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('DUPLICATE');
  });

  it('returns 400 for weak password (under 8 characters)', async () => {
    const req = createRegisterRequest({
      name: 'Test User',
      email: 'test@example.com',
      password: 'short',
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when required fields are missing', async () => {
    // Missing name
    const reqNoName = createRegisterRequest({
      email: 'test@example.com',
      password: 'password123',
    });
    const responseNoName = await POST(reqNoName);
    expect(responseNoName.status).toBe(400);

    // Missing email
    const reqNoEmail = createRegisterRequest({
      name: 'Test User',
      password: 'password123',
    });
    const responseNoEmail = await POST(reqNoEmail);
    expect(responseNoEmail.status).toBe(400);

    // Missing password
    const reqNoPassword = createRegisterRequest({
      name: 'Test User',
      email: 'test@example.com',
    });
    const responseNoPassword = await POST(reqNoPassword);
    expect(responseNoPassword.status).toBe(400);

    // Empty body
    const reqEmpty = createRegisterRequest({});
    const responseEmpty = await POST(reqEmpty);
    expect(responseEmpty.status).toBe(400);
  });

  it('inserts user into database with hashed password', async () => {
    const newUser = {
      id: 'new-user-1',
      email: 'new@example.com',
      name: 'New User',
      role: 'user',
    };

    mockDb.query.users.findFirst.mockResolvedValue(null);
    (hashPassword as ReturnType<typeof vi.fn>).mockResolvedValue('bcrypt-hashed-value');
    mockDb.returning.mockResolvedValue([newUser]);
    (createSession as ReturnType<typeof vi.fn>).mockResolvedValue('session-token');

    const req = createRegisterRequest({
      name: 'New User',
      email: 'New@Example.com',
      password: 'password123',
    });
    await POST(req);

    expect(hashPassword).toHaveBeenCalledWith('password123');
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New User',
        email: 'new@example.com', // lowercased
        passwordHash: 'bcrypt-hashed-value',
      }),
    );
  });

  it('calls createSession on successful registration', async () => {
    const newUser = {
      id: 'new-user-1',
      email: 'new@example.com',
      name: 'New User',
      role: 'user',
    };

    mockDb.query.users.findFirst.mockResolvedValue(null);
    (hashPassword as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-password');
    mockDb.returning.mockResolvedValue([newUser]);
    (createSession as ReturnType<typeof vi.fn>).mockResolvedValue('session-token-123');

    const req = createRegisterRequest({
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
    });
    await POST(req);

    expect(createSession).toHaveBeenCalledWith('new-user-1');
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid email format', async () => {
    const req = createRegisterRequest({
      name: 'Test User',
      email: 'not-valid-email',
      password: 'password123',
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });
});
