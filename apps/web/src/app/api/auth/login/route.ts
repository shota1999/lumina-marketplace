import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDb, users } from '@lumina/db';
import { withSpan, SpanAttr } from '@lumina/telemetry';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { verifyPassword, createSession } from '@/lib/auth';
import { createRequestLogger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'POST /api/auth/login' });

  try {
    const rl = await checkRateLimit(request, 'auth:login', RATE_LIMITS.login);
    if (!rl.allowed) {
      log.warn('Rate limited');
      log.done(429);
      return errorResponse(
        { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' },
        429,
      );
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) return bodyResult.error;

    const parsed = loginSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse({ code: 'VALIDATION_ERROR', message: 'Invalid email or password' }, 400);
    }

    const { email, password } = parsed.data;

    return withSpan(
      'auth.login',
      {
        [SpanAttr.AUTH_METHOD]: 'email',
      },
      async () => {
        const db = getDb();

        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });

        if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
          log.warn('Login failed', { email });
          return errorResponse(
            { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
            401,
          );
        }

        await createSession(user.id);
        log.info('Login success', { userId: user.id });
        log.done(200);

        return successResponse({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        });
      },
    );
  } catch (error) {
    log.error('Login error', { error: String(error) });
    log.done(500);
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Login failed' }, 500);
  }
}
