import { NextRequest } from 'next/server';
import { z } from 'zod';

import { withSpan } from '@lumina/telemetry';

import { errorResponse, safeParseBody } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { createRequestLogger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { generateListingDescription, type ListingContext } from '@/lib/services/ai';

const generateSchema = z.object({
  title: z.string().min(3).max(200),
  category: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  amenities: z.array(z.string()).default([]),
  maxGuests: z.number().int().min(1).max(50),
  bedrooms: z.number().int().min(0).max(30),
  bathrooms: z.number().int().min(0).max(20),
  pricePerNight: z.number().positive().optional(),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'POST /api/ai/generate-description' });

  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      log.done(401);
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Host access required' }, 401);
    }

    const rl = await checkRateLimit(request, 'ai:generate', {
      max: 10,
      windowSec: 60,
    });
    if (!rl.allowed) {
      log.done(429);
      return errorResponse(
        { code: 'RATE_LIMITED', message: 'Too many AI requests. Try again later.' },
        429,
      );
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) return bodyResult.error;

    const parsed = generateSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      log.done(400);
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    log.info('Generating AI description', { userId: user.id, title: parsed.data.title });

    const stream = await withSpan(
      'ai.generate_description',
      {
        'ai.model': 'claude-sonnet-4-20250514',
        'listing.category': parsed.data.category,
      },
      () => generateListingDescription(parsed.data as ListingContext),
    );

    log.done(200);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    log.error('AI description generation failed', { error: String(error) });
    log.done(500);
    return errorResponse({ code: 'AI_ERROR', message: 'Failed to generate description' }, 500);
  }
}
