import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDb, users } from '@lumina/db';
import { withSpan, SpanAttr } from '@lumina/telemetry';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { createSession } from '@/lib/auth';
import { isDemoMode } from '@/lib/demo-guard';
import { createRequestLogger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const DEMO_PERSONAS = {
  admin: 'admin@lumina.dev',
  host: 'host@lumina.dev',
  guest: 'guest@lumina.dev',
  traveler: 'traveler@lumina.dev',
} as const;

const bodySchema = z.object({
  persona: z.enum(['admin', 'host', 'guest', 'traveler']),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'POST /api/auth/demo-login' });

  if (!isDemoMode()) {
    log.warn('Demo login attempted while DEMO_MODE is off');
    log.done(404);
    return errorResponse({ code: 'NOT_FOUND', message: 'Not found' }, 404);
  }

  try {
    const rl = await checkRateLimit(request, 'auth:login', RATE_LIMITS.login);
    if (!rl.allowed) {
      log.done(429);
      return errorResponse(
        { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' },
        429,
      );
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) return bodyResult.error;

    const parsed = bodySchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse({ code: 'VALIDATION_ERROR', message: 'Invalid persona' }, 400);
    }

    const email = DEMO_PERSONAS[parsed.data.persona];

    return withSpan(
      'auth.login',
      {
        [SpanAttr.AUTH_METHOD]: 'demo',
      },
      async () => {
        const db = getDb();
        const user = await db.query.users.findFirst({ where: eq(users.email, email) });

        if (!user) {
          log.warn('Demo persona not found in DB', { email });
          return errorResponse(
            { code: 'NOT_FOUND', message: 'Demo account not seeded' },
            404,
          );
        }

        await createSession(user.id);
        log.info('Demo login success', { userId: user.id, persona: parsed.data.persona });
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
    log.error('Demo login error', { error: String(error) });
    log.done(500);
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Demo login failed' }, 500);
  }
}
