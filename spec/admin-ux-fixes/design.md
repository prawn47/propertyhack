# Admin UX Fixes & Data Quality — Design

## Architecture

No new services or infrastructure. All changes are within the existing Express + React + Prisma stack.

## F1: Source Editor Fix

**Diagnosis approach**:
1. Check the source list component — verify the ID passed to the edit link matches the DB record format
2. Check if IDs are UUIDs vs integers and whether URL encoding is an issue
3. Test the `GET /api/admin/sources/:id` endpoint directly with a known source ID
4. Add proper error states to `SourceEditor.tsx` — currently catches errors but doesn't display a meaningful message

**Implementation**:
- Add error boundary in `SourceEditor` that shows "Source not found — it may have been deleted" with a back link
- Add loading state to prevent flash of empty form
- Log the actual API error for debugging

## F2: Subscriber List Fix

**Diagnosis approach**:
1. Check server logs for errors on `GET /api/admin/subscribers`
2. Test the endpoint directly via curl
3. Check if auth middleware is blocking the request
4. Verify Prisma query works (could be a schema mismatch or migration issue)

**Implementation**:
- Fix whatever the root cause is
- Add better error display in `SubscriberList.tsx` — show the actual error message, not just "Failed to load"

## F3: Admin ↔ Live Site Navigation

**Admin → Public**:
- Add to `AdminLayout.tsx` sidebar header, next to the logo/title
- External link icon + "View Site" text
- `<a href="/" target="_blank" rel="noopener">`
- Styled consistently with existing sidebar nav items

**Public → Admin** (admin-only floating button):
- New `AdminFloatingButton.tsx` component
- Rendered in `App.tsx` layout, outside route switches
- Checks for valid admin JWT in localStorage/cookie
- If valid: renders a small pill button, bottom-right, `position: fixed`
- Semi-transparent background (brand.secondary at 80% opacity), gold text
- "Admin" label with a settings icon
- Links to `/admin`
- z-index above content but below modals
- No render if no valid JWT (zero overhead for public users)

## F4: Duplicate Feed Prevention

**Database**:
- No schema migration needed — uniqueness check done at application level (config is JSON, can't easily add a DB unique constraint across JSON fields)

**Backend** (`server/routes/admin/sources.js`):
- In `POST /` (create source):
  1. Extract the canonical URL from `config` based on source type:
     - RSS: `config.feedUrl`
     - SCRAPER: `config.targetUrl`
     - NEWS_API_ORG / NEWS_API_AI: `config.query` + `config.country`
     - NEWSLETTER: `config.senderEmail`
     - PERPLEXITY: `config.query`
     - MANUAL: skip check
  2. Normalise URL (lowercase, strip trailing slash, strip protocol for comparison)
  3. Query `IngestionSource` for any source where the same config field matches
  4. If found: return 409 with `{ duplicate: true, existingSource: { id, name, type } }`

**Frontend** (`SourceEditor.tsx`):
- On 409 response, show a warning: "A source with this feed URL already exists: {name}. Please edit the existing source instead."
- Link to the existing source's edit page

## F5: Image Fallback on Public Components

**Pattern** (apply to `ArticleCard.tsx`, `ArticleDetail.tsx`, `RelatedArticles.tsx`):
```tsx
const [imgError, setImgError] = useState(false);

{article.imageUrl && !imgError ? (
  <img src={article.imageUrl} alt={article.imageAltText || article.title}
       onError={() => setImgError(true)} />
) : (
  <PlaceholderSVG />  // existing SVG building icon component
)}
```

Extract the SVG placeholder into a shared component if not already shared.

## F6: Image Alt Text Backfill

**Approach**:
1. Use the existing `POST /api/admin/articles/maintenance/backfill-alt-text` endpoint
2. Verify it works by triggering it and checking a sample of articles
3. Add a progress response — currently fire-and-forget. Change to return a job ID, then poll for status.
4. Ensure the `articleImageWorker` always calls `generateImageAltText()` after image generation (verify the code path)

**No schema changes needed** — `imageAltText` field already exists.

## F7: Draft Article Cleanup

**New script**: `server/scripts/cleanup-drafts.js`

**Pass 1** (no AI needed):
```sql
DELETE FROM articles
WHERE status = 'DRAFT'
  AND (title IS NULL OR title = '')
  AND (short_blurb IS NULL OR short_blurb = '');
```

**Pass 2** (depends on Spec 2 F3 for relevance scoring):
- Query remaining DRAFT articles
- For each, call AI with title + any content to get relevance score
- Delete score <4, keep 4+ as DRAFT with score stored
- Rate-limit to avoid API burst (1-2 per second)
- Batch in groups of 50 with progress logging

**Admin maintenance endpoint**: `POST /api/admin/articles/maintenance/cleanup-drafts`
- Returns `{ pass1Deleted, pass2Deleted, pass2Kept, totalRemaining }`

## F8: Duplicate Image Detection

**New script**: `server/scripts/detect-duplicate-images.js`
- Query all articles, group by `imageUrl`
- Any `imageUrl` shared by 2+ articles is flagged
- Output: list of duplicate image URLs with article IDs
- For flagged articles: re-queue image generation (skip the first article that "owns" the image, regenerate for others)

**Prevention in image worker**:
- Before saving, check if the target filename already exists AND is owned by a different article
- If collision: append a short hash suffix to the filename

**Admin maintenance endpoint**: `POST /api/admin/articles/maintenance/detect-duplicate-images`

## F9: Site Mechanics Documentation

**File**: `docs/site-mechanics.md`

**Structure**:
1. Overview (what PropertyHack is, tech stack summary)
2. Ingestion Pipeline (source types, fetch → process → summarise → embed → publish)
3. AI Services (summarisation, image generation, alt text, embeddings)
4. Frontend (React app structure, routing, SSR for crawlers)
5. SEO (sitemaps, RSS, JSON-LD, location pages, crawler middleware)
6. Admin Panel (sections, auth, settings management)
7. Subscribers (signup flow, Beehiiv sync, segmentation)
8. Jobs & Scheduling (cron jobs, BullMQ workers, Redis)
9. Database (Prisma schema overview, key models, pgvector)
10. Deployment (Docker, Caddy, Vultr)

Written in plain English. Diagrams described in text (mermaid if appropriate). ~2000-3000 words.

## Testing Strategy

- **F1-F2**: Manual verification — load the pages, confirm they work
- **F3**: Visual check — admin button appears/disappears based on auth state
- **F4**: Integration test — attempt to create duplicate source, verify 409 response
- **F5**: Manual test — break an image URL in DB, verify fallback renders
- **F6**: Run backfill, spot-check 10 articles for alt text
- **F7**: Run cleanup script on test data, verify counts
- **F8**: Create test articles with same imageUrl, run detection
- **F9**: Review doc for accuracy against codebase
