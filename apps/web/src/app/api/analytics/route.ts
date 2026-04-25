import { NextRequest, NextResponse } from 'next/server';

import { getDb, analyticsEvents } from '@lumina/db';
import { analyticsEventSchema } from '@lumina/shared';

import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = analyticsEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid event' } },
        { status: 400 },
      );
    }

    const user = await getCurrentUser().catch(() => null);
    const sessionId =
      request.cookies.get('lumina_session_id')?.value ?? crypto.randomUUID();

    const db = getDb();
    await db.insert(analyticsEvents).values({
      type: parsed.data.type,
      userId: user?.id ?? null,
      sessionId,
      data: parsed.data.data,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logger.error('Failed to track event', { error: String(error) });
    // Analytics failures should not return 500 to the client
    return NextResponse.json({ success: true }, { status: 202 });
  }
}
