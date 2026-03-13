# Platform Polish & Semantic Search — Spec

## 1. Duplicate Articles & Images

### Problem
Current dedup is URL-only (`articleProcessWorker.js:16-26`). Same article from different sources (e.g. RSS + NewsAPI) passes dedup because URLs differ. Images are also duplicated — either the same AI-generated image is reused or near-identical images are generated for similar articles.

### Solution

**Article dedup — content hash:**
- Add `contentHash String?` column to Article model (index it)
- In `articleProcessWorker`, after URL dedup passes, compute a SHA-256 hash of `normalise(title) + normalise(first 500 chars of content)`
- Normalise = lowercase, strip punctuation, collapse whitespace
- If hash matches an existing article, skip the new one
- Add a title similarity check: if Levenshtein distance between new title and any existing title (same day, same market) is <15%, skip

**Image dedup:**
- Before generating a new image, check if an article with the same `contentHash` already has an image — reuse it
- Add a `imageHash String?` column to Article for perceptual hashing (deferred — manual review for now)
- Write a cleanup script to find articles sharing identical `imageUrl` values and regenerate duplicates

**Existing duplicate cleanup:**
- Script: query articles grouped by `contentHash`, flag duplicates, keep the one with highest `relevanceScore`
- Script: query articles grouped by `imageUrl`, regenerate images for duplicates

### Acceptance
- No two published articles with the same content hash exist in the feed
- No two articles share the same `imageUrl` (unless it's a source-provided URL)

---

## 2. Google OAuth Fix

### Problem
Google sign-in returns internal server error. Could be misconfigured Google Cloud Console or code-side callback handling.

### Solution

**Code fixes:**
- Add error logging to the Google OAuth callback in `server/routes/auth.js:368-381` — currently failures redirect silently
- Ensure `passport.js` handles edge cases: missing `profile.emails`, existing user with same email but different `googleId`
- Add a health-check endpoint `GET /api/auth/google/status` that returns whether Google OAuth is configured (env vars present, strategy loaded)

**Diagnostic checklist for Dan:**
- Google Cloud Console → APIs & Services → Credentials
  - OAuth 2.0 Client ID exists with type "Web application"
  - Authorized redirect URIs includes: `https://propertyhack.au/api/auth/google/callback` (production) and `http://localhost:3001/api/auth/google/callback` (local)
  - Authorized JavaScript origins includes: `https://propertyhack.au` and `http://localhost:3004`
- OAuth consent screen: Publishing status is "In production" (not "Testing" — testing limits to 100 test users)
- Env vars set in `server/.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`

### Acceptance
- Google OAuth completes sign-in flow end-to-end (new user + returning user)
- Clear error messages logged on failure (not silent redirect)

---

## 3. Saved Scenario → Calculator 404

### Problem
`ScenarioDashboard.tsx:287-292` builds URLs as `/tools/{calculator}?scenario={id}` — missing the `/:country` prefix required by the routing in `App.tsx:186-195` where calculators are nested under `/:country/tools/...`.

### Solution
- In `handleOpen`, use the scenario's `market` field to derive the country slug (e.g. `AU` → `au`)
- Build URL as `/${country}/tools/${route}?scenario=${id}`
- Add market-specific calculator route mapping for transfer tax variants (UK → `sdlt-calculator`, CA → `land-transfer-tax-calculator`, US → `transfer-tax-calculator`, NZ → `buying-costs-calculator`)

### Acceptance
- Opening any saved scenario navigates to the correct calculator with inputs pre-filled
- Works for all markets (AU, NZ, UK, US, CA)

---

## 4. Profile → Calculator 404

### Problem
Same root cause as #3 — any calculator links from profile pages are missing the country prefix.

### Solution
- Ensure all calculator links from `ProfilePage.tsx` and `ScenarioDashboard.tsx` include the country prefix
- Use the user's preferred market (from profile/preferences) or fall back to the current country context

### Acceptance
- All links from profile to calculators resolve correctly

---

## 5. Rent vs Buy Calculator — "Calculation Failed"

### Problem
`RentVsBuyCalculator.tsx` fails on initial load. Likely cause: the component sends a calculation request with default inputs that the backend rejects. The component has its own custom layout (doesn't use `CalculatorLayout`) and may have initialization issues — e.g. `weeklyRent` is 0 for monthly markets and vice versa (lines 152-153), which could cause division-by-zero or validation failure on the backend.

### Solution
- Debug the exact error by checking the backend `/api/calculators/rent-vs-buy/calculate` response for the default inputs
- Fix default inputs to ensure all required fields have valid non-zero values
- Add graceful handling: don't auto-calculate on mount if inputs are at defaults — wait for user input (matching behaviour of other calculators)
- If the backend validation is too strict, relax it to accept zero rent as valid

### Acceptance
- Rent vs Buy calculator loads without error
- Shows "Enter your details" empty state until user modifies inputs

---

## 6. No Navigation Back from Profile

### Problem
`ProfilePage.tsx` renders no Header or Footer. The only navigation is "View All Scenarios →". Users are trapped on the profile page with no way back to the main site.

### Solution
- Add the standard `Header` and `Footer` components to the profile page layout
- Or: wrap profile routes in a layout that includes Header/Footer (similar to how `CountryLayout` works for public pages)
- Ensure the PropertyHack logo in the header links back to the home feed

### Acceptance
- Profile page has the standard site header with logo, search, and navigation
- User can click the logo or a nav link to return to the main feed

---

## 7. Calculator Link from Saved Scenarios

### Problem
The ScenarioDashboard shows scenario cards but no prominent link to browse/use calculators — users may want to create new scenarios.

### Solution
- Add a prominent gold-branded button ("Explore Calculators" or similar) at the top of the ScenarioDashboard, styled with `bg-brand-gold text-white` (matching the site's button style)
- Link to `/${country}/tools` (the ToolsIndex page)
- Show this button whether or not scenarios exist (but especially useful when the list is empty)

### Acceptance
- Gold button visible at top of saved scenarios page
- Links to the calculators/tools index for the user's market

---

## 8. Rental Yield Calculator Layout

### Problem
Input panel (left) has only Purchase Price + Weekly Rent + collapsed Advanced section. Result panel (right) has 4-5 cards. Visual imbalance.

### Solution
Options (pick one during design):
- **A)** Default the "Advanced — Expenses" section to expanded, so the left panel has more visible content
- **B)** Move the Yield Comparison chart and/or Benchmark text to a full-width section below both panels (in the `footerSection` of `CalculatorLayout`)
- **C)** Stack some result cards horizontally to reduce right-panel height

