# Platform Polish & Semantic Search — Design

## Architecture Overview

No new services or infrastructure. Changes are scoped to:
- Prisma schema (2 new columns)
- Existing backend routes + 2 new endpoints
- Frontend component fixes and 1 new component
- 2 cleanup/audit scripts

---

## 1. Article Dedup — Content Hash

### Schema
```prisma
model Article {
  contentHash            String?
  imageGenerationFailed  Boolean  @default(false)
  @@index([contentHash])
}
```

### articleProcessWorker.js changes
After the existing URL dedup check (line 26), add:

```
1. Normalise: lowercase title, strip punctuation, collapse whitespace
2. Take first 500 chars of content body, same normalisation
3. SHA-256 hash of `normalisedTitle + '|' + normalisedContent`
4. Query: prisma.article.findFirst({ where: { contentHash } })
5. If match → skip (return { skipped: true, reason: 'content_duplicate' })
6. Store contentHash on the new article record
```

### Title similarity fallback
After hash check, query articles from the same day + market with Prisma:
```
WHERE market = X AND publishedAt >= startOfDay AND publishedAt <= endOfDay
```
Compare titles using a simple normalised string comparison (exact match after normalisation). Full Levenshtein is overkill — normalised exact match catches 90% of cases without a library dependency.

### Cleanup script: `server/scripts/dedup-existing-articles.js`
- Compute `contentHash` for all articles missing it
- Group by hash, keep highest `relevanceScore`, mark others as `ARCHIVED`
- Find articles sharing `imageUrl`, log them for manual review
- Run as one-off: `node server/scripts/dedup-existing-articles.js`

---

## 2. Google OAuth Fix

### Debug flow
1. Add try/catch with detailed logging around the passport verify callback in `server/passport.js`
2. In `server/routes/auth.js`, add an error-handling middleware after the Google callback route that logs the full error before redirecting
3. Add `GET /api/auth/google/status`:
   ```json
   {
     "configured": true/false,
     "clientIdSet": true/false,
     "clientSecretSet": true/false,
     "callbackUrl": "https://..."
   }
   ```

### Checklist output
Create a diagnostic route that Dan can hit in the browser. Also output a checklist to the console on server startup if Google env vars are missing.

### Common failure modes to handle
- `profile.emails` is undefined (Google account with no email) — return error, don't crash
- User exists with same email but `googleId` is null — already handled (links account), but add logging
- `GOOGLE_CALLBACK_URL` doesn't match what's in Google Console — log the configured URL on startup

---

## 3 & 4. Scenario & Profile Navigation 404s

### Root cause
`ScenarioDashboard.tsx:287-292` builds `/tools/${route}?scenario=${id}` — missing `/:country` prefix.

`App.tsx:186-195` nests calculators under `/:country/tools/...`.

### Fix in ScenarioDashboard.tsx

```typescript
const MARKET_TO_COUNTRY: Record<string, string> = {
  AU: 'au', NZ: 'nz', UK: 'uk', US: 'us', CA: 'ca'
};

const CALCULATOR_ROUTES: Record<string, Record<string, string>> = {
  MORTGAGE: { default: 'mortgage-calculator' },
  STAMP_DUTY: {
    default: 'stamp-duty-calculator',
    UK: 'sdlt-calculator',
    CA: 'land-transfer-tax-calculator',
    US: 'transfer-tax-calculator',
    NZ: 'buying-costs-calculator',
  },
  RENTAL_YIELD: { default: 'rental-yield-calculator' },
  BORROWING_POWER: { default: 'borrowing-power-calculator' },
  RENT_VS_BUY: { default: 'rent-vs-buy-calculator' },
  BUYING_COSTS: { default: 'buying-costs-calculator' },
};

const handleOpen = (scenario: Scenario) => {
  const routes = CALCULATOR_ROUTES[scenario.calculatorType];
  const route = routes?.[scenario.market] || routes?.default;
  const country = MARKET_TO_COUNTRY[scenario.market] || 'au';
  if (route) {
    navigate(`/${country}/tools/${route}?scenario=${scenario.id}`);
  }
};
```

### Profile page layout fix
Wrap `/profile` and `/profile/scenarios` routes in a layout component that renders `<Header />` and `<Footer />`. Two options:

**Option A** — Create a `ProfileLayout.tsx` wrapper:
```tsx
const ProfileLayout = () => (
  <>
    <Header />
    <main className="min-h-screen bg-base-200">
      <Outlet />
    </main>
    <Footer />
  </>
);
```
Then in `App.tsx`, nest profile routes inside this layout.

