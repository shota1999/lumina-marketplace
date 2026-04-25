export const AMENITIES = [
  'wifi',
  'pool',
  'hot-tub',
  'kitchen',
  'parking',
  'gym',
  'air-conditioning',
  'heating',
  'washer',
  'dryer',
  'tv',
  'fireplace',
  'balcony',
  'garden',
  'beach-access',
  'ski-in-out',
  'ev-charger',
  'pet-friendly',
  'wheelchair-accessible',
  'elevator',
] as const;

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const;

export const MEILISEARCH_INDEX = 'listings';

export const SEARCH_DEFAULTS = {
  limit: 24,
  maxTotalHits: 1000,
  typoTolerance: true,
} as const;

export const CACHE_TTL = {
  searchResults: 60,
  listing: 300,
  listingList: 120,
  facets: 600,
  analytics: 3600,
  availability: 300,
  pricing: 180,
  notifications: 60,
} as const;

export const QUEUE_NAMES = {
  indexing: 'search-indexing',
  analytics: 'analytics-events',
  email: 'email-notifications',
  messaging: 'messaging',
} as const;

export const PAGINATION = {
  defaultPage: 1,
  defaultPageSize: 24,
  maxPageSize: 100,
} as const;

export const CANCELLATION_POLICIES = {
  flexible: {
    rules: [
      { daysBeforeCheckin: 1, refundPercent: 100 },
      { daysBeforeCheckin: 0, refundPercent: 0 },
    ],
  },
  moderate: {
    rules: [
      { daysBeforeCheckin: 5, refundPercent: 100 },
      { daysBeforeCheckin: 1, refundPercent: 50 },
      { daysBeforeCheckin: 0, refundPercent: 0 },
    ],
  },
  strict: {
    rules: [
      { daysBeforeCheckin: 14, refundPercent: 100 },
      { daysBeforeCheckin: 7, refundPercent: 50 },
      { daysBeforeCheckin: 0, refundPercent: 0 },
    ],
  },
} as const;

export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko', 'pt'] as const;

export const DEFAULT_LOCALE = 'en';

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const SERVICE_FEE_PERCENT = 0.12;
