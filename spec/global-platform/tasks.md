# Global Platform — Tasks

## Phase 1: Data Foundation

Tasks that add schema changes, seed data, and backend endpoints with no frontend impact.

### T1: Prisma migration — add flagEmoji to Market, country to LocationSeo
- Add `flagEmoji String @default("")` to Market model
- Add `country String @default("AU")` to LocationSeo model
- Add index on `LocationSeo.country`
- Run `npx prisma migrate dev`
- **Priority:** 1 (blocker for everything)
- **Depends on:** nothing

### T2: Seed Market flagEmoji values
- Update seed.js to set `flagEmoji` for AU (🇦🇺), US (🇺🇸), UK (🇬🇧), CA (🇨🇦)
- Upsert so it's safe to re-run
- **Priority:** 1
- **Depends on:** T1

### T3: Seed inactive ingestion sources for US/UK/CA
- 11 new IngestionSource records (4 US, 4 UK, 3 CA) — all `isActive: false`, type `rss`
- Set correct `market` values
- Include `config` JSON with `feedUrl` for each
- **Priority:** 2
- **Depends on:** T1

### T4: Seed LocationSeo records for US/UK/CA cities
- 20 US cities, 15 UK cities, 10 CA cities
- Each record: `location` (slug), `country`, `title`, `description`, `h1`, `introText`
- Update existing AU records to have `country: 'AU'` (backfill)
- **Priority:** 2
- **Depends on:** T1

### T5: Seed ArticleCategory records for US/UK/CA
- Duplicate existing AU categories with `market` set to US/UK/CA
- Same category names and slugs, different market values
- **Priority:** 3
- **Depends on:** T1

### T6: Public markets endpoint — GET /api/markets
- New route file `server/routes/public/markets.js`
- Returns active markets from Market table
- `Cache-Control: public, s-maxage=86400`
- Register in Express app
- **Priority:** 1
- **Depends on:** T2

## Phase 2: API Filtering

Backend changes to filter articles and locations by country.

### T7: Add country filter to GET /api/articles
- Accept `country` query param (AU/US/UK/CA/GLOBAL or omit)
- When set (and not GLOBAL): `WHERE (market = country OR isEvergreen = true)`
- Works alongside existing search, location, category, dateRange filters
- Apply to both Prisma query path and vector search path
- **Priority:** 1
- **Depends on:** T1

### T8: Add country filter to GET /api/articles/trending
- Same filtering logic as T7
- **Priority:** 2
- **Depends on:** T7

### T9: Add country filter to GET /api/locations
- Accept `country` query param
- Return only LocationSeo records matching that country
- Fall back to all locations if no country param
- **Priority:** 2
- **Depends on:** T4

### T10: Add Cache-Control headers to public API routes
- `/api/articles` list: `public, s-maxage=300`
- `/api/articles/:slug` detail: `public, s-maxage=3600`
- `/api/articles/trending`: `public, s-maxage=300`
- `/api/locations`: `public, s-maxage=86400`
- `/api/categories`: `public, s-maxage=86400`
- `/api/admin/*`: `private, no-store`
- **Priority:** 2
- **Depends on:** nothing

## Phase 3: Location Mapper & Frontend Foundation

Expand location detection and create the CountryContext.

### T11: Expand locationMapper.ts with US/UK/CA cities
- Add `US_CITIES` (20 metros), `UK_CITIES` (15 cities), `CA_CITIES` (10 cities) maps
- Each entry: `{ display, region, slug }`
- Update `mapToKnownLocation()` to check country first, then match city
- Export `getCitiesForCountry(country)` helper
- Return type: `{ city, region, country, slug }`
- **Priority:** 1
- **Depends on:** nothing

### T12: Create CountryContext
- New file `contexts/CountryContext.tsx`
- Provides `{ country, setCountry, markets, loading }`
- Source of truth: URL param > user preferences > localStorage > IP detection
- `setCountry`: navigates to new country URL, persists to localStorage, API call if signed in
- Fetches markets from `GET /api/markets` on mount
- **Priority:** 1
- **Depends on:** T6

### T13: Add defaultCountry to user preferences type
- Update `UserPreferences` interface in `AuthContext.tsx`
- Update `useUserPreferences.ts` to expose `defaultCountry`
- Update `PUT /api/user/profile` to accept `defaultCountry`
- **Priority:** 2
- **Depends on:** nothing

## Phase 4: Frontend Routing & UI

Country-prefixed routes, FilterBar changes, and component updates.

