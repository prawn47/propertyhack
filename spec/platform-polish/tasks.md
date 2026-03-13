# Platform Polish & Semantic Search — Tasks

## Phase 1: Critical Fixes

### T1 — Prisma schema: add contentHash and imageGenerationFailed
- Add `contentHash String?` with `@@index([contentHash])` to Article model
- Add `imageGenerationFailed Boolean @default(false)` to Article model
- Run `npx prisma migrate dev --name add-content-hash-and-image-failed`
- Regenerate Prisma client
- **Verify:** `npx prisma studio` shows new columns on Article

### T2 — Content hash utility
- **Depends on: T1**
- Create `server/utils/contentHash.js`
- Export `generateContentHash(title, content)`: normalise (lowercase, strip punctuation, collapse whitespace), SHA-256 of `normalisedTitle + '|' + first500CharsNormalisedContent`
- Export `normaliseText(text)` for reuse
- Unit test: two articles with same title+content produce same hash; different content produces different hash
- **Verify:** Run unit test

### T3 — Wire content hash dedup into articleProcessWorker
- **Depends on: T2**
- In `articleProcessWorker.js`, after URL dedup (line 26):
  1. Import `generateContentHash` from `../utils/contentHash`
  2. Compute hash from article title + content
  3. Query `prisma.article.findFirst({ where: { contentHash } })`
  4. If match → return `{ skipped: true, reason: 'content_duplicate' }`
- Also check normalised exact title match for same day + same market
- Store `contentHash` on new article creation (add to the `prisma.article.create` call)
- **Verify:** Process two articles with different URLs but same title+content — second is skipped with log message

### T4 — Existing duplicate cleanup script
- **Depends on: T2**
- Create `server/scripts/dedup-existing-articles.js`
- Import `generateContentHash` utility
- Compute and backfill `contentHash` for all articles missing it (batch of 100)
- Group by hash, keep highest `relevanceScore`, set others to `status: 'ARCHIVED'`
- Find articles sharing same `imageUrl`, log to console for review
- **Verify:** Run script, check output shows archived count and image duplicate report

### T5 — Fix ScenarioDashboard URL building (404 fix)
- In `ScenarioDashboard.tsx`, add `MARKET_TO_COUNTRY` map: `{ AU: 'au', NZ: 'nz', UK: 'uk', US: 'us', CA: 'ca' }`
- Add per-market calculator route map for transfer tax variants (UK→sdlt-calculator, CA→land-transfer-tax-calculator, US→transfer-tax-calculator, NZ→buying-costs-calculator)
- Change `handleOpen` to build `/${country}/tools/${route}?scenario=${id}` using scenario's `market` field
- **Verify:** Confirm URL building for all market × calculator type combinations produces valid paths (AU stamp duty → `/au/tools/stamp-duty-calculator`, UK stamp duty → `/uk/tools/sdlt-calculator`, etc.)

### T6 — Profile page layout with Header/Footer
- Create `components/layout/ProfileLayout.tsx`: renders `<Header />`, `<main>` with `<Outlet />`, `<Footer />`
- In `App.tsx`, wrap `/profile` and `/profile/scenarios` routes inside `<Route element={<ProfileLayout />}>` using nested routes
- Check if ProfilePage or ScenarioDashboard already render their own Header/Footer — remove duplicates if so
- **Verify:** Navigate to `/profile` — site header visible with logo, search bar, user menu. Logo links to home.

### T7 — Rent vs Buy calculator: fix default inputs
- In `RentVsBuyCalculator.tsx`, update `getDefaultInputs` to use sensible non-zero defaults per market:
  - AU: weeklyRent 600, purchasePrice 750000
  - NZ: weeklyRent 550, purchasePrice 700000
  - UK: monthlyRent 1500, purchasePrice 300000
  - US: monthlyRent 2000, purchasePrice 400000
  - CA: monthlyRent 2000, purchasePrice 500000
- Ensure both `weeklyRent` and `monthlyRent` fields are non-zero (set weekly = monthly * 12 / 52 and vice versa)
- **Verify:** Load `/au/tools/rent-vs-buy-calculator` fresh — no "calculation failed" error, shows results with defaults

### T8 — Google OAuth: error logging and edge case fixes
- In `server/passport.js`, wrap the verify callback body in try/catch, `console.error` the full error with stack trace
- Handle edge case: `profile.emails` is undefined or empty array — return clear error via `done(null, false, { message: 'No email from Google' })`
- In `server/routes/auth.js`, add error-handling middleware after the Google callback route that logs the full error before redirecting to `/login?error=oauth_failed`
- Log the configured `GOOGLE_CALLBACK_URL` on server startup when Google env vars are present
- **Verify:** Server starts with Google env vars → logs callback URL. Trigger a failure scenario → error appears in server logs with full details.

