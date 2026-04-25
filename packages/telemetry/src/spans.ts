import { trace, SpanStatusCode, context as otelContext, type Attributes } from '@opentelemetry/api';

const TRACER_NAME = 'lumina-app';

/**
 * Wraps an async operation in a traced span with automatic error recording.
 *
 * Usage:
 * ```ts
 * const result = await withSpan('booking.create', { 'booking.listingId': id }, async () => {
 *   return createBooking(data);
 * });
 * ```
 */
export async function withSpan<T>(
  name: string,
  attributes: Attributes,
  fn: () => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME);

  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Returns the current trace ID from the active span context, or undefined if none.
 * Useful for correlating logs with traces.
 */
export function getActiveTraceId(): string | undefined {
  const span = trace.getActiveSpan();
  if (!span) return undefined;
  const traceId = span.spanContext().traceId;
  // All-zero trace ID means no valid trace
  return traceId === '00000000000000000000000000000000' ? undefined : traceId;
}

/**
 * Returns the current span ID from the active span context, or undefined if none.
 */
export function getActiveSpanId(): string | undefined {
  const span = trace.getActiveSpan();
  if (!span) return undefined;
  const spanId = span.spanContext().spanId;
  return spanId === '0000000000000000' ? undefined : spanId;
}
