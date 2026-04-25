import { NextRequest } from 'next/server';
import { vi } from 'vitest';

/**
 * Create a NextRequest for testing route handlers.
 */
export function createTestRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = 'GET', body, headers = {} } = options;
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as any);
}

/**
 * Parse the JSON body from a NextResponse.
 */
export async function parseResponse(response: Response) {
  return { status: response.status, body: await response.json() };
}

/**
 * Mock the auth module to return a specific user or null.
 */
export function mockCurrentUser(user: { id: string; name: string; email: string; avatarUrl: string | null; role: string; createdAt: string } | null) {
  vi.doMock('@/lib/auth', () => ({
    getCurrentUser: vi.fn().mockResolvedValue(user),
  }));
}

/** A test user for authenticated requests */
export const TEST_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Test User',
  email: 'test@lumina.dev',
  avatarUrl: null,
  role: 'user',
  createdAt: '2024-01-01T00:00:00.000Z',
};

export const TEST_USER_2 = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'Other User',
  email: 'other@lumina.dev',
  avatarUrl: null,
  role: 'user',
  createdAt: '2024-01-01T00:00:00.000Z',
};
