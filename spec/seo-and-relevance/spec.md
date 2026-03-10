# SEO & Content Relevance — Spec

## Features

### F1: SEO Keywords by Jurisdiction

**Current state**: `SeoKeyword` model exists with `keyword`, `category`, `location`, `market`, `priority`, `isActive` fields. Only used by `articleImageWorker.js` for image alt text generation. Admin UI is a flat list. Only AU/NZ keywords exist (manually added). No injection into page meta tags.

**Required behaviour**:
- Admin SEO panel reorganised into jurisdiction tabs: AU, NZ, UK, US, CA
- Each tab shows national-level keywords and a dropdown to select areas within that jurisdiction
- Area selection shows area-specific keywords
- Bulk add/edit/delete within each section
- Keywords seeded for all 5 jurisdictions (~50-80 per jurisdiction)

**Keyword categories per jurisdiction**:
- Property market terms (e.g., "auction clearance rate" AU, "chain-free" UK, "closing costs" US)
- Investment language (e.g., "negative gearing" AU, "buy-to-let" UK, "cap rate" US)
- Regulatory/tax terms (e.g., "stamp duty" AU/UK, "transfer tax" US, "land transfer tax" CA)
- Location-specific terminology (e.g., "inner west" AU, "zone 2" UK, "tri-state" US)
- Property types (e.g., "granny flat" AU, "terraced house" UK, "condo" US/CA, "bach" NZ)

**Acceptance criteria**:
- [ ] Admin SEO panel has 5 jurisdiction tabs
- [ ] Each tab shows national keywords + area dropdown
- [ ] Area dropdown populated from `LocationSeo` records for that jurisdiction
- [ ] 50-80 keywords seeded per jurisdiction
- [ ] Keywords cover all 5 categories listed above
- [ ] Bulk operations (add multiple, delete selected) work

---

### F2: Keyword Injection into Meta Tags

**Current state**: Crawler SSR middleware (`crawlerSsr.js`) injects meta tags for bot requests but does NOT use `SeoKeyword` data. Meta descriptions come from article summaries or `LocationSeo` records. `<meta name="keywords">` is not set.

**Required behaviour**:
- **Article pages**: Inject 5-8 relevant keywords into `<meta name="keywords">` based on article's `market`, `location`, and `category`. Blend into meta description naturally (append 1-2 keyword phrases if they're contextually relevant, don't force it).
- **Location pages**: Use jurisdiction + area keywords in meta description. Set `<meta name="keywords">` from matching `SeoKeyword` records.
- **Category pages**: Use jurisdiction-appropriate keywords for that category.
- **Home page**: Use top-priority national keywords for the default market.
- **No keyword stuffing**: Only inject keywords that are contextually relevant to the page content. Better to use 3 relevant keywords than 10 forced ones.

**Acceptance criteria**:
- [ ] Article pages have `<meta name="keywords">` with 5-8 relevant keywords
- [ ] Location pages have keyword-enriched meta descriptions
- [ ] Category pages have relevant keywords
- [ ] Keywords are contextually appropriate (not random from the pool)
- [ ] Crawler SSR middleware serves these to bots correctly
- [ ] No visible change to human-facing pages (keywords are meta-only)

---

### F3: Content Relevance Scoring

**Current state**: Binary `isPropertyRelated` boolean in summarisation output. Articles marked `false` are hard-deleted. No nuance — a loosely-related article about interest rates affecting housing gets the same treatment as a pure property article.

**Required behaviour**:
- Add `relevanceScore` (Integer, 1-10) field to Article model
- Summarisation prompt updated to return `relevanceScore` alongside `isPropertyRelated`
- Scoring criteria defined in the system prompt:
  - **9-10**: Core property content (sales, auctions, listings, development, market reports)
  - **7-8**: Strongly related (housing policy, mortgage rates, construction, property investment strategy)
  - **5-6**: Moderately related (macro economics affecting property, infrastructure impacting areas, lifestyle/architecture)
  - **3-4**: Loosely related (general finance, urban planning without property focus, broad economic commentary)
  - **1-2**: Not related (sports, entertainment, unrelated politics, celebrity news)
- Processing rules:
  - Score 1-3: Auto-reject (hard delete, same as current `isPropertyRelated: false`)
  - Score 4-6: Save as DRAFT for manual review (not auto-published)
  - Score 7-10: Auto-publish (current behaviour)
- Threshold configurable via admin (default: reject <4, review 4-6, publish 7+)

**Acceptance criteria**:
- [ ] `relevanceScore` column exists on Article model
- [ ] Summarisation returns a 1-10 score
- [ ] Articles scoring 1-3 are auto-deleted
- [ ] Articles scoring 4-6 are saved as DRAFT
- [ ] Articles scoring 7-10 are auto-published
- [ ] Thresholds configurable in admin settings
- [ ] Score visible in admin article list (sortable/filterable)

---

### F4: Article Relevance Audit

**Current state**: Unknown number of draft articles with varying quality. No systematic way to assess relevance across the corpus.

**Required behaviour**:
- **Pre-audit cleanup** (depends on Spec 1 F7 Pass 1): Delete articles with no title/summary first
- **Audit script**: For remaining draft articles, call the AI with title + any available content to get a relevance score
- Articles scoring <4 are auto-deleted
- Articles scoring 4-6 remain as DRAFT with score attached
- Articles scoring 7+ are published
- Results reported: total processed, deleted, kept as draft, published
- Available as admin maintenance action with progress indicator

**Acceptance criteria**:
- [ ] Audit processes all remaining draft articles
- [ ] Each article gets a `relevanceScore` stored in DB
- [ ] Deletions, draft-holds, and publications follow the threshold rules
- [ ] Results summary displayed in admin
- [ ] Idempotent — running twice doesn't re-process already-scored articles

---

### F5: Feed Selection Criteria

**Current state**: No documented criteria for what makes a good content source. Source selection is ad-hoc.

**Required behaviour**:
- Create a `SystemPrompt` record named `feed-quality-criteria` with editorial guidelines
- Content categories to cover (balanced mix desired):
  1. **Stories & narratives**: Human interest property stories, buyer/seller journeys, renovation stories, neighbourhood profiles
  2. **Price & market data**: Median prices, auction results, clearance rates, rental yields, market reports
  3. **Macro & rates**: Interest rate decisions, central bank commentary, inflation data, economic indicators affecting property
  4. **Opinion & commentary**: Industry expert columns, market predictions, investment strategy, policy debate
  5. **Development & construction**: New developments, planning approvals, construction trends, building costs
  6. **PropTech & innovation**: Property technology, AI in real estate, new platforms, digital disruption
- Per-jurisdiction emphasis notes (e.g., AU: auction culture, negative gearing debate; UK: leasehold reform, stamp duty bands; US: Fed policy, HOA trends; CA: foreign buyer rules, stress test; NZ: bright-line test, overseas investment)
- Editable in admin under Prompts section
- Used by: newsletter generation (Spec 3), future feed discovery, relevance scoring context

**Acceptance criteria**:
- [ ] `feed-quality-criteria` system prompt exists in DB
- [ ] Covers all 6 content categories with descriptions
- [ ] Includes per-jurisdiction emphasis notes
- [ ] Editable in admin prompts section
- [ ] Referenced by relevance scoring prompt as context
