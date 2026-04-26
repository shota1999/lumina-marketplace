/**
 * OpenAPI 3.1 specification for the Lumina Marketplace API.
 *
 * Defined inline so it stays in sync with the codebase.
 * Served at GET /api/docs/spec and rendered by Swagger UI at /api/docs.
 */

export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Lumina Marketplace API',
    version: '1.0.0',
    description:
      'REST API for the Lumina premium rental marketplace. Covers authentication, listings, bookings, reviews, messaging, search, analytics, and payments.',
    contact: { name: 'Lumina Engineering', url: 'https://github.com/lumina-marketplace' },
    license: { name: 'MIT' },
  },
  servers: [{ url: '{baseUrl}', variables: { baseUrl: { default: 'http://localhost:3000' } } }],

  tags: [
    { name: 'Auth', description: 'Authentication & session management' },
    { name: 'Listings', description: 'Property CRUD' },
    { name: 'Search', description: 'Full-text search with filters' },
    { name: 'Bookings', description: 'Reservation lifecycle' },
    { name: 'Reviews', description: 'Guest reviews' },
    { name: 'Conversations', description: 'Messaging between users' },
    { name: 'Payments', description: 'Stripe checkout & webhooks' },
    { name: 'Notifications', description: 'In-app notification system' },
    { name: 'Analytics', description: 'Event tracking' },
    { name: 'Admin', description: 'Admin-only endpoints' },
    { name: 'Health', description: 'Service health checks' },
  ],

  paths: {
    // ---------- Auth ----------
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: ref('RegisterInput'),
        responses: {
          201: jsonResp('User', 'Account created'),
          400: errorResp(),
          429: rateLimited(),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in with email & password',
        requestBody: ref('LoginInput'),
        responses: {
          200: jsonResp('User', 'Authenticated'),
          401: errorResp('Invalid credentials'),
          429: rateLimited(),
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Destroy current session',
        responses: { 200: jsonResp(null, 'Logged out') },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        security: [{ session: [] }],
        responses: { 200: jsonResp('User'), 401: errorResp() },
      },
    },
    '/api/auth/update': {
      patch: {
        tags: ['Auth'],
        summary: 'Update profile (name, avatar, password)',
        security: [{ session: [] }],
        requestBody: ref('UpdateProfileInput'),
        responses: { 200: jsonResp('User'), 400: errorResp(), 429: rateLimited() },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        requestBody: ref('ForgotPasswordInput'),
        responses: { 200: jsonResp(null, 'Reset email sent if account exists') },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        requestBody: ref('ResetPasswordInput'),
        responses: { 200: jsonResp(null, 'Password updated'), 400: errorResp() },
      },
    },

    // ---------- Listings ----------
    '/api/listings': {
      get: {
        tags: ['Listings'],
        summary: 'List published listings',
        parameters: paginationParams(),
        responses: { 200: jsonResp('Listing[]') },
      },
      post: {
        tags: ['Listings'],
        summary: 'Create a new listing',
        security: [{ session: [] }],
        requestBody: ref('CreateListingInput'),
        responses: { 201: jsonResp('Listing'), 400: errorResp(), 429: rateLimited() },
      },
    },
    '/api/listings/{id}': {
      get: {
        tags: ['Listings'],
        summary: 'Get listing by ID',
        parameters: [pathParam('id', 'Listing UUID')],
        responses: { 200: jsonResp('Listing'), 404: errorResp() },
      },
      patch: {
        tags: ['Listings'],
        summary: 'Update a listing',
        security: [{ session: [] }],
        parameters: [pathParam('id', 'Listing UUID')],
        requestBody: ref('UpdateListingInput'),
        responses: { 200: jsonResp('Listing'), 403: errorResp(), 404: errorResp() },
      },
      delete: {
        tags: ['Listings'],
        summary: 'Delete a listing',
        security: [{ session: [] }],
        parameters: [pathParam('id', 'Listing UUID')],
        responses: { 200: jsonResp(null, 'Deleted'), 403: errorResp(), 404: errorResp() },
      },
    },

    // ---------- Search ----------
    '/api/search': {
      get: {
        tags: ['Search'],
        summary: 'Full-text search with filters, facets, and geo bounds',
        parameters: [
          queryParam('q', 'Search query', 'string'),
          queryParam('category', 'Filter by category', 'string'),
          queryParam('priceMin', 'Minimum price per night', 'number'),
          queryParam('priceMax', 'Maximum price per night', 'number'),
          queryParam('guests', 'Minimum guest capacity', 'number'),
          queryParam('bedrooms', 'Minimum bedrooms', 'number'),
          queryParam('amenity', 'Required amenity (repeatable)', 'string'),
          queryParam(
            'sort',
            'Sort order (relevance|price_asc|price_desc|rating_desc|newest)',
            'string',
          ),
          queryParam('boundsN', 'Map bounds north latitude', 'number'),
          queryParam('boundsS', 'Map bounds south latitude', 'number'),
          queryParam('boundsE', 'Map bounds east longitude', 'number'),
          queryParam('boundsW', 'Map bounds west longitude', 'number'),
          ...paginationParams(),
        ],
        responses: { 200: jsonResp('SearchResult'), 429: rateLimited() },
      },
    },

    // ---------- Bookings ----------
    '/api/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Create a booking (reserve dates)',
        security: [{ session: [] }],
        requestBody: ref('CreateBookingInput'),
        responses: {
          201: jsonResp('Booking'),
          400: errorResp(),
          409: errorResp('Dates unavailable'),
          429: rateLimited(),
        },
      },
    },
    '/api/bookings/{id}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get booking details',
        security: [{ session: [] }],
        parameters: [pathParam('id', 'Booking UUID')],
        responses: { 200: jsonResp('Booking'), 404: errorResp() },
      },
    },
    '/api/bookings/{id}/confirm': {
      post: {
        tags: ['Bookings'],
        summary: 'Host confirms a pending booking',
        security: [{ session: [] }],
        parameters: [pathParam('id', 'Booking UUID')],
        responses: { 200: jsonResp(null, 'Confirmed'), 400: errorResp(), 429: rateLimited() },
      },
    },
    '/api/bookings/{id}/cancel': {
      post: {
        tags: ['Bookings'],
        summary: 'Cancel a booking',
        security: [{ session: [] }],
        parameters: [pathParam('id', 'Booking UUID')],
        responses: { 200: jsonResp(null, 'Cancelled'), 400: errorResp() },
      },
    },

    // ---------- Reviews ----------
    '/api/reviews': {
      post: {
        tags: ['Reviews'],
        summary: 'Leave a review on a listing',
        security: [{ session: [] }],
        requestBody: ref('CreateReviewInput'),
        responses: {
          201: jsonResp('Review'),
          400: errorResp(),
          409: errorResp('Already reviewed'),
          429: rateLimited(),
        },
      },
    },

    // ---------- Conversations ----------
    '/api/conversations': {
      get: {
        tags: ['Conversations'],
        summary: 'List user conversations',
        security: [{ session: [] }],
        responses: { 200: jsonResp('Conversation[]') },
      },
      post: {
        tags: ['Conversations'],
        summary: 'Start a new conversation about a listing',
        security: [{ session: [] }],
        requestBody: ref('CreateConversationInput'),
        responses: { 201: jsonResp('Conversation'), 400: errorResp() },
      },
    },
    '/api/conversations/{id}/messages': {
      post: {
        tags: ['Conversations'],
        summary: 'Send a message in a conversation',
        security: [{ session: [] }],
        parameters: [pathParam('id', 'Conversation UUID')],
        requestBody: ref('SendMessageInput'),
        responses: { 201: jsonResp('Message'), 400: errorResp(), 404: errorResp() },
      },
    },

    // ---------- Payments ----------
    '/api/payments/checkout': {
      post: {
        tags: ['Payments'],
        summary: 'Create a Stripe checkout session',
        security: [{ session: [] }],
        requestBody: ref('CheckoutInput'),
        responses: { 200: jsonResp('CheckoutSession') },
      },
    },
    '/api/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Stripe webhook handler',
        description:
          'Receives Stripe events (checkout.session.completed, payment_intent.succeeded, etc.)',
        responses: { 200: { description: 'Webhook processed' } },
      },
    },

    // ---------- Notifications ----------
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get user notifications',
        security: [{ session: [] }],
        parameters: paginationParams(),
        responses: { 200: jsonResp('Notification[]') },
      },
    },
    '/api/notifications/unread-count': {
      get: {
        tags: ['Notifications'],
        summary: 'Get unread notification count',
        security: [{ session: [] }],
        responses: { 200: jsonResp('{ count: number }') },
      },
    },

    // ---------- Analytics ----------
    '/api/analytics/track': {
      post: {
        tags: ['Analytics'],
        summary: 'Track an analytics event',
        requestBody: ref('TrackEventInput'),
        responses: { 200: jsonResp(null, 'Event recorded') },
      },
    },

    // ---------- Health ----------
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Service health check',
        responses: {
          200: {
            description: 'All services healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    uptime: { type: 'number' },
                    services: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  components: {
    securitySchemes: {
      session: {
        type: 'apiKey',
        in: 'cookie',
        name: 'lumina_session',
        description: 'Session cookie set after login',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['user', 'host', 'admin'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Listing: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'published', 'archived'] },
          pricePerNight: { type: 'number' },
          currency: { type: 'string' },
          location: { type: 'object' },
          amenities: { type: 'array', items: { type: 'string' } },
          images: { type: 'array', items: { $ref: '#/components/schemas/ListingImage' } },
          maxGuests: { type: 'integer' },
          bedrooms: { type: 'integer' },
          bathrooms: { type: 'integer' },
          rating: { type: 'number' },
          reviewCount: { type: 'integer' },
          hostId: { type: 'string', format: 'uuid' },
        },
      },
      ListingImage: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          alt: { type: 'string' },
          isPrimary: { type: 'boolean' },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          listingId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          guests: { type: 'integer' },
          totalPrice: { type: 'number' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          listingId: { type: 'string', format: 'uuid' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string' },
          author: {
            type: 'object',
            properties: { name: { type: 'string' }, avatarUrl: { type: 'string' } },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Conversation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          listingId: { type: 'string', format: 'uuid' },
          hostId: { type: 'string', format: 'uuid' },
          guestId: { type: 'string', format: 'uuid' },
          lastMessageAt: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          conversationId: { type: 'string', format: 'uuid' },
          senderId: { type: 'string', format: 'uuid' },
          body: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          read: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      SearchResult: {
        type: 'object',
        properties: {
          hits: { type: 'array', items: { type: 'object' } },
          totalHits: { type: 'integer' },
          page: { type: 'integer' },
          totalPages: { type: 'integer' },
          facets: { type: 'object' },
          processingTimeMs: { type: 'number' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers to reduce boilerplate
// ---------------------------------------------------------------------------

function ref(name: string) {
  return {
    content: { 'application/json': { schema: { type: 'object' as const } } },
    description: name,
  };
}

function jsonResp(schemaName: string | null, desc = 'Success') {
  if (!schemaName) return { description: desc };
  return {
    description: desc,
    content: {
      'application/json': {
        schema: {
          type: 'object' as const,
          properties: {
            success: { type: 'boolean' as const, example: true },
            data: schemaName.endsWith('[]')
              ? {
                  type: 'array' as const,
                  items: { $ref: `#/components/schemas/${schemaName.slice(0, -2)}` },
                }
              : { $ref: `#/components/schemas/${schemaName}` },
          },
        },
      },
    },
  };
}

function errorResp(desc = 'Error') {
  return {
    description: desc,
    content: {
      'application/json': { schema: { $ref: '#/components/schemas/Error' } },
    },
  };
}

function rateLimited() {
  return {
    description: 'Rate limited',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  };
}

function pathParam(name: string, desc: string) {
  return {
    name,
    in: 'path' as const,
    required: true,
    schema: { type: 'string' as const },
    description: desc,
  };
}

function queryParam(name: string, desc: string, type: string) {
  return {
    name,
    in: 'query' as const,
    required: false,
    schema: { type: type as 'string' },
    description: desc,
  };
}

function paginationParams() {
  return [
    queryParam('page', 'Page number (default: 1)', 'integer'),
    queryParam('limit', 'Items per page (default: 24)', 'integer'),
  ];
}
