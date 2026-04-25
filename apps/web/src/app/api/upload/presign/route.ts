import { NextRequest, NextResponse } from 'next/server';

import { getDb, listings } from '@lumina/db';
import { eq, and } from 'drizzle-orm';
import { presignUploadSchema } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { generatePresignedUrl } from '@/lib/services/upload';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Host access required' }, 401);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const parsed = presignUploadSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const { fileName, contentType, listingId } = parsed.data;

    // Verify listing ownership
    const db = getDb();
    const listing = await db.query.listings.findFirst({
      where: and(eq(listings.id, listingId), eq(listings.hostId, user.id)),
    });

    if (!listing) {
      return errorResponse({ code: 'FORBIDDEN', message: 'Not your listing' }, 403);
    }

    const ext = fileName.split('.').pop() ?? 'jpg';
    const storageKey = `listings/${listingId}/${crypto.randomUUID()}.${ext}`;

    const { uploadUrl, publicUrl } = await generatePresignedUrl(storageKey, contentType);

    return successResponse({ uploadUrl, publicUrl, storageKey });
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to generate presigned URL' }, 500);
  }
}
