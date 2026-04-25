import { MeiliSearch } from 'meilisearch';

let client: MeiliSearch | undefined;

export function getMeiliClient(): MeiliSearch {
  if (!client) {
    const host = process.env['MEILISEARCH_HOST'] ?? process.env['NEXT_PUBLIC_MEILISEARCH_HOST'];
    const apiKey = process.env['MEILISEARCH_API_KEY'];
    if (!host) throw new Error('MEILISEARCH_HOST is required');
    client = new MeiliSearch({ host, apiKey });
  }
  return client;
}
