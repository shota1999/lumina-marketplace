import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getDb, listings } from '@lumina/db';

import { getCurrentUser } from '@/lib/auth';
import { getIndexingQueue } from '@/lib/queue';
import { logger } from '@/lib/logger';

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 },
    );
  }

  try {
    const db = getDb();
    const published = await db.query.listings.findMany({
      where: eq(listings.status, 'published'),
      columns: { id: true },
    });

    const queue = getIndexingQueue();
    const jobs = published.map((l) => ({
      name: 'index-listing',
      data: { listingId: l.id, action: 'upsert' as const },
      opts: { priority: 10 },
    }));

    await queue.addBulk(jobs);

    logger.info('Full reindex triggered', {
      userId: user.id,
      listingCount: published.length,
    });

    return NextResponse.json({
      success: true,
      data: { queued: published.length },
    });
  } catch (error) {
    logger.error('Reindex failed', { error: String(error) });
    return NextResponse.json(
      { success: false, error: { code: 'REINDEX_ERROR', message: 'Reindex failed' } },
      { status: 500 },
    );
  }
}
