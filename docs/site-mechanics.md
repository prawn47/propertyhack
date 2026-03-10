# PropertyHack — Site Mechanics

This document explains how PropertyHack works, from ingestion to publication. It is written for a non-technical reader and reflects the current codebase as of March 2026.

---

## 1. Overview

PropertyHack is a property news aggregation platform that collects articles from across the internet, summarises them using AI, and presents them in a clean, fast, location-aware news feed. It covers Australia, the US, the UK, Canada, and New Zealand.

The site operates without editorial staff. The ingestion pipeline runs automatically around the clock, pulling content from RSS feeds, news APIs, web scrapers, newsletters, and other sources. AI handles summarisation, categorisation, image generation, and alt text. Human admin oversight is available via the admin panel.

**Tech stack at a glance:**

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Backend | Express 5 + Node.js |
| Database | PostgreSQL 16 + pgvector |
| ORM | Prisma |
| Job queue | BullMQ + Redis |
| AI (summaries) | Google Gemini 2.5 Flash / 2.0 Flash / 2.0 Flash Lite |
| AI (images) | Google Gemini (imagen model) |
| AI (embeddings) | OpenAI text-embedding-3-small |
| Hosting | Vultr VPS, Sydney region |
| Reverse proxy | Caddy (auto-HTTPS via Let's Encrypt) |

---

## 2. Ingestion Pipeline

Every article on PropertyHack passes through a five-stage automated pipeline managed by BullMQ, a job queue backed by Redis.

### Stage 1 — Fetch

The scheduler (described in Section 8) enqueues active sources into the `source-fetch` queue. The fetch worker picks up each job, selects the appropriate fetcher for the source type, and calls it to retrieve raw articles.

**Source types:**

- **RSS** — the most common type. Parses standard RSS/Atom feeds using the `rss-parser` library. Fetched every 30 minutes.
- **NewsAPI.org** — queries the NewsAPI.org API by keyword and country. Fetched every 3 hours.
- **NewsAPI.ai** — queries the NewsAPI.ai (EventRegistry) API by keyword. Fetched every 4 hours.
- **Perplexity** — uses the Perplexity AI API to surface property news for a given query. Fetched every 8 hours.
- **Scraper** — fetches and parses a target URL's HTML to extract article links and content. Fetched every 5 hours.
- **Newsletter** — receives articles via Resend webhook (inbound email), not on a schedule.
- **Social** — reserved for social media content; currently on-demand only.
- **Manual** — admin-entered articles; not scheduled.

Each fetcher returns a standardised list of article objects: `{ title, content, url, imageUrl, date, author, sourceName }`.

### Stage 2 — Process

The `article-process` worker receives each raw article and:

1. Normalises the article URL to check for duplicates (an article with the same URL is silently dropped).
2. Creates a new `Article` record in the database with status `DRAFT`.
3. Stores the raw content in `originalContent` for use in the next stage.
4. Enqueues the article ID into the `article-summarise` queue.

### Stage 3 — Summarise

The `article-summarise` worker sends the article's title and content to Google Gemini and asks it to return structured JSON. The AI decides:

- Is this actually about property? (`isPropertyRelated`) — if no, the article is deleted immediately.
- A short blurb (~50 words) for use on article cards.
- A longer summary (~80 words) with source attribution.
- A category (one of: property-market, residential, commercial, investment, development, policy, finance, uncategorized).
- The primary geographic location mentioned.
- Which markets the article applies to (AU, US, UK, CA, ALL).
- Whether the content is evergreen (timeless tips/guides) or time-sensitive news.
- Whether the content is globally relevant across markets.

If the article passes the property relevance check, the record is updated with all these fields and its status is set to `PUBLISHED`. It is then enqueued into the `article-image` queue.

The prompt used for summarisation is loaded from the database (`SystemPrompt` table, name: `article-summarisation`), so it can be updated via the admin panel without a code deployment. If no active DB prompt exists, a hardcoded fallback is used. If the AI returns summaries that exceed the word limits (60 words for the blurb, 100 for the summary), the service automatically re-submits them to Gemini for trimming.

### Stage 4 — Image

The `article-image` worker generates a representative photo-style image for the article using Google Gemini's image generation model. The image prompt is built from the article's title, summary, and category — with category-specific visual cues (e.g. construction site for "development", open home inspection for "property-market") and one of five randomly-chosen film photography styles to create visual variety.

The generated image is saved to `server/public/images/articles/` and the article's `imageUrl` is updated. If image generation fails entirely, no image is stored and the article uses a placeholder SVG on the frontend.

After the image is saved, the worker generates SEO-friendly alt text for the image using Gemini, incorporating relevant SEO keywords from the `SeoKeyword` table for the article's category and location.

The image prompt template is also stored in the `SystemPrompt` table (name: `image-generation`) and can be edited via the admin panel.

### Stage 5 — Embed

The `article-embed` worker sends the article's title and summary text to OpenAI's `text-embedding-3-small` model, which returns a 1536-dimensional vector representation of the article's meaning. This vector is stored in the `embedding` column (a `pgvector` type) in the database.

Embeddings power the "related articles" feature: when a reader views an article, the system queries the database for articles with the most similar embedding vectors using cosine similarity.

After embedding, the worker also triggers social post generation (described in Section 6).

---

## 3. AI Services

### Summarisation

Uses Google Gemini in a model cascade: Gemini 2.5 Flash is tried first, then 2.0 Flash, then 2.0 Flash Lite. The first model to respond successfully is used; others are skipped. The response is expected as JSON and is validated before saving to the database.

English spelling and phrasing varies by market — articles from AU/UK sources use British English; US/CA sources use American English.

### Image Generation

Images are generated by Google Gemini's image model. Each image is designed to look like a photograph taken with a film camera, with five distinct camera/film combinations used at random to ensure visual variety across the article feed. The image prompt adapts to the article category (e.g. a finance article gets a desk scene with property documents and house keys; a policy article gets a civic building with sandstone columns).

If the article already has an image from its source (RSS, scraper, etc.), image generation is skipped — the source image is kept as-is.

### Alt Text

Generated by Gemini using the article title, summary, and relevant SEO keywords. Produces concise, accessibility-compliant alt text (max 125 characters). Generated as part of the image stage for new articles. A backfill endpoint is available to retroactively generate alt text for articles that are missing it.

### Embeddings

Generated by OpenAI's `text-embedding-3-small` model at 1536 dimensions. Used exclusively for semantic search and related article recommendations. The `pgvector` PostgreSQL extension handles similarity queries.

---

## 4. Frontend

The frontend is a React 19 + TypeScript single-page application built with Vite and styled with Tailwind CSS.

**Key routes:**

- `/` or `/:country` — the main article feed, filterable by category, search, and location
- `/articles/:slug` — individual article detail page
- `/:country/property-news/:location` — location-specific landing pages (e.g. `/au/property-news/sydney`)
- `/category/:slug` — category landing pages
- `/:country/tools` and `/:country/tools/:calculator` — property calculators
- `/admin` — the admin panel (requires login)

The frontend fetches article data from the Express API. Market selection (AU, US, UK, CA, NZ) is stored in a browser cookie and filters the feed automatically on each visit.

Article cards display the image, headline, short blurb, category badge, and publish time. Clicking through loads the article detail page with the full AI summary, the original source link, and a "related articles" rail at the bottom.

---

## 5. SEO

Because React renders in the browser (client-side), search engines and social media crawlers would otherwise see an empty page. PropertyHack solves this with a crawler SSR middleware on the Express server.

### Crawler SSR Middleware

When a request arrives at the server and the `User-Agent` header identifies it as a search engine or social media crawler (Google, Bing, Facebook, Twitter/X, LinkedIn, WhatsApp, Telegram, Slack, ChatGPT, Claude, and others), the middleware:

1. Reads the article slug or page path from the URL.
2. Queries the database for the relevant article or location data.
3. Dynamically builds `<title>`, `<meta name="description">`, Open Graph tags, Twitter Card tags, and JSON-LD structured data.
4. Injects these into the `index.html` shell and serves the complete HTML to the crawler.

Regular human visitors receive the standard React SPA and render in their browser as normal.

### Sitemaps

- `/sitemap.xml` — the sitemap index, linking to sub-sitemaps.
- `/sitemap-articles.xml` — all published articles.
- `/sitemap-news.xml` — recent articles in Google News format.
- `/sitemap-pages.xml` — static pages (home, about, tools, location pages, category pages).

### RSS Feed

- `/feed.xml` — a standard RSS 2.0 feed of the 50 most recent published articles.

### JSON-LD Structured Data

- **NewsArticle schema** — injected on every article page, including headline, publication date, author (PropertyHack), and a reference back to the original source URL.
- **WebSite schema** — on the homepage, includes a SearchAction for Google's sitelinks search box.
- **CollectionPage schema** — on location and category landing pages.
- **WebApplication schema** — on calculator tool pages.
- **BreadcrumbList schema** — on tool pages.

### Location Pages

Location landing pages (e.g. `/au/property-news/sydney`, `/au/property-news/melbourne`) are served by the React app and enriched with custom SEO metadata stored in the `LocationSeo` database table. Each location has a custom meta title, meta description, H1 heading, intro paragraph, and focus keywords. These are managed via the admin panel.

### Category Pages

Category pages (e.g. `/category/investment`) are automatically generated from the article categories. Meta tags are built dynamically in the crawler middleware.

### Hreflang

All pages include `hreflang` alternate link tags for each supported market (en-AU, en-US, en-GB, en-CA, en-NZ) to help search engines serve the correct regional version.

---

## 6. Admin Panel

The admin panel is located at `/admin` and requires a superAdmin JWT to access. All admin routes are protected server-side.

**Sections:**

- **Dashboard** — at-a-glance stats: total articles, sources, subscribers, queue depths, and recent ingestion logs.
- **Sources** — manage ingestion sources. Add, edit, enable/disable, or manually trigger a fetch for any source. Each source stores its type, configuration (as JSON), market, and schedule.
- **Articles** — browse all articles (published, draft, archived). Edit any article manually: title, blurb, summary, category, market, image, status. Trigger maintenance actions such as backfilling alt text or cleaning up draft articles.
- **Prompts** — edit the AI prompt templates stored in the database. Changes here affect summarisation and image generation on the next article processed — no code deployment required.
- **SEO** — manage SEO keywords and location page metadata. Keywords are associated with categories and locations and are used when generating image alt text.
- **Subscribers** — view all newsletter subscribers, their country/region breakdown, and delete individual subscribers.
- **Social** — manage social post drafts and publishing. Social posts are auto-generated for each published article and can be approved for publishing via connected social accounts.
- **Henry** — the AI property assistant chat feature, accessible to logged-in users. The admin panel includes a view for managing conversation history and rate limit configuration.

---

## 7. Subscribers

Readers can sign up for the property news newsletter directly on the site. The signup form collects:
- Email address
- First name
- Country (AU, US, UK, CA, NZ)
- Region (state/province, validated against a list per country)

On signup, the subscriber is saved to the local PostgreSQL database and simultaneously synced to Beehiiv (the newsletter platform) in the background. The Beehiiv sync is fire-and-forget — if it fails, the subscriber is still saved locally and can be re-synced later. The `beehiivSynced` flag on each subscriber record tracks whether the sync has completed.

Subscribers can unsubscribe via the same API. Unsubscribes are reflected both in the local database (`unsubscribedAt` timestamp) and pushed to Beehiiv.

The admin panel shows subscriber counts segmented by country and region.

---

## 8. Jobs and Scheduling

### Ingestion Scheduler

A `node-cron` job runs every 5 minutes on server startup. It queries all active `IngestionSource` records and checks whether each one is due for a fetch based on its schedule (or the default schedule for its type). Due sources are enqueued into the `source-fetch` BullMQ queue.

**Off-peak throttling:** The scheduler is market-aware. During off-peak hours (10pm–5am local time in the source's market), the effective fetch interval is multiplied by 3. This reduces unnecessary API calls and processing overnight.

**Default fetch intervals:**
- RSS: every 30 minutes
- NewsAPI.org: every 3 hours
- NewsAPI.ai: every 4 hours
- Scraper: every 5 hours
- Perplexity: every 8 hours
- Newsletter, Social, Manual: on-demand only

### BullMQ Workers

Seven workers run concurrently within the same Express process:

| Worker | Queue | Concurrency |
|---|---|---|
| sourceFetchWorker | source-fetch | 3 |
| articleProcessWorker | article-process | 5 |
| articleSummariseWorker | article-summarise | 1 (rate limit) |
| articleImageWorker | article-image | 1 (rate limit) |
| articleEmbedWorker | article-embed | 3 |
| socialPublishWorker | social-publish | 1 |
| socialGenerateWorker | social-generate | 1 |

Summarisation and image generation workers run at concurrency 1 to stay within AI API rate limits. All workers handle graceful shutdown via SIGTERM/SIGINT signals.

### Other Scheduled Jobs

- **Social health check** — periodically verifies that connected social accounts are still authenticated.
- **Henry cleanup** — removes old Henry AI conversation history to manage database size.

---

## 9. Database

The database is self-hosted PostgreSQL 16 with the `pgvector` extension, running in Docker on the same Vultr VPS. The Prisma ORM handles all queries; raw SQL is never used for data mutations.

**Key models:**

- **User** — admin users (superAdmin flag). Supports password login and Google OAuth. Also stores Henry AI conversation data.
- **IngestionSource** — one record per news source. Stores source type, JSON config, market, schedule, error history, and article count.
- **Article** — the core model. Stores the headline, slug (unique), AI-generated short blurb and long summary, category, location, market tags, image URL, alt text, embedding vector, publish status, and a reference back to the source.
- **IngestionLog** — a log entry per fetch attempt, recording how many articles were found vs new, and any errors.
- **SystemPrompt** — editable AI prompt templates. Currently used for `article-summarisation` and `image-generation`.
- **ArticleCategory** — the valid category list (property-market, residential, commercial, investment, development, policy, finance, uncategorized).
- **Market** — supported market codes (AU, US, UK, CA, NZ) with currency and display name.
- **SeoKeyword** — keywords tagged by category and/or location, used to inform image alt text generation.
- **LocationSeo** — SEO metadata for location landing pages (meta title, description, H1, intro, focus keywords).
- **Subscriber** — newsletter subscribers with country/region and Beehiiv sync status.
- **SocialPost** — social media post drafts and their publish status across connected platforms.
- **SocialAccount** — OAuth credentials for connected social media accounts.
- **SavedScenario** — calculator scenarios saved by logged-in users.

**Deduplication:** Articles are deduplicated by normalised URL. Before creating a new article, the process worker checks whether an article with the same URL already exists. If so, the duplicate is silently dropped.

**Vector search:** The `embedding` column on `Article` uses the `vector(1536)` type from pgvector. Related articles are fetched using cosine similarity: the 5 most semantically similar articles to the current one are shown at the bottom of each article page.

All schema changes are applied via Prisma migrations — never by altering the database directly.

---

## 10. Deployment

### Local Development

```bash
# Start all services
npm run dev        # Vite dev server (port 3004) + Express (port 3001)
```

Vite proxies `/api` and `/images` requests through to Express. PostgreSQL and Redis can be run via Docker Compose or locally.

### Production (Vultr Sydney)

All services run inside Docker containers managed by Docker Compose:

- **Caddy** — the public-facing web server. Handles TLS certificate provisioning (Let's Encrypt) automatically. Serves the built React app from `frontend-dist/` as static files, and reverse-proxies all `/api` requests to the Express container.
- **Express** — the Node.js backend. Not directly exposed to the internet; only Caddy talks to it.
- **PostgreSQL** — the primary database. Data persists to a named Docker volume.
- **Redis** — the BullMQ job queue backend. Data persists to a named Docker volume.

The build process:
1. `npm run build` — Vite compiles the React app into `frontend-dist/`.
2. `docker compose up -d --build` — rebuilds the Express image and restarts all services.

Environment variables (API keys, database credentials, JWT secrets) are stored in a `.env` file on the server and passed to containers via Docker Compose's `env_file` directive. The `.env` file is never committed to the repository.

The health check endpoint at `GET /health` returns `{ status: "OK" }` and can be used by monitoring tools to verify the server is running. The queue status endpoint at `GET /system/queue-status` returns job counts for all seven BullMQ queues.
