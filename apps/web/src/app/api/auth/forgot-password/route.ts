import crypto from 'crypto';

import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDb, passwordResetTokens, users } from '@lumina/db';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { createRequestLogger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'POST /api/auth/forgot-password' });

  try {
    const rl = await checkRateLimit(request, 'auth:forgot-password', RATE_LIMITS.login);
    if (!rl.allowed) {
      log.warn('Rate limited');
      log.done(429);
      return errorResponse({ code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' }, 429);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) return bodyResult.error;

    const parsed = forgotPasswordSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse({ code: 'VALIDATION_ERROR', message: 'Valid email is required' }, 400);
    }

    const { email } = parsed.data;
    const db = getDb();

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    // Always return success to avoid leaking whether an email exists
    if (!user) {
      log.info('Forgot password for non-existent email', { email });
      log.done(200);
      return successResponse({ message: 'If that email is registered, a reset link has been sent.' });
    }

    // Generate a secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
    const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}`;
    const smtpConfigured = Boolean(
      process.env['SMTP_HOST'] && process.env['SMTP_USER'] && process.env['SMTP_PASS'],
    );
    let emailSent = false;

    if (smtpConfigured) {
      try {
        const { sendPasswordResetEmail } = await import('@/lib/services/email');
        await sendPasswordResetEmail(user.email, resetUrl);
        emailSent = true;
        log.info('Password reset email sent', { userId: user.id });
      } catch (emailError) {
        log.error('Failed to send reset email', { error: String(emailError) });
      }
    }

    // Demo fallback: when SMTP isn't configured, surface the reset URL directly
    // so portfolio reviewers can complete the flow without a working mailbox.
    // When SMTP IS configured, the URL is never exposed in the response.
    if (!smtpConfigured) {
      // eslint-disable-next-line no-console
      console.log(
        `\n========================================\n[DEMO] Password reset link (SMTP not configured):\n${resetUrl}\n========================================\n`,
      );
      log.done(200);
      return successResponse({
        message:
          'Email delivery is not configured for this demo. Use the link below to reset your password.',
        devResetUrl: resetUrl,
      });
    }

    log.done(200);
    return successResponse({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (error) {
    log.error('Forgot password error', { error: String(error) });
    log.done(500);
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Something went wrong' }, 500);
  }
}
