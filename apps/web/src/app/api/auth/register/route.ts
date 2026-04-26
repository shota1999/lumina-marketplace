import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDb, users } from '@lumina/db';
import { withSpan, SpanAttr } from '@lumina/telemetry';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { hashPassword, createSession } from '@/lib/auth';
import { createRequestLogger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'POST /api/auth/register' });

  try {
    const rl = await checkRateLimit(request, 'auth:register', RATE_LIMITS.register);
    if (!rl.allowed) {
      log.warn('Rate limited');
      log.done(429);
      return errorResponse(
        { code: 'RATE_LIMITED', message: 'Too many registration attempts. Try again later.' },
        429,
      );
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) return bodyResult.error;

    const parsed = registerSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const { name, email, password } = parsed.data;

    return withSpan(
      'auth.register',
      {
        [SpanAttr.AUTH_METHOD]: 'email',
      },
      async () => {
        const db = getDb();

        const existing = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });
        if (existing) {
          return errorResponse(
            { code: 'DUPLICATE', message: 'An account with this email already exists' },
            409,
          );
        }

        const passwordHash = await hashPassword(password);
        const [user] = await db
          .insert(users)
          .values({ name, email: email.toLowerCase(), passwordHash })
          .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

        await createSession(user!.id);
        log.info('Registration success', { userId: user!.id });
        log.done(201);

        return successResponse(
          { id: user!.id, email: user!.email, name: user!.name, role: user!.role },
          201,
        );
      },
    );
  } catch (error) {
    log.error('Registration error', { error: String(error) });
    log.done(500);
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Registration failed' }, 500);
  }
}
