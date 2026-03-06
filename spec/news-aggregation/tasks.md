# Tasks: Property News Aggregation Platform

## Phase 1: Foundation (Infrastructure + DB + Legacy Cleanup)

### T1.1: Legacy Cleanup — Remove QUORD References
**Priority: 1 | Estimate: S | Dependencies: none**
- Remove all "QUORD" references from codebase (code, comments, config, docs, env vars)
- Remove `render.yaml` (replaced by Docker Compose)
- Remove `vercel.json` (frontend served by Caddy)
- Remove LinkedIn OAuth code and passport dependencies
- Remove legacy routes: `/api/posts/*`, `/api/user/linkedin-*`, `/api/subscription/*`
- Remove legacy components: `DraftsPage`, `ScheduledPage`, `PublishedPage`, `DraftEditor`, `HomePage` (AI content gen), `SettingsPage`, `ProfilePage`, `LandingPage`, `RegisterPage`, `PromptManagementPage`, `SuperAdminSettings`
- Remove legacy services: `openaiService.js` (LinkedIn post gen), frontend `@google/genai` usage
- Remove unused frontend service files related to LinkedIn/posts
- Update `RESEND_FROM_EMAIL` to PropertyHack domain
- **Test**: grep -r "QUORD\|quord" returns zero results; app still boots

