import { NextRequest } from 'next/server';

import { updateNotificationPrefsSchema } from '@lumina/shared';
import { getDb, users } from '@lumina/db';
import { eq } from 'drizzle-orm';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const parsed = updateNotificationPrefsSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const db = getDb();

    await db
      .update(users)
      .set({
        notificationPreferences: parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to update preferences' }, 500);
  }
}
