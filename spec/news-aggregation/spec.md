# Spec: Property News Aggregation Platform

## Problem

Property professionals, investors, and enthusiasts need a single place to follow property news across Australia (and eventually other markets). Currently, news is scattered across dozens of RSS feeds, newsletters, social media accounts, and niche sites. PropertyHack solves this by aggregating, summarising, and presenting property news in one clean, fast, location-aware feed.

## Personas

### Platform Owner (Dan)
- Logs in as superAdmin
- Manages all news sources (RSS, scrapers, APIs, newsletters, social monitors)
- Reviews and edits AI-generated article summaries
- Creates social media posts promoting articles
- Monitors ingestion health and errors

### Anonymous Reader
- Lands on homepage, sees property news cards
- Location auto-detected, feed filtered to relevant area
- Can search, filter by category/location/date
- Clicks through to read full AI summary with source link
- No account needed

## Branding

PropertyHack's visual identity is **cream, black, and gold** — clean, premium, fast.

| Token | Value | Usage |
|---|---|---|
| `brand.primary` | `#2b2b2b` | Backgrounds, headers, cards |
| `brand.secondary` | `#3a3a3a` | Secondary surfaces |
| `brand.accent` / `brand.gold` | `#d4b038` | Accent borders, buttons, highlights |
| `base.100` | `#ffffff` | Card backgrounds |
| `base.200` | `#f0f0f0` | Page background (cream tone) |
| Dark mode body | `#13161d` | Dark mode background |

All new UI must use these tokens. No new colors. Gold accents for interactive elements, black/dark surfaces for contrast, cream/white for content areas.

## Legacy Cleanup

All references to "QUORD" must be removed from the entire codebase — code, comments, config, docs, env vars, service names. The product is **PropertyHack** only. This includes:
- `render.yaml` service names (`quord-api` -> `propertyhack-api`, etc.)
- `.env` variables (`QUORD_*` -> remove or rename)
- Code comments referencing QUORD
- `RESEND_FROM_EMAIL` -> `noreply@propertyhack.com` (or appropriate domain)
- LinkedIn OAuth legacy code -> remove entirely

## Features

### F1: Multi-Source News Ingestion Engine

Seven aggregation methods, all configurable from the admin UI:

#### F1.1: RSS Feed Polling
- Admin adds RSS feed URL + name + category + market/location tags
- Background worker polls feeds on configurable schedule (default: every 30 min)
- Parses entries, extracts title/content/image/date/URL
- Deduplicates by URL (normalized)
- **Acceptance**: Admin adds an RSS feed URL -> articles appear in feed within one polling cycle

#### F1.2: NewsAPI.org Integration
- Already partially implemented in `server/services/newsApiService.js`
- Refactor to fit new ingestion pipeline architecture
- Query property-related news by keyword, category, location
- Scheduled fetches with configurable keywords per market
- **Acceptance**: NewsAPI source configured -> property articles fetched and summarised automatically

#### F1.3: NewsAPI.ai Integration
- Premium news aggregation API with better coverage and filtering
- Configure search queries, categories, location filters
- Scheduled fetches aligned with other sources
- **Acceptance**: NewsAPI.ai source returns articles that appear in the feed with proper attribution

#### F1.4: Perplexity API Integration
- Use Perplexity's search API to discover and summarise property news
- Particularly useful for finding news not covered by RSS/NewsAPI
- Can provide pre-summarised content that we further process
- **Acceptance**: Perplexity source configured -> unique articles discovered and added to feed

#### F1.5: Newsletter Ingestion
- Dedicated inbound email address receives property newsletters
- Webhook parses email content, extracts article links and text
- Follows links to get full article content for summarisation
- **Acceptance**: Email sent to ingest address -> articles extracted and appear in feed

#### F1.6: Web Scraping
- Admin configures target URL + CSS selectors (or headless mode) + schedule
- Respects robots.txt, rate limits requests
- Extracts article data from configured page structure
- **Acceptance**: Scraper config added -> articles scraped on schedule and appear in feed

