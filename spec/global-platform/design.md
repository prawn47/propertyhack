# Global Platform — Design

## Architecture Overview

The global platform expansion is primarily a filtering and routing layer on top of existing infrastructure. The ingestion pipeline, AI summarisation, and article storage are already multi-market capable. The work focuses on:

1. **Frontend routing** — country-prefixed URLs with React Router
2. **API filtering** — Prisma `where` clauses using `market` + `isEvergreen`
3. **SEO infrastructure** — market-aware metadata, sitemaps, hreflang
4. **CDN layer** — Cloudflare in front of single origin

No new services, workers, or queues are needed.

## Component Design

### 1. React Router — Country-Prefixed Routes

**File:** `App.tsx`

Current route structure is flat (`/`, `/article/:slug`, `/property-news/:location`, etc.). Wrap all public routes in a `/:country` prefix.

```
/:country                           → HomePage (filtered feed)
/:country/article/:slug             → ArticleDetail
/:country/property-news/:location   → LocationPage
/:country/category/:slug            → CategoryPage
/:country/tools/*                   → Calculator routes
/admin/*                            → AdminLayout (unchanged)
/                                   → CountryRedirect (detect → redirect)
```

**CountryRedirect component:** Reads `ph_country` from localStorage or runs `useCountryDetection`, then does `navigate(`/${country.toLowerCase()}`, { replace: true })`.

**Country validation:** A layout wrapper validates `:country` param against supported markets from `/api/markets`. Invalid country → 404.

**Link helper:** Create a `useCountryPath()` hook that prepends the current country to paths. All internal `<Link>` components use this. E.g. `useCountryPath('/article/foo')` → `/au/article/foo`.

### 2. CountryContext

**New file:** `contexts/CountryContext.tsx`

Provides current country to the entire app. Source of truth hierarchy:
1. URL param `/:country` (highest priority — URL is king)
2. `User.preferences.defaultCountry` (signed-in users)
3. `localStorage.ph_country` (anonymous users)
4. IP detection via `useCountryDetection` (first visit fallback)

```typescript
interface CountryContextValue {
  country: string;           // 'AU' | 'US' | 'UK' | 'CA' | 'GLOBAL'
  setCountry: (c: string) => void;  // updates URL + persists
  markets: Market[];         // from /api/markets
  loading: boolean;
}
```

`setCountry` does three things:
- Navigates to `/${newCountry.toLowerCase()}/...` (updates URL)
- Saves to localStorage (`ph_country`)
- If signed in, calls `PUT /api/user/profile` to persist preference

### 3. FilterBar — Country Selector

**File:** `components/public/FilterBar.tsx`

Add country selector as leftmost filter element. Consumes `CountryContext`.

```
[🇦🇺 AU ▾] [Sydney ▾] [All Categories ▾] [All Time ▾] [Search...]
```

Implementation:
- Fetch markets from `CountryContext.markets`
- Render as a `<select>` styled as a compact pill (matching existing filter style)
- Options: each market's `flagEmoji + code`, plus "🌐 Global"
- `onChange` → `countryContext.setCountry(value)`
- When country changes: clear location filter, re-fetch locations for new country

Location dropdown changes:
- `GET /api/locations?country=${country}` to populate options
- When country is "GLOBAL", hide location dropdown
- Clear selected location when country changes

### 4. API Filtering — Public Articles

**File:** `server/routes/public/articles.js`

Add `country` to accepted query params. Build Prisma `where` clause:

```javascript
// When country param is provided
if (country && country !== 'GLOBAL') {
  where.OR = [
    { market: country.toUpperCase() },
    { isEvergreen: true }
  ];
}
// When country is omitted or 'GLOBAL', no market filter (all articles)
```

Apply to:
- `GET /api/articles` — main feed
- `GET /api/articles/trending` — trending articles
- Vector search path (add market filter to Prisma query after vector similarity)

**Locations endpoint** (`GET /api/locations`):
- Add `country` param
- Filter locations by country (requires LocationSeo to have a `country` field, or derive from a static mapping)

### 5. Markets Endpoint

**New file:** `server/routes/public/markets.js`

```javascript
// GET /api/markets
router.get('/', async (req, res) => {
  const markets = await prisma.market.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' }
  });
  res.json(markets);
});
```

Cache-friendly: `Cache-Control: public, s-maxage=86400` (markets rarely change).

