import { and, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { getDb, favorites, listings } from '@lumina/db';

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
    const userFavorites = await db.query.favorites.findMany({
      where: eq(favorites.userId, user.id),
      with: {
        listing: { with: { images: true } },
      },
      orderBy: (f, { desc }) => [desc(f.createdAt)],
    });

    return NextResponse.json({ success: true, data: userFavorites });
  } catch (error) {
    logger.error('Failed to fetch favorites', { error: String(error) });
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch favorites' } },
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

    const { listingId } = (await request.json()) as { listingId: string };
    if (!listingId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'listingId required' } },
        { status: 400 },
      );
    }

    const db = getDb();

    // Toggle: if exists, remove; if not, add
    const existing = await db.query.favorites.findFirst({
      where: and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId)),
    });

    if (existing) {
      await db
        .delete(favorites)
        .where(and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId)));
      return NextResponse.json({ success: true, data: { action: 'removed' } });
    }

    const [fav] = await db.insert(favorites).values({ userId: user.id, listingId }).returning();

    return NextResponse.json(
      { success: true, data: { action: 'added', favorite: fav } },
      { status: 201 },
    );
  } catch (error) {
    logger.error('Failed to toggle favorite', { error: String(error) });
    return NextResponse.json(
      { success: false, error: { code: 'FAVORITE_ERROR', message: 'Failed to toggle favorite' } },
      { status: 500 },
    );
  }
}
