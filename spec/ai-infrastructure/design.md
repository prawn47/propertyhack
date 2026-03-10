# AI Infrastructure — Multi-Model & Newsletter Generation — Design

## Architecture

### New Services
- `server/services/aiProviderService.js` — unified LLM abstraction
- `server/services/providers/geminiProvider.js` — Gemini implementation (extracted from existing code)
- `server/services/providers/claudeProvider.js` — Anthropic Claude implementation
- `server/services/providers/openaiProvider.js` — OpenAI implementation (text only, embeddings stay separate)
- `server/services/providers/ollamaProvider.js` — Ollama local implementation
- `server/services/newsletterService.js` — newsletter generation orchestration
- `server/workers/newsletterGenerateWorker.js` — BullMQ worker for async generation

### New Routes
- `server/routes/admin/aiModels.js` — AI model configuration CRUD
- `server/routes/admin/newsletters.js` — newsletter draft management, generation trigger, Beehiiv publish

### New Components
- `components/admin/AiModelConfig.tsx` — model selection per task
- `components/admin/NewsletterList.tsx` — draft list with status
- `components/admin/NewsletterEditor.tsx` — rich text editor + preview
- `components/admin/NewsletterTones.tsx` — tone management (subsection of prompts)

### Schema Changes
- `AiModelConfig` model (new)
- `NewsletterDraft` model (new)
- `NewsletterStatus` enum (new)

## F1: AI Provider Abstraction

### Interface

```javascript
// server/services/aiProviderService.js

class AiProviderService {
  // Get the configured provider for a specific task
  async getProvider(task) → { provider, model, fallbackProvider, fallbackModel }

  // Generate text with automatic fallback
  async generateText(task, prompt, options?) → { text, provider, model, tokens }

  // Generate image (Gemini only)
  async generateImage(task, prompt, options?) → { imageData, mimeType }
}
```

### Provider Interface

Each provider implements:
```javascript
class Provider {
  constructor(apiKey, options?)
  async generateText(model, prompt, options?) → { text, tokens }
  async generateImage(model, prompt, options?) → { imageData, mimeType }  // optional
  isAvailable() → boolean
  listModels() → [{ id, name, capabilities }]
}
```

### Gemini Provider
- Extracted from existing `articleSummaryService.js` and `imageGenerationService.js`
- Supports both text and image generation
- Model list: gemini-2.5-flash, gemini-2.0-flash, gemini-2.0-flash-lite, gemini-2.0-flash-exp-image-generation
- Existing prompt format: `model.generateContent(prompt)` → `response.text()`

### Claude Provider
- `@anthropic-ai/sdk` package
- Model list: claude-haiku-4-5-20251001, claude-sonnet-4-6, claude-opus-4-6
- Prompt format: `client.messages.create({ model, messages: [{ role: 'user', content: prompt }], system: systemPrompt })`
- Map existing Gemini-style prompts: system instruction → `system` param, user content → `messages`

### OpenAI Provider
- `openai` package (already a dependency for embeddings)
- Model list: gpt-4o, gpt-4o-mini
- Prompt format: `openai.chat.completions.create({ model, messages: [{ role: 'system', content }, { role: 'user', content }] })`
- JSON mode: `response_format: { type: 'json_object' }` for structured output

### Ollama Provider
- HTTP calls to `http://localhost:11434/api/generate`
- Only instantiated when `OLLAMA_ENABLED=true`
- Model list: dynamically fetched from `GET /api/tags`
- Prompt format: `{ model, prompt, system, stream: false }`
- Timeout: 120s (local models can be slow)

### Migration from Direct Gemini Calls

**Before**: `articleSummaryService.js` directly calls `@google/generative-ai`
**After**: `articleSummaryService.js` calls `aiProviderService.generateText('article-summarisation', prompt)`

The `aiProviderService` looks up which provider + model is configured for `'article-summarisation'` in `AiModelConfig`, instantiates the right provider, and handles the call + fallback.

