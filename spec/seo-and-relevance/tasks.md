# SEO & Content Relevance — Tasks

## Phase 1: Schema & Backend Foundation

### T1.1: Add relevanceScore column to Article model
- Add `relevanceScore Int? @map("relevance_score")` to Article in schema.prisma
- Create Prisma migration: `npx prisma migrate dev --name add-relevance-score`
- Generate Prisma client
- **Priority**: P1
- **Depends on**: nothing

### T1.2: Create feed quality criteria system prompt
- Create seed script `server/scripts/seed-feed-criteria.js`
- Seed `SystemPrompt` record named `feed-quality-criteria`
- Content covers: 6 content categories + 5 jurisdiction emphasis notes + rejection criteria (as defined in design F6)
- Run seed script
- **Priority**: P1
- **Depends on**: nothing

### T1.3: Create relevance threshold config system prompt
- Seed `SystemPrompt` record named `relevance-thresholds`
- JSON content: `{ "rejectBelow": 4, "reviewBelow": 7 }`
- Editable in admin prompts section
- **Priority**: P1
- **Depends on**: nothing

## Phase 2: Content Relevance Scoring

### T2.1: Update summarisation prompt for relevance scoring
- Update the `article-summarisation` DB prompt to include relevance scoring instructions (1-10 scale with criteria)
- Add scoring rubric to prompt: 9-10 core property, 7-8 strongly related, 5-6 moderate, 3-4 loose, 1-2 unrelated
- **Priority**: P1
- **Depends on**: nothing (prompt is in DB, just needs content update)

### T2.2: Update articleSummaryService to parse relevanceScore
- Parse `relevanceScore` from AI JSON response
- Validate: must be integer 1-10, default to 5 if missing/invalid
- Return alongside existing fields (shortBlurb, longSummary, etc.)
- **Priority**: P1
- **Depends on**: T2.1

### T2.3: Update articleSummariseWorker with scoring thresholds
- Load threshold config from `relevance-thresholds` system prompt (5-min cache)
- Score 1-3 (below rejectBelow): hard delete article
- Score 4-6 (below reviewBelow): save as DRAFT, store score, do NOT publish
- Score 7-10: publish as normal, store score
- Remove old `isPropertyRelated` binary check (subsumed by scoring)
- **Priority**: P1
- **Depends on**: T1.1 (field must exist), T1.3 (thresholds must exist), T2.2 (parsing must work)

### T2.4: Add relevance score column to admin article list
- Add `relevanceScore` column to `ArticleList.tsx` (sortable)
- Color-code: green 7+, yellow 4-6, red 1-3, grey if null
- **Priority**: P2
- **Depends on**: T2.3

### T2.5: Add relevance filter to admin article list
- Add filter dropdown: All / High (7+) / Medium (4-6) / Low (1-3)
- Update `GET /api/admin/articles` to support `?minRelevance=X&maxRelevance=Y` query params
- **Priority**: P2
- **Depends on**: T2.4

## Phase 3: SEO Keywords Admin UI

### T3.1: Create jurisdiction tabs for SEO keywords page
- Create `JurisdictionTabs.tsx` component (AU, NZ, UK, US, CA tabs)
- Refactor existing SEO keywords page to wrap keyword list in tabs
- Each tab filters keywords by `market` field
- **Priority**: P2
- **Depends on**: nothing

### T3.2: Create area dropdown within jurisdiction tabs
- Create `AreaDropdown.tsx` — populated from `LocationSeo` records for the selected market
- When an area is selected, filter keywords to that location
- When "All / National" is selected, show keywords where `location` is null
- **Priority**: P2
- **Depends on**: T3.1

### T3.3: Seed NZ LocationSeo records
- Add NZ cities: Auckland, Wellington, Christchurch, Hamilton, Tauranga, Dunedin, Queenstown
- Include metaTitle, metaDescription, h1Title, introContent for each
- Create seed script and run
- **Priority**: P2
- **Depends on**: nothing

