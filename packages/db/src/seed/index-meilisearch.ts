import { eq } from 'drizzle-orm';
import { MeiliSearch } from 'meilisearch';

import { getDb } from '../client';
import { listings, listingImages } from '../schema/index';

const MEILISEARCH_INDEX = 'listings';

interface MeiliListingDocument {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  pricePerNight: number;
  currency: string;
  city: string;
  state: string;
  country: string;
  _geo: { lat: number; lng: number };
  amenities: string[];
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  primaryImageUrl: string | null;
  createdAt: number;
}

async function indexListings() {
  const host = process.env['MEILISEARCH_HOST'] ?? 'http://localhost:7700';
  const apiKey = process.env['MEILISEARCH_API_KEY'] ?? '';

  console.log(`Connecting to Meilisearch at ${host}...`);
  const client = new MeiliSearch({ host, apiKey: apiKey || undefined });

  // Verify Meilisearch is reachable
  try {
    const health = await client.health();
    console.log(`Meilisearch status: ${health.status}`);
  } catch (err) {
    console.error(`Cannot reach Meilisearch at ${host}`);
    console.error('Make sure Meilisearch is running: docker compose up -d meilisearch');
    process.exit(1);
  }

  // Create index if it doesn't exist
  try {
    await client.createIndex(MEILISEARCH_INDEX, { primaryKey: 'id' });
    console.log(`Created index "${MEILISEARCH_INDEX}"`);
  } catch {
    console.log(`Index "${MEILISEARCH_INDEX}" already exists`);
  }

  const index = client.index(MEILISEARCH_INDEX);

  // Configure index settings (same as search-indexer/setup-index.ts)
  console.log('Configuring index settings...');
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

  // Fetch all published listings from DB
  console.log('Fetching published listings from database...');
  const db = getDb();

  const allListings = await db.query.listings.findMany({
    where: eq(listings.status, 'published'),
    with: { images: true },
  });

  if (allListings.length === 0) {
    console.log('No published listings found. Run seed first: yarn db:seed');
    process.exit(0);
  }

  // Transform to Meilisearch documents
  const documents: MeiliListingDocument[] = allListings.map((listing) => {
    const primaryImage = listing.images.find((img) => img.isPrimary) ?? listing.images[0];
    return {
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
      description: listing.description,
      category: listing.category,
      pricePerNight: Number(listing.pricePerNight),
      currency: listing.currency,
      city: listing.city,
      state: listing.state,
      country: listing.country,
      _geo: { lat: Number(listing.lat), lng: Number(listing.lng) },
      amenities: listing.amenities,
      maxGuests: listing.maxGuests,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      rating: Number(listing.rating),
      reviewCount: listing.reviewCount,
      featured: listing.featured,
      primaryImageUrl: primaryImage?.url ?? null,
      createdAt: listing.createdAt.getTime(),
    };
  });

  // Clear existing documents and add fresh ones
  console.log(`Clearing existing index data...`);
  const deleteTask = await index.deleteAllDocuments();
  await client.waitForTask(deleteTask.taskUid);

  console.log(`Indexing ${documents.length} listings...`);
  const addTask = await index.addDocuments(documents, { primaryKey: 'id' });
  await client.waitForTask(addTask.taskUid);

  // Verify
  const stats = await index.getStats();
  console.log(`\nDone! ${stats.numberOfDocuments} documents indexed.`);

  const allDocs = await index.getDocuments({ limit: 1 });
  if (allDocs.results.length > 0) {
    console.log(`Sample document: "${(allDocs.results[0] as MeiliListingDocument).title}"`);
  }

  process.exit(0);
}

indexListings().catch((err) => {
  console.error('Indexing failed:', err);
  process.exit(1);
});