**Backwards compatible**: If no `AiModelConfig` record exists for a task, default to Gemini with the current model cascade. This means the migration is non-breaking — existing behaviour is preserved until admin changes models.

### Prompt Adaptation

Different providers need slightly different prompt structures. The provider abstraction handles this:

- **System prompt**: All providers support a system-level instruction. The DB-stored `SystemPrompt` content becomes the system message.
- **User content**: The article content + specific instructions become the user message.
- **JSON output**: Gemini uses `generationConfig.responseMimeType: 'application/json'`. Claude uses tool_use or asks for JSON in prompt. OpenAI uses `response_format: { type: 'json_object' }`. Ollama uses `format: 'json'`.
- **The abstraction normalises**: caller passes `{ systemPrompt, userPrompt, jsonMode: true }` and the provider handles format differences.

## F2: Admin AI Model Configuration

### API Routes (`/api/admin/ai-models`)

```
GET    /                    → list all task configs
GET    /:task               → get config for specific task
PUT    /:task               → update config for a task
POST   /:task/test          → test the configured model with a sample prompt
GET    /providers            → list available providers + their models
POST   /providers/:name/test → test a provider's API key
```

### Tasks (seeded)
| Task Key | Description | Default Provider | Default Model |
|---|---|---|---|
| `article-summarisation` | Summarise articles | gemini | gemini-2.5-flash |
| `image-alt-text` | Generate image alt text | gemini | gemini-2.0-flash-exp |
| `image-generation` | Generate article images | gemini | gemini-2.0-flash-exp-image-generation |
| `newsletter-generation` | Generate newsletters | gemini | gemini-2.5-flash |
| `relevance-scoring` | Score article relevance | gemini | gemini-2.0-flash |

### API Key Storage
- Store API keys as environment variables (not in DB — security best practice)
- Admin UI shows which keys are configured (key present: green check, missing: red X)
- Admin can test each key without seeing the value
- Keys read from: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- No Ollama key needed (local, unauthenticated)

### Frontend Component

```
AiModelConfig.tsx
├── TaskList (table of tasks with current provider/model)
├── TaskEditor (modal: select provider → select model → set fallback → test)
├── ProviderStatus (card per provider: key status, test button, available models)
└── OllamaStatus (connection status, model list if connected)
```

## F3: Newsletter Generation Pipeline

### Orchestration Flow

```
Cron trigger (or manual)
  ↓
newsletterGenerateWorker.js (BullMQ)
  ↓
For each jurisdiction:
  1. Fetch today's articles (vector search, market-filtered)
  2. Fetch historical context (30-90 day lookback, trend clusters)
  3. Load tone prompt for jurisdiction
  4. Load feed quality criteria prompt
  5. Build generation prompt
  6. Call AI via aiProviderService.generateText('newsletter-generation', ...)
  7. Parse output (subject, HTML sections, article references)
  8. Store as NewsletterDraft (status: DRAFT)
  ↓
Admin reviews in newsletter UI
  ↓
Approve → Beehiiv publish
```

### Article Selection (Vector Search)

**Today's articles**:
```sql
SELECT a.id, a.title, a.short_blurb, a.long_summary, a.slug, a.category,
       a.published_at, a.source_url,
       1 - (a.embedding <=> $1::vector) as similarity
FROM articles a
WHERE a.status = 'PUBLISHED'
  AND a.embedding IS NOT NULL
  AND a.published_at >= NOW() - INTERVAL '24 hours'
  AND (a.market = $2 OR a.is_global = true OR a.is_evergreen = true)
ORDER BY a.published_at DESC
LIMIT 20;
```

