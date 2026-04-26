import crypto from 'crypto';

import { and, eq, gt, isNull } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDb, passwordResetTokens, users } from '@lumina/db';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { hashPassword } from '@/lib/auth';
import { createRequestLogger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'POST /api/auth/reset-password' });

  try {
    const rl = await checkRateLimit(request, 'auth:reset-password', RATE_LIMITS.login);
    if (!rl.allowed) {
      log.warn('Rate limited');
      log.done(429);
      return errorResponse(
        { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
        429,
      );
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) return bodyResult.error;

    const parsed = resetPasswordSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: 'Token and password (min 8 chars) are required' },
        400,
      );
    }

    const { token, password } = parsed.data;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const db = getDb();

    // Find valid, unused token
    const resetToken = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          gt(passwordResetTokens.expiresAt, new Date()),
          isNull(passwordResetTokens.usedAt),
        ),
      )
      .limit(1);

    const record = resetToken[0];
    if (!record) {
      log.warn('Invalid or expired reset token');
      log.done(400);
      return errorResponse(
        { code: 'INVALID_TOKEN', message: 'This reset link is invalid or has expired' },
        400,
      );
    }

    // Update password
    const newHash = await hashPassword(password);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, record.userId));

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));

    log.info('Password reset successful', { userId: record.userId });
    log.done(200);
    return successResponse({ message: 'Password has been reset. You can now sign in.' });
  } catch (error) {
    log.error('Reset password error', { error: String(error) });
    log.done(500);
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Something went wrong' }, 500);
  }
}