Register in Express app alongside other public routes.

### 6. Location Mapper Expansion

**File:** `utils/locationMapper.ts`

Structure: one `CITY_MAP` object per country, keyed by lowercase city name, value is `{ display, state/region, slug }`.

```typescript
const AU_CITIES: CityMap = {
  'sydney': { display: 'Sydney', region: 'NSW', slug: 'sydney' },
  // ... existing 15 AU cities
};

const US_CITIES: CityMap = {
  'new york': { display: 'New York', region: 'NY', slug: 'new-york' },
  'los angeles': { display: 'Los Angeles', region: 'CA', slug: 'los-angeles' },
  // ... 20 US metros
};

const UK_CITIES: CityMap = {
  'london': { display: 'London', region: 'England', slug: 'london' },
  // ... 15 UK cities
};

const CA_CITIES: CityMap = {
  'toronto': { display: 'Toronto', region: 'ON', slug: 'toronto' },
  // ... 10 CA cities
};

const ALL_CITIES: Record<string, CityMap> = { AU: AU_CITIES, US: US_CITIES, UK: UK_CITIES, CA: CA_CITIES };
```

`mapToKnownLocation()` updated: takes ip-api response, looks up country code, then matches city within that country's map. Returns `{ city, region, country, slug }`.

Export `getCitiesForCountry(country: string)` for the FilterBar location dropdown (client-side filtering without API call, as fallback).

### 7. Crawler SSR Middleware — International SEO

**File:** `server/middleware/crawlerSsr.js`

#### URL Parsing

Extract country from URL path: `/au/article/foo` → country = `AU`. Routes without country prefix (legacy) → assume `AU` for redirect purposes.

#### SITE_URL

Change from `https://propertyhack.com.au` to `https://propertyhack.com`.

#### Hreflang Injection

For every page, inject hreflang link tags:

```html
<link rel="alternate" hreflang="en-AU" href="https://propertyhack.com/au{path}" />
<link rel="alternate" hreflang="en-US" href="https://propertyhack.com/us{path}" />
<link rel="alternate" hreflang="en-GB" href="https://propertyhack.com/uk{path}" />
<link rel="alternate" hreflang="en-CA" href="https://propertyhack.com/ca{path}" />
<link rel="alternate" hreflang="x-default" href="https://propertyhack.com{path}" />
```

For article pages: check `article.market` and `article.isEvergreen`:
- Evergreen → all 4 hreflangs + x-default
- Country-specific → only that country's hreflang + x-default

#### Canonical URLs

```html
<link rel="canonical" href="https://propertyhack.com/{market}/article/{slug}" />
```

Evergreen articles use their `market` field as canonical country.

#### Meta Tags

- Title: include country name for location/country pages
- Description: market-aware default description
- OG tags: market-scoped

#### JSON-LD

- `priceCurrency`: look up from Market model (`AUD`, `USD`, `GBP`, `CAD`)
- `countryOfOrigin`: market code

### 8. Sitemaps — Per Country

**File:** `server/routes/sitemap.js`

#### Sitemap Index (`/sitemap.xml`)

Links to:
- `/au/sitemap.xml`, `/us/sitemap.xml`, `/uk/sitemap.xml`, `/ca/sitemap.xml`
- `/au/news-sitemap.xml`, `/us/news-sitemap.xml`, `/uk/news-sitemap.xml`, `/ca/news-sitemap.xml`
- `/sitemap-pages.xml`

#### Country Sitemap (`/:country/sitemap.xml`)

Query: `WHERE market = :country OR isEvergreen = true`, plus location landing pages for that country.

#### News Sitemap (`/:country/news-sitemap.xml`)

Query: `WHERE (market = :country OR isEvergreen = true) AND publishedAt > NOW() - 48h`

#### Route Registration

New routes:
- `GET /:country/sitemap.xml`
- `GET /:country/news-sitemap.xml`

Existing `/sitemap.xml` becomes the index. Existing `/sitemap-pages.xml` stays.

### 9. Legacy URL Redirects

**File:** `server/middleware/legacyRedirects.js` (new middleware)

Runs before the SPA catch-all. Checks for old AU-only paths and 301 redirects:

```javascript
const LEGACY_PATTERNS = [
  { from: /^\/property-news\/(.+)$/, to: '/au/property-news/$1' },
  { from: /^\/article\/(.+)$/, to: '/au/article/$1' },
  { from: /^\/category\/(.+)$/, to: '/au/category/$1' },
];
```

