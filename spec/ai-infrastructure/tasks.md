# AI Infrastructure — Multi-Model & Newsletter Generation — Tasks

## Phase 1: AI Provider Abstraction

### T1.1: Create AI provider interface
- Create `server/services/aiProviderService.js` with:
  - `generateText(task, prompt, options)` — looks up config, routes to provider
  - `generateImage(task, prompt, options)` — routes to image-capable provider
  - `getProvider(task)` — returns configured provider + model for a task
- Define provider interface: `generateText(model, prompt, options)`, `generateImage(model, prompt, options)`, `isAvailable()`, `listModels()`
- Include fallback cascade logic (try primary provider, fall to fallback)
- Default to Gemini if no AiModelConfig record exists (backwards compatible)
- **Priority**: P1
- **Depends on**: nothing

### T1.2: Extract Gemini into provider module
- Create `server/services/providers/geminiProvider.js`
- Extract Gemini text generation from `articleSummaryService.js`
- Extract Gemini image generation from `imageGenerationService.js`
- Implement the provider interface
- Support models: gemini-2.5-flash, gemini-2.0-flash, gemini-2.0-flash-lite, gemini-2.0-flash-exp-image-generation, gemini-2.5-flash-image
- **Priority**: P1
- **Depends on**: T1.1

### T1.3: Create Claude (Anthropic) provider
- Install `@anthropic-ai/sdk`
- Create `server/services/providers/claudeProvider.js`
- Map prompt format: system instruction → `system` param, user content → `messages` array
- Handle JSON mode via prompt instruction ("respond with valid JSON")
- Support models: claude-haiku-4-5-20251001, claude-sonnet-4-6, claude-opus-4-6
- **Priority**: P1
- **Depends on**: T1.1

### T1.4: Create OpenAI text provider
- Create `server/services/providers/openaiProvider.js`
- Reuse existing `openai` package (already installed for embeddings)
- Map prompt format: system → system message, user → user message
- Handle JSON mode via `response_format: { type: 'json_object' }`
- Support models: gpt-4o, gpt-4o-mini
- **Priority**: P1
- **Depends on**: T1.1

### T1.5: Create Ollama local provider
- Create `server/services/providers/ollamaProvider.js`
- HTTP calls to `http://localhost:11434/api/generate`
- Only instantiated when `OLLAMA_ENABLED=true` env var is set
- Dynamic model list from `GET /api/tags`
- 120s timeout for local inference
- Handle JSON mode via `format: 'json'`
- **Priority**: P2
- **Depends on**: T1.1

### T1.6: Migrate articleSummaryService to provider abstraction
- Refactor `articleSummaryService.js` to call `aiProviderService.generateText('article-summarisation', ...)`
- Refactor `generateImageAltText()` to call `aiProviderService.generateText('image-alt-text', ...)`
- Remove direct `@google/generative-ai` imports for text generation
- Ensure no regression in JSON parsing or field extraction
- **Priority**: P1
- **Depends on**: T1.2 (Gemini provider must exist as the default)

### T1.7: Migrate imageGenerationService to provider abstraction
- Refactor `imageGenerationService.js` to call `aiProviderService.generateImage('image-generation', ...)`
- Image generation stays Gemini-only but routes through abstraction
- Remove direct `@google/generative-ai` imports for image generation
- Preserve fallback-to-SVG behaviour
- **Priority**: P1
- **Depends on**: T1.2

## Phase 2: AI Model Configuration

### T2.1: Create AiModelConfig Prisma model
- Add `AiModelConfig` model to schema.prisma: id, task (unique), provider, model, fallbackProvider, fallbackModel, isActive
- Create Prisma migration
- Generate client
- **Priority**: P1
- **Depends on**: nothing

### T2.2: Seed default AiModelConfig records
- Create `server/scripts/seed-ai-config.js`
- Seed 5 task configs all defaulting to Gemini:
  - article-summarisation → gemini / gemini-2.5-flash
  - image-alt-text → gemini / gemini-2.0-flash-exp
  - image-generation → gemini / gemini-2.0-flash-exp-image-generation
  - newsletter-generation → gemini / gemini-2.5-flash
  - relevance-scoring → gemini / gemini-2.0-flash
- **Priority**: P1
- **Depends on**: T2.1

