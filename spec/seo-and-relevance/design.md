# SEO & Content Relevance — Design

## Architecture

Builds on existing `SeoKeyword`, `LocationSeo`, `SystemPrompt`, and `Article` models. One new column on Article (`relevanceScore`). New admin UI components for the redesigned SEO panel. Changes to crawler SSR middleware and article summarise worker.

## F1: SEO Keywords by Jurisdiction — Admin UI

**Component structure**:
```
SeoKeywordsPage.tsx
├── JurisdictionTabs.tsx          (AU | NZ | UK | US | CA)
│   ├── NationalKeywordList.tsx   (keywords where location is null for this market)
│   ├── AreaDropdown.tsx          (populated from LocationSeo records for this market)
│   └── AreaKeywordList.tsx       (keywords for selected area)
└── KeywordBulkActions.tsx        (add multiple, delete selected, import/export)
```

**Data flow**:
- `GET /api/admin/seo/keywords?market=AU` → returns all keywords for AU
- `GET /api/admin/seo/keywords?market=AU&location=sydney` → returns Sydney-specific keywords
- `POST /api/admin/seo/keywords/bulk` → create multiple keywords at once
- `DELETE /api/admin/seo/keywords/bulk` → delete selected keywords

**Area dropdown**: Populated from `LocationSeo` records filtered by country field. Each `LocationSeo` already has a `country` field mapping to AU/US/UK/CA. NZ location records need to be seeded.

**New LocationSeo seeds for NZ**:
- Auckland, Wellington, Christchurch, Hamilton, Tauranga, Dunedin, Queenstown

## F2: Keyword Research & Seeding

**Approach**: Generate keywords programmatically using AI, then seed via a script.

**Script**: `server/scripts/seed-keywords.js`

**Per jurisdiction, generate keywords covering**:

**AU (~95 existing, augment to ~100)**:
- Market: auction clearance rate, median house price, off-the-plan, settlement, vendor
- Investment: negative gearing, capital gains tax, rental yield, depreciation schedule, SMSF property
- Regulatory: stamp duty, land tax, foreign investment review board, first home owner grant
- Location: inner west, eastern suburbs, bayside, north shore, CBD fringe
- Types: granny flat, townhouse, duplex, acreage, rural residential

**NZ (~60 new)**:
- Market: CV (capital value), RV (rateable value), asking price, tender, deadline sale
- Investment: bright-line test, ring-fencing, interest deductibility, Healthy Homes standards
- Regulatory: OIO (Overseas Investment Office), resource consent, building consent, LIM report
- Location: North Island, South Island, Hauraki Gulf, Wairarapa, Bay of Plenty
- Types: bach, lifestyle block, cross-lease, unit title, leasehold

**UK (~70 new)**:
- Market: chain-free, gazumping, SSTC (sold subject to contract), guide price, exchange of contracts
- Investment: buy-to-let, Section 24, EPC rating, yield compression, HMO
- Regulatory: stamp duty land tax, leasehold reform, building safety act, permitted development
- Location: zone 1-6, home counties, commuter belt, northern powerhouse, Crossrail
- Types: terraced house, semi-detached, detached, maisonette, converted flat

**US (~70 new)**:
- Market: closing costs, MLS listing, pending sale, contingency, earnest money
- Investment: cap rate, 1031 exchange, cash-on-cash return, DSCR loan, house hacking
- Regulatory: property tax, HOA fees, Dodd-Frank, FHA loan, conforming loan limit
- Location: tri-state, Sun Belt, Rust Belt, Bay Area, DMV (DC/Maryland/Virginia)
- Types: condo, townhome, single-family, multi-family, manufactured home

**CA (~70 new)**:
- Market: firm offer, conditional offer, bidding war, assignment sale, pre-construction
- Investment: Smith Maneuver, HELOC, rental income rules, principal residence exemption
- Regulatory: stress test, land transfer tax, foreign buyer ban, CMHC insurance, provincial nominee
- Location: GTA (Greater Toronto Area), GVA (Greater Vancouver Area), Golden Horseshoe, Prairies, Atlantic Canada
- Types: detached, semi-detached, row house, stacked townhouse, laneway house

