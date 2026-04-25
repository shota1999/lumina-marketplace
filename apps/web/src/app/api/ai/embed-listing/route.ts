import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDb, listings } from '@lumina/db';
import { withSpan, SpanAttr } from '@lumina/telemetry';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { createRequestLogger } from '@/lib/logger';
import { generateEmbedding, buildListingEmbeddingText } from '@/lib/services/ai';

const embedSchema = z.object({
  listingId: z.string().uuid(),
});

/**
 * Generate and store an embedding vector for a listing.
 * Admin-only endpoint — used for batch embedding or on-demand reindexing.
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'POST /api/ai/embed-listing' });

  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      log.done(401);
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Admin access required' }, 401);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) return bodyResult.error;

    const parsed = embedSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      log.done(400);
      return errorResponse({ code: 'VALIDATION_ERROR', message: 'Invalid listing ID' }, 400);
    }

    const { listingId } = parsed.data;
    const db = getDb();

    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, listingId),
    });

    if (!listing) {
      log.done(404);
      return errorResponse({ code: 'NOT_FOUND', message: 'Listing not found' }, 404);
    }

    const result = await withSpan('ai.embed_listing', {
      [SpanAttr.LISTING_ID]: listingId,
    }, async () => {
      const text = buildListingEmbeddingText(listing);
      const embedding = await generateEmbedding(text);

      await db
        .update(listings)
        .set({ embedding, updatedAt: new Date() })
        .where(eq(listings.id, listingId));

      return { dimensions: embedding.length };
    });

    log.info('Listing embedded', { listingId, dimensions: result.dimensions });
    log.done(200);
    return successResponse({ listingId, embedded: true, dimensions: result.dimensions });
  } catch (error) {
    log.error('Embedding generation failed', { error: String(error) });
    log.done(500);
    return errorResponse({ code: 'AI_ERROR', message: 'Failed to generate embedding' }, 500);
  }
}
