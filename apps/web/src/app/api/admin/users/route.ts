import { desc, eq, ilike, or, sql, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { bookings, getDb, listings, users } from '@lumina/db';

import { getCurrentUser } from '@/lib/auth';
import { blockDemoMutation } from '@/lib/demo-guard';
import { logger } from '@/lib/logger';

const ROLE_VALUES = ['user', 'host', 'admin'] as const;

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return null;
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
  const role = url.searchParams.get('role');
  const search = url.searchParams.get('q')?.trim();

  const db = getDb();
  const filters = [];
  if (role && ROLE_VALUES.includes(role as (typeof ROLE_VALUES)[number])) {
    filters.push(eq(users.role, role as (typeof ROLE_VALUES)[number]));
  }
  if (search) {
    filters.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!);
  }
  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
        listingCount: sql<number>`(select count(*) from ${listings} where ${listings.hostId} = ${users.id})::int`,
        bookingCount: sql<number>`(select count(*) from ${bookings} where ${bookings.userId} = ${users.id})::int`,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      data: rows,
      total: Number(countResult[0]?.count ?? 0),
      page,
      pageSize: limit,
    },
  });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(ROLE_VALUES).optional(),
  isVerified: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 },
    );
  }
  const blocked = blockDemoMutation(admin);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    const { id, role, isVerified } = parsed.data;

    if (id === admin.id && role && role !== admin.role) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admins cannot change their own role' },
        },
        { status: 403 },
      );
    }

    const update: Record<string, unknown> = {};
    if (role !== undefined) update['role'] = role;
    if (isVerified !== undefined) update['isVerified'] = isVerified;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true });
    }
    update['updatedAt'] = new Date();

    const db = getDb();
    await db.update(users).set(update).where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Admin user update failed', { error: String(error) });
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_ERROR', message: 'Update failed' } },
      { status: 500 },
    );
  }
}
