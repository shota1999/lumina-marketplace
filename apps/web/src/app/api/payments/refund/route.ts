import { NextRequest } from 'next/server';

import { refundSchema } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { processRefund } from '@/lib/services/payment';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return errorResponse({ code: 'FORBIDDEN', message: 'Admin access required' }, 403);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const parsed = refundSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const result = await processRefund(parsed.data.bookingId, parsed.data.amount, parsed.data.reason);

    return successResponse(result);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to process refund' }, 500);
  }
}
