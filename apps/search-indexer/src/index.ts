import { validateServerEnv } from '@lumina/shared';
import { initTelemetry } from '@lumina/telemetry';

import { startHealthServer } from './health';
import { logger } from './logger';
import { setupIndex } from './setup-index';
import { createWorker } from './worker';

async function main() {
  // Initialize tracing before any other work
  if (process.env['OTEL_EXPORTER_OTLP_ENDPOINT']) {
    initTelemetry('lumina-search-indexer');
    logger.info('OpenTelemetry tracing initialized');
  }

  logger.info('Starting search-indexer service');

  const env = validateServerEnv(process.env as Record<string, string>);

  // Configure Meilisearch index settings
  await setupIndex(env.MEILISEARCH_HOST, env.MEILISEARCH_API_KEY);

  // Start BullMQ worker
  const worker = createWorker(env.REDIS_URL, env.MEILISEARCH_HOST, env.MEILISEARCH_API_KEY);
  logger.info('Worker started, listening for indexing jobs');

  // Health server
  const healthPort = Number(process.env['HEALTH_PORT'] ?? 3001);
  startHealthServer(healthPort, env.REDIS_URL, env.MEILISEARCH_HOST, env.MEILISEARCH_API_KEY);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Fatal error', { error: String(err) });
  process.exit(1);
});