**Option B** — Add Header/Footer directly to ProfilePage and ScenarioDashboard.

**Recommended: Option A** — single source of truth, consistent across all profile routes.

---

## 5. Rent vs Buy Calculator Fix

### Root cause
`useCalculator.ts` auto-fires calculation on mount via the debounced `useEffect` (line 86) when `inputs` state initializes. The Rent vs Buy calculator sets `weeklyRent: 0` for monthly markets (line 152), and the backend likely fails on zero rent.

### Fix
In `RentVsBuyCalculator.tsx`, add a `skipInitialCalculation` flag:
- Pass `skipInitialCalculation: true` to `useCalculator`
- In `useCalculator.ts`, add support for this option: skip the first debounced calculation, only calculate after user interaction changes an input

Alternative (simpler): In the Rent vs Buy `getDefaultInputs`, set sensible non-zero defaults for all markets (e.g. `weeklyRent: 500` for AU, `monthlyRent: 2000` for US). This matches how other calculators work — they have non-zero defaults and calculate immediately.

**Recommended: non-zero defaults** — simpler, consistent with other calculators, immediately shows a useful result.

---

## 6. Calculator Link from Saved Scenarios

### ScenarioDashboard.tsx changes
Add above the filter bar:

```tsx
<Link
  to={`/${country}/tools`}
  className="inline-flex items-center gap-2 bg-brand-gold text-white
             font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-gold/90
             transition-colors shadow-sm"
>
  <Calculator className="w-4 h-4" />
  Explore Calculators
</Link>
```

Use the user's preferred market from their profile preferences (or default to `au`).

---

## 7. Rental Yield Calculator Layout Rebalance

### Changes to RentalYieldCalculator.tsx

1. **Expand Advanced section by default**: Change `<ExpandableSection>` from default to `defaultOpen={true}`

2. **Move Yield Comparison chart to footer**: Extract the Recharts `BarChart` and benchmark text from the results panel. Pass them via the `footer` prop to `CalculatorLayout`:
   ```tsx
   <CalculatorLayout
     inputs={inputPanel}
     results={resultPanel}
     footer={yieldComparisonSection}
   />
   ```

This makes the left panel taller (expanded expenses) and the right panel shorter (no chart), achieving visual balance. The chart gets full width in the footer which is actually better for readability.

---

## 8. Stamp Duty Note Color

### StampDutyCalculator.tsx changes
At lines 272-278, change the notes box styling:

**From:**
```tsx
<div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
```

**To:**
```tsx
<div className="bg-amber-50 border border-brand-gold/30 rounded-xl p-4">
```

And the text inside from `text-blue-800` (if present) to `text-amber-800`.

This matches the brand gold palette and reads as informational rather than warning/error.

---

## 9. Mortgage Table Padding

### MortgageCalculator.tsx changes
At lines 516-544, add padding to the table container and adjust column padding:

**Table container:** Add `px-4` to the parent `<div className="overflow-x-auto">` → `<div className="overflow-x-auto px-4">`

**Year column (first):** Add `pl-1` to `<th>` and `<td>` for the Year column.

**Balance column (last):** Add `pr-1` to `<th>` and `<td>` for the Balance column.

The `px-4` on the container handles most of the breathing room. Column-level tweaks are minimal.

---

## 10. Semantic Search with AI Overview

### New endpoint: `GET /api/articles/search-overview`

**File:** `server/routes/public/articles.js`

```
Input:  ?search=string&country=string
Output: { overview: string, articles: Article[], query: string }
```

**Flow:**
1. Generate embedding via `embeddingService.generateEmbedding(search)`
2. Vector search top 10 published articles (reuse existing SQL pattern from the main search endpoint)
3. Build context string: concatenate `title + ': ' + shortBlurb` for each matched article
4. Call `aiProviderService.generateText('article-summarisation', prompt)` with:
   - System prompt: "You are a property market analyst. Based on the provided article summaries, give a brief factual overview responding to the user's query. Maximum 150 words. Reference specific trends or data points from the articles."
   - User prompt: `Query: "${search}"\n\nArticles:\n${context}`
   - `maxTokens: 300` (roughly 150 words)
5. Word count check: if `overview.split(/\s+/).length > 150`, retry once with appended instruction: "IMPORTANT: Your previous response was over 150 words. This response MUST be under 150 words."
6. Return overview + the 10 articles (shaped same as regular search results)

**Error handling:** If AI generation fails, return `overview: null` and still return the articles.

### Frontend: SearchResults component