### T1.2: Database Schema Migration
**Priority: 1 | Estimate: M | Dependencies: T1.1**
- Create Prisma migration that:
  - Drops legacy tables: `draft_posts`, `scheduled_posts`, `published_posts`, `email_responses`, `news_articles`, `prompt_templates`, `user_settings`
  - Drops `article_sources` table (replaced by `ingestion_sources`)
  - Simplifies `users` table (remove LinkedIn, OTP, Stripe subscription fields)
  - Creates `ingestion_sources` table with JSON config field
  - Creates `social_posts` table
  - Creates `ingestion_logs` table
  - Adds columns to `articles`: `short_blurb`, `long_summary`, `original_content`, `location`, `metadata` (JSON), `source_id` FK to `ingestion_sources`
  - Enables pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector`
  - Adds `embedding vector(1536)` column to `articles`
  - Creates IVFFlat index on embedding column
- Update Prisma schema to match
- Remove old seed files, create new seed script for test data
- **Test**: `npx prisma migrate deploy` succeeds; schema matches spec data model

### T1.3: Docker Compose + Caddy Setup
**Priority: 1 | Estimate: M | Dependencies: none**
- Create `docker-compose.yml` with: Caddy, Express, PostgreSQL (pgvector/pgvector:pg16), Redis
- Create `Caddyfile` for propertyhack.com (reverse proxy + static files)
- Create `server/Dockerfile` for Express container
- Add `.env.example` with all required env vars (no secrets)
- Add `npm run build` script that builds Vite frontend to `frontend-dist/`
- Create `docker-compose.dev.yml` override for local development (exposed ports, hot reload)
- **Test**: `docker compose up` starts all services; health endpoint responds; frontend loads

### T1.4: CI/CD Pipeline
**Priority: 2 | Estimate: S | Dependencies: T1.3**
- Create `.github/workflows/test-deploy.yml`
- Test job: checkout, install, start Postgres+Redis services, migrate, run tests
- Deploy job: SSH to Vultr, pull, build, `docker compose up -d --build`, smoke test
- Add GitHub secrets for Vultr SSH key and env vars
- **Test**: push to develop runs tests; merge to main triggers deploy

### T1.5: Simplified Auth
**Priority: 1 | Estimate: S | Dependencies: T1.2**
- Strip auth routes to: login, refresh, logout only
- Remove: register, forgot-password, reset-password, OTP, verify-email
- Keep JWT access/refresh token flow
- Ensure superAdmin check on all `/api/admin/*` routes
- **Test**: admin can login; non-admin rejected from admin routes; public routes work without auth

---

## Phase 2: Ingestion Engine

### T2.1: Ingestion Pipeline Architecture
**Priority: 1 | Estimate: M | Dependencies: T1.2**
- Create BullMQ queues: `source-fetch`, `article-process`, `article-summarise`, `article-embed`
- Remove legacy queues: `scheduled-posts`, `news-curation`, `article-processing`
- Create worker shells for each queue (empty handlers, proper BullMQ setup)
- Create `ingestionScheduler.js` — node-cron job that checks `IngestionSource` records and enqueues due sources
- Wire up workers in `server/index.js` with graceful shutdown
- **Test**: scheduler enqueues jobs for due sources; workers pick up and log jobs

### T2.2: Article Processing Worker
**Priority: 1 | Estimate: S | Dependencies: T2.1**
- `articleProcessWorker.js`: receives raw article data from fetchers
- URL normalisation and deduplication (check existing articles by normalised URL)
- Save new articles as DRAFT with `originalContent`
- Enqueue to `article-summarise` queue
- **Test**: duplicate URLs rejected; new articles saved as DRAFT; job enqueued for summarisation

### T2.3: AI Summarisation Worker
**Priority: 1 | Estimate: M | Dependencies: T2.2**
- Refactor `articleSummaryService.js` for new structured output: `{ shortBlurb, longSummary, suggestedCategory, extractedLocation }`
- `articleSummariseWorker.js`: calls AI service, updates Article with summaries
- Auto-assign category from `ArticleCategory` table based on AI suggestion
- Extract location (city/state) from content
- Enqueue to `article-embed` queue
- **Test**: article gets both summaries; category assigned; location extracted; embed job enqueued

### T2.4: Vector Embedding Worker
**Priority: 1 | Estimate: S | Dependencies: T2.3**
- Create `embeddingService.js` using OpenAI `text-embedding-3-small`
- `articleEmbedWorker.js`: generates embedding from title + shortBlurb + longSummary
- Stores embedding in pgvector column
- Sets article status to PUBLISHED, sets publishedAt
- **Test**: embedding stored (1536 dims); article status changed to PUBLISHED

### T2.5: RSS Feed Fetcher
**Priority: 1 | Estimate: S | Dependencies: T2.1**
- Create `server/services/fetchers/rssFetcher.js` using `rss-parser`
- Parse feed, extract: title, content/description, link, image (media:content or enclosure), pubDate
- Add `rss-parser` dependency
- **Test**: parses valid RSS/Atom feeds; handles malformed XML; handles empty feeds; extracts images

### T2.6: NewsAPI.org Fetcher
**Priority: 1 | Estimate: S | Dependencies: T2.1**
- Refactor existing `newsApiService.js` into `server/services/fetchers/newsApiOrgFetcher.js`
- Align with fetcher interface: `fetch(sourceConfig) → [{title, content, url, imageUrl, date, author, sourceName}]`
- Use keywords and filters from source config JSON
- **Test**: returns articles matching config; handles API errors and rate limits

### T2.7: NewsAPI.ai Fetcher
**Priority: 2 | Estimate: S | Dependencies: T2.1**
- Create `server/services/fetchers/newsApiAiFetcher.js`
- REST API integration with keyword/category/location filters
- Map response to standard fetcher output format
- **Test**: returns articles; handles auth errors; handles empty results

### T2.8: Perplexity Fetcher
**Priority: 2 | Estimate: S | Dependencies: T2.1**
- Create `server/services/fetchers/perplexityFetcher.js`
- Use Perplexity `sonar` model search API
- Extract article URLs and content from search results
- **Test**: returns discovered articles; handles API errors

### T2.9: Web Scraper Fetcher
**Priority: 2 | Estimate: M | Dependencies: T2.1**
- Create `server/services/fetchers/scraperFetcher.js`
- Static mode: `cheerio` for HTML parsing with configurable CSS selectors
- Dynamic mode: `puppeteer-core` for JS-rendered pages
- Respect robots.txt, configurable rate limiting
- Add `cheerio` and `puppeteer-core` dependencies
- **Test**: extracts articles from static HTML; handles missing selectors; respects rate limits

### T2.10: Newsletter Fetcher
**Priority: 3 | Estimate: M | Dependencies: T2.1**
- Create `server/services/fetchers/newsletterFetcher.js`
- Set up Resend inbound webhook endpoint: `POST /api/webhooks/inbound-email`
- Parse HTML email body with `cheerio`, extract article links and text
- Follow links to get full article content
- Filter by allowed senders from source config
- **Test**: parses newsletter HTML; extracts links; filters senders; handles malformed email

### T2.11: Social Media Fetcher
**Priority: 3 | Estimate: M | Dependencies: T2.1**
- Create `server/services/fetchers/socialFetcher.js`
- Reddit: use `snoowrap` to monitor configured subreddits, extract linked URLs
- Twitter/X: use `twitter-api-v2` to monitor lists/hashtags (if API access available)
- Follow extracted links to get article content
- Add `snoowrap` dependency (Twitter deferred if API cost is prohibitive)
- **Test**: extracts links from Reddit posts; follows to source; handles rate limits

### T2.12: Manual Entry Fetcher
**Priority: 1 | Estimate: S | Dependencies: T2.1**
- Create `server/services/fetchers/manualFetcher.js`
- Accept URL → fetch page → extract content with `cheerio` (title, body text, image, meta description)
- Accept direct content (admin types article manually)
- **Test**: extracts content from URL; handles unreachable URLs; accepts direct input

---

## Phase 3: Admin Dashboard

### T3.1: Admin API — Source Management
**Priority: 1 | Estimate: M | Dependencies: T2.1**
- `GET /api/admin/sources` — list all with status, counts, last fetch
- `POST /api/admin/sources` — create (validate config per type)
- `GET /api/admin/sources/:id` — detail with recent logs
- `PUT /api/admin/sources/:id` — update config, toggle active
- `DELETE /api/admin/sources/:id` — soft delete or hard delete
- `POST /api/admin/sources/:id/fetch` — trigger immediate fetch job
- `GET /api/admin/sources/:id/logs` — paginated ingestion logs
- All routes require superAdmin auth
- Input validation with express-validator
- **Test**: CRUD operations work; validation rejects bad input; auth enforced; fetch trigger enqueues job

### T3.2: Admin API — Article Management
**Priority: 1 | Estimate: M | Dependencies: T1.2**
- `GET /api/admin/articles` — list with search, filter by status/source/category, pagination
- `PUT /api/admin/articles/:id` — edit title, shortBlurb, longSummary, category, location, featured, status
- `POST /api/admin/articles/manual` — manual entry (URL or direct content), triggers pipeline
- `DELETE /api/admin/articles/:id` — set status ARCHIVED
- `PUT /api/admin/articles/bulk` — bulk status change (publish, archive, delete)
- Re-embed article on summary edit (enqueue to `article-embed` queue)
- **Test**: CRUD works; bulk actions work; re-embedding triggered on edit; auth enforced

### T3.3: Admin API — Dashboard Stats
**Priority: 2 | Estimate: S | Dependencies: T3.1, T3.2**
- `GET /api/admin/dashboard` — returns:
  - Total articles (24h, 7d, 30d)
  - Articles per source
  - Error rate per source
  - Per-source health (last success, consecutive failures)
- **Test**: stats aggregate correctly; empty state handled

### T3.4: Admin Frontend — Layout + Navigation
**Priority: 1 | Estimate: S | Dependencies: T1.1**
- Create `AdminLayout.tsx` with sidebar navigation
- Routes: Dashboard, Sources, Articles, Social Posts, Monitor
- Sidebar styled with `brand.primary` background, `brand.gold` active state
- Responsive: sidebar collapses to hamburger on mobile
- **Test**: navigation between admin pages works; active state highlights correctly

### T3.5: Admin Frontend — Source Management UI
**Priority: 1 | Estimate: L | Dependencies: T3.1, T3.4**
- `SourceList.tsx`: table with columns (name, type, status, last fetch, article count, actions)
- Status indicators: green (active/healthy), yellow (active/errors), red (failed), grey (paused)
- `SourceEditor.tsx`: dynamic form that changes fields based on source type
  - RSS: feed URL
  - NewsAPI.org: keywords, country, category
  - NewsAPI.ai: keywords, categories, source locations
  - Perplexity: search queries
  - Scraper: target URL, CSS selectors, headless toggle
  - Newsletter: inbound email, allowed senders
  - Social: platform, subreddits/lists/hashtags
- Schedule picker (cron expression or preset intervals)
- Test source button (triggers fetch, shows results)
- **Test**: add/edit/delete sources of each type; form validates; test fetch works

### T3.6: Admin Frontend — Article Management UI
**Priority: 1 | Estimate: M | Dependencies: T3.2, T3.4**
- `ArticleList.tsx`: table with search, status filter, source filter, category filter
- Columns: title (truncated), source, status, category, location, date, views, actions
- Inline status toggle dropdown
- Bulk select + bulk action bar (publish, archive, delete)
- `ArticleEditor.tsx`: edit title, short blurb (with char count), long summary (markdown), category dropdown, location input, featured toggle, status
- Show source URL (read-only, clickable)
- Show original content in collapsible section
- **Test**: list loads with filters; edit saves and re-embeds; bulk actions work

### T3.7: Admin Frontend — Ingestion Monitor
**Priority: 2 | Estimate: M | Dependencies: T3.3, T3.4**
- `Dashboard.tsx`: stat cards (total articles, new today, active sources, error count)
- `IngestionMonitor.tsx`: per-source health table with expandable log rows
- Simple bar chart for articles-per-day (last 30 days) — use `recharts` or plain SVG
- `IngestionLogViewer.tsx`: filterable log table per source
- **Test**: stats display correctly; logs paginate; chart renders

---

## Phase 4: Public Frontend

### T4.1: Public API — Article Feed
**Priority: 1 | Estimate: M | Dependencies: T1.2, T2.4**
- Refactor `GET /api/articles` (rename from `/api/public/articles`):
  - Pagination: cursor-based for infinite scroll
  - Filters: `location`, `category`, `dateFrom`, `dateTo`, `search`
  - When `search` param present: generate query embedding, use pgvector cosine similarity
  - When no search: standard query, ordered by publishedAt DESC
  - Featured articles first (separate query or flag in response)
  - Response: `{ articles: [...], nextCursor, hasMore }`
- `GET /api/articles/:slug` — full article detail, increment viewCount
- `GET /api/articles/:slug/related` — top 5 by vector similarity
- `GET /api/categories` — list active categories
- `GET /api/locations` — list known locations from articles
- **Test**: pagination works; filters combine correctly; semantic search returns relevant results; viewCount increments; related articles returned

### T4.2: Homepage — Public Feed
**Priority: 1 | Estimate: L | Dependencies: T4.1**
- `PublicFeed.tsx`: replaces current `PublicArticlesGrid`
- Sticky header: PropertyHack logo (left), search input (center), filter toggles (right), admin login link
- `SearchFilterBar.tsx`: keyword input (debounced 300ms), location pill (auto-detected), category dropdown, date range
- `ArticleCard.tsx`: headline image (with fallback gradient), title, short blurb (2-3 lines), source name, date, location tag
- Featured cards: full-width, gold border (`brand.gold`), larger image
- Infinite scroll with `useInfiniteQuery` — load next page at 200px from bottom
- Skeleton loading states (card placeholders during load)
- Mobile: single column; Tablet: 2 columns; Desktop: 3 columns
- Empty state for no results
- Add `@tanstack/react-query` dependency
- **Test**: cards render with all fields; infinite scroll loads more; filters update feed; skeleton shows during load; responsive layout works

### T4.3: Article Detail Page
**Priority: 1 | Estimate: M | Dependencies: T4.1**
- `ArticleDetail.tsx`: full-width headline image, title, long summary (rendered markdown), source attribution with link, publish date, category + location tags
- `RelatedArticles.tsx`: horizontal scroll of 3-5 similar article cards (from vector similarity endpoint)
- Share buttons: copy link, Twitter, Facebook, LinkedIn (simple URL-based sharing, no API)
- Back button / breadcrumb to homepage
- Prefetch on card hover (React Query prefetchQuery)
- **Test**: renders full summary; source link works; related articles show; share buttons generate correct URLs; back navigation works

### T4.4: Location Detection
**Priority: 1 | Estimate: S | Dependencies: T4.2**
- `LocationDetector.tsx` / `useLocation.ts` hook:
  - On first visit: request `navigator.geolocation.getCurrentPosition()`
  - On decline/failure: call `https://ip-api.com/json/` for IP-based location
  - Map coordinates/IP result to nearest Australian city/state
  - Store in localStorage as `{ city, state, lat, lng }`
  - Expose as filter param to article API
- Location pill in search bar shows detected city, click to open location picker
- Location picker: list of Australian states/cities, or "All Australia"
- Override persisted in localStorage
- **Test**: geolocation success → filter applied; geolocation denied → IP fallback; override persists on reload; "All Australia" clears filter

### T4.5: App Router + Cleanup
**Priority: 1 | Estimate: S | Dependencies: T4.2, T4.3**
- Rewrite `App.tsx` routing:
  - `/` → PublicFeed
  - `/article/:slug` → ArticleDetail
  - `/login` → LoginPage (simplified)
  - `/admin/*` → AdminLayout (protected, redirect to /login if not authed)
- Remove all legacy routes and component imports
- Set up React Query provider at app root
- **Test**: all routes resolve correctly; admin routes redirect when not authed; 404 for unknown routes

---

## Phase 5: Social Media Publishing

### T5.1: Social Media Post API
**Priority: 2 | Estimate: M | Dependencies: T1.2**
- `GET /api/admin/social-posts` — list with status filter, pagination
- `POST /api/admin/social-posts` — create draft post
- `GET/PUT/DELETE /api/admin/social-posts/:id` — CRUD
- `POST /api/admin/social-posts/:id/publish` — enqueue to `social-publish` queue
- Create `social-publish` BullMQ queue + worker
- **Test**: CRUD works; publish enqueues job; auth enforced

### T5.2: Social Platform Adapters
**Priority: 2 | Estimate: L | Dependencies: T5.1**
- Create `server/services/social/` directory
- `twitterAdapter.js`: Twitter API v2 — create tweet with optional image + link
- `facebookAdapter.js`: Graph API — post to page with image + link
- `linkedinAdapter.js`: Share API v2 — create share post
- `instagramAdapter.js`: Graph API via Facebook — post image with caption
- Each adapter: `publish(post, credentials) → { platformPostId, url }`
- Each adapter: `preview(post) → { characterCount, mediaSupport, formattedContent }`
- Platform credentials stored as env vars
- `socialPublishWorker.js`: calls appropriate adapter, updates `SocialPost.platformResults`
- **Test**: each adapter formats correctly; handles API errors; worker updates post status

### T5.3: Social Media Post UI
**Priority: 2 | Estimate: M | Dependencies: T5.1, T3.4**
- `SocialPostList.tsx`: table with status, platforms, date, actions
- `SocialPostEditor.tsx`:
  - Content textarea with character count (per-platform limits shown)
  - Image upload/URL input
  - Platform checkboxes (Twitter, Facebook, LinkedIn, Instagram)
  - Optional link to PropertyHack article (dropdown selector)
  - Per-platform preview tabs showing formatted post
  - Schedule for later (date/time picker) or publish now
- **Test**: create post; select platforms; preview shows per-platform formatting; publish triggers job

---

## Phase 6: Testing

### T6.1: Test Infrastructure Setup
**Priority: 1 | Estimate: S | Dependencies: T1.3**
- Add `vitest` to both root and server package.json
- Create `vitest.config.ts` (root — frontend tests)
- Create `server/vitest.config.js` (backend tests)
- Add `@playwright/test` to dev dependencies
- Create `playwright.config.ts` with base URL, browser config
- Add `msw` for API mocking in frontend tests
- Add `supertest` for backend integration tests
- Create test helper utilities: DB setup/teardown, auth token generation, mock factories
- Add test scripts to package.json: `test`, `test:unit`, `test:integration`, `test:e2e`, `test:coverage`
- **Test**: `npm test` runs and reports (even if no tests yet)

### T6.2: Backend Unit Tests — Fetchers
**Priority: 1 | Estimate: L | Dependencies: T2.5-T2.12, T6.1**
- Test each fetcher with mocked HTTP responses:
  - `rssFetcher.test.js`: valid RSS, Atom, malformed XML, empty feed, encoding, missing fields
  - `newsApiOrgFetcher.test.js`: success, rate limit (429), API error, empty results, auth error
  - `newsApiAiFetcher.test.js`: same patterns
  - `perplexityFetcher.test.js`: same patterns
  - `scraperFetcher.test.js`: static HTML, missing selectors, timeout, robots.txt blocked
  - `socialFetcher.test.js`: Reddit success, empty subreddit, rate limit
  - `newsletterFetcher.test.js`: HTML email parsing, link extraction, sender filtering
  - `manualFetcher.test.js`: URL fetch, content extraction, invalid URL, unreachable
- **Coverage target: >90% for all fetcher modules**

### T6.3: Backend Unit Tests — Services
**Priority: 1 | Estimate: M | Dependencies: T2.3, T2.4, T6.1**
- `articleSummaryService.test.js`: mock Gemini API, verify prompt, parse structured output, handle API error
- `embeddingService.test.js`: mock OpenAI API, verify 1536 dimensions, handle API error
- `perplexityService.test.js`: mock API, verify query format, parse results
- Deduplication logic tests: URL normalisation edge cases (trailing slashes, query params, fragments, protocol)
- **Coverage target: >80%**

### T6.4: Backend Integration Tests — API
**Priority: 1 | Estimate: L | Dependencies: T3.1, T3.2, T4.1, T6.1**
- Use supertest + test database
- `publicArticles.test.js`:
  - Pagination (cursor-based), default sort, location filter, category filter, date range
  - Semantic search with mock embeddings
  - Article detail (slug lookup, viewCount increment, 404)
  - Related articles endpoint
  - Combined filters
- `adminSources.test.js`:
  - CRUD all source types, validation errors, auth (401/403), fetch trigger
- `adminArticles.test.js`:
  - List with filters, edit (re-embed triggered), manual create, bulk actions
- `adminSocialPosts.test.js`:
  - CRUD, publish trigger
- `auth.test.js`:
  - Login success/failure, token refresh, logout, expired token
- **Coverage target: >80% for all route handlers**

### T6.5: Frontend Unit Tests
**Priority: 2 | Estimate: M | Dependencies: T4.2, T4.3, T4.4, T6.1**
- `ArticleCard.test.tsx`: renders fields, missing image fallback, blurb truncation, click navigation
- `SearchFilterBar.test.tsx`: debounced search, filter selection, clear filters, combined state
- `LocationDetector.test.tsx`: geolocation success, denial, IP fallback, localStorage persistence
- `ArticleDetail.test.tsx`: renders summary, source link, related articles, share buttons
- **Coverage target: >80% for all components**

### T6.6: E2E Tests — Public Flows
**Priority: 1 | Estimate: L | Dependencies: T4.5, T6.1**
- `homepage.spec.ts`:
  - Page loads within 2s (performance assertion)
  - Article cards display with image, title, blurb, date
  - Infinite scroll loads more articles
  - Featured article has gold border and full-width layout
- `search-filter.spec.ts`:
  - Keyword search returns results and clears
  - Location filter applies and persists on reload
  - Category filter narrows results
  - Date range filter works
  - Combined filters
  - No results empty state
- `article-detail.spec.ts`:
  - Click card → navigates to detail
  - Full summary displayed
  - Source link present and clickable
  - Related articles visible
  - Back navigation returns to feed with scroll position
- `location-detection.spec.ts`:
  - Mock geolocation → filter applied automatically
  - Deny geolocation → IP fallback
  - Override location → persists on reload

### T6.7: E2E Tests — Admin Flows
**Priority: 1 | Estimate: L | Dependencies: T3.5, T3.6, T6.1**
- `admin-login.spec.ts`:
  - Valid credentials → admin dashboard
  - Invalid credentials → error message
  - Protected routes redirect to /login
  - Logout → redirected
- `admin-sources.spec.ts`:
  - Add RSS feed source (fill form, save, appears in list)
  - Edit source config
  - Toggle active/inactive
  - Delete with confirmation
  - Trigger manual fetch
  - View source logs
- `admin-articles.spec.ts`:
  - View article list with filters
  - Edit article summary (save + verify change)
  - Change status (draft → published → archived)
  - Set featured flag
  - Bulk archive selection

### T6.8: Vector Search Tests
**Priority: 2 | Estimate: S | Dependencies: T2.4, T6.1**
- Seed test articles with known embeddings
- Verify semantic relevance (search "Sydney apartments" returns Sydney-related articles)
- Verify ordering by similarity score
- Verify combined with location/category filters
- Verify related articles returns similar content
- Empty results handled gracefully

### T6.9: Load Tests
**Priority: 3 | Estimate: S | Dependencies: T4.1, T6.1**
- Install k6 or artillery
- `publicFeed.load.js`: 100 concurrent users, homepage + infinite scroll, target p95 <500ms
- `search.load.js`: 50 concurrent searches, target p95 <1s
- Run against staging/local Docker environment
- Document results and bottlenecks

---

## Phase Summary

| Phase | Tasks | Focus |
|---|---|---|
| **Phase 1** | T1.1–T1.5 | Clean slate: remove legacy, new schema, Docker infra, auth |
| **Phase 2** | T2.1–T2.12 | Ingestion engine: pipeline, workers, all 7 fetchers |
| **Phase 3** | T3.1–T3.7 | Admin dashboard: source/article/monitor management |
| **Phase 4** | T4.1–T4.5 | Public frontend: feed, detail page, location, routing |
| **Phase 5** | T5.1–T5.3 | Social media posting (manual) |
| **Phase 6** | T6.1–T6.9 | Comprehensive testing suite |

### Execution Order (dependency-aware)

**Wave 1** (parallel): T1.1, T1.3, T6.1
**Wave 2** (parallel): T1.2, T1.4 (after T1.1 + T1.3)
**Wave 3** (parallel): T1.5, T2.1, T3.4 (after T1.2)
**Wave 4** (parallel): T2.2, T2.5, T2.6, T2.12 (after T2.1)
**Wave 5** (parallel): T2.3, T2.7, T2.8, T2.9 (after T2.2)
**Wave 6** (parallel): T2.4, T2.10, T2.11, T3.1 (after T2.3)
**Wave 7** (parallel): T3.2, T3.3, T4.1 (after T2.4 + T3.1)
**Wave 8** (parallel): T3.5, T3.6, T4.2 (after T3.1/T3.2 + T4.1)
**Wave 9** (parallel): T3.7, T4.3, T4.4, T5.1 (after T4.2)
**Wave 10** (parallel): T4.5, T5.2, T5.3 (after T4.3 + T5.1)
**Wave 11** (parallel): T6.2, T6.3, T6.4, T6.5 (after code complete)
**Wave 12** (parallel): T6.6, T6.7, T6.8, T6.9 (after unit/integration tests)

### Size Key
- **S** = small (1-2 files, straightforward)
- **M** = medium (3-5 files, some complexity)
- **L** = large (5+ files, significant complexity)
