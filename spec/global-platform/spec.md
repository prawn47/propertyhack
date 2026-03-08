# Global Platform — Spec

## Features

### F1: Country Detection & Preference

**Description:** Automatically detect a visitor's country and use it to filter the article feed. Allow manual override via a country selector.

**Acceptance Criteria:**
- On first visit, detect country via ip-api.com (already used by `useCountryDetection`)
- Map detected country to supported market (AU/US/UK/CA); unsupported countries default to "Global"
- Store detected/selected country in `localStorage` key `ph_country`
- Signed-in users: persist `defaultCountry` in `User.preferences` JSON field
- On subsequent visits, read from localStorage (anon) or preferences (signed-in) — no re-detection
- Country change in FilterBar immediately re-fetches articles for new market

### F2: Article Feed Filtering by Country

**Description:** Public article API endpoints accept a `country` parameter and return only articles matching that market plus evergreen content.

**Acceptance Criteria:**
- `GET /api/articles?country=US` returns articles where `market = 'US'` OR `isEvergreen = true`
- `GET /api/articles` (no country param) returns all articles (backwards compatible)
- `GET /api/articles/trending?country=US` filters the same way
- `GET /api/locations?country=US` returns only US locations
- `GET /api/articles/:slug` — no filtering (direct access always works regardless of market)
- Pagination, search, category, location filters all work in combination with country
- Country filter applied via Prisma `where` clause — no post-query filtering

### F3: Location Mapper Expansion

**Description:** Expand the location detection and mapping system from AU-only to all 4 markets.

**City Counts:**
- AU: existing 15 cities (keep as-is)
- US: 20 metros — New York, Los Angeles, Chicago, Houston, Phoenix, Philadelphia, San Antonio, San Diego, Dallas, San Francisco, Seattle, Denver, Miami, Atlanta, Boston, Austin, Nashville, Portland, Minneapolis, Detroit
- UK: 15 cities — London, Manchester, Birmingham, Leeds, Glasgow, Edinburgh, Bristol, Liverpool, Newcastle, Sheffield, Cardiff, Belfast, Nottingham, Cambridge, Oxford
- CA: 10 cities — Toronto, Vancouver, Montreal, Calgary, Edmonton, Ottawa, Winnipeg, Quebec City, Hamilton, Victoria

**Acceptance Criteria:**
- `mapToKnownLocation()` returns `{ city, state/region, country }` for cities in all 4 countries
- Country is inferred from the city match (no separate country lookup needed)
- Unknown cities return `null` (unchanged behaviour)
- Each city has a URL-friendly slug (lowercase, hyphenated)

### F4: FilterBar Country Selector

**Description:** Add a country picker to the FilterBar, positioned as the leftmost filter.

