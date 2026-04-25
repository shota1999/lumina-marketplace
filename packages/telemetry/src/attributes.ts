/**
 * Standard span attribute keys for consistent naming across the codebase.
 * Follows OpenTelemetry semantic conventions where applicable.
 */
export const SpanAttr = {
  // Booking
  BOOKING_ID: 'booking.id',
  BOOKING_STATUS: 'booking.status',
  BOOKING_LISTING_ID: 'booking.listing_id',
  BOOKING_NIGHTS: 'booking.nights',
  BOOKING_TOTAL_PRICE: 'booking.total_price',

  // Listing
  LISTING_ID: 'listing.id',
  LISTING_SLUG: 'listing.slug',

  // User (hashed, never PII)
  USER_ID: 'user.id',

  // Search
  SEARCH_QUERY: 'search.query',
  SEARCH_RESULT_COUNT: 'search.result_count',
  SEARCH_ENGINE: 'search.engine',
  SEARCH_PROCESSING_MS: 'search.processing_ms',

  // Queue
  QUEUE_NAME: 'queue.name',
  QUEUE_JOB_ID: 'queue.job_id',
  QUEUE_JOB_NAME: 'queue.job_name',
  QUEUE_ATTEMPT: 'queue.attempt',

  // Email
  EMAIL_TEMPLATE: 'email.template',
  EMAIL_RECIPIENT_DOMAIN: 'email.recipient_domain',

  // Auth
  AUTH_METHOD: 'auth.method',
  AUTH_RESULT: 'auth.result',
} as const;
