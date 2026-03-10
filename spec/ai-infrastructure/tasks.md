# AI Infrastructure — Multi-Model & Newsletter Generation — Tasks

## Phase 1: AI Provider Abstraction

### T1.1: Create AI provider interface and Gemini provider
- Create `server/services/aiProviderService.js` with unified interface
- Extract Gemini code from `articleSummaryService.js` into `server/services/providers/geminiProvider.js`
- Support `generateText()` and `generateImage()` methods
- Include model cascade logic (try primary, fall back)
- Backwards compatible: if no `AiModelConfig` record, default to Gemini
- **Priority**: P1
- **Depends on**: nothing

### T1.2: Create Claude (Anthropic) provider
- Install `@anthropic-ai/sdk`
- Create `server/services/providers/claudeProvider.js`
- Support Haiku, Sonnet, Opus models
- Handle prompt format: system param + messages array
- Handle JSON mode via prompt instruction
- **Priority**: P1
- **Depends on**: T1.1 (provider interface must exist)

### T1.3: Create OpenAI text provider
- Create `server/services/providers/openaiProvider.js`
- Reuse existing `openai` package (already installed for embeddings)
- Support GPT-4o, GPT-4o-mini
- Handle JSON mode via `response_format`
- **Priority**: P1
- **Depends on**: T1.1

### T1.4: Create Ollama provider
- Create `server/services/providers/ollamaProvider.js`
- HTTP calls to `localhost:11434`
- Only active when `OLLAMA_ENABLED=true`
- Dynamic model list from `/api/tags`
- 120s timeout for local inference
- **Priority**: P2
- **Depends on**: T1.1

### T1.5: Migrate articleSummaryService to use provider abstraction
- Refactor `articleSummaryService.js` to call `aiProviderService.generateText()` instead of direct Gemini calls
- Refactor `generateImageAltText()` similarly
- Ensure no regression in summarisation output format
- **Priority**: P1
- **Depends on**: T1.1

### T1.6: Migrate imageGenerationService to use provider abstraction
- Refactor `imageGenerationService.js` to call `aiProviderService.generateImage()`
- Image generation stays Gemini-only but goes through the abstraction
- **Priority**: P1
- **Depends on**: T1.1

## Phase 2: AI Model Configuration

### T2.1: Create AiModelConfig schema and seed
- Add `AiModelConfig` model to schema.prisma
- Create Prisma migration
- Seed default configs: all 5 tasks defaulting to Gemini with current models
- **Priority**: P1
- **Depends on**: nothing

### T2.2: Create AI model admin routes
- Create `server/routes/admin/aiModels.js`
- CRUD for task configs: `GET /`, `GET /:task`, `PUT /:task`
- Provider list: `GET /providers` (available providers + their models + key status)
- Test endpoint: `POST /:task/test` (sends test prompt, returns success/error)
- Mount at `/api/admin/ai-models`
- **Priority**: P2
- **Depends on**: T2.1, T1.1

### T2.3: Create AI model admin UI
- Create `components/admin/AiModelConfig.tsx`
- Task list table with current provider/model
- Task editor modal: provider dropdown → model dropdown → fallback config → test button
- Provider status cards: key present (green/red), test button
- Ollama status (connected/disconnected, model list)
- Add "AI Models" to admin sidebar navigation
- **Priority**: P2
- **Depends on**: T2.2

## Phase 3: Newsletter Infrastructure

### T3.1: Create NewsletterDraft schema
- Add `NewsletterDraft` model and `NewsletterStatus` enum to schema.prisma
- Create Prisma migration
- **Priority**: P1
- **Depends on**: nothing

### T3.2: Seed newsletter tone prompts
- Create `server/scripts/seed-newsletter-tones.js`
- Seed 5 `SystemPrompt` records: `newsletter-tone-au`, `newsletter-tone-uk`, `newsletter-tone-us`, `newsletter-tone-ca`, `newsletter-tone-nz`
- Each with jurisdiction-appropriate voice as defined in design F4
- **Priority**: P1
- **Depends on**: nothing

### T3.3: Create newsletter generation service
- Create `server/services/newsletterService.js`
- Article selection: today's articles by market (vector search)
- Historical context: 30-90 day lookback, trend clustering via vector similarity
- Prompt construction: tone + criteria + articles + historical context + backlinking instructions
- Call AI via `aiProviderService.generateText('newsletter-generation', ...)`
- Parse output: subject, HTML sections, referenced article slugs
- Store as `NewsletterDraft`
- **Priority**: P1
- **Depends on**: T1.1 (AI provider), T3.1 (schema), T3.2 (tone prompts), Spec 2 T1.2 (feed criteria prompt)

### T3.4: Create newsletter generation worker
- Create `server/workers/newsletterGenerateWorker.js`
- BullMQ worker on `newsletterGenerateQueue`
- Calls `newsletterService.generate(jurisdiction)`
- Error handling: store error on draft record, don't crash worker
- **Priority**: P2
- **Depends on**: T3.3

