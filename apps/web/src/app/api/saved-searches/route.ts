import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { getDb, savedSearches } from '@lumina/db';
import { savedSearchSchema } from '@lumina/shared';

import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } },
        { status: 401 },
      );
    }

    const db = getDb();
    const searches = await db.query.savedSearches.findMany({
      where: eq(savedSearches.userId, user.id),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    });

    return NextResponse.json({ success: true, data: searches });
  } catch (error) {
    logger.error('Failed to fetch saved searches', { error: String(error) });
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch saved searches' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = savedSearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    const db = getDb();
    const [search] = await db
      .insert(savedSearches)
      .values({
        userId: user.id,
        name: parsed.data.name,
        params: parsed.data.params,
        notifyOnNew: parsed.data.notifyOnNew,
      })
      .returning();

    return NextResponse.json({ success: true, data: search }, { status: 201 });
  } catch (error) {
    logger.error('Failed to save search', { error: String(error) });
    return NextResponse.json(
      { success: false, error: { code: 'SAVE_ERROR', message: 'Failed to save search' } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } },
        { status: 401 },
      );
    }

    const { id } = (await request.json()) as { id: string };
    const db = getDb();
    await db.delete(savedSearches).where(eq(savedSearches.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete saved search', { error: String(error) });
    return NextResponse.json(
      { success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete' } },
      { status: 500 },
    );
  }
}