Recommended: **A + B** — expand Advanced by default, move the chart to footer section.

### Acceptance
- Left and right panels are approximately visually balanced
- No content is hidden or removed — just reorganised

---

## 9. Stamp Duty Investment Note — Gold Not Blue

### Problem
The notes box in `StampDutyCalculator.tsx:272-278` uses `bg-blue-50 border-blue-200` styling. When the primary residence toggle is off (investment property), the note says "Investment property — standard stamp duty rates apply (no primary residence concession)". Blue looks like a warning/error; this is just informational.

### Solution
- When the note content indicates investment property (no concession), style the box with brand gold: `bg-amber-50 border-brand-gold/30 text-brand-gold`
- Keep blue styling for other notes (or switch all notes to gold for consistency)
- Alternatively, use a gold-tinted info box for all calculator notes since they're always informational

### Acceptance
- Investment property note displays with gold/amber styling, not blue
- Visually reads as "neutral info", not "warning" or "error"

---

## 10. Mortgage Yearly Breakdown Padding

### Problem
In `MortgageCalculator.tsx:516-544`, the Year column (left-most) and Balance column (right-most) sit tight against the container edges.

### Solution
- Add `pl-2` or `pl-4` to the Year column cells and header
- Add `pr-2` or `pr-4` to the Balance column cells and header
- Or: add `px-4` padding to the table's parent `<div>` container

