import { eq, desc, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { getDb, listings } from '@lumina/db';
import { updateListingSchema } from '@lumina/shared';

import { getCurrentUser } from '@/lib/auth';
import { enqueueIndexingJob } from '@/lib/queue';
import { logger } from '@/lib/logger';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return null;
  }
  return user;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.min(100, Number(url.searchParams.get('limit')) || 25);
  const status = url.searchParams.get('status');

  const db = getDb();
  const conditions = status
    ? eq(listings.status, status as 'draft' | 'published' | 'archived')
    : undefined;

  const [data, countResult] = await Promise.all([
    db.query.listings.findMany({
      where: conditions,
      with: { images: true },
      orderBy: [desc(listings.updatedAt)],
      limit,
      offset: (page - 1) * limit,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(conditions),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      data,
      total: Number(countResult[0]?.count ?? 0),
      page,
      pageSize: limit,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 },
    );
  }

  try {
    const { id, ...body } = (await request.json()) as { id: string } & Record<string, unknown>;
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'id is required' } },
        { status: 400 },
      );
    }

    const parsed = updateListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    const db = getDb();
    const updateData: Record<string, unknown> = {};
    const input = parsed.data;

    if (input.title !== undefined) updateData['title'] = input.title;
    if (input.description !== undefined) updateData['description'] = input.description;
    if (input.category !== undefined) updateData['category'] = input.category;
    if (input.pricePerNight !== undefined)
      updateData['pricePerNight'] = String(input.pricePerNight);
    if (input.amenities !== undefined) updateData['amenities'] = input.amenities;
    if (input.maxGuests !== undefined) updateData['maxGuests'] = input.maxGuests;
    if (input.bedrooms !== undefined) updateData['bedrooms'] = input.bedrooms;
    if (input.bathrooms !== undefined) updateData['bathrooms'] = input.bathrooms;

    if (Object.keys(updateData).length > 0) {
      updateData['updatedAt'] = new Date();
      await db.update(listings).set(updateData).where(eq(listings.id, id));

      await enqueueIndexingJob('index-listing', { listingId: id, action: 'upsert' });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Admin update failed', { error: String(error) });
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_ERROR', message: 'Update failed' } },
      { status: 500 },
    );
  }
}