### T2.3: Create AI model admin API routes
- Create `server/routes/admin/aiModels.js`
- `GET /` — list all task configs
- `GET /:task` — get config for specific task
- `PUT /:task` — update config
- `GET /providers` — list available providers, their models, and API key status (present/missing)
- `POST /:task/test` — test configured model with sample prompt, return success/error
- Mount at `/api/admin/ai-models`
- **Priority**: P2
- **Depends on**: T2.1, T1.1

### T2.4: Create AI model admin UI — task list view
- Create `components/admin/AiModelConfig.tsx`
- Table of tasks with columns: task name, current provider, current model, fallback, status
- Provider status cards: key present (green check / red X), available models
- Add "AI Models" to admin sidebar navigation in `AdminLayout.tsx`
- **Priority**: P2
- **Depends on**: T2.3

### T2.5: Create AI model admin UI — task editor modal
- Modal triggered from task list: select provider → select model → set fallback provider/model
- "Test" button: sends test prompt, shows success/error toast
- Save updates the `AiModelConfig` record
- **Priority**: P2
- **Depends on**: T2.4

## Phase 3: Newsletter Infrastructure

### T3.1: Create NewsletterDraft Prisma model
- Add `NewsletterDraft` model: id, jurisdiction, subject, htmlContent, textContent, articleIds[], status (DRAFT/APPROVED/SENT), beehiivPostId, generatedAt, approvedAt, sentAt
- Add `NewsletterStatus` enum
- Create Prisma migration
- **Priority**: P1
- **Depends on**: nothing

### T3.2: Seed newsletter tone prompts
- Create `server/scripts/seed-newsletter-tones.js`
- Seed 5 `SystemPrompt` records: newsletter-tone-au, newsletter-tone-uk, newsletter-tone-us, newsletter-tone-ca, newsletter-tone-nz
- Each with jurisdiction-appropriate voice (as defined in design F4)
- **Priority**: P1
- **Depends on**: nothing

### T3.3: Create newsletter article selection service
- Create `server/services/newsletterService.js` (part 1: article selection)
- `selectTodaysArticles(jurisdiction)` — query published articles from last 24h for this market using vector search
- `selectHistoricalContext(jurisdiction, todaysEmbedding)` — 30-90 day lookback, find semantically similar articles
- `clusterTrends(historicalArticles)` — group by similarity >0.7, count clusters, generate trend descriptions
- Return structured data: `{ todaysArticles, historicalArticles, trendClusters }`
- **Priority**: P1
- **Depends on**: nothing (uses existing embedding infrastructure)

### T3.4: Create newsletter prompt builder
- Add to `newsletterService.js` (part 2: prompt construction)
- `buildNewsletterPrompt(jurisdiction, articleData)`:
  - Load tone prompt for jurisdiction
  - Load feed quality criteria prompt (Spec 2 T1.2)
  - Format today's articles with titles, summaries, slugs
  - Format historical context and trend clusters
  - Format related older articles for backlinking
  - Assemble full prompt with backlinking instructions
- Return `{ systemPrompt, userPrompt }`
- **Priority**: P1
- **Depends on**: T3.2 (tone prompts), Spec 2 T1.2 (feed criteria prompt)

### T3.5: Create newsletter generation and storage
- Add to `newsletterService.js` (part 3: generation)
- `generateNewsletter(jurisdiction)`:
  - Call article selection (T3.3)
  - Call prompt builder (T3.4)
  - Call `aiProviderService.generateText('newsletter-generation', ...)` (T1.1)
  - Parse AI output: subject, HTML sections, referenced article slugs
  - Store as `NewsletterDraft` with status DRAFT
- Return the created draft
- **Priority**: P1
- **Depends on**: T3.1 (schema), T3.3, T3.4, T1.1 (AI provider)

### T3.6: Create newsletter generation BullMQ worker
- Create `server/workers/newsletterGenerateWorker.js`
- New queue: `newsletterGenerateQueue`
- Worker calls `newsletterService.generateNewsletter(jurisdiction)`
- Error handling: log error, don't crash worker
- Concurrency: 1 per jurisdiction
- **Priority**: P2
- **Depends on**: T3.5

