import { Queue } from 'bullmq';

import { QUEUE_NAMES } from '@lumina/shared';
import { injectTraceContext, withSpan, SpanAttr } from '@lumina/telemetry';

import { getRedis } from './redis';

let indexingQueue: Queue | undefined;
let analyticsQueue: Queue | undefined;

export function getIndexingQueue(): Queue {
  if (!indexingQueue) {
    indexingQueue = new Queue(QUEUE_NAMES.indexing, {
      connection: getRedis(),
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    });
  }
  return indexingQueue;
}

export function getAnalyticsQueue(): Queue {
  if (!analyticsQueue) {
    analyticsQueue = new Queue(QUEUE_NAMES.analytics, {
      connection: getRedis(),
      defaultJobOptions: {
        removeOnComplete: { count: 5000 },
        removeOnFail: { count: 1000 },
        attempts: 2,
        backoff: { type: 'fixed', delay: 1000 },
      },
    });
  }
  return analyticsQueue;
}

/**
 * Enqueue an indexing job with trace context propagation.
 * The search-indexer will extract the trace context to link its spans
 * back to the originating request.
 */
export async function enqueueIndexingJob(jobName: string, data: Record<string, unknown>) {
  return withSpan(
    'queue.enqueue',
    {
      [SpanAttr.QUEUE_NAME]: QUEUE_NAMES.indexing,
      [SpanAttr.QUEUE_JOB_NAME]: jobName,
    },
    async () => {
      const queue = getIndexingQueue();
      const job = await queue.add(jobName, {
        ...data,
        _traceContext: injectTraceContext(),
      });
      return job;
    },
  );
}
