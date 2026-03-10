# Admin UX Fixes & Data Quality — Tasks

## Phase 1: Bug Fixes (no dependencies)

### T1.1: Debug and fix source editor 404
- Test `GET /api/admin/sources/:id` with a known source ID via curl
- Check source list component — verify the ID format passed to edit link
- Fix the root cause (ID encoding, route mismatch, or data issue)
- **Priority**: P1
- **Depends on**: nothing

### T1.2: Add error states to SourceEditor component
- Add loading spinner while fetching source data
- Add "Source not found" message with back link when API returns 404
- Add generic error message for other failures
- **Priority**: P1
- **Depends on**: T1.1

### T1.3: Debug and fix subscriber list loading
- Test `GET /api/admin/subscribers` via curl, check server logs
- Identify root cause (auth, query error, schema mismatch)
- Fix the backend issue
- **Priority**: P1
- **Depends on**: nothing

### T1.4: Improve subscriber list error handling
- Add better error display in `SubscriberList.tsx` — show actual error message
- Add retry button on failure
- **Priority**: P2
- **Depends on**: T1.3

### T1.5: Add image onError fallbacks to public components
- Extract SVG placeholder into a shared component (if not already shared)
- Add `onError` state + handler to `ArticleCard.tsx`
- Add `onError` state + handler to `ArticleDetail.tsx`
- Add `onError` state + handler to `RelatedArticles.tsx`
- **Priority**: P1
- **Depends on**: nothing

### T1.6: Add "View Site" link to admin sidebar
- Add external link icon + "View Site" to `AdminLayout.tsx` sidebar header
- Opens public site in new tab
- **Priority**: P2
- **Depends on**: nothing

### T1.7: Add floating "Admin" button on public site
- Create `AdminFloatingButton.tsx` — checks JWT, renders small pill bottom-right
- Semi-transparent brand.secondary background, gold text, links to `/admin`
- Add to `App.tsx` layout (outside route switches)
- Only renders when valid admin JWT exists
- **Priority**: P2
- **Depends on**: nothing

## Phase 2: Data Integrity

### T2.1: Add duplicate feed check to source creation backend
- In `POST /api/admin/sources`: extract canonical URL from config by source type
- Normalise URL (lowercase, strip trailing slash/protocol)
- Query existing sources for match
- Return 409 with existing source info if duplicate found
- **Priority**: P2
- **Depends on**: T1.1 (source editor must work)

### T2.2: Handle duplicate feed warning in source editor frontend
- Catch 409 response in `SourceEditor.tsx`
- Show warning message naming the existing source
- Link to existing source's edit page
- **Priority**: P2
- **Depends on**: T2.1

### T2.3: Run image alt text backfill and verify
- Trigger existing `POST /maintenance/backfill-alt-text` endpoint
- Monitor completion
- Spot-check 10 articles for alt text quality
- Document any issues found
- **Priority**: P2
- **Depends on**: nothing

### T2.4: Add progress reporting to alt text backfill endpoint
- Change endpoint to return a BullMQ job ID
- Add `GET /maintenance/backfill-alt-text/:jobId` for status polling
- Report: total to process, processed so far, failures
- **Priority**: P3
- **Depends on**: T2.3

### T2.5: Create duplicate image detection script
- Create `server/scripts/detect-duplicate-images.js`
- Query all articles, group by `imageUrl`
- Report duplicate image URLs with article IDs
- **Priority**: P3
- **Depends on**: nothing

### T2.6: Add image filename collision prevention
- In image generation: before saving, check if target filename exists for a different article
- If collision: append a short hash suffix to the filename
- Add admin maintenance endpoint `POST /maintenance/detect-duplicate-images`
- **Priority**: P3
- **Depends on**: T2.5

## Phase 3: Draft Cleanup

### T3.1: Delete draft articles with no title and no summary
- Create `server/scripts/cleanup-drafts.js`
- Delete articles where `status = 'DRAFT'` AND title is null/empty AND short_blurb is null/empty
- Report: count before, count deleted, count remaining
- **Priority**: P1
- **Depends on**: nothing

### T3.2: Add draft cleanup admin maintenance endpoint
- Add `POST /api/admin/articles/maintenance/cleanup-drafts` endpoint
- Runs pass 1 (empty articles) immediately
- Returns `{ deletedCount, remainingDrafts }`
- **Priority**: P2
- **Depends on**: T3.1

### T3.3: Score remaining drafts for relevance and clean up
- Extend cleanup script for pass 2: query remaining drafts without a relevanceScore
- Call AI for each (rate-limited 1/sec) to get relevance score
- Apply threshold: delete <4, keep 4-6 as draft, publish 7+
- Report results
- **Priority**: P2
- **Depends on**: T3.1, Spec 2 T2.1 (relevance scoring must be implemented)

## Phase 4: Documentation

### T4.1: Write site mechanics documentation
- Create `docs/site-mechanics.md`
- Cover: architecture, ingestion pipeline, AI services, frontend, SEO, admin, subscribers, jobs, database, deployment
- Accurate to current codebase, readable by non-technical stakeholders
- ~2000-3000 words
- **Priority**: P2
- **Depends on**: nothing (but best done last for accuracy)

## Task Summary

Total: 18 tasks
Immediately unblocked: 12 (T1.1, T1.3, T1.5, T1.6, T1.7, T2.3, T2.5, T3.1, T4.1, and T1.2/T1.4 can start once their debug task completes quickly)
Blocked: 6