### T3.7: Add newsletter generation cron schedule
- Add cron jobs to scheduler (new file or extend `ingestionScheduler.js`)
- One cron per jurisdiction at configured times (AU 8pm UTC, NZ 6pm UTC, UK 7am UTC, US 11am UTC, CA 11am UTC)
- Each enqueues a job on `newsletterGenerateQueue`
- **Priority**: P2
- **Depends on**: T3.6

## Phase 4: Newsletter Admin UI

### T4.1: Create newsletter admin API routes
- Create `server/routes/admin/newsletters.js`
- `GET /` — list drafts (filterable by jurisdiction, status), paginated
- `GET /:id` — get draft with full content
- `PUT /:id` — update draft (subject, htmlContent)
- `DELETE /:id` — delete draft
- `POST /:id/approve` — set status APPROVED
- `POST /generate` — trigger manual generation for a jurisdiction
- Mount at `/api/admin/newsletters`
- **Priority**: P2
- **Depends on**: T3.1 (schema)

### T4.2: Create newsletter list component
- Create `components/admin/NewsletterList.tsx`
- Jurisdiction filter tabs (AU, NZ, UK, US, CA, All)
- Draft table: subject, jurisdiction, generated date, status badge, edit/delete actions
- "Generate Now" button per jurisdiction (calls `POST /generate`)
- Add "Newsletters" to admin sidebar navigation
- **Priority**: P2
- **Depends on**: T4.1

### T4.3: Install TipTap and create newsletter rich text editor
- Install `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`
- Create `components/admin/NewsletterEditor.tsx` (editor portion)
- Subject line inline editor
- Rich text editor with toolbar: bold, italic, link, heading, list
- Load draft content on mount, save on change
- **Priority**: P2
- **Depends on**: T4.1

### T4.4: Add newsletter preview and approval flow
- Add to `NewsletterEditor.tsx`:
  - Preview panel: rendered HTML in modal or side panel
  - Article links panel: list of referenced articles with clickable PropertyHack links
  - Status bar: DRAFT → APPROVED → SENT with timestamps
  - "Approve" button
- **Priority**: P2
- **Depends on**: T4.3

### T4.5: Create newsletter tone management UI
- Add "Newsletter Tones" subsection to admin prompts page
- Show 5 tone prompts with inline edit
- Reuse existing `PromptEditor.tsx` pattern
- **Priority**: P3
- **Depends on**: T3.2 (tones must be seeded)

## Phase 5: Beehiiv Publishing

### T5.1: Add newsletter post creation to Beehiiv service
- Extend `server/services/beehiivService.js`:
  - `createPost(subject, htmlContent, options)` — POST to Beehiiv publications API
  - `sendPost(postId, segmentOptions)` — send targeting country custom field
- **Priority**: P2
- **Depends on**: T3.1 (need beehiivPostId on draft)

### T5.2: Add newsletter stats retrieval to Beehiiv service
- Extend `beehiivService.js`:
  - `getPostStats(postId)` — opens, clicks, subscribers sent to
  - `listPosts(page, limit)` — for history view
- **Priority**: P3
- **Depends on**: T5.1

### T5.3: Wire send button in newsletter admin
- Add `POST /api/admin/newsletters/:id/send` route
- Calls `beehiivService.createPost()` then `sendPost()`
- Stores Beehiiv post ID on draft, updates status to SENT
- Wire into `NewsletterEditor.tsx`: confirmation dialog (jurisdiction, subscriber count, subject) → send
- **Priority**: P3
- **Depends on**: T5.1, T4.4

### T5.4: Create newsletter history view with stats
- Add `GET /api/admin/newsletters/history` route — list SENT drafts with Beehiiv stats
- Create history tab in `NewsletterList.tsx`
- Show: subject, jurisdiction, sent date, open rate, click rate
- **Priority**: P3
- **Depends on**: T5.2, T5.3

## Task Summary

Total: 28 tasks
Immediately unblocked: 6 (T1.1, T2.1, T3.1, T3.2, T3.3)
Blocked: 22

## Cross-Spec Dependencies

| This Task | Depends On |
|---|---|
| Spec 1 T3.3 (draft cleanup pass 2) | Spec 2 T2.3 (relevance scoring in worker) |
| Spec 2 T5.1 (article audit) | Spec 1 T3.1 (empty article cleanup first) |
| Spec 3 T3.4 (newsletter prompt builder) | Spec 2 T1.2 (feed criteria prompt) |
