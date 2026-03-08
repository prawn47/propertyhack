# Global Platform — Proposal

## Problem

PropertyHack only serves Australian users. The schema already supports multi-market (`market`, `markets`, `isEvergreen` on Article; `market` on IngestionSource; AI summariser classifies AU/US/UK/CA/ALL), but nothing in the frontend or API filters by country. The feed shows all articles regardless of market, location detection and mapping only covers AU cities, and SEO is hardcoded to `.com.au`.

## Why Now

- The ingestion pipeline and AI classification are already global-ready — wasted capability
- Property news is inherently local; showing AU articles to US users is noise
- Expanding to 4 English-speaking markets (AU, US, UK, CA) while the platform is young avoids costly retrofitting later
- ccTLD domains (`.com.au`, `.co.uk`) can be acquired cheaply now and redirected

## Scope — In for v1

1. **Country detection & preference** — detect user's country via IP, persist choice, add country selector to FilterBar
2. **API filtering by market** — `?country=` param on public article endpoints; evergreen articles show in all markets
3. **Location mapper expansion** — city/region mappings for US (20 metros), UK (15 cities), CA (10 cities)
4. **FilterBar country selector** — flag + code pills, location dropdown scoped to selected country
5. **User preferences** — add `defaultCountry` to preferences (localStorage for anon, JSON field for signed-in)
6. **Ingestion source seeds** — placeholder RSS sources for US/UK/CA (inactive, ready to enable)
7. **SEO internationalisation** — country-scoped URL structure (`/au/...`, `/us/...`), hreflang tags, per-country sitemaps, canonical URLs, 301 redirects from old AU-only paths
8. **Location landing pages** — seed `LocationSeo` records for major cities in US/UK/CA
9. **Market model cleanup** — either wire up the existing `Market` model as source of truth or remove it
10. **Cloudflare CDN** — single server (Sydney) + Cloudflare for global edge caching; cache public API responses

## Scope — Explicitly Deferred

- Multi-region hosting (Option A with multiple VPS instances) — only if latency complaints arise
- Non-English markets
- User registration / accounts for readers
- Market-specific branding or theming
- Currency conversion or market-specific calculators (beyond what exists)
- Social publishing changes

## Affected Areas

| Area | Impact |
|------|--------|
| Frontend routes | New `/:country/` prefix on all public routes; React Router updates |
| FilterBar component | New country selector, location dropdown scoped by country |
| Public API routes | `?country=` param on `/api/articles`, `/api/locations`, `/api/articles/trending` |
| useLocationDetection | Wire country detection into feed filtering |
| useCountryDetection | Already works — just needs to feed into FilterBar default |
| locationMapper.ts | Expand from AU-only to AU/US/UK/CA city mappings |
| AuthContext / preferences | Add `defaultCountry` field |
| Crawler SSR middleware | Market-aware meta tags, hreflang, canonical URLs |
| Sitemap routes | Per-country sitemaps and news sitemaps |
| LocationPage component | Support cities from all 4 countries |
| Caddyfile | Trust Cloudflare proxy headers |
| Prisma seed data | US/UK/CA ingestion sources + LocationSeo records |
| Market model | Decision: use or remove |

## Breaking Risk

- **URL structure change**: existing AU paths (`/property-news/sydney`) must 301 → `/au/property-news/sydney`. SEO impact mitigated by proper redirects + canonical tags.
- **API contract**: adding `?country=` param is additive, not breaking. Omitting it returns all articles (backwards compatible).
- **No data model changes**: `market`, `markets`, `isEvergreen` already exist and are populated. No migrations needed for article fields.
- **Existing articles**: all current articles are `market: "AU"` — they'll correctly appear under `/au` only.

## Acceptance Criteria

1. A user in the US visiting propertyhack.com sees US property articles by default (detected via IP)
2. A user can switch country in the FilterBar; choice persists across sessions
3. Evergreen/global articles appear in every country's feed
4. Location dropdown shows only cities for the selected country
5. `/au/property-news/sydney` renders with correct AU-specific meta tags and structured data
6. `/property-news/sydney` (old URL) 301 redirects to `/au/property-news/sydney`
7. `propertyhack.co.uk/whatever` 301 redirects to `propertyhack.com/uk/whatever`
8. Each country has its own sitemap and Google News sitemap
9. Hreflang tags are present on all pages
10. Public API responses include `Cache-Control` headers suitable for Cloudflare edge caching
11. Inactive ingestion sources exist for US/UK/CA, ready to enable
12. Page load for a US user (via Cloudflare cache hit) completes in <100ms for cached API responses

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Filtering field | `market` (single string) + `isEvergreen` flag | Simpler than querying `markets` array; each article has one primary market |
| Hosting | Single server (Sydney) + Cloudflare CDN | News content is highly cacheable; avoids ops complexity of multi-region |
| URL structure | Subdirectory (`/au/`, `/us/`) not subdomain | Better for SEO link equity; simpler infra |
| Canonical domain | `propertyhack.com` | ccTLDs redirect to `.com/:country` |
| Market model | Wire up as source of truth | Already seeded with AU/US/UK/CA; use it for "supported markets" list |