## F3: Keyword Injection into Meta Tags

**Crawler SSR middleware changes** (`server/middleware/crawlerSsr.js`):

**For article pages** (`/article/:slug`):
1. Load article with its `market`, `location`, `category`
2. Query `SeoKeyword` matching: `market` matches article market, AND (`location` matches article location OR `location` is null), AND (`category` matches article category OR `category` is null)
3. Sort by `priority` DESC, take top 8
4. Inject as `<meta name="keywords" content="keyword1, keyword2, ...">`
5. For meta description: use article's `shortBlurb` as-is (already good quality from AI). Append 1-2 high-priority keywords only if they naturally extend the sentence.

**For location pages** (`/:country/property-news/:location`):
1. Load `LocationSeo` record
2. Query `SeoKeyword` matching market + location
3. Set `<meta name="keywords">` from matches
4. Enrich `metaDescription` with top keywords (template: "{existing description} Find the latest on {keyword1}, {keyword2}, and {keyword3}.")

**For category pages** (`/category/:slug`):
1. Query `SeoKeyword` matching the category across all markets
2. Set `<meta name="keywords">` from top matches
3. Mild description enrichment

**For home page** (`/`):
1. Use top-priority national keywords for AU (default market)
2. Set `<meta name="keywords">`

**Important**: `<meta name="keywords">` has diminished SEO value for Google but still matters for Bing, Yandex, and some news aggregators. The real value is in naturally enriched meta descriptions.

## F4: Content Relevance Scoring

**Schema change**:
```prisma
model Article {
  // ... existing fields
  relevanceScore  Int?    @map("relevance_score")
}
```

Migration: `npx prisma migrate dev --name add-relevance-score`

**Summarisation prompt update**:
Add to the system prompt template (the DB-editable `article-summarisation` prompt):
```
Rate the relevance of this article to property and real estate on a scale of 1-10:
- 9-10: Core property content (sales, auctions, listings, market reports, development)
- 7-8: Strongly related (housing policy, mortgage rates, construction, investment strategy)
- 5-6: Moderately related (macro economics affecting property, infrastructure, lifestyle)
- 3-4: Loosely related (general finance, broad economics, urban planning)
- 1-2: Not related (sports, entertainment, celebrity, unrelated politics)

Return as: "relevanceScore": <number>
```

**Worker changes** (`articleSummariseWorker.js`):
1. Parse `relevanceScore` from AI response (default to 5 if missing/invalid)
2. Load threshold config (default: reject <4, review 4-6, publish 7+)
3. Score 1-3: Hard delete (same as current `isPropertyRelated: false` path)
4. Score 4-6: Set `status: 'DRAFT'`, store score, do NOT set `publishedAt`
5. Score 7-10: Publish as normal, store score
6. Remove the old `isPropertyRelated` check (subsumed by scoring)

**Threshold configuration**:
- New `SystemPrompt` record: `relevance-thresholds` with JSON content: `{ "rejectBelow": 4, "reviewBelow": 7 }`
- Loaded by the worker with 5-minute cache (same pattern as summary prompt)
- Editable in admin prompts section

**Admin article list enhancement**:
- Add `relevanceScore` column to article list (sortable)
- Add filter: "Relevance: All / High (7+) / Medium (4-6) / Low (1-3)"
- Color-code: green 7+, yellow 4-6, red 1-3

## F5: Article Relevance Audit

**Script**: `server/scripts/audit-article-relevance.js`