### T9 — Google OAuth: diagnostic status endpoint
- Add `GET /api/auth/google/status` in `server/routes/auth.js`
- Return JSON: `{ configured: bool, clientIdSet: bool, clientSecretSet: bool, callbackUrl: string }`
- No auth required (public endpoint — only reveals config presence, not secrets)
- **Verify:** `curl http://localhost:3001/api/auth/google/status` returns config info

---

## Phase 2: UX Polish (all independent, no Phase 1 dependencies)

### T10 — Gold "Explore Calculators" button on ScenarioDashboard
- In `ScenarioDashboard.tsx`, add a button above the filter bar
- Style: `bg-brand-gold text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-gold/90 transition-colors shadow-sm`
- Link to `/${country}/tools` — derive country from the user's scenarios (most common market) or default to `au`
- Show whether or not scenarios exist
- **Verify:** Button visible on scenarios page, clicking it navigates to the tools index

### T11 — Stamp duty investment note: blue → gold
- In `StampDutyCalculator.tsx`, find the notes box (uses `bg-blue-50 border-blue-200`)
- Change to `bg-amber-50 border border-brand-gold/30`
- Change text color from any blue tones to `text-amber-800`
- Leave the concession note styling (already `bg-amber-50`) unchanged
- **Verify:** Set primary residence toggle off → note displays in gold/amber, not blue

### T12 — Rental yield calculator: expand Advanced and move chart to footer
- In `RentalYieldCalculator.tsx`:
  1. Change the "Advanced — Expenses" `ExpandableSection` to `defaultOpen={true}`
  2. Extract the Recharts `BarChart` "Yield Comparison" section and benchmark text from the results panel
  3. Pass extracted content as the `footer` prop to `CalculatorLayout`
- Do NOT remove any content — just reorganise
- **Verify:** Left panel shows expanded expenses (taller). Right panel has fewer cards. Chart displays full-width below both panels.

### T13 — Mortgage yearly breakdown table padding
- In `MortgageCalculator.tsx`, find the yearly breakdown table (inside `footerSection`)
- Add `px-4` to the `<div className="overflow-x-auto">` container
- Add `pl-1` to Year column `<th>` and `<td>`
- Add `pr-1` to Balance column `<th>` and `<td>`
- **Verify:** Year and Balance columns have visible breathing room from container edges

---

## Phase 3: Semantic Search

### T14 — Search overview API endpoint
- **Depends on: T1** (needs stable schema)
- Add `GET /api/articles/search-overview` in `server/routes/public/articles.js`
- Accept query params: `search` (required), `country` (optional)
- Steps:
  1. Generate embedding via `embeddingService.generateEmbedding(search)`
  2. Vector search top 10 published articles (reuse the existing SQL pattern from the main GET /api/articles search — copy and simplify, no pagination needed)
  3. Build context: concatenate `title + ': ' + shortBlurb` for each article
  4. Call `aiProviderService.generateText('article-summarisation', userPrompt, { systemPrompt, maxTokens: 300 })`
  5. System prompt: "You are a property market analyst. Based on the provided article summaries, give a brief factual overview responding to the user's query. Maximum 150 words. Reference specific trends or data points."
  6. Word count check: if `response.split(/\s+/).length > 150`, retry once appending "IMPORTANT: Under 150 words."
  7. Return `{ overview: string|null, articles: Article[], query: string }`
  8. If embedding OR AI fails, return `overview: null` with articles (or empty array)
- **Verify:** `curl '/api/articles/search-overview?search=interest+rates&country=AU'` returns JSON with overview text and articles array

### T15 — SearchResults frontend component
- **Depends on: T14**
- Create `components/public/SearchResults.tsx`
- Props: `query: string`, `country: string`
- Fetches from `/api/articles/search-overview?search=${query}&country=${country}` on mount
- Renders:
  1. Heading: "Results for '{query}'"
  2. AI overview card: `bg-amber-50/50 border border-brand-gold/20 rounded-xl p-5` — skeleton pulse while loading
  3. If `overview` is null, don't render the overview card (just articles)
- Does NOT render articles itself — that's handled by the existing feed
- **Verify:** Component renders overview card with text, shows skeleton while loading

### T16 — Wire SearchResults into feed page
- **Depends on: T15**
- In the PublicFeed component (or wherever the `?search=` param is consumed):
  1. When `search` param is present, render `<SearchResults query={search} country={country} />` above the article grid
  2. Keep existing article grid below (it already filters by search)
- **Verify:** Search "property prices" from the header → see AI overview card above article results. Clear search → overview disappears.

---

## Phase 4: Image Quality