### T3.4: Research and generate AU keyword additions
- Augment existing ~95 AU keywords to ~100
- Fill gaps in: investment language, regulatory terms, location-specific terms
- Add to seed script
- **Priority**: P2
- **Depends on**: T3.1 (UI to verify)

### T3.5: Research and generate NZ keywords (~60)
- Cover: market terms (CV, RV, deadline sale), investment (bright-line, ring-fencing), regulatory (OIO, resource consent), location terms, property types (bach, lifestyle block, cross-lease)
- Add to seed script
- **Priority**: P2
- **Depends on**: T3.1, T3.3 (NZ locations must exist)

### T3.6: Research and generate UK keywords (~70)
- Cover: market terms (chain-free, gazumping, SSTC), investment (buy-to-let, Section 24, HMO), regulatory (SDLT, leasehold reform), location terms (zone 1-6, commuter belt), property types (terraced, semi-detached, maisonette)
- Add to seed script
- **Priority**: P2
- **Depends on**: T3.1

### T3.7: Research and generate US keywords (~70)
- Cover: market terms (closing costs, MLS, earnest money), investment (cap rate, 1031 exchange, DSCR), regulatory (property tax, HOA, FHA), location terms (Sun Belt, tri-state), property types (condo, multi-family, manufactured)
- Add to seed script
- **Priority**: P2
- **Depends on**: T3.1

### T3.8: Research and generate CA keywords (~70)
- Cover: market terms (firm offer, assignment sale), investment (Smith Maneuver, HELOC), regulatory (stress test, CMHC, land transfer tax), location terms (GTA, GVA, Golden Horseshoe), property types (row house, laneway house)
- Add to seed script
- **Priority**: P2
- **Depends on**: T3.1

### T3.9: Add bulk keyword operations to admin
- Bulk add: paste multiple keywords at once
- Bulk delete: select and delete multiple
- Backend: `POST /api/admin/seo/keywords/bulk`, `DELETE /api/admin/seo/keywords/bulk`
- **Priority**: P3
- **Depends on**: T3.1

## Phase 4: Keyword Injection

### T4.1: Inject keywords into article page meta tags
- Update `crawlerSsr.js` for article pages
- Query `SeoKeyword` matching article's market + location + category
- Set `<meta name="keywords">` with top 5-8 matches sorted by priority
- **Priority**: P2
- **Depends on**: T3.4 or T3.5 or T3.6 or T3.7 or T3.8 (at least some keywords must be seeded)

### T4.2: Inject keywords into location page meta tags
- Update `crawlerSsr.js` for location pages
- Query keywords matching market + location
- Set `<meta name="keywords">` and enrich meta description
- **Priority**: P2
- **Depends on**: T4.1 (same middleware, build incrementally)

### T4.3: Inject keywords into category and home page meta tags
- Update `crawlerSsr.js` for category pages (keywords matching category) and home page (top national keywords)
- **Priority**: P3
- **Depends on**: T4.2

## Phase 5: Article Audit

### T5.1: Build article relevance audit script
- Create `server/scripts/audit-article-relevance.js`
- Query DRAFT articles without a `relevanceScore`
- Call AI for each (rate-limited 1/sec) with title + content
- Store score, apply threshold rules (delete <4, keep 4-6, publish 7+)
- Log progress and final report
- **Priority**: P2
- **Depends on**: T2.3 (relevance scoring in worker), Spec 1 T3.1 (empty articles cleaned first)

### T5.2: Add article audit admin maintenance endpoint
- Add `POST /api/admin/articles/maintenance/audit-relevance`
- Enqueue as BullMQ job (long-running)
- Return job ID for status polling
- Add `GET /maintenance/audit-relevance/:jobId` for progress
- **Priority**: P2
- **Depends on**: T5.1

## Task Summary

Total: 22 tasks
Immediately unblocked: 8 (T1.1, T1.2, T1.3, T2.1, T3.1, T3.3, T3.6, T3.7, T3.8)
Blocked: 14
