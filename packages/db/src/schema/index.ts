import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Custom Drizzle column type for pgvector's `vector(N)`.
 * Stores embedding vectors as float arrays, enabling semantic similarity search.
 */
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    // pgvector returns "[0.1,0.2,...]" format
    return value.slice(1, -1).split(',').map(Number);
  },
});

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'host', 'admin']);
export const listingStatusEnum = pgEnum('listing_status', ['draft', 'published', 'archived']);
export const listingCategoryEnum = pgEnum('listing_category', [
  'villa',
  'apartment',
  'cabin',
  'treehouse',
  'boat',
  'castle',
  'farmhouse',
  'penthouse',
]);
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'cancelled']);
export const analyticsEventTypeEnum = pgEnum('analytics_event_type', [
  'search',
  'listing_view',
  'listing_click',
  'favorite_add',
  'favorite_remove',
  'filter_apply',
  'compare_add',
  'compare_remove',
  'conversion',
]);
export const messageStatusEnum = pgEnum('message_status', ['sent', 'delivered', 'read']);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded',
  'partially_refunded',
]);
export const payoutStatusEnum = pgEnum('payout_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);
export const cancellationPolicyTypeEnum = pgEnum('cancellation_policy_type', [
  'flexible',
  'moderate',
  'strict',
]);
export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'approved',
  'rejected',
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'booking_confirmed',
  'booking_cancelled',
  'new_message',
  'new_review',
  'payment_received',
  'payout_sent',
  'verification_update',
]);
export const priceRuleTypeEnum = pgEnum('price_rule_type', [
  'weekend',
  'seasonal',
  'length_discount',
  'custom',
]);
export const oauthProviderEnum = pgEnum('oauth_provider', ['google', 'apple']);

// Users
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  role: userRoleEnum('role').notNull().default('user'),
  preferredLanguage: varchar('preferred_language', { length: 10 }).notNull().default('en'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeConnectAccountId: varchar('stripe_connect_account_id', { length: 255 }),
  isVerified: boolean('is_verified').notNull().default(false),
  notificationPreferences: jsonb('notification_preferences')
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Partners
export const partners = pgTable('partners', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  logoUrl: text('logo_url'),
  website: text('website'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Listings
export const listings = pgTable(
  'listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 300 }).notNull().unique(),
    description: text('description').notNull(),
    category: listingCategoryEnum('category').notNull(),
    status: listingStatusEnum('status').notNull().default('draft'),
    pricePerNight: decimal('price_per_night', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    address: text('address').notNull(),
    city: varchar('city', { length: 255 }).notNull(),
    state: varchar('state', { length: 255 }).notNull(),
    country: varchar('country', { length: 255 }).notNull(),
    lat: decimal('lat', { precision: 10, scale: 7 }).notNull(),
    lng: decimal('lng', { precision: 10, scale: 7 }).notNull(),
    amenities: jsonb('amenities').$type<string[]>().notNull().default([]),
    maxGuests: integer('max_guests').notNull(),
    bedrooms: integer('bedrooms').notNull(),
    bathrooms: integer('bathrooms').notNull(),
    rating: decimal('rating', { precision: 3, scale: 2 }).notNull().default('0'),
    reviewCount: integer('review_count').notNull().default(0),
    hostId: uuid('host_id')
      .notNull()
      .references(() => users.id),
    partnerId: uuid('partner_id').references(() => partners.id),
    featured: boolean('featured').notNull().default(false),
    cancellationPolicyType: cancellationPolicyTypeEnum('cancellation_policy_type')
      .notNull()
      .default('flexible'),
    cleaningFee: decimal('cleaning_fee', { precision: 10, scale: 2 }).notNull().default('0'),
    /** pgvector embedding for semantic search (text-embedding-3-small, 1536 dims) */
    embedding: vector('embedding'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('listings_category_idx').on(table.category),
    index('listings_status_idx').on(table.status),
    index('listings_city_idx').on(table.city),
    index('listings_country_idx').on(table.country),
    index('listings_host_id_idx').on(table.hostId),
    index('listings_partner_id_idx').on(table.partnerId),
    index('listings_featured_idx').on(table.featured),
    index('listings_price_idx').on(table.pricePerNight),
    // HNSW index for fast approximate nearest-neighbor search on embeddings
    index('listings_embedding_idx').using('hnsw', sql`${table.embedding} vector_cosine_ops`),
  ],
);

// Listing images
export const listingImages = pgTable(
  'listing_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    alt: varchar('alt', { length: 500 }).notNull().default(''),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    storageKey: varchar('storage_key', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('listing_images_listing_id_idx').on(table.listingId)],
);

// Reviews
export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('reviews_listing_id_idx').on(table.listingId),
    index('reviews_user_id_idx').on(table.userId),
  ],
);

// Bookings
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
    status: bookingStatusEnum('status').notNull().default('pending'),
    guests: integer('guests').notNull().default(1),
    cancellationPolicySnapshot: jsonb('cancellation_policy_snapshot'),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    refundedAmount: decimal('refunded_amount', { precision: 10, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('bookings_listing_id_idx').on(table.listingId),
    index('bookings_user_id_idx').on(table.userId),
    index('bookings_dates_idx').on(table.listingId, table.startDate, table.endDate),
  ],
);

// Favorites
export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('favorites_user_id_idx').on(table.userId),
    index('favorites_listing_id_idx').on(table.listingId),
  ],
);