### T14: Restructure React Router with /:country prefix
- Wrap all public routes in `/:country` param
- Create `CountryRedirect` component at `/` — reads stored country or detects, redirects
- Country validation layout wrapper — invalid country → 404
- Admin routes unchanged
- Wrap app in `CountryProvider`
- **Priority:** 1
- **Depends on:** T12

### T15: Create useCountryPath hook
- Returns a function that prepends current country to paths
- E.g. `countryPath('/article/foo')` → `/au/article/foo`
- Reads country from CountryContext
- **Priority:** 1
- **Depends on:** T14

### T16: Add country selector to FilterBar
- Leftmost position in filter bar
- Render as compact pill/dropdown: flag emoji + country code
- "🌐 Global" option
- On change: call `setCountry`, clear location filter
- When Global selected: hide location dropdown
- Location dropdown fetches locations scoped to selected country
- **Priority:** 1
- **Depends on:** T12, T9

### T17: Update PublicFeed to pass country to API
- Read country from CountryContext
- Pass `country` param to `useArticles` / article service calls
- Re-fetch when country changes
- **Priority:** 1
- **Depends on:** T7, T14

### T18: Update ArticleCard with country-prefixed links
- Use `useCountryPath` for article links
- **Priority:** 2
- **Depends on:** T15

### T19: Update ArticleDetail with country-prefixed links
- Use `useCountryPath` for breadcrumb links, related article links
- **Priority:** 2
- **Depends on:** T15

### T20: Update Header with country-prefixed nav links
- Use `useCountryPath` for navigation links
- **Priority:** 2
- **Depends on:** T15

### T21: Update Footer — conditional AU acknowledgement
- Only show AU-specific acknowledgement text when country is AU
- Read country from CountryContext
- **Priority:** 3
- **Depends on:** T14

### T22: Update LocationPage for multi-country support
- Read country from URL param
- Fetch LocationSeo for that country + location combo
- Update city list to come from LocationSeo records for current country
- Remove hardcoded AU-only LOCATIONS array
- **Priority:** 2
- **Depends on:** T4, T14

### T23: Update articleService.ts to accept country param
- Add `country` to API call params
- Pass through to `GET /api/articles?country=`
- **Priority:** 1
- **Depends on:** T7

## Phase 5: SEO Internationalisation

Crawler SSR, sitemaps, redirects, structured data.

### T24: Legacy URL redirect middleware
- New file `server/middleware/legacyRedirects.js`
- 301 redirect patterns: `/property-news/:loc` → `/au/property-news/:loc`, `/article/:slug` → `/au/article/:slug`, `/category/:slug` → `/au/category/:slug`
- Register early in Express middleware chain
- **Priority:** 1
- **Depends on:** nothing

### T25: Update crawler SSR — SITE_URL and market-aware meta
- Change `SITE_URL` from `https://propertyhack.com.au` to `https://propertyhack.com`
- Extract country from URL path
- Market-aware title and description templates
- Update default description to not be AU-specific
- **Priority:** 1
- **Depends on:** T14

### T26: Add hreflang tags to crawler SSR
- Inject hreflang link tags for all supported markets + x-default
- For article pages: check `isEvergreen` — evergreen gets all 4, country-specific gets only its own + x-default
- **Priority:** 1
- **Depends on:** T25

### T27: Add canonical URLs to crawler SSR
- Every page gets `<link rel="canonical" href="https://propertyhack.com/:country/...">`
- Evergreen articles: canonical uses their `market` field as country
- **Priority:** 2
- **Depends on:** T25

### T28: Update JSON-LD with market currency
- Read currency from Market model (AUD/USD/GBP/CAD)
- Set `priceCurrency` in structured data based on page's country
- **Priority:** 3
- **Depends on:** T25, T6

### T29: Per-country sitemaps
- `/sitemap.xml` becomes sitemap index linking to country sitemaps
- `/:country/sitemap.xml` — articles for that market + evergreen + location pages
- `/:country/news-sitemap.xml` — last 48h articles for that market
- Keep `/sitemap-pages.xml` for static pages
- **Priority:** 1
- **Depends on:** T7, T4

### T30: Update LocationPage SEO in crawler SSR
- Location pages under `/:country/property-news/:location` get correct country-scoped meta
- Read LocationSeo record using both country and location
- **Priority:** 2
- **Depends on:** T25, T22

## Phase 6: Infrastructure & Deployment

Cloudflare setup, Caddy config, domain redirects.

