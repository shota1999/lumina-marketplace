import { eq, and, desc } from 'drizzle-orm';

import { getDb, identityVerifications, users } from '@lumina/db';
import type { IdentityVerification } from '@lumina/shared';

export async function submitVerification(
  userId: string,
  data: {
    documentType: string;
    documentUrl: string;
    selfieUrl?: string;
  },
): Promise<IdentityVerification> {
  const db = getDb();

  // Check if there's already a pending verification
  const existing = await db.query.identityVerifications.findFirst({
    where: and(
      eq(identityVerifications.userId, userId),
      eq(identityVerifications.status, 'pending'),
    ),
  });

  if (existing) {
    throw new Error('A verification request is already pending');
  }

  const [verification] = await db
    .insert(identityVerifications)
    .values({
      userId,
      documentType: data.documentType,
      documentUrl: data.documentUrl,
      selfieUrl: data.selfieUrl ?? null,
      status: 'pending',
    })
    .returning();

  return {
    id: verification!.id,
    userId: verification!.userId,
    documentType: verification!.documentType,
    documentUrl: verification!.documentUrl,
    selfieUrl: verification!.selfieUrl,
    status: verification!.status,
    adminNotes: verification!.adminNotes,
    createdAt: verification!.createdAt.toISOString(),
  };
}

export async function getVerificationStatus(
  userId: string,
): Promise<IdentityVerification | null> {
  const db = getDb();

  const verification = await db.query.identityVerifications.findFirst({
    where: eq(identityVerifications.userId, userId),
    orderBy: [desc(identityVerifications.createdAt)],
  });

  if (!verification) return null;

  return {
    id: verification.id,
    userId: verification.userId,
    documentType: verification.documentType,
    documentUrl: verification.documentUrl,
    selfieUrl: verification.selfieUrl,
    status: verification.status,
    adminNotes: verification.adminNotes,
    createdAt: verification.createdAt.toISOString(),
  };
}

export async function reviewVerification(
  verificationId: string,
  adminId: string,
  status: 'approved' | 'rejected',
  notes?: string,
): Promise<void> {
  const db = getDb();

  const verification = await db.query.identityVerifications.findFirst({
    where: eq(identityVerifications.id, verificationId),
  });

  if (!verification) {
    throw new Error('Verification not found');
  }

  if (verification.status !== 'pending') {
    throw new Error('Verification has already been reviewed');
  }

  await db
    .update(identityVerifications)
    .set({
      status,
      adminNotes: notes ?? null,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(identityVerifications.id, verificationId));

  // If approved, set user.isVerified = true
  if (status === 'approved') {
    await db
      .update(users)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(users.id, verification.userId));
  }
}

export async function getPendingVerifications(): Promise<
  IdentityVerification[]
> {
  const db = getDb();

  const rows = await db
    .select()
    .from(identityVerifications)
    .where(eq(identityVerifications.status, 'pending'))
    .orderBy(identityVerifications.createdAt);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    documentType: row.documentType,
    documentUrl: row.documentUrl,
    selfieUrl: row.selfieUrl,
    status: row.status,
    adminNotes: row.adminNotes,
    createdAt: row.createdAt.toISOString(),
  }));
}
