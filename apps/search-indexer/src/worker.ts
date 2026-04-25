import { Worker, type Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import Redis from 'ioredis';
import { MeiliSearch } from 'meilisearch';
import OpenAI from 'openai';
import { context } from '@opentelemetry/api';

import { getDb, listings, listingImages } from '@lumina/db';
import { QUEUE_NAMES, MEILISEARCH_INDEX, type IndexingJob } from '@lumina/shared';
import { extractTraceContext, withSpan, SpanAttr } from '@lumina/telemetry';

import { logger } from './logger';

interface MeiliListingDocument {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  pricePerNight: number;
  currency: string;
  city: string;
  state: string;
  country: string;
  _geo: { lat: number; lng: number };
  amenities: string[];
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  primaryImageUrl: string | null;
  createdAt: number;
}

export function createWorker(redisUrl: string, meiliHost: string, meiliApiKey: string) {
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  const meili = new MeiliSearch({ host: meiliHost, apiKey: meiliApiKey });

  const worker = new Worker<IndexingJob & { _traceContext?: Record<string, string> }>(
    QUEUE_NAMES.indexing,
    async (job: Job<IndexingJob & { _traceContext?: Record<string, string> }>) => {
      // Extract trace context from the producer to link this span to the original request
      const traceCtx = job.data._traceContext
        ? extractTraceContext(job.data._traceContext)
        : context.active();

      return context.with(traceCtx, () =>
        withSpan('queue.process.index-listing', {
          [SpanAttr.QUEUE_JOB_ID]: job.id ?? 'unknown',
          [SpanAttr.QUEUE_ATTEMPT]: job.attemptsMade,
          [SpanAttr.LISTING_ID]: job.data.listingId,
        }, async () => {
          const { listingId, action } = job.data;
          const index = meili.index(MEILISEARCH_INDEX);

          if (action === 'delete') {
            logger.info('Deleting listing from index', { listingId });
            await index.deleteDocument(listingId);
            return { action: 'deleted', listingId };
          }

          // Upsert
          logger.info('Indexing listing', { listingId });
          const db = getDb();

          const listing = await db.query.listings.findFirst({
            where: eq(listings.id, listingId),
            with: { images: true },
          });

          if (!listing) {
            logger.warn('Listing not found, skipping', { listingId });
            return { action: 'skipped', listingId, reason: 'not_found' };
          }

          if (listing.status !== 'published') {
            logger.info('Listing not published, removing from index', { listingId });
            await index.deleteDocument(listingId);
            return { action: 'removed_unpublished', listingId };
          }

          const primaryImage = listing.images.find((img) => img.isPrimary) ?? listing.images[0];

          const document: MeiliListingDocument = {
            id: listing.id,
            title: listing.title,
            slug: listing.slug,
            description: listing.description,
            category: listing.category,
            pricePerNight: Number(listing.pricePerNight),
            currency: listing.currency,
            city: listing.city,
            state: listing.state,
            country: listing.country,
            _geo: { lat: Number(listing.lat), lng: Number(listing.lng) },
            amenities: listing.amenities,
            maxGuests: listing.maxGuests,
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            rating: Number(listing.rating),
            reviewCount: listing.reviewCount,
            featured: listing.featured,
            primaryImageUrl: primaryImage?.url ?? null,
            createdAt: listing.createdAt.getTime(),
          };

          // Index in Meilisearch
          await withSpan('meilisearch.index', {
            [SpanAttr.LISTING_ID]: listingId,
          }, async () => {
            await index.addDocuments([document], { primaryKey: 'id' });
            logger.info('Listing indexed in Meilisearch', { listingId });
          });

          // Generate embedding vector if OpenAI key is available
          if (process.env['OPENAI_API_KEY']) {
            await withSpan('ai.embed_listing', {
              [SpanAttr.LISTING_ID]: listingId,
              'ai.model': 'text-embedding-3-small',
            }, async () => {
              try {
                const embeddingText = [
                  listing.title,
                  listing.description,
                  `Category: ${listing.category}`,
                  `Location: ${listing.city}, ${listing.state}, ${listing.country}`,
                  `Amenities: ${listing.amenities.join(', ')}`,
                  `${listing.bedrooms} bedrooms, ${listing.bathrooms} bathrooms, up to ${listing.maxGuests} guests`,
                ].join('\n');

                const openai = new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] });
                const response = await openai.embeddings.create({
                  model: 'text-embedding-3-small',
                  input: embeddingText,
                  dimensions: 1536,
                });

                const embedding = response.data[0]!.embedding;
                const db = getDb();
                await db
                  .update(listings)
                  .set({ embedding, updatedAt: new Date() })
                  .where(eq(listings.id, listingId));

                logger.info('Listing embedding generated', { listingId, dimensions: embedding.length });
              } catch (embedError) {
                // Non-fatal: embedding failure should not fail the indexing job
                logger.warn('Embedding generation failed (non-fatal)', {
                  listingId,
                  error: String(embedError),
                });
              }
            });
          }

          return { action: 'indexed', listingId };
        }),
      );
    },
    {
      connection,
      concurrency: 5,
      limiter: { max: 50, duration: 1000 },
    },
  );

  worker.on('completed', (job) => {
    logger.debug('Job completed', { jobId: job.id, result: job.returnvalue });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', {
      jobId: job?.id,
      listingId: job?.data.listingId,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
  });

  return worker;
}
