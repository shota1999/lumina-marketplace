import { context, propagation } from '@opentelemetry/api';

/**
 * Captures the current trace context into a plain object.
 * Embed this in BullMQ job data to propagate traces across service boundaries.
 *
 * Usage (producer):
 * ```ts
 * await queue.add('job-name', {
 *   ...jobData,
 *   _traceContext: injectTraceContext(),
 * });
 * ```
 */
export function injectTraceContext(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

/**
 * Restores trace context from a carrier object.
 * Use with `context.with()` to link consumer spans to the producer trace.
 *
 * Usage (consumer):
 * ```ts
 * const traceCtx = extractTraceContext(job.data._traceContext ?? {});
 * await context.with(traceCtx, () =>
 *   withSpan('queue.process.job-name', {}, async () => { ... })
 * );
 * ```
 */
export function extractTraceContext(carrier: Record<string, string>) {
  return propagation.extract(context.active(), carrier);
}