**Historical context** (for trend detection):
```sql
SELECT a.id, a.title, a.short_blurb, a.slug, a.category, a.published_at,
       1 - (a.embedding <=> $1::vector) as similarity
FROM articles a
WHERE a.status = 'PUBLISHED'
  AND a.embedding IS NOT NULL
  AND a.published_at >= NOW() - INTERVAL '90 days'
  AND a.published_at < NOW() - INTERVAL '24 hours'
  AND (a.market = $2 OR a.is_global = true)
  AND 1 - (a.embedding <=> $1::vector) > 0.4
ORDER BY similarity DESC
LIMIT 30;
```

The `$1` embedding is generated from a concatenation of today's top article titles — this finds historically similar content to today's themes.

**Trend clustering**:
- Group historical articles by semantic similarity (articles with >0.7 cosine similarity to each other)
- Count cluster sizes — large clusters = recurring themes
- Pass cluster summaries to the generation prompt: "Brisbane prices appeared in 8 articles over 6 weeks" etc.

### Generation Prompt Structure

```
SYSTEM: {newsletter-tone-{jurisdiction} prompt}

USER:
You are writing the daily PropertyHack newsletter for {jurisdiction_name} subscribers.

## Editorial Guidelines
{feed-quality-criteria prompt content}

## Today's Top Articles
{For each of today's 5-8 best articles:}
- [{title}](/article/{slug}): {longSummary}

## Historical Context & Trends
{For each trend cluster:}
- Theme: "{cluster_description}" — {count} articles over {timespan}
  - Key article: [{title}](/article/{slug}) ({date})

## Related Older Articles (for backlinking)
{For each of 10-15 historical articles with high similarity:}
- [{title}](/article/{slug}): {shortBlurb} (published {date})

## Instructions
Write a newsletter with these sections:
1. Subject line (compelling, 60 chars max)
2. Opening editorial paragraph — set the tone, reference today's key theme
3. 3-5 main story sections — each with a headline, 2-3 paragraph commentary, and link to the full article on PropertyHack
4. Trends & Insights — draw on historical data to identify patterns. Weave in backlinks to older articles NATURALLY as hyperlinked words within sentences, not as standalone links
5. "Worth Revisiting" — 3-5 older articles relevant to today's themes, each with title, one-line blurb, and link

ALL links must use PropertyHack URLs: /article/{slug}
Inline backlinks must be woven into narrative text as [hyperlinked phrases](/article/{slug}), not listed separately.
Output as JSON: { subject, sections: [{ type, heading?, html }], articleSlugs: [] }
```

### Scheduling

- New cron entries in `server/jobs/ingestionScheduler.js` (or a new `newsletterScheduler.js`):
  - AU: `0 6 * * *` (6am AEST / 8pm UTC)
  - NZ: `0 6 * * *` (6am NZST / 6pm UTC)
  - UK: `0 7 * * *` (7am GMT / 7am UTC)
  - US: `0 6 * * *` (6am EST / 11am UTC)
  - CA: `0 6 * * *` (6am EST / 11am UTC)
- Schedule configurable per jurisdiction via admin
- Each triggers a BullMQ job on `newsletterGenerateQueue`

## F4: Jurisdiction Tone of Voice

**Seeded via** `server/scripts/seed-newsletter-tones.js`:

**AU**: "Write in a direct, no-nonsense Australian voice. Conversational but informed. Use plain language, avoid jargon unless it's industry-standard (negative gearing, clearance rate). Reference Australian specifics naturally — state differences, auction culture, seasonal patterns. Slight humour is fine but don't force it. Think: smart friend who works in property, not a sales agent."

**UK**: "Write in a measured, informed British voice. Dry observations welcome. Reference UK-specific property concepts naturally — leasehold vs freehold, council tax bands, EPC ratings. Acknowledge regional differences (London vs rest of UK, Scotland's separate system). Authoritative without being stuffy. Think: quality broadsheet property section."

**US**: "Write in an energetic, opportunity-aware American voice. Data-driven and actionable. Reference US specifics — Fed policy, state variations, 1031 exchanges, housing starts. Acknowledge the diversity of US markets (coastal vs Sun Belt vs Midwest). Optimistic but honest about challenges. Think: smart financial newsletter with a property focus."