### T17 — Image generation: prompt audit and file size check
- **Depends on: T1**
- Read the image worker that processes the `articleImageQueue` — verify it passes `article.category` to `generateArticleImage`. If category is missing/undefined, fetch it from DB.
- In `imageGenerationService.js`:
  1. After image data is returned from Gemini, check `imageData.length > 10240` (10KB). If under, log warning and treat as failed attempt.
  2. Add `console.log` of the full prompt string before sending to Gemini (for debugging image quality)
- If a `SystemPrompt` DB record for `image-generation` exists, verify it includes `{category_elements}`, `{camera}`, `{film}`, `{look}` placeholders. If placeholders are missing, log a warning.
- **Verify:** Trigger image generation for an article → server logs show full prompt with category elements and camera style

### T18 — Image generation: set failure flag on exhausted retries
- **Depends on: T1, T17**
- In `imageGenerationService.js`, when all retries exhaust and fallback SVG is used:
  1. Accept `articleId` as a parameter (or return a flag indicating failure)
  2. Set `imageGenerationFailed: true` on the article via Prisma
- In the image worker, after calling `generateArticleImage`, check the result — if it's a fallback SVG path, set `imageGenerationFailed: true`
- **Verify:** Simulate image generation failure → article record has `imageGenerationFailed: true`

### T19 — Frontend: styled placeholder for missing article images
- **Depends on: T1** (no backend dependency — just handles null imageUrl)
- In `ArticleCard.tsx` (and any other component displaying article images):
  1. If `imageUrl` is null, empty, or fails to load, show a styled placeholder instead of broken image icon
  2. Placeholder: gradient background (dark to brand-gold/10) with article category text centered
  3. Use `onError` handler on `<img>` to swap to placeholder on load failure
- **Verify:** An article with no `imageUrl` shows gradient placeholder with category label. An article with a broken URL also shows placeholder (not broken icon).

### T20 — Admin: regenerate image API endpoint
- **Depends on: T1**
- Add `POST /api/admin/articles/:id/regenerate-image` in `server/routes/admin/articles.js`
- Auth: require admin JWT (same as other admin routes)
- Logic: clear `imageUrl`, `imageAltText`, set `imageGenerationFailed: false`, enqueue to `articleImageQueue`
- Return `{ success: true, message: 'Image regeneration queued' }`
- **Verify:** `curl -X POST -H "Authorization: Bearer ..." /api/admin/articles/123/regenerate-image` returns success

### T21 — Admin: regenerate image button in article editor
- **Depends on: T20**
- In the admin article editor component, add a "Regenerate Image" button near the current image display
- On click, call `POST /api/admin/articles/:id/regenerate-image`
- Show loading state while request is in flight, success toast on completion
- **Verify:** Click button in admin → toast confirms queued. After worker processes, refresh page → new image visible.

### T22 — Image audit and re-queue script
- **Depends on: T17**
- Create `server/scripts/audit-article-images.js`
- Find published articles where `imageUrl` is null AND `imageGenerationFailed` is false AND `relevanceScore >= 7` → re-enqueue to `articleImageQueue`
- Find articles where `imageUrl` points to a local file path that doesn't exist on disk → clear `imageUrl` and re-enqueue
- Print summary: total articles checked, missing images, broken paths, re-queued count
- **Verify:** Run script, check console output shows stats and re-queue counts

---

## Dependency Graph

```
T1 (schema migration)
├── T2 (content hash utility)
│   ├── T3 (wire dedup into worker)
│   └── T4 (cleanup script)
├── T14 (search overview API)
│   └── T15 (SearchResults component)
│       └── T16 (wire into feed)
├── T17 (image prompt audit)
│   ├── T18 (failure flag)
│   └── T22 (image audit script)
├── T19 (frontend image placeholder)
└── T20 (admin regenerate endpoint)
    └── T21 (admin regenerate button)

T5 (scenario 404 fix) — independent
T6 (profile layout) — independent
T7 (rent vs buy defaults) — independent
T8 (OAuth error logging) — independent
T9 (OAuth status endpoint) — independent
T10 (gold calculator button) — independent
T11 (stamp duty color) — independent
T12 (rental yield layout) — independent
T13 (mortgage padding) — independent
```

## Summary

| Phase | Tasks | Count |
|---|---|---|
| 1: Critical Fixes | T1–T9 | 9 |
| 2: UX Polish | T10–T13 | 4 |
| 3: Semantic Search | T14–T16 | 3 |
| 4: Image Quality | T17–T22 | 6 |
| **Total** | | **22** |

## Parallelisation Plan

**Wave 1 (immediate — 8 agents):** T1, T5, T6, T7, T8, T9, T11, T13
**Wave 2 (after T1 — 6 agents):** T2, T10, T12, T14, T17, T19, T20
**Wave 3 (after T2, T14, T15, T17, T20 — 5 agents):** T3, T4, T15, T18, T21, T22
**Wave 4 (after T15 — 1 agent):** T16
