import { logger } from '@/lib/logger';

interface ErrorContext {
  requestId?: string;
  userId?: string;
  route?: string;
  [key: string]: unknown;
}

/**
 * Capture and log errors in a structured, Sentry-compatible format.
 * In production, this would forward to Sentry/Datadog/etc.
 * For now it produces structured JSON logs that any log aggregator can index.
 */
export function captureError(error: unknown, context: ErrorContext = {}) {
  const serialized =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };

  logger.error('Captured error', {
    error: serialized,
    ...context,
    capturedAt: new Date().toISOString(),
  });
}

/**
 * Capture a business-level failure (not a thrown error, but a rejected operation).
 * These are expected failures but worth tracking for product analytics.
 */
export function captureBusinessFailure(action: string, code: string, context: ErrorContext = {}) {
  logger.warn('Business failure', {
    action,
    failureCode: code,
    ...context,
  });
}