#### F1.7: Social Media Monitoring
- Monitor Reddit subreddits (r/AusProperty, r/AusFinance, etc.) for property news links
- Monitor Twitter/X lists or hashtags (where API access permits)
- Extract shared links, follow to source, ingest article
- **Acceptance**: Social monitor configured -> linked articles from monitored sources appear in feed

#### F1.8: Manual Entry
- Admin pastes a URL -> system fetches and summarises
- Admin writes article directly in editor
- **Acceptance**: Admin pastes URL -> article created with AI summary

### F2: AI Summarisation Pipeline

- Every ingested article processed through AI summarisation:
  - **Short blurb** (~50 words) for card display
  - **Long summary** (~300 words) for article detail page
  - **Category auto-tagging** based on content
  - **Location extraction** from content (city, state, market)
- Platform owner can edit any summary from the admin article editor
- Source URL always preserved and prominently displayed
- **Acceptance**: Raw article ingested -> AI generates both summaries -> admin can edit either -> source link visible on detail page

### F3: Vector Embeddings (pgvector)

- All article summaries embedded using OpenAI embeddings API
- Stored in PostgreSQL via pgvector extension
- Powers semantic search on the public feed
- Foundation for future deep-research features
- Re-embed on summary edit
- **Acceptance**: User searches "interest rate changes Sydney" -> returns semantically relevant articles, not just keyword matches

### F4: Public News Feed (Homepage)

- Card-based responsive grid layout
- Each card: headline image (with fallback), title, short blurb, source name, date, location tag
- Infinite scroll pagination
- Featured articles highlighted (full-width card, gold border)
- Sticky header with search bar + filter controls
- Filters: keyword search (semantic via pgvector), location (auto-detected + override), category, date range
- Sort: newest first (default), relevance (when searching)
- Fast: target <2s initial load, <500ms filter changes
- **Acceptance**: Homepage loads <2s, shows location-relevant articles, search returns semantic results, filters update instantly

### F5: Article Detail Page

- Full AI-generated long summary
- Headline image (full-width)
- Source attribution with clickable link to original
- Publication date, category tags, location tags
- Related articles sidebar/section (via vector similarity)
- Share buttons (copy link, Twitter, Facebook, LinkedIn)
- Clean reading experience — no clutter
- **Acceptance**: Click card -> detail page loads with full summary, source link works, related articles shown

### F6: Location Detection & Filtering

- On first visit: request browser geolocation (with user consent prompt)
- Fallback: IP-based geolocation (free service like ip-api.com)
- Map coordinates to nearest city/state
- Apply as default filter (user sees local news first)
- Location pill in filter bar shows detected location, click to change
- Override persisted in localStorage
- Works for anonymous visitors (no account needed)
- **Acceptance**: New visitor -> location detected -> feed shows local articles -> user changes location -> feed updates -> preference persists on reload

### F7: Admin Dashboard

#### F7.1: Source Management
- List all sources with status (active/paused/error), type, last fetch time, article count
- Add/edit/delete sources of any type (RSS, API, scraper, newsletter, social)
- Toggle active/paused per source
- View error logs per source
- Test source (fetch now) button
- **Acceptance**: Admin can CRUD all source types, see status, trigger manual fetch

#### F7.2: Article Management
- Table view of all articles with search, filter by status/source/category
- Inline status toggle (draft/published/archived)
- Edit article: modify title, short blurb, long summary, category, location, featured flag
- Bulk actions: publish, archive, delete
- **Acceptance**: Admin can find, edit, and manage any article

#### F7.3: Ingestion Monitor
- Dashboard showing: total articles (24h, 7d, 30d), articles per source, error rate
- Per-source health: last successful fetch, consecutive failures, error messages
- **Acceptance**: Admin can see system health at a glance

#### F7.4: Social Media Post Management
- Create posts for: Twitter/X, Facebook, LinkedIn, Instagram
- Post editor with character count, image attachment, link preview
- Select which platforms to post to
- Preview per platform
- Post queue (draft, scheduled, published)
- **Acceptance**: Admin creates a post, selects platforms, previews, publishes

## Data Model

### Core Models (new/refactored)