### Acceptance
- Year and Balance columns have visible breathing room from container edges
- Table looks balanced on desktop and doesn't break on mobile

---

## 11. Semantic Search with AI Overview

### Problem
The search bar navigates to the feed with a `?search=` param. The backend already uses pgvector for semantic ordering, but there's no AI-generated summary of results.

### Solution

**New endpoint: `GET /api/articles/search-overview`**
- Accepts: `search` (query string), `country` (market filter)
- Process:
  1. Generate embedding for search query
  2. Find top 10 most similar articles via pgvector
  3. Send article titles + shortBlurbs to AI (via `aiProviderService`) with prompt: "Based on these property news articles, provide a brief overview of what can be inferred about '{query}'. Maximum 150 words. Be factual and cite specific trends."
  4. If response > 150 words, retry once with: "Your response was too long. Summarise in under 150 words."
  5. Return: `{ overview: string, articles: Article[] }`

**Frontend changes:**
- New search results page component (or modify the existing feed page when `?search=` is present)
- Show AI overview in a highlighted card at the top of results
- Below: show matched articles as normal feed cards with relevance indicators
- Loading state: show skeleton for AI overview while it generates

### Acceptance
- Search returns semantically relevant articles (not just keyword matches)
- AI overview appears above results, ≤150 words, factual
- Overview references actual trends from matched articles
- Graceful fallback if AI generation fails (just show articles, no overview)

---

## 12. Image Quality & Missing Images

### Problem
Some AI-generated images are poor quality — not using the dynamic category-aware prompt with vintage camera styles. Some articles have missing images entirely.

### Solution

**Prompt audit:**
- Verify `imageGenerationService.js` always passes `category` from the article to `buildImagePrompt`
- Check that the DB `SystemPrompt` for `image-generation` (if it exists) includes the `{category_elements}` and `{camera}/{film}/{look}` placeholders
- If the DB prompt overrides the defaults but is missing placeholders, fix it or remove the DB override

**Missing image handling:**
- In the image worker, if generation fails after all retries, set a flag `imageGenerationFailed: true` on the article (or use a specific fallback URL pattern)
- Add a re-generation endpoint or admin action: "Regenerate image" button on admin article editor
- Write a script to find articles with missing/fallback images and re-enqueue them for image generation

**Quality check:**
- After image generation, verify the image file is >10KB (tiny files indicate generation failure)
- Log the full prompt used for each image so quality issues can be traced

### Acceptance
- All new articles with relevanceScore ≥7 get a category-appropriate, vintage-styled AI image
- Admin can regenerate images for individual articles
- No articles display broken image icons
- Fallback SVG is used gracefully when AI generation fails

---

## Data Model Changes

```prisma
model Article {
  // Existing fields...
  contentHash          String?   // SHA-256 of normalised title+content for dedup
  imageGenerationFailed Boolean  @default(false)

  @@index([contentHash])
}
```

## New API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/articles/search-overview` | Semantic search + AI overview |
| GET | `/api/auth/google/status` | Google OAuth config health check |
| POST | `/api/admin/articles/:id/regenerate-image` | Re-enqueue image generation |

## Modified API Endpoints

| Method | Path | Change |
|---|---|---|
| GET | `/api/articles` | No change (vector search already works) |

## Frontend Components — New

| Component | Purpose |
|---|---|
| `SearchResults.tsx` | Search results page with AI overview card + article list |

## Frontend Components — Modified

| Component | Change |
|---|---|
| `ScenarioDashboard.tsx` | Fix Open URL to include country prefix; add gold "Explore Calculators" button |
| `ProfilePage.tsx` | Add Header/Footer or wrap in layout with navigation |
| `RentalYieldCalculator.tsx` | Expand Advanced section by default; move chart to footer |
| `StampDutyCalculator.tsx` | Change investment property note from blue to gold styling |
| `RentVsBuyCalculator.tsx` | Fix calculation failure on load; don't auto-calc with defaults |
| `MortgageCalculator.tsx` | Add padding to Year and Balance columns in yearly breakdown |