**Flow**:
1. Query all articles where `status = 'DRAFT'` AND `relevanceScore IS NULL`
2. For each (rate-limited at 1/second):
   a. Build a minimal prompt: "Rate relevance 1-10: Title: {title}. Summary: {shortBlurb || 'No summary'}. Content: {first 500 chars of originalContent || 'No content'}"
   b. Call AI via provider abstraction (Spec 3 dependency, or direct Gemini if Spec 3 not ready)
   c. Store `relevanceScore` on article
   d. If score <4: delete article
   e. If score 4-6: keep as DRAFT
   f. If score 7+: publish article (set status, publishedAt)
3. Log progress: "Processing 45/128... Deleted: 12, Kept draft: 8, Published: 25"
4. Final report: totals per category

**Admin endpoint**: `POST /api/admin/articles/maintenance/audit-relevance`
- Triggers the audit as a BullMQ job (long-running)
- Returns job ID for status polling
- `GET /api/admin/articles/maintenance/audit-relevance/:jobId` for progress

**Idempotency**: Skip articles that already have a `relevanceScore`.

## F6: Feed Selection Criteria

**Implementation**:
1. Create `SystemPrompt` record via seed script:
   - `name`: `feed-quality-criteria`
   - `description`: "Editorial criteria for content source selection and quality evaluation"
   - `content`: The full criteria document (see spec F5 for categories)
   - `isActive`: true

2. The prompt content is structured as:
```
# PropertyHack Content Quality Criteria

## Content Categories (balanced mix desired)

### 1. Stories & Narratives
Human interest property stories, buyer/seller journeys, renovation stories, neighbourhood profiles, "day in the life" of property professionals. These build emotional connection and shareability.

### 2. Price & Market Data
Median prices, auction results, clearance rates, rental yields, vacancy rates, days on market, market reports from agencies and data providers. Factual, data-driven content.

### 3. Macro & Rates
Interest rate decisions, central bank commentary, inflation data, employment figures, GDP, government budgets — specifically how these affect property markets. Not general economics unless property impact is clear.

### 4. Opinion & Commentary
Industry expert columns, market predictions, investment strategy, policy debate, buyer/seller advice. Credible sources with clear property focus.

### 5. Development & Construction
New developments, planning approvals, construction trends, building costs, material shortages, infrastructure projects affecting property values. Both residential and commercial.

### 6. PropTech & Innovation
Property technology, AI in real estate, new platforms, digital disruption, smart homes, sustainability in construction. Forward-looking content.

## Jurisdiction-Specific Focus

### Australia
Auction culture, negative gearing debate, APRA regulations, state-by-state stamp duty, SMSF property, infrastructure projects (Western Sydney Airport, Cross River Rail, Suburban Rail Loop).

### New Zealand
Bright-line test changes, overseas buyer rules, building consent delays, Kiwibuild, density enablement, managed retreat from climate-vulnerable areas.

### United Kingdom
Leasehold reform, stamp duty bands, EPC requirements, Section 21 abolition, building safety post-Grenfell, planning reform, HS2 and Crossrail effects.

### United States
Fed policy and mortgage rates, state-level property tax variations, 1031 exchanges, institutional landlords, zoning reform, climate risk and insurance.

### Canada
Stress test rules, foreign buyer ban, provincial nominee programs, housing supply action plan, carbon tax on buildings, interprovincial migration.

## Rejection Criteria
Reject content that is: purely celebrity gossip, sports, entertainment, partisan politics without property angle, product reviews unrelated to property, travel/tourism without property investment angle, health/fitness, food/dining.
```

3. Referenced by:
   - Newsletter generation prompt (Spec 3) — provides editorial focus
   - Relevance scoring context — loaded and appended to the scoring prompt so the AI understands what PropertyHack considers relevant
   - Future: automated feed discovery prompts

## Testing Strategy

- **F1**: Seed keywords, verify admin UI loads correct data per jurisdiction + area
- **F2**: Check crawler SSR output with curl for article, location, and category pages
- **F3**: Process test articles with known relevance levels, verify scoring and routing
- **F4**: Run audit on test dataset, verify counts and score distribution
- **F5**: Verify system prompt exists and is editable in admin
