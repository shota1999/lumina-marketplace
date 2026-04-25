# Lumina — Premium Rental Marketplace

![Next.js](https://img.shields.io/badge/Next.js_15-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-000000?logo=opentelemetry&logoColor=white)
![Claude API](https://img.shields.io/badge/Claude_API-191919?logo=anthropic&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

> **High-performance search/discovery marketplace for premium rentals and curated experiences.**

**[Architecture](#architecture)** · **[API Docs](#api-endpoints)** · **[Demo Accounts](#demo-accounts)** · **[Run Locally](#quick-start)**

---

Full-stack production-grade application with AI-powered semantic search, map-based discovery, Stripe payments, distributed tracing, i18n (8 languages), PWA support, and comprehensive testing.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client                                      │
│  React 19 · Mapbox GL · TanStack Query · next-intl · Service Worker     │
├──────────────┬──────────────────────────────────────┬───────────────────┤
│  Next.js 15  │         API Routes (REST)            │   Edge Middleware │
│  App Router  │  Auth · Bookings · Reviews · Search  │  Auth · Geo · Bot│
│  ISR + Cache │  Payments · Analytics · Notifications │  Security Hdrs   │
├──────────────┴──────────────┬───────────────────────┴───────────────────┤
│          Drizzle ORM        │              Services                      │
│     PostgreSQL (26 tables)  │  Stripe · Nodemailer · OpenTelemetry     │
├─────────────────────────────┼───────────────────────────────────────────┤
│      Meilisearch + pgvector  │              Redis                         │
│  Full-text · Semantic · Geo  │  Sessions · Rate Limit · Job Queue        │
└─────────────────────────────┴───────────────────────────────────────────┘
```

## Architecture

### Why modular monolith?

A single team and deployment pipeline. Splitting into microservices at this scale adds network latency, operational overhead, and distributed transaction complexity with zero benefit. The modular monolith keeps listings, auth, favorites, saved searches, analytics, and admin in one deployable unit with clean module boundaries and shared types.

### Why the search-indexer is separate

Indexing is CPU-bound, bursty (bulk reindexes), and failure-prone (external Meilisearch dependency). Isolating it prevents indexing storms from degrading user-facing API latency. It processes BullMQ jobs independently with its own retry strategy and health checks, and can be scaled or restarted without touching the web app.

### Why BullMQ over Kafka

Redis-backed queues are operationally simple — no ZooKeeper, no partition management, no consumer group rebalancing. BullMQ provides: retry with exponential backoff, dead-letter visibility, rate limiting, concurrency control, and priority queues. Kafka's durability and throughput guarantees are unnecessary at this scale.

### Tradeoffs

| Decision | Tradeoff |
|----------|----------|
| Drizzle over Prisma | Better perf, SQL-like DX, but smaller ecosystem |
| Meilisearch over Typesense | Simpler ops, better typo tolerance, but less clustering maturity |
| Session tokens over JWT | Revocable sessions, but requires DB lookup per request |
| BullMQ over Kafka | Simple ops, but limited to single-Redis throughput |
| Tailwind over CSS-in-JS | Zero runtime cost, but utility class strings can get verbose |

## Tech Stack

- **Monorepo**: Yarn workspaces + Turborepo
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind, shadcn/ui, TanStack Query, Mapbox
- **Backend**: Next.js route handlers, Drizzle ORM, PostgreSQL, Redis, BullMQ
- **Search**: Meilisearch (faceted filtering, typo tolerance, geo search)
- **Infra**: Docker multi-stage, docker-compose, Kubernetes, GitHub Actions

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd lumina
corepack enable
yarn install

# 2. Start infrastructure
docker compose up -d postgres redis meilisearch

# 3. Configure env
cp .env.example .env.local

# 4. Push schema and seed demo data
yarn db:reset

# 5. Start dev servers
yarn dev
```

Web app: http://localhost:3000
Meilisearch dashboard: http://localhost:7700

## Project Structure

```
apps/
  web/                   # Next.js main app (frontend + API)
  search-indexer/        # Standalone search indexing service
packages/
  db/                    # Drizzle schema, migrations, client, seed
  telemetry/             # OpenTelemetry SDK, span helpers, trace propagation
  ui/                    # shadcn/ui component library
  shared/                # Types, schemas, constants, utils, env validation
  config/                # ESLint, TypeScript, Tailwind configs
docker/                  # Multi-stage Dockerfiles
k8s/                     # Kubernetes manifests
.github/workflows/       # CI/CD pipeline
```

## Commands

| Command | Description |
|---------|-------------|
| `yarn dev` | Start all services in dev mode |
| `yarn build` | Build all packages |
| `yarn lint` | Lint all packages |
| `yarn typecheck` | Type-check all packages |
| `yarn db:push` | Push schema to database |
| `yarn db:studio` | Open Drizzle Studio |
| `yarn db:seed` | Seed demo data (clears + reinserts) |
| `yarn db:index` | Index listings into Meilisearch |
| `yarn db:reset` | Push schema + seed + index (all-in-one) |

## Deployment

### Docker

```bash
# Development (infra only)
docker compose up -d postgres redis meilisearch

# Full stack (builds + runs everything)
docker compose up --build
```

The web Dockerfile uses Next.js standalone output — the final image contains only the server and its dependencies (~150MB vs ~1GB for a full node_modules install).

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `MEILISEARCH_HOST` | Yes | Meilisearch instance URL |
| `MEILISEARCH_API_KEY` | Yes | Meilisearch API key |
| `SESSION_SECRET` | Yes | 32+ char secret for session signing |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL (default: http://localhost:3000) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | No | Mapbox token for map features |
| `SENTRY_DSN` | No | Sentry error tracking DSN |

The app validates env vars at startup in production via `instrumentation.ts`. Missing required vars will fail the deploy immediately.

### Cloud Deployment (Railway / Render / Fly.io)

```bash
# 1. Set env vars on your platform
# 2. Build command:
yarn install --immutable && yarn build

# 3. Start command:
yarn workspace @lumina/web start

# 4. Health check endpoint:
GET /api/health
```

### Kubernetes

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml  # Update with real values first
kubectl apply -f k8s/web-deployment.yaml
kubectl apply -f k8s/indexer-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

## Features

| Feature | Implementation |
|---------|---------------|
| **Map-based search** | Mapbox GL + Supercluster clustering, price markers, style toggle, "Search this area" |
| **Full-text search** | Meilisearch with facets, geo-bounds, typo tolerance; PostgreSQL fallback |
| **Stripe payments** | Checkout sessions, webhooks, refunds, Stripe Connect payouts |
| **Admin dashboard** | Analytics with Recharts (area/bar/pie charts), listings management, verifications |
| **i18n** | 8 languages via next-intl (en, es, fr, de, ja, zh, ko, pt) |
| **Auth** | Session-based, OAuth (Google/Apple), password reset, rate-limited |
| **Edge middleware** | Auth guards, geo-locale, bot detection, security headers |
| **PWA** | Service worker, offline fallback, installable manifest |
| **API documentation** | OpenAPI 3.1 spec + interactive Swagger UI at `/docs` |
| **Notifications** | In-app + email (Nodemailer) for bookings, messages, reviews |
| **Analytics** | Event tracking, Web Vitals reporting, conversion funnel |
| **Testing** | Vitest (58 unit/integration) + Playwright E2E (4 suites) |
| **Error handling** | Error boundaries, global-error, structured logging, Sentry |
| **Observability** | OpenTelemetry distributed tracing, Jaeger UI, request logging, metrics, audit trail, health checks |
| **Dark mode** | next-themes with system/light/dark toggle |
| **ISR + caching** | `unstable_cache` with tag revalidation, ISR on listing pages |

## CI/CD Pipeline

On every push/PR to `main`:

1. **Quality** — format check, lint, typecheck, unit tests
2. **Build** — full production build
3. **E2E** — Playwright browser tests with artifact upload
4. **Docker** — build and push images to GHCR (main branch only)

Pre-commit hooks enforce lint-staged (ESLint + Prettier). Pre-push hooks run typecheck and tests.

## Booking & Review Flow

### How a booking works

```
User selects dates → POST /api/bookings
  ├─ Zod validates input (date format, guest count)
  ├─ Pure validation: dates in future, start < end, ≤365 nights
  ├─ DB: listing exists + published
  ├─ DB: no overlapping active bookings (pending/confirmed)
  ├─ Calculate total = nights × pricePerNight
  └─ Insert booking (status: "pending")

User clicks "Confirm" → POST /api/bookings/:id/confirm
  ├─ Verify booking belongs to user
  ├─ Verify status is "pending"
  └─ Update status → "confirmed"
```

The two-step flow simulates a real payment integration point. Swapping the confirm step for Stripe checkout requires changing only the confirm route.

### How reviews update ratings

```
POST /api/reviews
  ├─ Create review row
  ├─ UPDATE listings SET rating = avg(reviews), reviewCount = count(reviews)
  └─ revalidateTag("listing:{slug}") → bust cached page data
```

Rating and reviewCount are **denormalized** on the listings table for read performance. The source of truth remains the reviews table; the denormalized values are recomputed on every write.

## Key Technical Decisions

| Decision | Why |
|----------|-----|
| **Validation separation** (`booking-validation.ts`) | Pure functions with zero DB deps — fully unit-testable without mocks. Service layer composes validation + DB logic. |
| **`unstable_cache` with tag-based revalidation** | Listing pages are read-heavy. 60s TTL + tag invalidation on review/booking gives near-real-time data without per-request DB hits. |
| **Denormalized rating/reviewCount** | Avoids expensive `JOIN + GROUP BY` on every listing page load. Acceptable because reviews are write-infrequent. |
| **`pending → confirmed` booking status** | Clean integration point for future payment. Overlap detection includes pending bookings to prevent race conditions. |
| **Structured request logging** | Every mutating API route logs `requestId`, `userId`, `route`, `traceId`, and business outcome. Logs are correlated with OpenTelemetry traces via `traceId`/`spanId` fields. |
| **`instrumentation.ts` env validation** | Fails fast on deploy if env vars are missing. Only in production — dev can run with partial config. |
| **OpenTelemetry distributed tracing** | Auto-instruments HTTP, postgres, Redis. Manual spans on business operations (bookings, search, auth, email). Trace context propagates through BullMQ jobs via W3C `traceparent` in job data. Jaeger UI at `localhost:16686`. |
| **AI semantic search (pgvector)** | Natural language queries ("cozy cabin near the ocean with a fireplace") are embedded via OpenAI `text-embedding-3-small` and matched against listing embeddings using cosine similarity in PostgreSQL (pgvector HNSW index). Falls back to Meilisearch for keyword queries. |
| **AI description generator** | Hosts can generate listing descriptions via Claude API with streaming response. Context-aware prompt uses property details (category, location, amenities) to produce tailored, professional descriptions. |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check (DB + Redis latency) |
| `/api/search` | GET | Search listings (semantic + Meilisearch + DB fallback) |
| `/api/ai/generate-description` | POST | Stream AI-generated listing description (Claude) |
| `/api/ai/embed-listing` | POST | Generate/store embedding for a listing (admin) |
| `/api/listings` | GET/POST | List/create listings |
| `/api/listings/:slug` | GET | Listing detail + reviews + similar |
| `/api/reviews` | POST | Create review (auth required) |
| `/api/bookings` | POST | Create booking (auth required) |
| `/api/bookings/:id/confirm` | POST | Confirm pending booking |
| `/api/favorites` | GET/POST | List/toggle favorites |
| `/api/saved-searches` | GET/POST/DELETE | Manage saved searches |
| `/api/analytics` | POST | Track events |
| `/api/admin/listings` | GET/PATCH | Admin listing management |
| `/api/admin/reindex` | POST | Trigger full reindex |

## Demo Accounts

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| `admin@lumina.dev` | `admin123` | admin | Full admin access |
| `host@lumina.dev` | `admin123` | host | Owns all demo listings (Sarah Chen) |
| `guest@lumina.dev` | `admin123` | user | Has bookings, favorites, saved searches (Alex Rivera) |
| `traveler@lumina.dev` | `admin123` | user | Has bookings and favorites (Jamie Park) |

## Demo Data & Scenarios

### Seeding

```bash
# Seed database + index into Meilisearch
yarn db:seed       # Seed PostgreSQL
yarn db:index      # Index listings into Meilisearch

# Full reset (push schema + seed + index) — one command
yarn db:reset

# Or use the scripts directly
./scripts/reset-db.sh   # Interactive, confirms before wiping
./scripts/seed-demo.sh  # Seed + index
```

> **Note:** If Meilisearch is not running, the search API automatically falls back to a direct PostgreSQL query. You can run without Meilisearch for basic demo/development.

### Scenario Listings

| Listing | Scenario | What to test |
|---------|----------|-------------|
| Oceanfront Villa in Malibu | Highly rated (4.8+), featured | Star rating display, featured badge, review list |
| Mountain Cabin Retreat in Aspen | Booked next week | Date picker shows unavailable dates |
| Treehouse Escape in Big Sur | No similar listings nearby | "Similar listings" section is empty |
| Historic Castle in Scottish Highlands | Zero reviews | Empty review state, no rating badge |
| Luxury Penthouse in Miami Beach | Fully booked next 30 days | **Overlapping booking rejection** — try booking any dates in the next month |
| Sailboat Stay in Marina del Rey | Low rated (3.2) | Low rating display, mixed review sentiment |
| Tuscan Farmhouse with Vineyard | Partner listing, good reviews | Partner badge, review variety |
| Modern Apartment in Tokyo Shibuya | Budget, mixed booking history | Cancelled + pending bookings in history |
| Clifftop Villa in Santorini | Second villa | Appears in "similar listings" for Malibu villa |
| Lakeside Cabin in Lake Tahoe | Second cabin | Appears in "similar listings" for Aspen cabin |

### Scenario: Booking Flows

1. **Successful booking** — Login as `guest@lumina.dev`, book Tuscan Farmhouse for any open dates
2. **Overlapping rejection** — Try booking Miami Penthouse for dates within the next 30 days → should get overlap error
3. **Unauthenticated attempt** — Log out, try `POST /api/bookings` → should get 401
4. **Confirm a pending booking** — Login as `guest@lumina.dev`, the Tokyo Apartment has a pending booking → confirm it
5. **Cancel a booking** — The Santorini Villa has a pending booking for `traveler@lumina.dev`

### Scenario: Review Flows

1. **Listing with no reviews** — Visit the Scottish Castle → empty review state
2. **Low-rated listing** — Visit the Sailboat → shows low average and mixed comments
3. **Add a review** — Login, POST to `/api/reviews` for any listing

### Booking States in the Seed

| Listing | Guest | Status | Dates |
|---------|-------|--------|-------|
| Aspen Cabin | guest@lumina.dev | confirmed | Next 3–10 days |
| Miami Penthouse | guest@lumina.dev | confirmed | Next 1–15 days |
| Miami Penthouse | traveler@lumina.dev | confirmed | Next 15–30 days |
| Tokyo Apartment | guest@lumina.dev | pending | 2 weeks out |
| Malibu Villa | guest@lumina.dev | confirmed | Past (completed) |
| Tuscan Farmhouse | traveler@lumina.dev | cancelled | 3 weeks out |
| Tokyo Apartment | traveler@lumina.dev | cancelled | Past |
| Santorini Villa | traveler@lumina.dev | pending | 6 weeks out |