### T31: Update Caddyfile for Cloudflare
- Add `trusted_proxies cloudflare` directive
- Ensure origin TLS continues working with Cloudflare Full (Strict) mode
- **Priority:** 2
- **Depends on:** nothing

### T32: Document Cloudflare setup steps
- Create `docs/cloudflare-setup.md` with step-by-step:
  - DNS migration to Cloudflare nameservers
  - SSL mode configuration
  - Redirect Rules for ccTLD domains
  - Cache Rules for API routes
  - Page Rules if needed
- Not code — ops documentation for manual setup
- **Priority:** 3
- **Depends on:** nothing

### T33: Update existing AU LocationSeo slugs for consistency
- Ensure all existing AU LocationSeo records have `country: 'AU'` (backfill from T4)
- Verify slugs match the format used in locationMapper
- **Priority:** 2
- **Depends on:** T4

## Phase 7: Testing & QA

### T34: Unit tests — locationMapper
- Test city lookups for all 4 countries
- Test unknown city returns null
- Test `getCitiesForCountry` returns correct list
- **Priority:** 2
- **Depends on:** T11

### T35: Integration tests — article API with country filter
- `?country=US` returns US + evergreen articles
- `?country=AU` returns AU + evergreen articles
- No country param returns all
- Country + location combo works
- Country + search + category combo works
- **Priority:** 2
- **Depends on:** T7

### T36: Integration tests — markets and locations endpoints
- `/api/markets` returns 4 active markets with flagEmoji
- `/api/locations?country=UK` returns UK locations
- **Priority:** 2
- **Depends on:** T6, T9

### T37: E2E tests — country switching and routing
- Visit `/` → redirected to detected country
- Switch country in FilterBar → URL updates, articles change
- Visit old URL → 301 redirect to country-prefixed URL
- Location page renders for non-AU city
- **Priority:** 2
- **Depends on:** T14, T16, T24

### T38: E2E tests — SEO verification
- View source on country page has correct hreflang tags
- Sitemap at `/:country/sitemap.xml` returns valid XML with correct articles
- Canonical URLs are correct for country-specific and evergreen articles
- **Priority:** 2
- **Depends on:** T26, T27, T29

## Dependency Graph

```
Phase 1 (Data):
T1 ──┬── T2 ── T6
     ├── T3
     ├── T4 ──── T9, T22, T29, T33
     └── T5

Phase 2 (API):
T1 ── T7 ──┬── T8
            ├── T17
            ├── T23
            ├── T29
            └── T35

Phase 3 (Foundation):
T11 (independent)
T6 ── T12 ──┬── T14 ──┬── T15 ──┬── T18
             │         │         ├── T19
             │         │         └── T20
             │         ├── T17
             │         ├── T21
             │         ├── T22
             │         └── T25 ──┬── T26
             │                   ├── T27
             │                   ├── T28
             │                   └── T30
             └── T16
T13 (independent)

Phase 6 (Infra):
T31, T32 (independent)
```

## Task Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 — Data Foundation | T1–T6 | Schema, seeds, markets endpoint |
| 2 — API Filtering | T7–T10 | Country filter on article/location endpoints, cache headers |
| 3 — Frontend Foundation | T11–T13 | Location mapper, CountryContext, preferences |
| 4 — Frontend Routing & UI | T14–T23 | Routes, FilterBar, component updates |
| 5 — SEO | T24–T30 | Redirects, hreflang, canonicals, sitemaps |
| 6 — Infrastructure | T31–T33 | Cloudflare, Caddy, docs |
| 7 — Testing | T34–T38 | Unit, integration, E2E tests |

**Total: 38 tasks across 7 phases**

## Estimated Wave Execution

With parallel agents on independent tasks:

- **Wave 1:** T1, T10, T11, T13, T24, T31, T32 (7 tasks — all independent)
- **Wave 2:** T2, T3, T4, T5, T7, T23 (6 tasks — depend on T1)
- **Wave 3:** T6, T8, T9, T33, T34, T35 (6 tasks — depend on wave 2)
- **Wave 4:** T12, T16 (2 tasks — depend on T6/T9)
- **Wave 5:** T14, T15 (2 tasks — depend on T12)
- **Wave 6:** T17, T18, T19, T20, T21, T22, T25 (7 tasks — depend on T14/T15)
- **Wave 7:** T26, T27, T28, T29, T30, T36 (6 tasks — depend on wave 6)
- **Wave 8:** T37, T38 (2 tasks — E2E tests, depend on everything)
