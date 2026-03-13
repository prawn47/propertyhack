# Platform Polish & Semantic Search — Proposal

## Problem
PropertyHack has several UX bugs and missing polish that undermine trust — duplicate articles/images, broken calculator flows, OAuth failures, and poor navigation. Additionally, the search bar doesn't leverage the existing vector database for semantic search, missing an opportunity to surface AI-powered insights from the article back-catalogue.

## Priority Issues

### P0 — Broken Functionality
1. **Duplicate articles & images** — Many duplicate articles and duplicate/reused images appearing across the site. Current URL-based dedup isn't catching enough (e.g. same article from different source URLs, same content with minor URL variations). Duplicate images are also being generated or shared across unrelated articles.
2. **Google OAuth internal server error** — Google sign-in returns 500. Needs both codebase verification and a checklist for Dan to confirm Google Cloud Console setup (redirect URIs, consent screen, credentials).
3. **Saved scenario → calculator 404** — Opening a saved scenario from the profile/dashboard navigates to a broken URL (likely missing country prefix in the route).
4. **Profile → calculator 404** — Clicking calculator links from the profile page returns 404 (same routing issue).
5. **Rent vs Buy calculator "calculation failed"** — Calculator errors on initial load before any input is provided.

### P1 — Navigation & UX
6. **No navigation back from profile** — Profile pages have no visible link/button to return to the main PropertyHack feed.
7. **No calculator link from saved scenarios** — When scenarios exist, there's no prominent way to navigate to the calculators. Add a gold-branded button.
8. **Rental yield calculator layout imbalance** — Inputs panel (left) has only one card while results (right) has multiple. Needs visual rebalancing.
9. **Stamp duty investment note color** — The "Investment property — standard stamp duty rates apply" info box uses blue (looks like an error). Should use the brand gold to indicate a neutral informational note.
10. **Mortgage yearly breakdown padding** — Year column needs right padding, Balance column needs left padding to visually balance the table.

### P2 — Enhancement
11. **Semantic search with AI overview** — The search bar should use the existing pgvector embeddings for semantic search (it partially does already) AND generate a brief AI overview (max 150 words) summarising what can be inferred from matching articles. If the AI response exceeds 150 words, retry with a stricter prompt.
12. **Poor quality & missing article images** — Some articles have low-quality AI-generated images that don't use the correct dynamic prompt (category-specific scenes + vintage camera styles). Ensure the image generation prompt is always dynamic and category-aware. Also handle missing images gracefully.

## Scope

### In for this round
- All 12 items above
- Dedup improvements (content-based hashing, not just URL matching)
- Google OAuth diagnostic checklist + code fixes
- Search UI with AI summary panel
- Image quality audit + prompt fixes

### Explicitly deferred
- New calculator types
- User registration changes beyond OAuth fix
- Newsletter or social media features
- Mobile app
- SEO changes

## Affected Areas

| Area | Changes |
|---|---|
| **Database** | Possible new content hash column on Article for dedup; no other schema changes |
| **Backend routes** | New/modified search endpoint to return AI overview; OAuth route debugging |
| **Frontend components** | ScenarioDashboard, ProfilePage, Header, CalculatorLayout, StampDutyCalculator, RentalYieldCalculator, MortgageCalculator, RentVsBuyCalculator, search results UI |
| **Services** | imageGenerationService prompt fixes, embeddingService (search), new AI search summary service |
| **Auth** | Google OAuth passport config + callback flow |

## Breaking Risk
- **Low** — No API contract changes. Dedup improvements only affect new ingestion, not existing articles (though a cleanup script may be needed for existing duplicates).
- **OAuth** — Fixing OAuth won't break existing JWT auth; Google strategy is already conditionally loaded.

## Acceptance Criteria
1. No duplicate articles visible in the public feed (same content from different sources consolidated)
2. No duplicate images across different articles
3. Google OAuth completes full sign-in flow without error
4. Saved scenarios open correctly in their respective calculators
5. Profile pages have clear navigation back to the main site
6. Rent vs Buy calculator loads without error
7. Search returns semantically relevant results with a ≤150-word AI overview
8. All AI-generated images use the dynamic category-aware prompt with vintage camera styles
9. Stamp duty investment note displays in brand gold, not blue
10. Rental yield calculator layout is visually balanced
11. Mortgage breakdown table has proper column padding
12. Saved scenarios page has a prominent gold button linking to calculators
