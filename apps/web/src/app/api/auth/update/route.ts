import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDb, users } from '@lumina/db';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
}).refine((data) => {
  if (data.newPassword && !data.currentPassword) return false;
  return true;
}, { message: 'Current password is required to set a new password' });

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'auth:update', RATE_LIMITS.profileUpdate);
    if (!rl.allowed) {
      return errorResponse({ code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' }, 429);
    }

    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) return bodyResult.error;

    const parsed = updateSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
      }, 400);
    }

    const { name, email, currentPassword, newPassword } = parsed.data;
    const db = getDb();
    const updates: Record<string, string> = {};

    if (name) updates.name = name;

    if (email && email !== user.email) {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });
      if (existing) {
        return errorResponse({ code: 'EMAIL_TAKEN', message: 'This email is already in use' }, 409);
      }
      updates.email = email.toLowerCase();
    }

    if (newPassword && currentPassword) {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });
      if (!dbUser || !dbUser.passwordHash || !(await verifyPassword(currentPassword, dbUser.passwordHash))) {
        return errorResponse({ code: 'INVALID_PASSWORD', message: 'Current password is incorrect' }, 401);
      }
      updates.passwordHash = await hashPassword(newPassword);
    }

    if (Object.keys(updates).length === 0) {
      return successResponse({ message: 'No changes' });
    }

    await db.update(users).set(updates).where(eq(users.id, user.id));

    return successResponse({ message: 'Profile updated' });
  } catch {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to update profile' }, 500);
  }
}
