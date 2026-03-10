# SEO & Content Relevance — Tasks

## Phase 1: Schema & Backend Foundation

### T1.1: Add relevanceScore to Article model
- Add `relevanceScore Int? @map("relevance_score")` to Article model in schema.prisma
- Create Prisma migration
- Generate Prisma client
- **Priority**: P1
- **Depends on**: nothing

### T1.2: Create feed quality criteria system prompt
- Create seed script `server/scripts/seed-feed-criteria.js`
- Seed `SystemPrompt` record named `feed-quality-criteria` with full criteria content from design F6
- Covers all 6 content categories + 5 jurisdiction emphasis notes + rejection criteria
- Run seed script
- **Priority**: P1
- **Depends on**: nothing

## Phase 2: Content Relevance Scoring

### T2.1: Update summarisation for relevance scoring
- Update the `article-summarisation` system prompt to include relevance scoring criteria (1-10 scale)
- Update `articleSummaryService.js` to parse `relevanceScore` from AI response
- Update `articleSummariseWorker.js`:
  - Score 1-3: hard delete (replaces old `isPropertyRelated: false` check)
  - Score 4-6: save as DRAFT (do not auto-publish)
  - Score 7-10: auto-publish as before
  - Store `relevanceScore` on article
- Create `relevance-thresholds` system prompt with JSON config: `{ "rejectBelow": 4, "reviewBelow": 7 }`
- Worker loads thresholds with 5-min cache
- **Priority**: P1
- **Depends on**: T1.1 (relevanceScore field must exist)

### T2.2: Add relevance score to admin article list
- Add `relevanceScore` column to `ArticleList.tsx` (sortable)
- Add relevance filter: All / High (7+) / Medium (4-6) / Low (1-3)
- Color-code scores: green 7+, yellow 4-6, red 1-3
- Update `GET /api/admin/articles` to support `?minRelevance=X&maxRelevance=Y` filter params
- **Priority**: P2
- **Depends on**: T2.1

## Phase 3: SEO Keywords

### T3.1: Restructure SEO admin panel by jurisdiction
- Create `JurisdictionTabs.tsx`, `NationalKeywordList.tsx`, `AreaDropdown.tsx`, `AreaKeywordList.tsx`
- Refactor existing SEO keywords page to use jurisdiction tabs (AU, NZ, UK, US, CA)
- Area dropdown populated from `LocationSeo` records for each market
- **Priority**: P2
- **Depends on**: nothing

### T3.2: Seed NZ LocationSeo records
- Add NZ cities to `LocationSeo` seed: Auckland, Wellington, Christchurch, Hamilton, Tauranga, Dunedin, Queenstown
- Include metaTitle, metaDescription, h1Title, introContent for each
- Run seed
- **Priority**: P2
- **Depends on**: nothing

### T3.3: Research and seed keywords for all jurisdictions
- Create `server/scripts/seed-keywords.js`
- Generate/curate 50-80 keywords per jurisdiction covering: market terms, investment language, regulatory terms, location-specific terminology, property types
- Augment existing AU keywords to ~100
- Seed NZ (~60), UK (~70), US (~70), CA (~70) keywords
- Each keyword has: keyword, category, location (nullable), market, priority, isActive
- **Priority**: P2
- **Depends on**: T3.1 (admin UI should exist to verify), T3.2 (NZ locations must exist)

### T3.4: Add bulk keyword operations to admin
- Add bulk add (paste multiple keywords), bulk delete (select and delete), import/export (CSV)
- Backend: `POST /api/admin/seo/keywords/bulk`, `DELETE /api/admin/seo/keywords/bulk`
- **Priority**: P3
- **Depends on**: T3.1

## Phase 4: Keyword Injection

### T4.1: Inject keywords into crawler SSR middleware
- Update `crawlerSsr.js` to query `SeoKeyword` records relevant to the current page
- Article pages: `<meta name="keywords">` with top 5-8 matching keywords
- Location pages: keyword-enriched meta descriptions
- Category pages: relevant keywords
- Home page: top-priority national keywords
- No keyword stuffing — contextual relevance only
- **Priority**: P2
- **Depends on**: T3.3 (keywords must be seeded)

## Phase 5: Article Audit

### T5.1: Build article relevance audit script
- Create `server/scripts/audit-article-relevance.js`
- Process all DRAFT articles without a `relevanceScore`
- Call AI for each (rate-limited 1/second) to get relevance score
- Apply threshold rules: delete <4, keep 4-6 as draft, publish 7+
- Log progress and final report
- Add admin maintenance endpoint `POST /maintenance/audit-relevance` (enqueue as BullMQ job)
- Add status polling endpoint `GET /maintenance/audit-relevance/:jobId`
- **Priority**: P2
- **Depends on**: T2.1 (relevance scoring must exist), Spec 1 T3.1 (empty articles cleaned first)

## Task Dependency Summary

```
T1.1 ──→ T2.1 ──→ T2.2
                ──→ T5.1 (also needs Spec 1 T3.1)
T1.2
T3.1 ──→ T3.3 (also needs T3.2)
     ──→ T3.4
T3.2 ──→ T3.3
T3.3 ──→ T4.1
```

Total: 9 tasks
Immediately unblocked: 4 (T1.1, T1.2, T3.1, T3.2)
Blocked: 5 (T2.1, T2.2, T3.3, T3.4, T4.1, T5.1)
