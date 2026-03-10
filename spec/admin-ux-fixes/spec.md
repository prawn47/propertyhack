# Admin UX Fixes & Data Quality — Spec

## Features

### F1: Source Editor Fix

**Current state**: Clicking "Edit" on any source in the admin source list returns a 404. The frontend route `/admin/sources/:id/edit` and backend `GET /api/admin/sources/:id` both exist and appear correctly wired.

**Required behaviour**:
- Edit button navigates to `/admin/sources/:id/edit` with the correct source ID
- Source data loads and populates the form
- Save persists changes and returns to source list
- If source not found, show a clear "Source not found" message (not a blank form)

**Acceptance criteria**:
- [ ] Click Edit on any source → form loads with source data
- [ ] Save changes → changes persist in DB
- [ ] Navigate to a non-existent source ID → shows "Source not found" with back link

---

### F2: Subscriber List Fix

**Current state**: Admin subscribers page shows "Failed to load". Need to identify whether this is a frontend API call error, a backend route error, or a data issue.

**Required behaviour**:
- Subscriber list loads showing all subscribers with pagination
- Country breakdown badges display correctly
- Delete button works

**Acceptance criteria**:
- [ ] `/admin/subscribers` loads and displays subscriber data
- [ ] Pagination works across multiple pages
- [ ] Country breakdown badges show correct counts

---

### F3: Admin ↔ Live Site Navigation

**Current state**: No way to navigate between admin panel and public site without manually typing URLs.

**Required behaviour**:
- Admin sidebar header includes a "View Site" icon/link → opens public site in new tab
- When logged in as admin and viewing the public site, a small floating "Admin" button appears (bottom-right corner) → links to `/admin`
- Button is unobtrusive — small, semi-transparent, doesn't interfere with content

**Acceptance criteria**:
- [ ] Admin sidebar shows "View Site" link → opens public site in new tab
- [ ] Public site shows floating "Admin" button when admin JWT is valid
- [ ] Button does not appear for non-admin visitors
- [ ] Button does not overlap content or interfere with reading

---

### F4: Duplicate Feed Prevention

**Current state**: No uniqueness check on `IngestionSource`. The same RSS feed URL can be added multiple times. Article-level dedup (by normalised URL) catches duplicate articles downstream, but duplicate sources waste fetch cycles and create confusion.

**Required behaviour**:
- Before creating a source, normalise and check the feed URL against existing sources
- If a match is found, show a warning with the existing source name and block creation
- For non-RSS sources (NewsAPI, scraper, etc.), check the relevant config field (e.g., query string, target URL)

**Acceptance criteria**:
- [ ] Attempting to add a duplicate RSS feed URL shows a warning naming the existing source
- [ ] Duplicate is blocked (not just warned)
- [ ] Different source types check their relevant config fields for uniqueness
- [ ] Existing duplicate sources (if any) are identified and flagged

---

### F5: Image Fallback on Public Components

**Current state**: `ArticleCard`, `ArticleDetail`, and `RelatedArticles` components render `<img>` tags without `onError` handlers. If an image URL is broken (file deleted, 404, etc.), the browser shows a broken image icon. The `ArticleEditor` admin component already has `onError` handling.

**Required behaviour**:
- All public image components handle load errors gracefully
- On error, swap to the same SVG building icon placeholder used when `imageUrl` is null
- No broken image icons visible to users

**Acceptance criteria**:
- [ ] Broken image URL in `ArticleCard` → shows SVG placeholder
- [ ] Broken image URL in `ArticleDetail` → shows SVG placeholder
- [ ] Broken image URL in `RelatedArticles` → shows SVG placeholder
- [ ] Placeholder matches the existing "no image" design

---

### F6: Image Alt Text Backfill

**Current state**: `imageAltText` field exists on Article model. Generation pipeline exists in `articleImageWorker.js`. A backfill script exists at `server/scripts/backfill-alt-text.js`. An admin maintenance endpoint exists at `POST /maintenance/backfill-alt-text`. Many published articles appear to lack alt text.

**Required behaviour**:
- All published articles with images get alt text generated
- The backfill runs reliably and reports progress
- New articles always get alt text as part of the image generation pipeline (verify this works)

**Acceptance criteria**:
- [ ] Backfill script/endpoint processes all published articles missing alt text
- [ ] Progress is reported (X of Y processed, X failures)
- [ ] After backfill, 0 published articles with images have null `imageAltText`
- [ ] New articles generated going forward always have alt text

---

### F7: Draft Article Cleanup

**Current state**: Draft articles accumulate from failed processing, irrelevant content, or incomplete ingestion. No automated cleanup. The `isPropertyRelated` check only runs during summarisation — articles that fail before that stage stay as drafts forever.

**Required behaviour**:
- **Pass 1 (automatic)**: Delete articles with no title AND no summary — these are broken ingestion artifacts
- **Pass 2 (scored)**: For remaining drafts with content, run relevance scoring (from Spec 2) and delete those scoring <4
- Report results: how many deleted in each pass, how many remain
- Available as both a one-time script and an admin maintenance action

**Acceptance criteria**:
- [ ] Pass 1 deletes all articles with null/empty title AND null/empty summary
- [ ] Count reported before and after each pass
- [ ] Pass 2 applies relevance scoring to remaining drafts (depends on Spec 2)
- [ ] Admin maintenance UI shows a "Clean up drafts" button with results

---

### F8: Duplicate Image Detection

**Current state**: Image filenames are derived from article slugs, so they're inherently unique per article. However, if two articles have very similar slugs, or if an image file is manually reused, duplicates could exist. Also, source images (from RSS) could be the same URL across articles.

**Required behaviour**:
- During image generation, verify the output path doesn't collide with another article's image
- For source-provided images (from RSS/scraping), detect when multiple articles reference the same `imageUrl` and flag for regeneration
- Add an admin maintenance action to scan for and report duplicate image URLs across articles

**Acceptance criteria**:
- [ ] Image generation checks for filename collision before saving
- [ ] Admin can trigger a duplicate image scan
- [ ] Duplicate image articles are flagged and can be regenerated

---

### F9: Site Mechanics Documentation

**Current state**: No single document explains how the platform works. Knowledge is spread across CLAUDE.md, spec files, and code comments.

**Required behaviour**:
- Create `docs/site-mechanics.md` covering:
  - Architecture overview (frontend, backend, DB, Redis, queues)
  - Ingestion pipeline (5 stages: fetch → process → summarise → embed → publish)
  - Source types and how each fetcher works
  - AI summarisation flow (prompt loading, model cascade, field extraction)
  - Image generation flow (model cascade, fallbacks, alt text)
  - Embedding pipeline (OpenAI, pgvector, cosine similarity)
  - Frontend rendering (React, SSR for crawlers, location pages)
  - SEO infrastructure (sitemaps, RSS, JSON-LD, crawler middleware)
  - Admin panel (sections, auth, settings)
  - Subscriber flow (signup, Beehiiv sync, segmentation)
  - Scheduled jobs (cron, BullMQ workers)

**Acceptance criteria**:
- [ ] Document exists at `docs/site-mechanics.md`
- [ ] Covers all major systems listed above
- [ ] Accurate to current codebase (not aspirational)
- [ ] Readable by a non-technical stakeholder
