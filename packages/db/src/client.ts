import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index';

function createClient(url: string) {
  const queryClient = postgres(url, {
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(queryClient, { schema });
}

let db: ReturnType<typeof createClient> | undefined;

export function getDb(url?: string): ReturnType<typeof createClient> {
  if (!db) {
    const connectionUrl = url ?? process.env['DATABASE_URL'];
    if (!connectionUrl) {
      throw new Error('DATABASE_URL is required');
    }
    db = createClient(connectionUrl);
  }
  return db;
}

export type Database = ReturnType<typeof createClient>;
