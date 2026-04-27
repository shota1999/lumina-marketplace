import { logger } from '@/lib/logger';

type AuditAction =
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'booking.approved_by_host'
  | 'booking.declined_by_host'
  | 'review.created';

interface AuditEntry {
  action: AuditAction;
  userId: string;
  requestId?: string;
  resourceId: string;
  meta?: Record<string, unknown>;
}

/**
 * Write an immutable audit log entry.
 * Outputs structured JSON — in production, pipe to a dedicated audit index
 * (e.g. CloudWatch, BigQuery) via log routing.
 */
export function audit(entry: AuditEntry) {
  logger.info('AUDIT', {
    audit: true,
    action: entry.action,
    userId: entry.userId,
    requestId: entry.requestId,
    resourceId: entry.resourceId,
    timestamp: new Date().toISOString(),
    ...entry.meta,
  });
}