Must run early in the middleware chain, before static file serving and SPA fallback.

### 10. Cloudflare CDN Configuration

**Not in code — ops/config documentation.**

#### DNS
- Move DNS to Cloudflare nameservers
- A/AAAA records for `propertyhack.com` → Sydney VPS IP (proxied through Cloudflare)

#### SSL
- Cloudflare SSL mode: Full (Strict)
- Caddy continues to handle origin TLS (Let's Encrypt)
- Cloudflare → origin connection is encrypted

#### Cache Headers (set in Express)

| Route Pattern | Cache-Control |
|---------------|---------------|
| `GET /api/articles` | `public, s-maxage=300` (5 min) |
| `GET /api/articles/trending` | `public, s-maxage=300` |
| `GET /api/articles/:slug` | `public, s-maxage=3600` (1 hour) |
| `GET /api/locations` | `public, s-maxage=86400` (24 hours) |
| `GET /api/markets` | `public, s-maxage=86400` |
| `GET /api/categories` | `public, s-maxage=86400` |
| `GET /api/admin/*` | `private, no-store` |
| `GET /sitemap*` | `public, s-maxage=3600` |

#### Caddyfile Changes

Add `trusted_proxies` directive for Cloudflare IP ranges so `X-Forwarded-For` headers are trusted:

```
trusted_proxies cloudflare
```

(Caddy has built-in Cloudflare IP list support via the `cloudflare` keyword.)

#### Domain Redirects (Cloudflare Redirect Rules)

Configure in Cloudflare dashboard (not code):
- `propertyhack.com.au/*` → `https://propertyhack.com/au/$1` (301)
- `propertyhack.au/*` → `https://propertyhack.com/au/$1` (301)
- `propertyhack.co.uk/*` → `https://propertyhack.com/uk/$1` (301)
- `propertyhack.co/*` → `https://propertyhack.com/$1` (301)
- `propertyhack.app/*` → `https://propertyhack.com/$1` (301)

### 11. Database Changes

#### Migration: Add `flagEmoji` to Market

```sql
ALTER TABLE "markets" ADD COLUMN "flagEmoji" TEXT NOT NULL DEFAULT '';
```

#### Migration: Add `country` to LocationSeo

```sql
ALTER TABLE "location_seo" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'AU';
CREATE INDEX "location_seo_country_idx" ON "location_seo"("country");
```

#### Seed Data Updates

**Market flagEmoji:**
| Code | flagEmoji |
|------|-----------|
| AU | 🇦🇺 |
| US | 🇺🇸 |
| UK | 🇬🇧 |
| CA | 🇨🇦 |

**Ingestion Sources:** 11 new sources (4 US, 4 UK, 3 CA) — all `isActive: false`. See spec.md F9 for full list.

**LocationSeo:** ~55 new records (20 US + 15 UK + 10 CA cities + existing 9 AU). Each with `country`, `location` (slug), `title`, `description`, `h1`, `introText`.

**ArticleCategory:** Duplicate existing AU categories for US/UK/CA markets (same category names, different `market` values).

### 12. Market Model — Source of Truth

**File:** `server/prisma/schema.prisma`

Keep `Market` model as-is plus `flagEmoji`. No foreign key to Article/IngestionSource (string field is simpler, already works).

Usage:
- `GET /api/markets` returns active markets for frontend
- Crawler SSR reads Market for currency in JSON-LD
- FilterBar consumes markets list from API
- Admin could manage markets via the existing admin patterns (future)

### 13. User Preferences Extension

**Files:** `contexts/AuthContext.tsx`, `hooks/useUserPreferences.ts`, `server/routes/auth.js` (or profile route)

Add `defaultCountry` to preferences type:

```typescript
interface UserPreferences {
  defaultLocation?: string;
  defaultCategories?: string[];
  defaultDateRange?: string;
  defaultCountry?: string;  // NEW
}
```

No migration needed — `preferences` is a JSON field. Just update TypeScript types and the profile update endpoint validation.

## Data Flow

### First Visit (Anonymous)

```
1. User visits propertyhack.com
2. CountryRedirect component mounts
3. Check localStorage for ph_country → not found
4. useCountryDetection calls ip-api.com → "US"
5. Store "US" in localStorage
6. navigate('/us', { replace: true })
7. HomePage mounts with country="US"
8. Fetch GET /api/articles?country=US
9. API returns US articles + evergreen articles
10. FilterBar shows 🇺🇸 US selected, US locations in dropdown
```

### Return Visit (Anonymous)

```
1. User visits propertyhack.com
2. CountryRedirect reads localStorage ph_country → "US"
3. navigate('/us', { replace: true })
4. No IP detection needed
```

### Direct URL Visit

```
1. User visits propertyhack.com/uk/property-news/london
2. Country from URL: UK
3. No redirect needed
4. LocationPage fetches UK articles for London
5. FilterBar shows 🇬🇧 UK selected, London in location dropdown
```

### Country Switch

```
1. User on /us, clicks 🇬🇧 UK in FilterBar
2. setCountry('UK')
3. navigate('/uk', { replace: true })
4. localStorage updated to 'UK'
5. Location filter cleared
6. Articles re-fetched with country=UK
```

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `contexts/CountryContext.tsx` | Country state management |
| `server/routes/public/markets.js` | Markets endpoint |
| `server/middleware/legacyRedirects.js` | 301 redirects for old AU-only URLs |
| `server/prisma/migrations/xxx_add_global_platform/` | Schema changes |

### Modified Files

| File | Changes |
|------|---------|
| `App.tsx` | Country-prefixed routes, CountryRedirect |
| `components/public/FilterBar.tsx` | Country selector, scoped location dropdown |
| `components/public/LocationPage.tsx` | Multi-country support, read country from URL |
| `components/public/ArticleCard.tsx` | Country-prefixed links |
| `components/public/ArticleDetail.tsx` | Country-prefixed links |
| `components/public/PublicFeed.tsx` | Pass country to API calls |
| `components/layout/Header.tsx` | Country-prefixed nav links |
| `components/layout/Footer.tsx` | Conditionally show AU acknowledgement |
| `contexts/AuthContext.tsx` | Add defaultCountry to preferences type |
| `hooks/useUserPreferences.ts` | Read defaultCountry |
| `hooks/useArticles.ts` | Accept country param, pass to API |
| `hooks/useLocationDetection.ts` | Use expanded location mapper |
| `utils/locationMapper.ts` | AU/US/UK/CA city maps |
| `services/articleService.ts` | Add country param to API calls |
| `server/routes/public/articles.js` | Market filtering in queries |
| `server/routes/sitemap.js` | Per-country sitemaps |
| `server/middleware/crawlerSsr.js` | Hreflang, canonical, market-aware meta |
| `server/prisma/schema.prisma` | flagEmoji on Market, country on LocationSeo |
| `server/prisma/seed.js` | US/UK/CA sources, locations, categories |
| `server/index.js` | Register markets route, legacy redirects middleware |
| `Caddyfile` | trusted_proxies for Cloudflare |

### Unchanged

- All ingestion fetchers, workers, queues
- Article summary/embedding pipeline
- Social publishing system
- Admin routes and UI (no country scoping needed)
- Auth system

## Testing Strategy

### Unit Tests
- `locationMapper` — verify city lookups for all 4 countries
- Market filtering logic — verify `OR` clause includes evergreen
- Legacy redirect matching — verify patterns

### Integration Tests
- `GET /api/articles?country=US` returns correct articles
- `GET /api/articles?country=US&location=new-york` double filter works
- `GET /api/articles` with no country returns all
- `GET /api/markets` returns 4 active markets
- `GET /api/locations?country=UK` returns UK locations only

### E2E Tests (Playwright)
- Visit `/` → redirected to detected country
- Switch country in FilterBar → URL updates, articles refresh
- Visit `/au/property-news/sydney` → correct content and meta tags
- Visit `/property-news/sydney` (old URL) → 301 to `/au/property-news/sydney`
- Sitemap at `/au/sitemap.xml` contains AU articles

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| SEO impact from URL restructure | 301 redirects from all old URLs; proper canonical tags; submit updated sitemaps to Search Console |
| IP detection inaccuracy | Allow manual country override; persist choice so detection only runs once |
| Cloudflare caching stale data | 5-min TTL on article lists; articles don't change after publish; admin can purge cache manually |
| Location dropdown too long (65+ cities across 4 countries) | Scoped to selected country; searchable dropdown for countries with 15+ cities |
| Evergreen articles dominating feeds | Monitor ratio; adjust isEvergreen classification in AI prompt if needed |