// Saved searches
export const savedSearches = pgTable(
  'saved_searches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    params: jsonb('params').notNull(),
    notifyOnNew: boolean('notify_on_new').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('saved_searches_user_id_idx').on(table.userId)],
);

// Analytics events
export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: analyticsEventTypeEnum('type').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: varchar('session_id', { length: 255 }).notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('analytics_events_type_idx').on(table.type),
    index('analytics_events_user_id_idx').on(table.userId),
    index('analytics_events_session_id_idx').on(table.sessionId),
    index('analytics_events_created_at_idx').on(table.createdAt),
  ],
);

// Sessions (for auth)
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 512 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_token_idx').on(table.token),
  ],
);

// Conversations
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id),
  hostId: uuid('host_id')
    .notNull()
    .references(() => users.id),
  guestId: uuid('guest_id')
    .notNull()
    .references(() => users.id),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Messages
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    status: messageStatusEnum('status').notNull().default('sent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('messages_conversation_id_idx').on(table.conversationId),
    index('messages_created_at_idx').on(table.createdAt),
  ],
);

// Payments
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookingId: uuid('booking_id')
    .notNull()
    .references(() => bookings.id),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }).unique(),
  stripeCheckoutSessionId: varchar('stripe_checkout_session_id', { length: 255 }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  refundedAmount: decimal('refunded_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Payouts
export const payouts = pgTable('payouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  hostId: uuid('host_id')
    .notNull()
    .references(() => users.id),
  bookingId: uuid('booking_id')
    .notNull()
    .references(() => bookings.id),
  stripeTransferId: varchar('stripe_transfer_id', { length: 255 }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  status: payoutStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Availability blocks
export const availabilityBlocks = pgTable('availability_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  reason: varchar('reason', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  data: jsonb('data').$type<Record<string, unknown>>(),
  readAt: timestamp('read_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Pricing rules
export const pricingRules = pgTable('pricing_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  type: priceRuleTypeEnum('type').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  adjustment: decimal('adjustment', { precision: 5, scale: 2 }).notNull(),
  adjustmentType: varchar('adjustment_type', { length: 10 }).notNull(),
  config: jsonb('config').$type<Record<string, unknown>>(),
  priority: integer('priority').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Cancellation policies
export const cancellationPolicies = pgTable(
  'cancellation_policies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    type: cancellationPolicyTypeEnum('type').notNull().default('flexible'),
    rules: jsonb('rules').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('cancellation_policies_listing_id_unique').on(table.listingId)],
);

// Identity verifications
export const identityVerifications = pgTable('identity_verifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  documentUrl: text('document_url').notNull(),
  selfieUrl: text('selfie_url'),
  status: verificationStatusEnum('status').notNull().default('pending'),
  adminNotes: text('admin_notes'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Wishlists (collections)
export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isPublic: boolean('is_public').notNull().default(false),
    coverImageUrl: text('cover_image_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('wishlists_user_id_idx').on(table.userId)],
);

// Wishlist items
export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    wishlistId: uuid('wishlist_id')
      .notNull()
      .references(() => wishlists.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('wishlist_items_wishlist_id_idx').on(table.wishlistId),
    unique('wishlist_items_unique').on(table.wishlistId, table.listingId),
  ],
);

// Review responses (host replies)
export const reviewResponses = pgTable(
  'review_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id, { onDelete: 'cascade' }),
    hostId: uuid('host_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('review_responses_review_id_unique').on(table.reviewId)],
);

// Password reset tokens
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 512 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('password_reset_tokens_user_id_idx').on(table.userId)],
);

// OAuth accounts (social login)
export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: oauthProviderEnum('provider').notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('oauth_accounts_provider_account_unique').on(table.provider, table.providerAccountId),
    index('oauth_accounts_user_id_idx').on(table.userId),
  ],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  listings: many(listings),
  favorites: many(favorites),
  reviews: many(reviews),
  bookings: many(bookings),
  savedSearches: many(savedSearches),
  sessions: many(sessions),
  hostedConversations: many(conversations, { relationName: 'hostConversations' }),
  guestConversations: many(conversations, { relationName: 'guestConversations' }),
  sentMessages: many(messages),
  payouts: many(payouts),
  notifications: many(notifications),
  identityVerifications: many(identityVerifications, { relationName: 'userVerifications' }),
  wishlists: many(wishlists),
  oauthAccounts: many(oauthAccounts),
  reviewResponses: many(reviewResponses),
}));

export const partnersRelations = relations(partners, ({ many }) => ({
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  host: one(users, { fields: [listings.hostId], references: [users.id] }),
  partner: one(partners, { fields: [listings.partnerId], references: [partners.id] }),
  images: many(listingImages),
  reviews: many(reviews),
  bookings: many(bookings),
  favorites: many(favorites),
  conversations: many(conversations),
  availabilityBlocks: many(availabilityBlocks),
  pricingRules: many(pricingRules),
  cancellationPolicy: many(cancellationPolicies),
}));

export const listingImagesRelations = relations(listingImages, ({ one }) => ({
  listing: one(listings, { fields: [listingImages.listingId], references: [listings.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  listing: one(listings, { fields: [favorites.listingId], references: [listings.id] }),
}));

export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  user: one(users, { fields: [savedSearches.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  listing: one(listings, { fields: [reviews.listingId], references: [listings.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  response: one(reviewResponses),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  listing: one(listings, { fields: [bookings.listingId], references: [listings.id] }),
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  payments: many(payments),
  payouts: many(payouts),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  listing: one(listings, { fields: [conversations.listingId], references: [listings.id] }),
  host: one(users, {
    fields: [conversations.hostId],
    references: [users.id],
    relationName: 'hostConversations',
  }),
  guest: one(users, {
    fields: [conversations.guestId],
    references: [users.id],
    relationName: 'guestConversations',
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  host: one(users, { fields: [payouts.hostId], references: [users.id] }),
  booking: one(bookings, { fields: [payouts.bookingId], references: [bookings.id] }),
}));

export const availabilityBlocksRelations = relations(availabilityBlocks, ({ one }) => ({
  listing: one(listings, { fields: [availabilityBlocks.listingId], references: [listings.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const pricingRulesRelations = relations(pricingRules, ({ one }) => ({
  listing: one(listings, { fields: [pricingRules.listingId], references: [listings.id] }),
}));

export const cancellationPoliciesRelations = relations(cancellationPolicies, ({ one }) => ({
  listing: one(listings, { fields: [cancellationPolicies.listingId], references: [listings.id] }),
}));

export const identityVerificationsRelations = relations(identityVerifications, ({ one }) => ({
  user: one(users, {
    fields: [identityVerifications.userId],
    references: [users.id],
    relationName: 'userVerifications',
  }),
  reviewer: one(users, { fields: [identityVerifications.reviewedBy], references: [users.id] }),
}));

export const wishlistsRelations = relations(wishlists, ({ one, many }) => ({
  user: one(users, { fields: [wishlists.userId], references: [users.id] }),
  items: many(wishlistItems),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  wishlist: one(wishlists, { fields: [wishlistItems.wishlistId], references: [wishlists.id] }),
  listing: one(listings, { fields: [wishlistItems.listingId], references: [listings.id] }),
}));

export const reviewResponsesRelations = relations(reviewResponses, ({ one }) => ({
  review: one(reviews, { fields: [reviewResponses.reviewId], references: [reviews.id] }),
  host: one(users, { fields: [reviewResponses.hostId], references: [users.id] }),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, { fields: [oauthAccounts.userId], references: [users.id] }),
}));
