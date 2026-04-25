import { MeiliSearch } from 'meilisearch';

import { MEILISEARCH_INDEX } from '@lumina/shared';

import { logger } from './logger';

export async function setupIndex(host: string, apiKey: string) {
  const client = new MeiliSearch({ host, apiKey });

  logger.info('Setting up Meilisearch index', { index: MEILISEARCH_INDEX });

  try {
    await client.createIndex(MEILISEARCH_INDEX, { primaryKey: 'id' });
  } catch {
    // Index may already exist
  }

  const index = client.index(MEILISEARCH_INDEX);

  await index.updateSettings({
    searchableAttributes: ['title', 'description', 'city', 'state', 'country', 'amenities'],
    filterableAttributes: [
      'category',
      'pricePerNight',
      'maxGuests',
      'bedrooms',
      'bathrooms',
      'amenities',
      'featured',
      'country',
      'city',
      '_geo',
    ],
    sortableAttributes: ['pricePerNight', 'rating', 'reviewCount', 'createdAt'],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'rating:desc',
    ],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
    },
    faceting: { maxValuesPerFacet: 100 },
    pagination: { maxTotalHits: 1000 },
  });

  logger.info('Meilisearch index configured');
}
