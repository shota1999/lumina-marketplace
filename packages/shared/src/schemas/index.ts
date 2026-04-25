import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

import { SUPPORTED_LOCALES } from '../constants/index';

// ---------------------------------------------------------------------------
// Auth schemas (mirrored on client and server)
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is missing'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ---------------------------------------------------------------------------
// Existing schemas
// ---------------------------------------------------------------------------

export const listingCategorySchema = z.enum([
  'villa',
  'apartment',
  'cabin',
  'treehouse',
  'boat',
  'castle',
  'farmhouse',
  'penthouse',
]);

export const searchParamsSchema = z.object({
  query: z.string().max(200).optional(),
  category: z.array(listingCategorySchema).optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  location: z.string().max(100).optional(),
  amenities: z.array(z.string()).optional(),
  guests: z.coerce.number().min(1).max(20).optional(),
  bedrooms: z.coerce.number().min(0).max(15).optional(),
  bathrooms: z.coerce.number().min(0).max(10).optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  bounds: z
    .object({
      north: z.number(),
      south: z.number(),
      east: z.number(),
      west: z.number(),
    })
    .optional(),
  sort: z
    .enum(['relevance', 'price_asc', 'price_desc', 'rating_desc', 'newest'])
    .default('relevance'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(24),
});

export const createListingSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  category: listingCategorySchema,
  pricePerNight: z.number().min(1).max(100000),
  currency: z.string().length(3).default('USD'),
  location: z.object({
    address: z.string().min(5),
    city: z.string().min(1),
    state: z.string().min(1),
    country: z.string().min(1),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  amenities: z.array(z.string()).default([]),
  maxGuests: z.number().min(1).max(50),
  bedrooms: z.number().min(0).max(30),
  bathrooms: z.number().min(0).max(20),
  partnerId: z.string().uuid().nullable().optional(),
});

export const updateListingSchema = createListingSchema.partial();

export const savedSearchSchema = z.object({
  name: z.string().min(1).max(100),
  params: searchParamsSchema,
  notifyOnNew: z.boolean().default(false),
});

export const createReviewSchema = z.object({
  listingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(2000),
});

export const createBookingSchema = z.object({
  listingId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  guests: z.number().int().min(1).max(50),
});

export const analyticsEventSchema = z.object({
  type: z.enum([
    'search',
    'listing_view',
    'listing_click',
    'favorite_add',
    'favorite_remove',
    'filter_apply',
    'compare_add',
    'compare_remove',
    'conversion',
  ]),
  data: z.record(z.unknown()).default({}),
});

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

export const createConversationSchema = z.object({
  listingId: z.string().uuid(),
  message: z.string().min(1).max(5000),
});

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export const createCheckoutSchema = z.object({
  bookingId: z.string().uuid(),
});

export const refundSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().optional(),
  reason: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export const createAvailabilityBlockSchema = z.object({
  listingId: z.string().uuid(),
  startDate: dateString,
  endDate: dateString,
  reason: z.string().max(255).optional(),
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const updateNotificationPrefsSchema = z.object({
  booking_confirmed: z.boolean().optional(),
  booking_cancelled: z.boolean().optional(),
  new_message: z.boolean().optional(),
  new_review: z.boolean().optional(),
  payment_received: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Image Upload
// ---------------------------------------------------------------------------

export const presignUploadSchema = z.object({
  fileName: z.string(),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  listingId: z.string().uuid(),
});

export const registerImageSchema = z.object({
  url: z.string().url(),
  storageKey: z.string(),
  alt: z.string().max(500).default(''),
  width: z.number(),
  height: z.number(),
  isPrimary: z.boolean().default(false),
});

export const reorderImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()),
});

// ---------------------------------------------------------------------------
// Dynamic Pricing
// ---------------------------------------------------------------------------

export const createPricingRuleSchema = z.object({
  listingId: z.string().uuid(),
  type: z.enum(['weekend', 'seasonal', 'length_discount', 'custom']),
  name: z.string().max(255),
  adjustment: z.number(),
  adjustmentType: z.enum(['percent', 'fixed']),
  config: z.record(z.unknown()).default({}),
  priority: z.number().int().default(0),
});

export const priceQuoteRequestSchema = z.object({
  listingId: z.string().uuid(),
  startDate: dateString,
  endDate: dateString,
  guests: z.number().min(1).default(1),
});

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

export const setCancellationPolicySchema = z.object({
  listingId: z.string().uuid(),
  type: z.enum(['flexible', 'moderate', 'strict']),
});

// ---------------------------------------------------------------------------
// Identity Verification
// ---------------------------------------------------------------------------

export const submitVerificationSchema = z.object({
  documentType: z.enum(['passport', 'drivers_license', 'national_id']),
  documentUrl: z.string().url(),
  selfieUrl: z.string().url().optional(),
});

export const reviewVerificationSchema = z.object({
  verificationId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  adminNotes: z.string().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// Wishlists
// ---------------------------------------------------------------------------

export const createWishlistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

export const updateWishlistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isPublic: z.boolean().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
});

export const addToWishlistSchema = z.object({
  listingId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Review Responses
// ---------------------------------------------------------------------------

export const createReviewResponseSchema = z.object({
  reviewId: z.string().uuid(),
  body: z.string().min(1).max(2000),
});

export const updateReviewResponseSchema = z.object({
  body: z.string().min(1).max(2000),
});

// ---------------------------------------------------------------------------
// Search Autocomplete
// ---------------------------------------------------------------------------

export const autocompleteSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().min(1).max(10).default(5),
});

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

export const updateLanguageSchema = z.object({
  language: z.enum(SUPPORTED_LOCALES),
});

// ---------------------------------------------------------------------------
// Inferred types – existing
// ---------------------------------------------------------------------------

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type SearchParamsInput = z.infer<typeof searchParamsSchema>;
export type SavedSearchInput = z.infer<typeof savedSearchSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

// ---------------------------------------------------------------------------
// Inferred types – new
// ---------------------------------------------------------------------------

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
export type CreateAvailabilityBlockInput = z.infer<typeof createAvailabilityBlockSchema>;
export type UpdateNotificationPrefsInput = z.infer<typeof updateNotificationPrefsSchema>;
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
export type RegisterImageInput = z.infer<typeof registerImageSchema>;
export type ReorderImagesInput = z.infer<typeof reorderImagesSchema>;
export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;
export type PriceQuoteRequestInput = z.infer<typeof priceQuoteRequestSchema>;
export type SetCancellationPolicyInput = z.infer<typeof setCancellationPolicySchema>;
export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;
export type ReviewVerificationInput = z.infer<typeof reviewVerificationSchema>;
export type UpdateLanguageInput = z.infer<typeof updateLanguageSchema>;
export type CreateWishlistInput = z.infer<typeof createWishlistSchema>;
export type UpdateWishlistInput = z.infer<typeof updateWishlistSchema>;
export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>;
export type CreateReviewResponseInput = z.infer<typeof createReviewResponseSchema>;
export type AutocompleteInput = z.infer<typeof autocompleteSchema>;
