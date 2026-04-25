import { NextRequest } from 'next/server';

import { createCheckoutSchema } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/services/payment';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const parsed = createCheckoutSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const session = await createCheckoutSession(parsed.data.bookingId, user.id);

    return successResponse(session, 201);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create checkout session' }, 500);
  }
}