**File:** `components/public/SearchResults.tsx`

Rendered when the feed page has a `?search=` param. Layout:

```
┌─────────────────────────────────────┐
│ 🔍 Results for "your query"         │
├─────────────────────────────────────┤
│ AI Overview (gold-bordered card)    │
│ "Based on our coverage, ..."        │
│ Loading: skeleton pulse animation   │
├─────────────────────────────────────┤
│ ArticleCard  ArticleCard            │
│ ArticleCard  ArticleCard            │
│ ...                                 │
└─────────────────────────────────────┘
```

- AI overview card: `bg-amber-50/50 border border-brand-gold/20 rounded-xl p-5`
- Fetch `/api/articles/search-overview` on mount
- Show articles immediately from the existing `/api/articles?search=` endpoint
- AI overview loads async (may take 2-3 seconds) — show skeleton meanwhile

### Existing search stays as-is
The current `GET /api/articles?search=` endpoint already does vector search. The new endpoint adds the AI overview layer on top. The frontend calls both: articles endpoint for the feed, overview endpoint for the AI summary.

---

## 11. Image Quality Fixes

### imageGenerationService.js audit

**Check 1:** Ensure `buildImagePrompt` always receives the article's category. Trace from `articleImageWorker` → verify it passes `article.category` (not undefined).

**Check 2:** If a `SystemPrompt` DB record exists for `image-generation`, verify it includes all placeholders: `{category_elements}`, `{title}`, `{shortBlurb}`, `{camera}`, `{film}`, `{look}`.

**Check 3:** After image generation, verify file size > 10KB before saving. If under, treat as failed.

### Missing image fallback
- Set `imageGenerationFailed = true` on the article when all retries exhaust
- Frontend: if `imageUrl` is null/empty, show a styled placeholder (not a broken image icon) — gradient background with the article category as text

### Admin regenerate endpoint
`POST /api/admin/articles/:id/regenerate-image`
- Clears `imageUrl`, `imageAltText`, `imageGenerationFailed`
- Enqueues to `articleImageQueue`
- Returns `{ success: true, message: 'Image regeneration queued' }`

### Cleanup script: `server/scripts/audit-article-images.js`
- Find articles where `imageUrl` is null AND `imageGenerationFailed` is false AND `relevanceScore >= 7`
- Re-enqueue them for image generation
- Find articles where `imageUrl` points to a file that doesn't exist on disk
- Report statistics

---

## Testing Strategy

| Area | Test Type | What |
|---|---|---|
| Content hash dedup | Unit | Hash generation, normalisation, collision detection |
| Search overview | Integration | Endpoint returns overview + articles, handles AI failure |
| Scenario URL building | Unit | All market × calculator type combinations produce valid URLs |
| Google OAuth | Manual | Full flow with Dan's Google account |
| Calculator fixes | E2E | Rent vs Buy loads, Stamp Duty shows gold note, Mortgage table renders |
| Image audit script | Manual | Run once, verify output |

---

## File Change Summary

### New Files
| File | Purpose |
|---|---|
| `server/scripts/dedup-existing-articles.js` | One-off cleanup of duplicate articles |
| `server/scripts/audit-article-images.js` | Find and re-queue missing/broken images |
| `components/public/SearchResults.tsx` | Search results page with AI overview |
| `components/layout/ProfileLayout.tsx` | Header+Footer wrapper for profile routes |

### Modified Files
| File | Change |
|---|---|
| `server/prisma/schema.prisma` | Add `contentHash`, `imageGenerationFailed` to Article |
| `server/workers/articleProcessWorker.js` | Content hash dedup after URL dedup |
| `server/routes/auth.js` | Google OAuth error logging, status endpoint |
| `server/passport.js` | Better error handling in verify callback |
| `server/routes/public/articles.js` | New `search-overview` endpoint |
| `server/services/imageGenerationService.js` | File size check, logging |
| `server/routes/admin/articles.js` | Regenerate image endpoint |
| `components/user/ScenarioDashboard.tsx` | Fix URL building, add gold calculator button |
| `components/user/ProfilePage.tsx` | (no changes — wrapped by ProfileLayout instead) |
| `components/calculators/RentalYieldCalculator.tsx` | Expand Advanced, move chart to footer |
| `components/calculators/StampDutyCalculator.tsx` | Blue → gold note styling |
| `components/calculators/RentVsBuyCalculator.tsx` | Non-zero default inputs |
| `components/calculators/MortgageCalculator.tsx` | Table padding |
| `App.tsx` | Wrap profile routes in ProfileLayout |
