# Proposal: Property News Aggregation Platform

## What Is This?

Refactor PropertyHack from a LinkedIn content scheduling tool into a **property news aggregation platform**. The site collects property news from multiple sources (RSS, newsletters, scraping, social media), uses AI to summarise articles, and presents them in a clean, fast, location-aware news feed.

## Why Now?

The existing QUORD/LinkedIn tooling is legacy — the product direction has shifted to property news. The current codebase has stub models for articles, sources, and markets but no working ingestion pipeline, no admin management UI, and no user-facing search/filter experience.

## What's In Scope (v1)

### 1. Multi-Source News Ingestion
Five aggregation methods, all manageable by the platform owner from the admin UI:

| Method | How It Works |
|---|---|
| **RSS Feeds** | Poll configured RSS feed URLs on a schedule. Parse entries, deduplicate by URL. |
| **Newsletter Ingestion** | Dedicated inbound email address (via Resend/webhook). Parse incoming newsletters, extract article links + content. |
| **Web Scraping** | Configurable scraper targets (URL + CSS selectors or headless browser). Scheduled runs with rate limiting. |
| **Social Media Monitoring** | Monitor Twitter/X lists, Reddit subreddits, and Facebook groups for property news links. Extract and follow links. |
| **Manual Entry** | Admin can paste a URL or write an article directly. |

### 2. AI Summarisation + Vector Storage
- Every ingested article gets an AI-generated summary (short blurb + longer summary)
- Platform owner can edit any AI summary from the admin UI
- All articles embedded into a vector database (pgvector) for semantic search and future deep-research features
- Source URL always preserved and displayed

### 3. Public News Feed (Homepage)
- Clean, fast, card-based layout with infinite scroll
- Each card: headline image, title, short blurb, source attribution, publish date, location tag
- Sticky search/filter bar: keyword search, location filter, category filter, date range
- Clicking a card opens a full article page with the longer AI summary + source link
- Mobile-first responsive design

### 4. Location-Aware Personalisation
- Auto-detect user location via browser geolocation API (with fallback to IP geolocation)
- Default filter to articles relevant to user's detected area (state/city level)
- User can override location filter at any time
- Works for both anonymous and logged-in users

### 5. Admin Dashboard (Platform Owner)
- **Source Management**: Add/edit/delete/toggle RSS feeds, scraper configs, newsletter endpoints, social monitors
- **Article Management**: View all articles, edit summaries, change status (draft/published/archived), set featured
- **Ingestion Monitor**: See last fetch time, success/failure counts, error logs per source
- **Social Media Publishing**: Create and manage posts to multiple platforms (Twitter/X, Facebook, LinkedIn, Instagram) with preview. Future: auto-generate posts from articles linking back to site.

### 6. Testing Strategy
- Unit tests for all ingestion parsers (RSS, email, scraper, social)
- Integration tests for API endpoints (auth, articles CRUD, public feed, admin)
- E2E tests with Playwright (homepage load, search/filter, article detail, admin flows)
- Vector search accuracy tests
- Ingestion pipeline tests with mock data
- Load testing for public feed endpoints
- CI pipeline runs all tests on every PR

## What's Explicitly Deferred

- **Paywall / subscriptions** — Stripe integration exists but subscription gating deferred
- **Deep research reports** — monthly location-based reports, deferred
- **User accounts for readers** — anonymous access first; login only needed for admin
- **Email digest / notifications** — future feature
- **Automated social media posting** — v1 is manual post creation; automation deferred

## Affected Areas

| Area | Impact |
|---|---|
| **Database** | New tables for ingestion sources, scraper configs, social monitors, vector embeddings. Repurpose existing Article/ArticleSource/Market models. Remove or archive legacy QUORD models. |
| **Backend** | New ingestion workers, admin API, vector search endpoint, social media posting API. Remove legacy LinkedIn/post routes. |
| **Frontend** | New homepage, article detail page, admin dashboard. Remove legacy dashboard, drafts, scheduling UI. |
| **Auth** | Simplify — only admin login needed for v1. Remove user registration flow. |
| **Infrastructure** | Migrate from Vercel + Render to single Vultr VPS (Sydney). Docker Compose with Caddy, Express, PostgreSQL (pgvector), Redis. |

## Breaking Risk

**High** — this is a full pivot. All existing API contracts change. No existing user data to preserve (seed data only). The legacy QUORD models can be archived/removed. Deployment moves from Vercel + Render to a single Vultr VPS in Sydney running Docker Compose.

## Acceptance Criteria

1. Platform owner can log in, add an RSS feed, and see articles appear within minutes
2. Platform owner can add scraper, newsletter, and social media sources
3. Platform owner can edit any article's AI summary
4. Homepage loads in <2s, displays article cards with search/filter
5. Clicking a card shows full summary with source link
6. Location auto-detected and filters applied on first visit
7. Admin can create social media posts with preview
8. All ingestion methods have unit tests with >80% coverage
9. E2E tests cover: homepage, search, article detail, admin source management, admin article editing
10. Vector search returns semantically relevant results for keyword queries
