# AI Infrastructure — Multi-Model & Newsletter Generation — Spec

## Features

### F1: AI Provider Abstraction

**Current state**: All AI calls go directly to `@google/generative-ai` SDK. Model names are hardcoded in `articleSummaryService.js` and `imageGenerationService.js`. No way to switch providers without code changes.

**Required behaviour**:
- Unified provider interface: `generateText(prompt, options)` and `generateImage(prompt, options)`
- Supported providers:
  - **Gemini** (Google): `@google/generative-ai` — existing, refactored behind abstraction
  - **Claude** (Anthropic): `@anthropic-ai/sdk` — Haiku, Sonnet, Opus
  - **OpenAI**: `openai` package — GPT-4o, GPT-4o-mini
  - **Ollama** (local): HTTP to `localhost:11434` — any locally running model. Only active when `OLLAMA_ENABLED=true`
- Each provider has its own API key env var (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`)
- Provider handles prompt format differences (Gemini uses `generateContent`, Claude uses `messages`, OpenAI uses `chat.completions`)
- Cascade support: primary model fails → try fallback model (same or different provider)
- Image generation stays Gemini-only for now (Claude/OpenAI don't offer equivalent image gen)

**Acceptance criteria**:
- [ ] `aiProviderService.js` exposes `generateText()` and `generateImage()` with provider selection
- [ ] All 4 providers implemented and tested
- [ ] Existing summarisation pipeline works through the abstraction (no regression)
- [ ] Ollama only attempted when `OLLAMA_ENABLED=true`
- [ ] Provider-specific prompt formatting handled transparently
- [ ] Error handling includes provider name in error messages for debugging

---

### F2: Admin AI Model Configuration

**Current state**: No admin UI for AI model selection. Models are hardcoded.

**Required behaviour**:
- New "AI Models" section in admin sidebar
- Task-level model assignment — select provider + model for each task:
  - Article summarisation (text)
  - Image alt text generation (text)
  - Image generation (image — Gemini only)
  - Newsletter generation (text) — Spec 3 F3
  - Relevance scoring (text) — Spec 2 F3
- Config stored in `AiModelConfig` table:
  - `task` (unique string key)
  - `provider` (gemini | claude | openai | ollama)
  - `model` (provider-specific model ID)
  - `fallbackProvider` (nullable)
  - `fallbackModel` (nullable)
  - `isActive` (boolean)
- API key entry per provider (validated on save — test call)
- "Test" button per task — sends a test prompt and shows success/failure
- API keys stored as `SystemPrompt` records with a naming convention (e.g., `api-key-anthropic`) or in a dedicated secure config table

**Acceptance criteria**:
- [ ] Admin UI shows AI Models section with task list
- [ ] Each task has provider + model dropdowns
- [ ] Fallback provider + model configurable per task
- [ ] Test button verifies connectivity and returns success/error
- [ ] Config persists in DB and is read by `aiProviderService`
- [ ] Changing a model takes effect on next AI call (no restart needed)
- [ ] API keys are not exposed in API responses (write-only from admin)

---

### F3: Newsletter Generation Pipeline

**Current state**: No newsletter generation code exists. All ingredients are in place: pgvector embeddings on published articles, subscriber segmentation by country, Beehiiv integration for subscriber management, Henry's vector search pattern as a template.

**Required behaviour**:

**Article selection** (per jurisdiction):
- Query today's published articles for that market (recency-weighted vector search)
- Query historically similar articles (30-90 day lookback) to detect trends and patterns
- Cluster similar articles to identify recurring themes (e.g., "Perth has been in top movers for 6 weeks")
- Select 5-8 primary articles + 10-15 historical articles as context

**Generation**:
- Use the configured AI model (F2) with a newsletter-specific prompt
- Prompt includes:
  - Today's selected articles (title, summary, slug)
  - Historical context bundle (trend clusters, recurring themes)
  - Tone of voice for this jurisdiction (F4)
  - Feed quality criteria (Spec 2 F5) for editorial focus
  - PropertyHack site URL for link generation
- Output structure:
  - Subject line
  - Opening editorial paragraph (sets the tone, references key theme)
  - Article sections (3-5 main stories with commentary)
  - Trends & insights section (drawing on historical vector data)
  - "Worth revisiting" footer (3-5 older articles)
- All article references link to PropertyHack URLs (`/article/:slug`)

**Inline backlinking**:
- When referencing trends or historical context, weave links naturally: "Brisbane's median hit $1.2M, continuing a [pattern of sustained growth](/article/brisbane-prices-surge-17-per-cent) that began in late 2025"
- Links are part of the narrative, not standalone "Read more" blocks
- AI selects which historical articles to link based on semantic relevance to the current paragraph

**Related articles footer**:
- "Worth revisiting" section with 3-5 older articles per jurisdiction
- Selected by vector similarity to today's primary themes
- Each with title, one-line blurb, and PropertyHack link

**Scheduling & trigger**:
- Daily cron per jurisdiction (configurable time per market — e.g., AU at 6am AEST, UK at 7am GMT)
- Manual "Generate Now" button in admin per jurisdiction
- BullMQ worker for async generation

**Acceptance criteria**:
- [ ] Daily cron triggers newsletter generation per jurisdiction
- [ ] Manual generation works from admin UI
- [ ] Vector search retrieves today's articles + historical context
- [ ] Generated newsletter has: subject, editorial intro, 3-5 article sections, trends section, footer
- [ ] Inline backlinks woven naturally into narrative text
- [ ] Footer has 3-5 "Worth revisiting" articles with links
- [ ] All links point to PropertyHack article URLs
- [ ] Generation uses the configured AI model from F2

---

### F4: Jurisdiction Tone of Voice

**Current state**: No tone configuration. The summarisation prompt uses British English for AU/UK and American English for US/CA, but no editorial voice control.

**Required behaviour**:
- System prompt records for each jurisdiction:
  - `newsletter-tone-au`: Direct, no-nonsense, conversational Australian voice. References local landmarks and culture naturally.
  - `newsletter-tone-uk`: Measured, occasionally dry wit, informed. References UK property specifics (leasehold, council tax bands, etc.).
  - `newsletter-tone-us`: Energetic, data-driven, opportunity-focused. References US specifics (HOA, closing costs, Fed policy).
  - `newsletter-tone-ca`: Balanced, polite, informative. References Canadian specifics (stress test, CMHC, provincial differences).
  - `newsletter-tone-nz`: Relaxed, community-focused, practical. References NZ specifics (bright-line test, Kiwibuild, consents).
- Editable in admin under a "Newsletter Tones" subsection of Prompts
- Each tone prompt injected into the newsletter generation prompt for that jurisdiction

**Acceptance criteria**:
- [ ] 5 tone prompts seeded in DB (one per jurisdiction)
- [ ] Each editable in admin prompts section
- [ ] Newsletter generation uses the correct tone for each jurisdiction
- [ ] Changing a tone prompt affects the next newsletter generation (no restart)
- [ ] Default tones reflect each market's communication style

---

### F5: Newsletter Admin UI

**Current state**: No newsletter management interface.

**Required behaviour**:
- New "Newsletters" section in admin sidebar
- **Draft list**: Table of generated newsletters with columns: jurisdiction, subject, generated date, status (DRAFT/APPROVED/SENT), actions
- **Editor**: Click a draft to open a rich text editor (Quill, TipTap, or similar) with the generated HTML content. Admin can:
  - Edit subject line
  - Edit/rewrite any section
  - Remove or reorder articles
  - Add custom editorial notes
  - Preview as rendered email
- **Preview**: Side-by-side or modal preview showing the newsletter as subscribers would see it
- **Approve & Send**: Button to publish to Beehiiv. Confirmation dialog showing: jurisdiction, subscriber count for that segment, subject line
- **History**: Past sent newsletters with: sent date, jurisdiction, subject, open rate, click rate (pulled from Beehiiv API)

**Acceptance criteria**:
- [ ] Newsletters section visible in admin sidebar
- [ ] Draft list shows all generated newsletters with status
- [ ] Rich text editor loads with generated content
- [ ] Preview renders the newsletter accurately
- [ ] Approve & Send publishes to Beehiiv with correct segmentation
- [ ] History shows past newsletters with Beehiiv stats
- [ ] Status transitions: DRAFT → APPROVED → SENT

---

### F6: Beehiiv Publishing Integration

**Current state**: `beehiivService.js` handles subscriber sync only (subscribe/unsubscribe). No post creation or stats retrieval.

**Required behaviour**:
- Extend `beehiivService.js` with:
  - `createPost(subject, htmlContent, options)` — creates a Beehiiv post via their API
  - `schedulePost(postId, sendAt)` — schedule for a specific time
  - `sendPost(postId)` — send immediately
  - `getPostStats(postId)` — retrieve open rate, click rate, subscriber count
  - `listPosts(options)` — list recent posts for history view
- Segmentation: Use Beehiiv's segment/tag API to target subscribers by `country` custom field
- Store Beehiiv post ID on `NewsletterDraft` record for stat retrieval

**Acceptance criteria**:
- [ ] Posts created in Beehiiv with correct HTML content
- [ ] Posts targeted to subscribers with matching `country` custom field
- [ ] Immediate send and scheduled send both work
- [ ] Stats retrievable and displayed in admin history
- [ ] Beehiiv post ID stored on newsletter draft record

## Data Model Additions

### AiModelConfig
```
id          String   @id @default(uuid())
task        String   @unique  // e.g., "article-summarisation", "newsletter-generation"
provider    String             // gemini, claude, openai, ollama
model       String             // provider-specific model ID
fallbackProvider  String?
fallbackModel     String?
isActive    Boolean  @default(true)
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt
```

### NewsletterDraft
```
id              String    @id @default(uuid())
jurisdiction    String              // AU, NZ, UK, US, CA
subject         String
htmlContent     String              // rendered HTML
textContent     String?             // plain text version
articleIds      String[]            // IDs of articles referenced
status          NewsletterStatus    // DRAFT, APPROVED, SENT
beehiivPostId   String?             // Beehiiv post ID after publish
generatedAt     DateTime  @default(now())
approvedAt      DateTime?
sentAt          DateTime?
createdAt       DateTime  @default(now())
updatedAt       DateTime  @updatedAt
```

### NewsletterStatus enum
```
DRAFT
APPROVED
SENT
```