**CA**: "Write in a balanced, informative Canadian voice. Acknowledge the unique challenges — stress test, interprovincial differences, housing affordability crisis. Reference Canadian specifics — CMHC, provincial rules, GTA vs GVA dynamics. Inclusive and practical. Think: trusted national property news source."

**NZ**: "Write in a relaxed, community-minded New Zealand voice. Practical and grounded. Reference NZ specifics — bright-line test, building consent challenges, Kiwibuild. Acknowledge the small market reality — everyone knows everyone. Honest about challenges, hopeful about solutions. Think: informed local voice with national perspective."

## F5: Newsletter Admin UI

### Component Structure

```
NewsletterList.tsx
├── JurisdictionFilter (tabs or dropdown)
├── DraftTable (subject, jurisdiction, date, status, actions)
├── GenerateButton (per jurisdiction, triggers manual generation)
└── ScheduleDisplay (shows next scheduled generation per jurisdiction)

NewsletterEditor.tsx
├── SubjectEditor (inline text edit)
├── RichTextEditor (TipTap — already lightweight, good HTML output)
│   ├── Toolbar (bold, italic, link, heading, list)
│   └── ContentArea (editable HTML)
├── PreviewPanel (rendered HTML in iframe or modal)
├── ArticleLinks (list of referenced articles with clickable links)
├── ApproveButton → SendConfirmation modal
│   ├── Jurisdiction badge
│   ├── Subscriber count for this segment
│   └── Subject preview
└── StatusBar (DRAFT / APPROVED / SENT with timestamps)

NewsletterHistory.tsx
├── SentTable (subject, jurisdiction, sent date, opens, clicks)
└── StatsCards (aggregate: total sent, avg open rate, avg click rate)
```

### Rich Text Editor Choice

**TipTap** — lightweight, extensible, good HTML output, works well with React. Already common in content apps. No heavy dependencies.

Alternative considered: Quill — heavier, less maintained. React-Quill has compatibility issues with React 19.

**Decision**: TipTap. Install `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`.

## F6: Beehiiv Publishing Integration

### New Functions in `beehiivService.js`

```javascript
// Create a post (draft state in Beehiiv)
async createPost(subject, htmlContent, options) {
  // POST /publications/{pubId}/posts
  // Returns { id, status, web_url }
}

// Send to specific segment
async sendPost(postId, segmentOptions) {
  // POST /publications/{pubId}/posts/{postId}/send
  // segmentOptions: { custom_fields: [{ name: 'country', value: 'AU' }] }
}

// Get post stats
async getPostStats(postId) {
  // GET /publications/{pubId}/posts/{postId}/stats
  // Returns { opens, clicks, subscribers_sent_to }
}

// List recent posts
async listPosts(page, limit) {
  // GET /publications/{pubId}/posts?page=X&limit=Y
}
```

### Beehiiv API Requirements
- Beehiiv API v2 (`api.beehiiv.com/v2`)
- Requires `BEEHIIV_API_KEY` and `BEEHIIV_PUBLICATION_ID` (already in env)
- Post creation: supports HTML content, subject, preview text
- Segmentation: Beehiiv supports custom field-based audience segments. The `country` custom field is already synced on subscribers via the existing subscribe flow.
- **Prerequisite**: Ensure `country` and `region` custom fields exist in the Beehiiv publication settings (manual one-time setup in Beehiiv dashboard)

## Testing Strategy

- **F1**: Unit tests for each provider (mock HTTP calls). Integration test: switch providers for a task, verify output.
- **F2**: Test model config CRUD. Test that changing config affects subsequent AI calls.
- **F3**: Generate a test newsletter for AU with test data. Verify inline links, footer links, and trend references.
- **F4**: Generate newsletters for 2 jurisdictions, verify different tone in output.
- **F5**: Manual testing — create/edit/preview/send flow.
- **F6**: Mock Beehiiv API for tests. Manual test with real Beehiiv in staging.
