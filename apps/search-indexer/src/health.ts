import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import Redis from 'ioredis';
import { MeiliSearch } from 'meilisearch';

import type { HealthStatus } from '@lumina/shared';

import { logger } from './logger';

const startTime = Date.now();

export function startHealthServer(
  port: number,
  redisUrl: string,
  meiliHost: string,
  meiliApiKey: string,
) {
  const redis = new Redis(redisUrl);
  const meili = new MeiliSearch({ host: meiliHost, apiKey: meiliApiKey });

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health' || req.url === '/ready') {
      const checks: HealthStatus['checks'] = {};

      try {
        const start = Date.now();
        await redis.ping();
        checks['redis'] = { status: 'pass', latencyMs: Date.now() - start };
      } catch (e) {
        checks['redis'] = { status: 'fail', message: String(e) };
      }

      try {
        const start = Date.now();
        await meili.health();
        checks['meilisearch'] = { status: 'pass', latencyMs: Date.now() - start };
      } catch (e) {
        checks['meilisearch'] = { status: 'fail', message: String(e) };
      }

      const allPassing = Object.values(checks).every((c) => c.status === 'pass');

      const status: HealthStatus = {
        status: allPassing ? 'healthy' : 'unhealthy',
        version: process.env['npm_package_version'] ?? '0.0.0',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        checks,
      };

      res.writeHead(allPassing ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(port, () => {
    logger.info(`Health server listening on port ${port}`);
  });

  return server;
}
