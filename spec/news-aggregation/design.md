# Design: Property News Aggregation Platform

## Architecture Overview

```
                         ┌──────────────────────────────────┐
                         │     Vultr VPS (Sydney region)     │
                         │          Docker Compose           │
                         │                                   │
                         │  ┌───────────┐  ┌──────────────┐ │
                         │  │  Caddy     │  │  Node/Express│ │
                         │  │  (reverse  │──│  + BullMQ    │ │
                         │  │   proxy +  │  │  workers     │ │
                         │  │   static)  │  └──────┬───────┘ │
                         │  └───────────┘         │         │
                         │                ┌───────┴──┐      │
                         │           ┌────▼──┐  ┌────▼───┐  │
                         │           │Postgres│  │ Redis  │  │
                         │           │+pgvector│  │(queues)│  │
                         │           └────────┘  └────────┘  │
                         └──────────────────────────────────┘
```

**Single Vultr VPS in Sydney** running everything via Docker Compose. Caddy serves the Vite static build and reverse-proxies `/api` to Express. PostgreSQL with pgvector and Redis run as containers on the same host. This gives us full control, low latency for AU users, and no managed service costs.

### Deployment Architecture

| Component | Container | Details |
|---|---|---|
| **Caddy** | `caddy:2-alpine` | Reverse proxy, auto-HTTPS (Let's Encrypt), serves frontend static files from `/srv`, proxies `/api/*` to Express |
| **Express API** | `node:20-alpine` | Express + BullMQ workers in same process, port 3001 |
| **PostgreSQL** | `postgres:16-alpine` + pgvector | Data + vector storage, persistent volume |
| **Redis** | `redis:7-alpine` | BullMQ job queues, persistent volume |

### Caddy Config (Caddyfile)
```
propertyhack.com {
    handle /api/* {
        reverse_proxy express:3001
    }
    handle {
        root * /srv
        try_files {path} /index.html
        file_server
    }
}
```

### Docker Compose Structure
```yaml
# docker-compose.yml
services:
  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - ./frontend-dist:/srv        # Vite build output
      - caddy_data:/data
  express:
    build: ./server
    env_file: .env
    depends_on: [postgres, redis]
  postgres:
    image: pgvector/pgvector:pg16
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: propertyhack
      POSTGRES_USER: propertyhack
      POSTGRES_PASSWORD: ${DB_PASSWORD}
  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]
```

### Deployment Flow
1. Push to `main` triggers GitHub Actions
2. CI runs tests (unit, integration, E2E)
3. On pass: SSH into Vultr VPS, `git pull`, `npm run build` (frontend), `docker compose up -d --build`
4. Caddy auto-renews HTTPS certificates via Let's Encrypt
5. Zero-downtime deploys via Docker Compose rolling restart

## Backend Architecture

### Ingestion Pipeline

All seven source types feed into a unified pipeline:

```
Source Fetcher → Raw Article → Deduplication → AI Summarisation → Embedding → Published Article
```

Each step is a separate BullMQ job so failures are isolated and retryable.

#### Queue Design

Replace existing queues with:

| Queue | Purpose | Concurrency | Rate Limit |
|---|---|---|---|
| `source-fetch` | Fetch raw content from sources | 3 | 10/min (respect external APIs) |
| `article-process` | Deduplicate + extract content | 5 | none |
| `article-summarise` | AI summarisation (short + long) | 2 | 20/min (API rate limits) |
| `article-embed` | Generate vector embedding | 3 | 60/min (OpenAI embeddings) |
| `social-publish` | Post to social platforms | 1 | 1/min per platform |

Remove: `scheduled-posts` queue (legacy), `news-curation` queue (unused).

#### Worker Flow

```
1. Scheduler (node-cron) checks IngestionSource records
   → For each due source, adds job to `source-fetch` queue

2. source-fetch worker:
   → Calls appropriate fetcher (RSS, NewsAPI, Perplexity, scraper, etc.)
   → Extracts raw articles [{title, content, url, imageUrl, date}]
   → For each article, adds job to `article-process` queue
   → Updates IngestionSource.lastFetchAt, creates IngestionLog

3. article-process worker:
   → Checks URL deduplication (normalized URL lookup in Article table)
   → If new: saves as DRAFT Article with originalContent
   → Adds job to `article-summarise` queue

4. article-summarise worker:
   → Calls AI service to generate shortBlurb + longSummary
   → Auto-tags category and extracts location from content
   → Updates Article record
   → Adds job to `article-embed` queue

5. article-embed worker:
   → Calls OpenAI embeddings API (text-embedding-3-small, 1536 dims)
   → Stores vector in Article.embedding column
   → Sets Article.status = PUBLISHED, sets publishedAt
```

#### Source Fetchers

Each source type has a dedicated fetcher module in `server/services/fetchers/`:

| File | Source Type | Key Dependencies |
|---|---|---|
| `rssFetcher.js` | RSS | `rss-parser` npm package |
| `newsApiOrgFetcher.js` | NewsAPI.org | Refactor existing `newsApiService.js` |
| `newsApiAiFetcher.js` | NewsAPI.ai | `axios` (REST API) |
| `perplexityFetcher.js` | Perplexity | `axios` (REST API) |
| `newsletterFetcher.js` | Newsletter | Resend inbound webhook + `cheerio` for HTML parsing |
| `scraperFetcher.js` | Web Scraper | `cheerio` (static) or `puppeteer-core` (dynamic) |
| `socialFetcher.js` | Social Media | Reddit API (`snoowrap`), Twitter API v2 (`twitter-api-v2`) |
| `manualFetcher.js` | Manual URL | `axios` + `cheerio` for URL content extraction |

Each fetcher implements:
```js
async function fetch(sourceConfig) → [{ title, content, url, imageUrl, date, author, sourceName }]
```

The `sourceConfig` is the JSON `config` field from `IngestionSource`, containing type-specific settings.

#### Source Config Schemas (JSON)

```js
// RSS
{ feedUrl: "https://...", maxItems: 50 }

// NewsAPI.org
{ keywords: ["property", "real estate"], country: "au", category: "business", pageSize: 100 }

// NewsAPI.ai
{ keywords: ["Australian property market"], categories: ["Business"], sourceLocations: ["Australia"], maxItems: 50, apiKey: "..." }

// Perplexity
{ searchQueries: ["Australian property news this week", "Sydney housing market"], maxResults: 20 }

// Newsletter
{ inboundEmail: "news@ingest.propertyhack.com", allowedSenders: ["*@domain1.com", "specific@sender.com"] }

// Scraper
{ targetUrl: "https://...", selectors: { articleList: ".article", title: "h2", content: ".body", image: "img", link: "a" }, headless: false, maxPages: 5 }

// Social
{ platform: "reddit", subreddits: ["AusProperty", "AusFinance"], minUpvotes: 10 }
{ platform: "twitter", listId: "...", hashtags: ["#ausproperty"] }

// Manual
{ url: "https://..." } // one-shot, no schedule
```

### AI Services

#### Summarisation
Refactor existing `server/services/articleSummaryService.js`:
- Keep **Gemini 2.0 Flash** as the summarisation model (fast, cheap, good quality)
- Add structured output: `{ shortBlurb, longSummary, suggestedCategory, extractedLocation }`
- System prompt instructs: factual, neutral tone, always attribute source, extract Australian location names

#### Embeddings
New service `server/services/embeddingService.js`:
- Use **OpenAI text-embedding-3-small** (1536 dimensions) — already have OpenAI SDK
- Input: concatenation of title + shortBlurb + longSummary
- Output: float[] stored in pgvector column

#### Perplexity
New service `server/services/perplexityService.js`:
- Use Perplexity's `sonar` model via their API
- Search queries configured per source
- Returns articles with summaries that we re-process through our pipeline

### Database Changes

#### pgvector Setup
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
Add to Article model:
```prisma
embedding  Unsupported("vector(1536)")?
```
Create index:
```sql
CREATE INDEX article_embedding_idx ON articles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

#### Prisma Schema Changes

**Add:**
- `IngestionSource` model (as per spec)
- `SocialPost` model (as per spec)
- `IngestionLog` model (as per spec)
- `embedding` field on `Article` (Unsupported pgvector type)

**Refactor `Article`:**
- Add: `shortBlurb`, `longSummary`, `originalContent`, `location`, `embedding`, `metadata`
- Rename: `summary` -> keep as alias during migration, then remove
- Add: `sourceId` FK to `IngestionSource`
- Keep: `slug`, `title`, `imageUrl`, `imageAltText`, `sourceUrl`, `sourceName`, `market`, `status`, `featured`, `viewCount`, `publishedAt`, `categoryId`

**Remove models:**
- `DraftPost`
- `ScheduledPost`
- `PublishedPost`
- `EmailResponse`
- `NewsArticle`
- `PromptTemplate`

**Simplify `User`:**
- Remove: LinkedIn OAuth fields, OTP fields, Stripe subscription fields, monthlyPostCount
- Keep: id, email, passwordHash, displayName, superAdmin, createdAt, updatedAt

**Remove `UserSettings`** (no user customisation in v1)

**Keep as-is:**
- `Market`
- `ArticleCategory`
- `SystemPrompt`

**Remove `ArticleSource`** — replaced by `IngestionSource`

#### Migration Strategy
Single migration that:
1. Creates new tables (IngestionSource, SocialPost, IngestionLog)
2. Adds new columns to Article
3. Drops legacy tables
4. Adds pgvector extension and embedding column

Data loss is acceptable — only seed data exists in production.

### API Design

#### Semantic Search Endpoint
`GET /api/articles?search=interest+rates+sydney`

When `search` param is present:
1. Generate embedding for search query via OpenAI
2. Query pgvector for cosine similarity: `ORDER BY embedding <=> $queryEmbedding LIMIT 20`
3. Combine with any other filters (location, category, date)
4. Return results ranked by similarity

When no search param: standard Prisma query with filters, ordered by `publishedAt DESC`.

#### Location Detection
Frontend calls browser `navigator.geolocation.getCurrentPosition()` on first visit. On decline or failure, falls back to `GET https://ip-api.com/json/` (free, no key needed). Detected location stored in localStorage. Sent as `location` query param to `/api/articles`.

### Social Media Publishing

#### Platform Integrations
`server/services/social/`:

| Platform | API | Auth |
|---|---|---|
| Twitter/X | Twitter API v2 | OAuth 2.0 (app-level) |
| Facebook | Graph API | Page Access Token |
| LinkedIn | Share API v2 | OAuth 2.0 |
| Instagram | Graph API (via FB) | Page Access Token |

Each platform adapter implements:
```js
async function publish(post, credentials) → { platformPostId, url }
async function preview(post) → { characterCount, mediaSupport, formattedContent }
```

Platform API credentials stored as env vars (not in DB). Admin selects platforms per post. Publishing is async via `social-publish` queue.

## Frontend Architecture

### Route Structure

```
/                           → Homepage (PublicFeed)
/article/:slug              → ArticleDetail
/admin                      → Admin Dashboard (protected)
/admin/sources              → Source Management
/admin/sources/:id          → Source Detail/Edit
/admin/articles             → Article Management
/admin/articles/:id/edit    → Article Editor
/admin/social               → Social Post Management
/admin/social/new           → Create Social Post
/admin/social/:id           → Edit Social Post
/admin/monitor              → Ingestion Monitor
/login                      → Admin Login
```

Remove all legacy routes: `/dashboard`, `/drafts`, `/scheduled`, `/published`, `/settings`, `/profile`, `/register`, `/prompt-management`, `/super-admin`.

### Component Structure

```
components/
├── layout/
│   ├── Header.tsx              # Sticky header with logo + search bar + filters
│   ├── Footer.tsx              # Minimal footer
│   └── AdminLayout.tsx         # Admin sidebar + header wrapper
├── public/
│   ├── PublicFeed.tsx           # Homepage - infinite scroll article grid
│   ├── ArticleCard.tsx          # Individual card (image, title, blurb, meta)
│   ├── ArticleDetail.tsx        # Full article page
│   ├── SearchFilterBar.tsx      # Search + location + category + date filters
│   ├── LocationDetector.tsx     # Handles geolocation + fallback + localStorage
│   └── RelatedArticles.tsx      # Vector-similar articles sidebar
├── admin/
│   ├── Dashboard.tsx            # Stats overview + health
│   ├── SourceList.tsx           # All sources table with status
│   ├── SourceEditor.tsx         # Add/edit source (dynamic form per type)
│   ├── ArticleList.tsx          # All articles table with bulk actions
│   ├── ArticleEditor.tsx        # Edit summaries, metadata, status
│   ├── SocialPostList.tsx       # Social posts table
│   ├── SocialPostEditor.tsx     # Create/edit post with platform preview
│   ├── IngestionMonitor.tsx     # Health dashboard with charts
│   └── IngestionLogViewer.tsx   # Per-source log table
└── shared/
    ├── Pagination.tsx           # Infinite scroll trigger
    ├── LoadingSpinner.tsx       # Gold-accented spinner
    └── EmptyState.tsx           # No results messaging
```

### State Management
- No global state library — React Query (`@tanstack/react-query`) for server state
- `useQuery` / `useInfiniteQuery` for data fetching with caching
- Location stored in localStorage, accessed via custom `useLocation` hook
- Auth state via existing JWT context (simplified for admin-only)

### Performance Targets
- Homepage initial load: **<2s** (skeleton loading, paginated API)
- Filter/search response: **<500ms** (debounced input, optimistic UI)
- Article detail: **<1s** (prefetch on card hover)
- Infinite scroll: load next page when 200px from bottom
- Images: lazy loaded with blur placeholder, WebP where available

### Styling Approach
- Tailwind CSS with existing theme tokens (no new colors)
- Gold accents (`brand.accent`) on: buttons, active filters, featured card borders, links on hover
- Dark surfaces (`brand.primary`, `brand.secondary`) on: header, admin sidebar, footer
- Light surfaces (`base.100`, `base.200`) on: content areas, card backgrounds
- Framer Motion for: card entrance animations, page transitions, filter panel toggle
- Mobile-first: single column cards on mobile, 2-col on tablet, 3-col on desktop

## Testing Strategy

### Unit Tests (Vitest)

**Backend (`server/__tests__/`):**
- Each fetcher module: mock HTTP responses, verify parsing, handle errors
  - `rssFetcher.test.js` — valid RSS, malformed XML, empty feed, encoding issues
  - `newsApiOrgFetcher.test.js` — success response, rate limit, API error, empty results
  - `newsApiAiFetcher.test.js` — same patterns
  - `perplexityFetcher.test.js` — same patterns
  - `scraperFetcher.test.js` — static HTML parsing, missing selectors, timeout
  - `socialFetcher.test.js` — Reddit API mock, empty subreddit, rate limit
  - `newsletterFetcher.test.js` — email parsing, link extraction, HTML sanitisation
  - `manualFetcher.test.js` — URL fetch, content extraction, invalid URL
- AI services: mock API calls, verify prompt structure, handle API errors
  - `articleSummaryService.test.js` — summary generation, structured output parsing
  - `embeddingService.test.js` — embedding generation, dimension validation
- Deduplication logic: URL normalisation, duplicate detection, edge cases
- Article processing pipeline: end-to-end with mocked services
- Social media adapters: mock each platform API, verify post format

**Frontend (`__tests__/`):**
- `ArticleCard.test.tsx` — renders all fields, handles missing image, truncation
- `SearchFilterBar.test.tsx` — search input debounce, filter selection, clear
- `LocationDetector.test.tsx` — geolocation success, denial, IP fallback
- `ArticleDetail.test.tsx` — renders summary, source link, related articles

**Coverage target: >80% for all ingestion and API code.**

### Integration Tests (Vitest + Supertest)

**API endpoint tests (`server/__tests__/api/`):**
- `publicArticles.test.js`:
  - GET /api/articles — pagination, default sort, location filter, category filter, date range
  - GET /api/articles — semantic search (mock embeddings)
  - GET /api/articles/:slug — returns article, increments viewCount
  - GET /api/articles/:slug — 404 for missing slug
  - GET /api/articles/:slug/related — returns similar articles
- `adminSources.test.js`:
  - CRUD all source types with auth
  - 401 without auth, 403 for non-admin
  - POST /api/admin/sources/:id/fetch — triggers fetch
  - Validation: required fields, invalid config
- `adminArticles.test.js`:
  - List with filters, edit summary, change status, bulk actions
  - Manual article creation (URL + direct)
- `adminSocialPosts.test.js`:
  - CRUD social posts, publish to mock platforms
- `auth.test.js`:
  - Login success/failure, token refresh, logout

### E2E Tests (Playwright)

**Test files (`e2e/`):**
- `homepage.spec.ts`:
  - Page loads within 2s
  - Article cards display with image, title, blurb, date
  - Infinite scroll loads more articles
  - Featured article has gold border and full width
- `search-filter.spec.ts`:
  - Keyword search returns results, clears properly
  - Location filter applies and persists on reload
  - Category filter works
  - Date range filter works
  - Combined filters work together
  - No results state displays correctly
- `article-detail.spec.ts`:
  - Click card navigates to detail page
  - Full summary displayed
  - Source link present and clickable
  - Related articles section visible
  - Back navigation works
- `location-detection.spec.ts`:
  - Mock geolocation → filter applied
  - Deny geolocation → IP fallback used
  - Override location → new filter applied → persists
- `admin-login.spec.ts`:
  - Login with valid credentials
  - Reject invalid credentials
  - Protected routes redirect to login
- `admin-sources.spec.ts`:
  - Add RSS feed source
  - Edit source config
  - Toggle source active/inactive
  - Delete source with confirmation
  - Trigger manual fetch
  - View source logs
- `admin-articles.spec.ts`:
  - View article list
  - Edit article summary
  - Change article status
  - Set article as featured
  - Bulk archive
- `admin-social.spec.ts`:
  - Create social post
  - Select platforms
  - Preview post
  - Publish post

### Vector Search Tests (`server/__tests__/vector/`)
- `semanticSearch.test.js`:
  - Search query returns semantically relevant results
  - Results ordered by similarity score
  - Combined with location filter
  - Empty results handled
  - Related articles endpoint returns similar content

### Load Tests (k6 or Artillery)
- `publicFeed.load.js`:
  - 100 concurrent users browsing homepage
  - Target: p95 response time <500ms
  - Sustained 5 min test
- `search.load.js`:
  - 50 concurrent search queries
  - Target: p95 <1s (includes embedding generation)

### CI/CD Pipeline
```yaml
# .github/workflows/test-deploy.yml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [develop]

jobs:
  test:
    - Checkout
    - Setup Node 20
    - Install dependencies (root + server)
    - Start Postgres (pgvector/pgvector:pg16) + Redis via services
    - Run Prisma migrations
    - Run unit tests (vitest)
    - Run integration tests (vitest + supertest)
    - Run E2E tests (playwright)
    - Upload coverage report
    - Fail PR if coverage < 80%

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    - SSH into Vultr VPS
    - git pull origin main
    - npm run build (frontend → frontend-dist/)
    - docker compose up -d --build
    - Run smoke test (curl health endpoint)
```

## New Dependencies

### Backend (add to server/package.json)
| Package | Purpose |
|---|---|
| `rss-parser` | RSS feed parsing |
| `cheerio` | HTML parsing for scrapers + newsletters |
| `puppeteer-core` | Headless browser for dynamic scraping |
| `snoowrap` | Reddit API client |
| `twitter-api-v2` | Twitter/X API client |
| `pgvector` | pgvector Prisma/Node.js support |
| `vitest` | Test framework |
| `supertest` | HTTP integration testing |

### Frontend (add to root package.json)
| Package | Purpose |
|---|---|
| `@tanstack/react-query` | Server state management + caching |

### Dev Dependencies
| Package | Purpose |
|---|---|
| `@playwright/test` | E2E testing |
| `msw` | Mock Service Worker for API mocking in tests |
| `k6` or `artillery` | Load testing |

### Remove
| Package | Reason |
|---|---|
| `passport`, `passport-google-oauth20`, `passport-linkedin-oauth2` | No OAuth in v1 |
| `@google/genai` (frontend) | No client-side AI in v1 |

## File Structure (final)

```
propertyhack/
├── App.tsx
├── index.tsx
├── index.css
├── index.html
├── components/
│   ├── layout/
│   ├── public/
│   ├── admin/
│   └── shared/
├── services/
│   ├── api.ts                    # Base API client (axios/fetch)
│   ├── articleService.ts         # Public article API calls
│   ├── adminService.ts           # Admin API calls
│   └── locationService.ts        # Geolocation + IP fallback
├── hooks/
│   ├── useArticles.ts            # React Query hooks for articles
│   ├── useLocation.ts            # Location detection + localStorage
│   └── useAdmin.ts               # Admin data hooks
├── contexts/
│   └── AuthContext.tsx           # Simplified admin-only auth
├── __tests__/                    # Frontend unit tests
├── e2e/                          # Playwright E2E tests
├── server/
│   ├── index.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── routes/
│   │   ├── auth.js
│   │   ├── public/
│   │   │   └── articles.js      # Public feed + search + detail
│   │   └── admin/
│   │       ├── sources.js       # Source CRUD + fetch trigger
│   │       ├── articles.js      # Article management
│   │       ├── socialPosts.js   # Social post management
│   │       └── dashboard.js     # Stats + health
│   ├── services/
│   │   ├── fetchers/            # One per source type
│   │   ├── social/              # One per social platform
│   │   ├── articleSummaryService.js
│   │   ├── embeddingService.js
│   │   ├── perplexityService.js
│   │   └── newsApiService.js    # Refactored
│   ├── workers/
│   │   ├── sourceFetchWorker.js
│   │   ├── articleProcessWorker.js
│   │   ├── articleSummariseWorker.js
│   │   ├── articleEmbedWorker.js
│   │   └── socialPublishWorker.js
│   ├── queues/
│   │   ├── connection.js        # Keep (Redis connection)
│   │   ├── sourceFetchQueue.js
│   │   ├── articleProcessQueue.js
│   │   ├── articleSummariseQueue.js
│   │   ├── articleEmbedQueue.js
│   │   └── socialPublishQueue.js
│   ├── jobs/
│   │   └── ingestionScheduler.js  # Cron that checks sources + enqueues
│   └── __tests__/
│       ├── fetchers/
│       ├── services/
│       ├── api/
│       └── vector/
├── spec/
│   └── news-aggregation/
├── docker-compose.yml
├── Caddyfile
├── tailwind.config.js
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── .github/
    └── workflows/
        └── test-deploy.yml
```