```
IngestionSource
  id            UUID
  name          String
  type          Enum(RSS, NEWSAPI_ORG, NEWSAPI_AI, PERPLEXITY, NEWSLETTER, SCRAPER, SOCIAL, MANUAL)
  config        JSON          // type-specific config (URL, selectors, keywords, etc.)
  market        String        // AU, US, UK, etc.
  category      String?       // default category for articles from this source
  schedule      String?       // cron expression
  isActive      Boolean
  lastFetchAt   DateTime?
  lastError     String?
  errorCount    Int
  articleCount  Int
  createdAt     DateTime
  updatedAt     DateTime

Article (refactored from existing)
  id            UUID
  sourceId      UUID -> IngestionSource
  sourceUrl     String        // original article URL (always required)
  title         String
  shortBlurb    String        // ~50 word AI summary for cards
  longSummary   String        // ~300 word AI summary for detail page
  originalContent Text?       // raw scraped/fetched content
  imageUrl      String?
  imageAltText  String?
  slug          String @unique
  category      String
  location      String?       // city/state extracted from content
  market        String        // AU, US, UK, etc.
  status        Enum(DRAFT, PUBLISHED, ARCHIVED)
  isFeatured    Boolean
  viewCount     Int
  publishedAt   DateTime?
  embedding     Vector(1536)  // pgvector
  metadata      JSON?         // extra data (author, tags, etc.)
  createdAt     DateTime
  updatedAt     DateTime

SocialPost
  id            UUID
  content       String
  imageUrl      String?
  platforms     String[]      // ["twitter", "facebook", "linkedin", "instagram"]
  articleId     UUID? -> Article   // optional link to article
  status        Enum(DRAFT, SCHEDULED, PUBLISHED, FAILED)
  scheduledFor  DateTime?
  publishedAt   DateTime?
  platformResults JSON?       // per-platform post IDs and status
  createdAt     DateTime
  updatedAt     DateTime

IngestionLog
  id            UUID
  sourceId      UUID -> IngestionSource
  status        Enum(SUCCESS, PARTIAL, FAILED)
  articlesFound Int
  articlesNew   Int
  errorMessage  String?
  duration      Int           // ms
  createdAt     DateTime
```

### Models to Remove (legacy QUORD)
- `DraftPost`, `ScheduledPost`, `PublishedPost` (LinkedIn posting)
- `EmailResponse` (email-to-draft workflow)
- `NewsArticle` (replaced by refactored `Article`)
- `UserSettings` fields related to LinkedIn (tone, industry, audience, etc.)
- `PromptTemplate` (replace with system-level AI config)

### Models to Keep
- `User` (simplified — just admin auth fields)
- `SystemPrompt` (useful for managing AI summarisation prompts)

## API Endpoints

### Public (no auth)
- `GET /api/articles` — paginated feed with filters (search, location, category, dateRange, sort)
- `GET /api/articles/:slug` — single article detail (increments viewCount)
- `GET /api/articles/:slug/related` — related articles via vector similarity
- `GET /api/categories` — list categories
- `GET /api/locations` — list known locations/markets

### Admin (superAdmin auth required)
- `GET/POST /api/admin/sources` — list/create ingestion sources
- `GET/PUT/DELETE /api/admin/sources/:id` — manage individual source
- `POST /api/admin/sources/:id/fetch` — trigger immediate fetch
- `GET /api/admin/sources/:id/logs` — fetch logs for source
- `GET/PUT/DELETE /api/admin/articles` — article CRUD (bulk actions via PUT with array)
- `POST /api/admin/articles/manual` — manual article entry (URL or direct)
- `GET/POST /api/admin/social-posts` — social post management
- `GET/PUT/DELETE /api/admin/social-posts/:id` — individual social post
- `POST /api/admin/social-posts/:id/publish` — publish to selected platforms
- `GET /api/admin/dashboard` — ingestion stats and health

### Auth
- `POST /api/auth/login` — admin login (email + password)
- `POST /api/auth/refresh` — refresh JWT
- `POST /api/auth/logout`

(Remove: register, forgot-password, OTP, verify-email — admin-only for v1)
