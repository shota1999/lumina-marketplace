import { getActiveTraceId, getActiveSpanId } from '@lumina/telemetry';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  traceId?: string;
  spanId?: string;
  [key: string]: unknown;
}

export type RequestLogger = ReturnType<typeof createRequestLogger>;

const SLOW_REQUEST_MS = 200;

function log(level: LogLevel, message: string, meta: Record<string, unknown> = {}) {
  const traceId = getActiveTraceId();
  const spanId = getActiveSpanId();

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'web',
    ...(traceId && { traceId }),
    ...(spanId && { spanId }),
    ...meta,
  };

  const output = JSON.stringify(entry);

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
};

/**
 * Create a child logger that always includes the given context fields.
 * Carries requestId, userId, and route through the entire request lifecycle.
 */
export function createRequestLogger(context: Record<string, unknown>) {
  const startTime = Date.now();
  return {
    debug: (message: string, meta?: Record<string, unknown>) =>
      log('debug', message, { ...context, ...meta }),
    info: (message: string, meta?: Record<string, unknown>) =>
      log('info', message, { ...context, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) =>
      log('warn', message, { ...context, ...meta }),
    error: (message: string, meta?: Record<string, unknown>) =>
      log('error', message, { ...context, ...meta }),
    /** Call at the end of the request to log duration and flag slow requests. */
    done: (status: number) => {
      const durationMs = Date.now() - startTime;
      const meta: Record<string, unknown> = { ...context, durationMs, status };
      if (durationMs > SLOW_REQUEST_MS) {
        log('warn', 'Slow request', { ...meta, slow: true });
      } else {
        log('info', 'Request completed', meta);
      }
    },
  };
}
