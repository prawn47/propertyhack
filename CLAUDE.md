# PropertyHack — Project Instructions

## What This Is
Property news aggregation platform. Collects property news from multiple sources (RSS, NewsAPI.org, NewsAPI.ai, Perplexity, scraping, newsletters, social media), AI-summarises articles, and serves them in a clean, fast, location-aware news feed.

## Architecture

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Backend | Express 5 + Node.js (JavaScript) |
| Database | PostgreSQL 16 + pgvector (vector search) |
| ORM | Prisma |
| Job Queue | BullMQ + Redis |
| AI (summaries) | Google Gemini 2.0 Flash |
| AI (embeddings) | OpenAI text-embedding-3-small (1536 dims) |
| Reverse Proxy | Caddy (auto-HTTPS) |
| Hosting | Vultr VPS, Sydney region, Docker Compose |

## Project Structure

```
propertyhack/
├── App.tsx                     # Root React component (routing)
├── components/
│   ├── layout/                 # Header, Footer, AdminLayout
│   ├── public/                 # PublicFeed, ArticleCard, ArticleDetail, SearchFilterBar
│   ├── admin/                  # Dashboard, SourceList/Editor, ArticleList/Editor, Social
│   └── shared/                 # Pagination, LoadingSpinner, EmptyState
├── services/                   # Frontend API clients
├── hooks/                      # useArticles, useLocation, useAdmin
├── contexts/                   # AuthContext (admin-only JWT)
├── server/
│   ├── index.js                # Express entry + BullMQ workers
│   ├── prisma/schema.prisma    # Database schema
│   ├── routes/
│   │   ├── auth.js             # Login, refresh, logout
│   │   ├── public/articles.js  # Public feed + search + detail
│   │   └── admin/              # sources, articles, socialPosts, dashboard
│   ├── services/
│   │   ├── fetchers/           # rssFetcher, newsApiOrg, newsApiAi, perplexity, scraper, newsletter, social, manual
│   │   ├── social/             # twitter, facebook, linkedin, instagram adapters
│   │   ├── articleSummaryService.js
│   │   └── embeddingService.js
│   ├── workers/                # sourceFetch, articleProcess, articleSummarise, articleEmbed, socialPublish
│   ├── queues/                 # BullMQ queue definitions + Redis connection
│   └── jobs/ingestionScheduler.js
├── docker-compose.yml
├── Caddyfile
├── spec/news-aggregation/      # proposal.md, spec.md, design.md, tasks.md
└── .beads/                     # Task tracking (Dolt-backed)
```

## Key Conventions

### Branding — DO NOT CHANGE
- `brand.primary`: `#2b2b2b` (near-black)
- `brand.secondary`: `#3a3a3a` (dark grey)
- `brand.accent` / `brand.gold`: `#d4b038` (gold)
- `base.100`: `#ffffff` (white)
- `base.200`: `#f0f0f0` (cream/light grey)
- Gold accents on buttons, active states, featured cards, links
- Dark surfaces on header, admin sidebar, footer
- Light surfaces on content areas, card backgrounds
- All defined in `tailwind.config.js` — use tokens, never hardcode colors

### QUORD — NEVER REFERENCE
The product was previously called QUORD. All references have been (or must be) removed. Never use "QUORD" anywhere — code, comments, config, docs. The product is **PropertyHack**.

### Code Style
- Backend: JavaScript (ES modules where existing, CommonJS where existing — don't mix)
- Frontend: TypeScript + React
- No unnecessary abstractions — keep it simple
- Validate at API boundaries only (express-validator)
- Parameterized queries via Prisma only — no raw SQL concatenation
- Rate-limit all public endpoints

### Database
- All schema changes via Prisma migrations — never alter tables directly
- pgvector for article embeddings (1536 dimensions, cosine similarity)
- Article deduplication by normalised URL

### Ingestion Pipeline
- 5-stage BullMQ pipeline: fetch → process → summarise → embed → publish
- Each fetcher implements: `async fetch(sourceConfig) → [{title, content, url, imageUrl, date, author, sourceName}]`
- Source config is JSON in IngestionSource.config — schema varies by type
- Scheduler (node-cron) checks IngestionSource records and enqueues due sources

### Auth
- Admin-only for v1 (no user registration)
- JWT access token (15min) + refresh token (7 days)
- superAdmin flag on User model gates all `/api/admin/*` routes

### Testing
- Unit tests: Vitest + mocked HTTP (msw)
- Integration tests: Vitest + Supertest + test DB
- E2E tests: Playwright
- Coverage target: >80% for all API and ingestion code
- Run `npm test` before any PR

## Deployment

### Local Dev
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```
Frontend: Vite dev server (port 3004)
Backend: Express (port 3001)
Postgres: port 5432
Redis: port 6379

### Production (Vultr Sydney)
```bash
npm run build              # Vite → frontend-dist/
docker compose up -d --build
```
Caddy handles HTTPS (Let's Encrypt) and serves static files + reverse proxies API.

## Common Commands

```bash
# Database
cd server && npx prisma migrate dev       # Create migration
cd server && npx prisma generate          # Regenerate client
cd server && npx prisma studio            # Visual DB browser

# Testing
npm run test                # All tests
npm run test:unit           # Unit only
npm run test:integration    # Integration only
npm run test:e2e            # Playwright E2E

# Beads
bd list                     # Show all tasks
bd dep                      # Show dependency graph
bd update <id> --status=in_progress
bd update <id> --status=done
```

## Spec Reference
Full spec files in `/spec/news-aggregation/`:
- `proposal.md` — problem, scope, acceptance criteria
- `spec.md` — features, data model, API endpoints
- `design.md` — architecture, pipeline, components, testing strategy
- `tasks.md` — 38 tasks across 6 phases with dependencies

## Deferred (Not in v1)
- Paywall / Stripe subscription gating
- Deep research reports (monthly, location-based)
- User accounts for readers (anonymous access only)
- Automated social media posting (manual only in v1)
- Email digest / notifications
