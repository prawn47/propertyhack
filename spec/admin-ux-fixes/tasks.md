# Admin UX Fixes & Data Quality — Tasks

## Phase 1: Bug Fixes & Quick Wins (no dependencies)

### T1.1: Fix source editor 404
- Debug the root cause (test API endpoint, check ID format, check frontend routing)
- Add proper error states to `SourceEditor.tsx` (loading, not found, error)
- Verify edit + save works end-to-end
- **Priority**: P1
- **Depends on**: nothing

### T1.2: Fix subscriber list loading
- Debug `GET /api/admin/subscribers` — check server logs, test endpoint directly
- Fix root cause (auth, query, schema mismatch, or frontend error)
- Add better error display in `SubscriberList.tsx`
- **Priority**: P1
- **Depends on**: nothing

### T1.3: Add image onError fallbacks to public components
- Add `onError` handlers to `<img>` tags in `ArticleCard.tsx`, `ArticleDetail.tsx`, `RelatedArticles.tsx`
- Extract SVG placeholder into shared component if not already shared
- Test with a broken image URL
- **Priority**: P1
- **Depends on**: nothing

### T1.4: Add admin ↔ live site navigation
- Add "View Site" link to `AdminLayout.tsx` sidebar header
- Create `AdminFloatingButton.tsx` for public site (checks JWT, renders floating pill)
- Add to `App.tsx` layout
- **Priority**: P2
- **Depends on**: nothing

## Phase 2: Data Integrity (no cross-spec dependencies)

### T2.1: Add duplicate feed prevention
- Backend: Add duplicate check to `POST /api/admin/sources` (normalise URL, check by source type)
- Frontend: Handle 409 response in `SourceEditor.tsx` with warning message
- Test with duplicate RSS feed URL
- **Priority**: P2
- **Depends on**: T1.1 (source editor must work first)

### T2.2: Run image alt text backfill
- Trigger existing `POST /maintenance/backfill-alt-text` endpoint
- Verify it processes all published articles missing alt text
- Add progress reporting to the endpoint (return job ID, poll for status)
- Spot-check 10 articles for quality
- **Priority**: P2
- **Depends on**: nothing

### T2.3: Implement duplicate image detection
- Create `server/scripts/detect-duplicate-images.js`
- Scan articles for shared `imageUrl` values
- Add collision prevention in image generation (hash suffix on filename collision)
- Add admin maintenance endpoint `POST /maintenance/detect-duplicate-images`
- **Priority**: P3
- **Depends on**: nothing

## Phase 3: Draft Cleanup

### T3.1: Draft cleanup — Pass 1 (delete empty articles)
- Create `server/scripts/cleanup-drafts.js`
- Delete articles with no title AND no summary (raw SQL for efficiency)
- Report: count before, count deleted, count remaining
- Add admin maintenance endpoint `POST /maintenance/cleanup-drafts`
- **Priority**: P1
- **Depends on**: nothing

### T3.2: Draft cleanup — Pass 2 (relevance scoring)
- Extend cleanup script to score remaining drafts via AI
- Apply threshold rules (delete <4, keep 4-6 as draft, publish 7+)
- Rate-limit API calls (1/second)
- Report results
- **Priority**: P2
- **Depends on**: T3.1, Spec 2 T2.1 (relevance scoring must exist)

## Phase 4: Documentation

### T4.1: Write site mechanics documentation
- Create `docs/site-mechanics.md`
- Cover all 10 sections from design F9
- Keep it accurate to current codebase, readable by non-technical stakeholders
- ~2000-3000 words
- **Priority**: P2
- **Depends on**: nothing (but best done after other changes are complete for accuracy)

## Task Dependency Summary

```
T1.1 ──→ T2.1
T1.2
T1.3
T1.4
T2.2
T2.3
T3.1 ──→ T3.2 (also needs Spec 2 T2.1)
T4.1
```

Total: 9 tasks
Immediately unblocked: 7 (T1.1, T1.2, T1.3, T1.4, T2.2, T2.3, T3.1)
Blocked: 2 (T2.1, T3.2)