### T3.5: Add newsletter generation cron schedule
- Add cron jobs to scheduler: one per jurisdiction at configured times
- Default: AU 8pm UTC, NZ 6pm UTC, UK 7am UTC, US 11am UTC, CA 11am UTC
- Schedule stored in config (could use SystemPrompt or a simple config object)
- Enqueues jobs on `newsletterGenerateQueue`
- **Priority**: P2
- **Depends on**: T3.4

## Phase 4: Newsletter Admin UI

### T4.1: Create newsletter admin routes
- Create `server/routes/admin/newsletters.js`
- `GET /` — list drafts (filterable by jurisdiction, status)
- `GET /:id` — get draft with full content
- `PUT /:id` — update draft (edit content, subject)
- `POST /:id/approve` — set status to APPROVED
- `POST /:id/send` — publish to Beehiiv
- `POST /generate` — trigger manual generation for a jurisdiction
- `GET /history` — list sent newsletters with stats
- Mount at `/api/admin/newsletters`
- **Priority**: P2
- **Depends on**: T3.1 (schema)

### T4.2: Create newsletter list component
- Create `components/admin/NewsletterList.tsx`
- Jurisdiction filter (tabs or dropdown)
- Draft table: subject, jurisdiction, date, status badge, actions (edit, delete)
- "Generate Now" button per jurisdiction
- Next scheduled generation display
- Add "Newsletters" to admin sidebar navigation
- **Priority**: P2
- **Depends on**: T4.1

### T4.3: Create newsletter editor component
- Create `components/admin/NewsletterEditor.tsx`
- Install TipTap: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`
- Subject line editor (inline text)
- Rich text editor with toolbar (bold, italic, link, heading, list)
- Article links panel (list of referenced articles)
- Preview panel (rendered HTML in modal or side panel)
- Status bar showing current state + timestamps
- **Priority**: P2
- **Depends on**: T4.1, T4.2

### T4.4: Create newsletter tone management UI
- Add "Newsletter Tones" subsection to admin prompts page
- Show 5 tone prompts (one per jurisdiction) with inline edit
- Reuse existing `PromptEditor.tsx` pattern
- **Priority**: P3
- **Depends on**: T3.2 (tones must be seeded)

## Phase 5: Beehiiv Publishing

### T5.1: Extend Beehiiv service for newsletter publishing
- Add to `server/services/beehiivService.js`:
  - `createPost(subject, htmlContent, options)`
  - `sendPost(postId, segmentOptions)` — target by country custom field
  - `getPostStats(postId)` — opens, clicks, subscriber count
  - `listPosts(page, limit)` — for history view
- Store Beehiiv post ID on `NewsletterDraft` record
- **Priority**: P2
- **Depends on**: T3.1 (schema must have beehiivPostId)

### T5.2: Integrate Beehiiv publishing into newsletter admin flow
- Wire "Approve & Send" button in `NewsletterEditor.tsx` to:
  1. Call `POST /api/admin/newsletters/:id/approve`
  2. Show confirmation dialog (jurisdiction, subscriber count, subject)
  3. On confirm: call `POST /api/admin/newsletters/:id/send`
  4. Backend: create Beehiiv post, send to segment, update draft status to SENT
- Add history view with stats from Beehiiv
- **Priority**: P3
- **Depends on**: T5.1, T4.3

## Task Dependency Summary

```
T1.1 ──→ T1.2
     ──→ T1.3
     ──→ T1.4
     ──→ T1.5
     ──→ T1.6
     ──→ T2.2 (also needs T2.1)
     ──→ T3.3 (also needs T3.1, T3.2, Spec 2 T1.2)

T2.1 ──→ T2.2 ──→ T2.3

T3.1 ──→ T3.3 ──→ T3.4 ──→ T3.5
     ──→ T4.1 ──→ T4.2 ──→ T4.3 ──→ T5.2
     ──→ T5.1 ──→ T5.2

T3.2 ──→ T3.3
     ──→ T4.4
```

Total: 18 tasks
Immediately unblocked: 4 (T1.1, T2.1, T3.1, T3.2)
Blocked: 14

## Cross-Spec Dependencies

| This Task | Depends On |
|---|---|
| Spec 1 T3.2 (draft cleanup pass 2) | Spec 2 T2.1 (relevance scoring) |
| Spec 2 T5.1 (article audit) | Spec 1 T3.1 (empty article cleanup) |
| Spec 3 T3.3 (newsletter generation) | Spec 2 T1.2 (feed criteria prompt) |
| Spec 3 T1.5 (migrate summary service) | Spec 3 T1.1 (provider interface) |
| Spec 2 T2.1 (relevance in summarisation) | Spec 2 T1.1 (relevance score field) |
