export type ListingStatus = 'draft' | 'published' | 'archived';
export type ListingCategory =
  | 'villa'
  | 'apartment'
  | 'cabin'
  | 'treehouse'
  | 'boat'
  | 'castle'
  | 'farmhouse'
  | 'penthouse';

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type CancellationPolicyType = 'flexible' | 'moderate' | 'strict';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'new_message'
  | 'new_review'
  | 'payment_received'
  | 'payout_sent'
  | 'verification_update';
export type PriceRuleType = 'weekend' | 'seasonal' | 'length_discount' | 'custom';

export interface Listing {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: ListingCategory;
  status: ListingStatus;
  pricePerNight: number;
  currency: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    lat: number;
    lng: number;
  };
  amenities: string[];
  images: ListingImage[];
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  rating: number;
  reviewCount: number;
  hostId: string;
  partnerId: string | null;
  featured: boolean;
  cancellationPolicyType?: CancellationPolicyType;
  cleaningFee?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListingImage {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  isPrimary: boolean;
}

export interface SearchParams {
  query?: string;
  category?: ListingCategory[];
  priceMin?: number;
  priceMax?: number;
  location?: string;
  amenities?: string[];
  guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  sort?: SearchSort;
  page?: number;
  limit?: number;
}

export type SearchSort = 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc' | 'newest';

export interface SearchResult {
  hits: Listing[];
  totalHits: number;
  page: number;
  totalPages: number;
  facets: SearchFacets;
  processingTimeMs: number;
}

export interface SearchFacets {
  category: Record<string, number>;
  amenities: Record<string, number>;
  city: Record<string, number>;
  country: Record<string, number>;
  priceRange: { min: number; max: number };
}

export interface Review {
  id: string;
  listingId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  author: {
    name: string;
    avatarUrl: string | null;
  };
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  listingId: string;
  userId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: BookingStatus;
  guests?: number;
  paidAt?: string;
  cancellationPolicySnapshot?: CancellationRule[];
  createdAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  listingId: string;
  createdAt: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  params: SearchParams;
  notifyOnNew: boolean;
  createdAt: string;
}

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  userId: string | null;
  sessionId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export type AnalyticsEventType =
  | 'search'
  | 'listing_view'
  | 'listing_click'
  | 'favorite_add'
  | 'favorite_remove'
  | 'filter_apply'
  | 'compare_add'
  | 'compare_remove'
  | 'conversion';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'user' | 'host' | 'admin';
  preferredLanguage?: string;
  isVerified?: boolean;
  createdAt: string;
}

export interface Partner {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface IndexingJob {
  listingId: string;
  action: 'upsert' | 'delete';
  priority?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: Record<
    string,
    {
      status: 'pass' | 'fail';
      latencyMs?: number;
      message?: string;
    }
  >;
}

export interface Conversation {
  id: string;
  listingId: string;
  hostId: string;
  guestId: string;
  lastMessageAt: string | null;
  createdAt: string;
  listing?: {
    title: string;
    slug: string;
  };
  otherUser?: {
    name: string;
    avatarUrl: string | null;
  };
  unreadCount?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  status: MessageStatus;
  createdAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  refundedAmount: number;
  createdAt: string;
}

export interface Payout {
  id: string;
  hostId: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  createdAt: string;
}

export interface AvailabilityBlock {
  id: string;
  listingId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface PricingRule {
  id: string;
  listingId: string;
  type: PriceRuleType;
  name: string;
  adjustment: number;
  adjustmentType: 'percent' | 'fixed';
  config: Record<string, unknown>;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

export interface CancellationPolicy {
  id: string;
  listingId: string;
  type: CancellationPolicyType;
  rules: CancellationRule[];
}

export interface CancellationRule {
  daysBeforeCheckin: number;
  refundPercent: number;
}

export interface IdentityVerification {
  id: string;
  userId: string;
  documentType: string;
  documentUrl: string;
  selfieUrl: string | null;
  status: VerificationStatus;
  adminNotes: string | null;
  createdAt: string;
}

export interface PriceQuote {
  nightly: NightlyPrice[];
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
  currency: string;
  nights: number;
}

export interface NightlyPrice {
  date: string;
  price: number;
  rules: string[];
}

export interface Wishlist {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  coverImageUrl: string | null;
  itemCount?: number;
  items?: WishlistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItem {
  id: string;
  wishlistId: string;
  listingId: string;
  note: string | null;
  listing?: Listing;
  createdAt: string;
}

export interface ReviewResponse {
  id: string;
  reviewId: string;
  hostId: string;
  body: string;
  hostName?: string;
  hostAvatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OAuthProvider = 'google' | 'apple';

export interface OAuthAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: 'user' | 'host' | 'admin';
  isVerified: boolean;
  memberSince: string;
  reviewsGiven: number;
  reviewsReceived?: number;
  listingsCount?: number;
  averageRating?: number;
  recentReviews?: Review[];
}