**Acceptance Criteria:**
- Renders as compact pills or dropdown: flag emoji + country code (🇦🇺 AU, 🇺🇸 US, 🇬🇧 UK, 🇨🇦 CA, 🌐 Global)
- Default selection matches detected/stored country
- Changing country clears the current location filter (cities don't transfer across countries)
- Location dropdown updates to show only cities for the selected country
- "Global" hides the location dropdown entirely
- Country change triggers article re-fetch with new `country` param
- Mobile: country selector remains accessible (not hidden behind overflow)

### F5: Country-Scoped URL Structure

**Description:** All public routes gain a `/:country` prefix. Old AU-only URLs redirect.

**Routes:**

| Pattern | Example | Purpose |
|---------|---------|---------|
| `/:country` | `/au` | Country homepage (filtered feed) |
| `/:country/article/:slug` | `/us/article/housing-starts` | Article detail |
| `/:country/property-news/:location` | `/uk/property-news/london` | Location landing page |
| `/:country/category/:slug` | `/ca/category/market-trends` | Category landing page |
| `/` | `/` | Detect country → redirect to `/:country` |

**Acceptance Criteria:**
- React Router handles `/:country` prefix on all public routes
- Country param is validated against supported markets (AU/US/UK/CA); invalid → 404
- `/` detects country and redirects (302) to `/:country`
- Old paths 301 redirect: `/property-news/sydney` → `/au/property-news/sydney`
- Old paths 301 redirect: `/article/:slug` → `/au/article/:slug` (existing articles are AU)
- `/category/:slug` → `/au/category/:slug`
- Internal links throughout the app use country-prefixed paths
- Country from URL takes precedence over stored preference (URL is source of truth for current view)
- Admin routes (`/admin/*`) are unchanged — no country prefix

### F6: SEO Internationalisation

**Description:** Full international SEO support — hreflang, per-country sitemaps, canonical URLs, structured data.

**6a. Hreflang Tags**

- Every page includes hreflang link tags for all supported markets + x-default
- Article pages: evergreen articles get all 4 market hreflangs; country-specific articles get only their market's hreflang
- Injected by crawler SSR middleware for bots; React Helmet (or equivalent) for client-side

**6b. Sitemaps**

| URL | Content |
|-----|---------|
| `/sitemap.xml` | Sitemap index linking all below |
| `/:country/sitemap.xml` | Articles for that market + evergreen articles + city landing pages |
| `/:country/news-sitemap.xml` | Google News sitemap (articles from last 48h for that market) |
| `/sitemap-pages.xml` | Static pages (about, contact, terms, privacy) |

**6c. Canonical URLs**

- Every article has `<link rel="canonical">` pointing to `https://propertyhack.com/:market/article/:slug`
- Evergreen articles use their `market` field value as canonical market (avoids duplicate content)
- Location pages canonical: `https://propertyhack.com/:country/property-news/:location`

**6d. Crawler SSR Metadata**

- `SITE_URL` changes from `https://propertyhack.com.au` to `https://propertyhack.com`
- Page titles include country context: "Property News Sydney, Australia | PropertyHack"
- Default description becomes market-aware: "Property news and market insights for [Country]"
- JSON-LD `priceCurrency` uses the market's currency (AUD/USD/GBP/CAD) from Market model

**6e. Location Landing Pages**

- Seed `LocationSeo` records for all cities across 4 markets
- Each record includes: `location` (slug), `country`, `title`, `description`, `h1`, `introText`
- LocationPage component reads country from URL, fetches appropriate LocationSeo record

**Acceptance Criteria:**
- View source on `/au/property-news/sydney` shows correct hreflang, canonical, OG tags
- `/au/sitemap.xml` contains only AU + evergreen articles
- Google Search Console can parse all sitemaps without errors
- No duplicate content flags between country versions of the same evergreen article

### F7: Domain Redirects

**Description:** ccTLD domains redirect to propertyhack.com subdirectories.

| Domain | 301 → |
|--------|-------|
| propertyhack.com.au/* | propertyhack.com/au/* |
| propertyhack.au/* | propertyhack.com/au/* |
| propertyhack.co.uk/* | propertyhack.com/uk/* |
| propertyhack.co/* | propertyhack.com/* |
| propertyhack.app/* | propertyhack.com/* |

**Acceptance Criteria:**
- All redirects preserve path: `propertyhack.co.uk/about` → `propertyhack.com/uk/about`
- All redirects are 301 (permanent) for SEO
- Configured at Cloudflare level (Redirect Rules), not in Caddy

### F8: Cloudflare CDN & Caching

**Description:** Put Cloudflare in front of the single Sydney origin for global edge caching.

**Acceptance Criteria:**
- Cloudflare is DNS provider for propertyhack.com
- Public API routes return `Cache-Control: public, s-maxage=300` (5 min edge cache)
- Article detail endpoint: `s-maxage=3600` (1 hour — articles don't change after publish)
- Admin API routes return `Cache-Control: private, no-store`
- Caddy configured with `trusted_proxies` for Cloudflare IP ranges
- Cloudflare SSL mode: Full (Strict)
- Static assets (JS/CSS/images) cached with long TTL via Cloudflare

### F9: Ingestion Source Seeds

**Description:** Create inactive placeholder sources for US/UK/CA markets.

**Sources:**

| Market | Source | Type | URL |
|--------|--------|------|-----|
| US | HousingWire | RSS | housingwire.com/feed |
| US | Realtor.com News | RSS | realtor.com/news/feed |
| US | Inman News | RSS | inman.com/feed |
| US | NAR (Economists' Outlook) | RSS | economistsoutlook.blogs.realtor.org/feed |
| UK | Property Wire | RSS | propertywire.com/feed |
| UK | Property Reporter | RSS | propertyreporter.co.uk/feed |
| UK | Estate Agent Today | RSS | estateagenttoday.co.uk/rss |
| UK | Rightmove Blog | RSS | rightmove.co.uk/news/feed |
| CA | CREA | RSS | creastats.crea.ca/feed |
| CA | REW.ca | RSS | rew.ca/news.rss |
| CA | Canadian Real Estate Magazine | RSS | canadianrealestatemagazine.ca/feed |

**Acceptance Criteria:**
- All sources created with `isActive: false`
- Each source has correct `market` value (US/UK/CA)
- Source type is `rss` with appropriate `config` JSON
- Sources can be enabled via admin UI without code changes

### F10: Market Model Wiring

**Description:** Wire up the existing `Market` model as the source of truth for supported countries.

**Acceptance Criteria:**
- `Market` model keeps existing fields: `code`, `name`, `currency`, `isActive`
- Add `flagEmoji` field to Market (🇦🇺, 🇺🇸, 🇬🇧, 🇨🇦)
- `GET /api/markets` public endpoint returns active markets (for FilterBar to consume)
- Frontend fetches markets list from API (not hardcoded)
- Market `currency` used in JSON-LD structured data
- No foreign key relations added (keep `market` as string field on Article/IngestionSource — simpler)

### F11: User Preferences — Country

**Description:** Extend user preferences to include default country.

**Acceptance Criteria:**
- `UserPreferences` type adds `defaultCountry?: string`
- `PUT /api/user/profile` accepts `defaultCountry` in preferences payload
- HomePage reads `defaultCountry` from preferences (signed-in) or localStorage (anon)
- Changing country in FilterBar persists: localStorage for anon, API call for signed-in
- AuthContext exposes updated preferences type

## Data Model Changes

### Market (existing model — update)

```
add field: flagEmoji String
```

### LocationSeo (existing model — extend data)

No schema change. Seed new records with a `country` field convention in the location slug or a new approach:

Option: Add `country String @default("AU")` field to LocationSeo to scope location pages by market. This requires a migration.

### Prisma Seed Updates

- Seed `Market` records with `flagEmoji`
- Seed inactive `IngestionSource` records for US/UK/CA
- Seed `LocationSeo` records for US/UK/CA cities
- Seed `ArticleCategory` records for US/UK/CA (same categories, different market values)

## API Endpoints

### New

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/markets` | List active markets |

### Modified

| Method | Path | Change |
|--------|------|--------|
| GET | `/api/articles` | Add `?country=` filter param |
| GET | `/api/articles/trending` | Add `?country=` filter param |
| GET | `/api/locations` | Add `?country=` filter param |

### Unchanged

All admin endpoints, auth endpoints, article detail, search — no changes needed.
