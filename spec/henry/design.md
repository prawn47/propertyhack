# Henry — Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐                 │
│  │  HenryPage  │  │ HenrySidebar │                 │
│  │  (full page) │  │  (widget)    │                 │
│  └──────┬──────┘  └──────┬───────┘                 │
│         │                │                          │
│         └────────┬───────┘                          │
│                  ▼                                   │
│         ┌──────────────┐                            │
│         │  useHenry()  │  (hook: state + streaming) │
│         └──────┬───────┘                            │
│                │                                     │
│         ┌──────▼───────┐                            │
│         │ henryService  │  (API client + SSE)       │
│         └──────┬───────┘                            │
└────────────────┼────────────────────────────────────┘
                 │ HTTP + SSE
                 ▼
┌─────────────────────────────────────────────────────┐
│                    Backend                           │
│                                                     │
│  ┌──────────────────┐                               │
│  │ routes/henry.js  │  (API endpoints)              │
│  └────────┬─────────┘                               │
│           ▼                                          │
│  ┌──────────────────┐                               │
│  │ henryService.js  │  (orchestrator)               │
│  │                  │                               │
│  │  1. Build context│                               │
│  │  2. Retrieve RAG │──→ pgvector (articles)        │
│  │  3. Call Gemini  │──→ Gemini 2.0 Flash API      │
│  │  4. Handle tools │──→ Calculator functions       │
│  │  5. Stream SSE   │                               │
│  └──────────────────┘                               │
│                                                     │
│  ┌──────────────────┐                               │
│  │ henryTools.js    │  (Gemini function definitions)│
│  └──────────────────┘                               │
│                                                     │
│  ┌──────────────────┐                               │
│  │ henryPrompts.js  │  (system prompt + templates)  │
│  └──────────────────┘                               │
└─────────────────────────────────────────────────────┘
```

## Backend

### New Files

```
server/
├── routes/
│   └── henry.js                  # API routes
├── services/
│   ├── henryService.js           # Core orchestration
│   ├── henryTools.js             # Gemini function calling definitions
│   └── henryPrompts.js           # System prompt + context templates
```

### Database Schema Changes

Add to `schema.prisma`:

```prisma
model Conversation {
  id        String    @id @default(cuid())
  userId    String
  title     String    @db.VarChar(80)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]

  @@index([userId, updatedAt(sort: Desc)])
}

model Message {
  id              String        @id @default(cuid())
  conversationId  String
  role            String        @db.VarChar(10)   // user | assistant
  content         String
  citations       Json?         // [{articleId, title, slug, similarity}]
  calculatorCall  Json?         // {type, inputs, outputs}
  rating          Int?          // 1 or 5
  tokenCount      Int?
  createdAt       DateTime      @default(now())
  conversation    Conversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
}
```

Add relation to User model:
```prisma
conversations Conversation[]
```

Migration: `npx prisma migrate dev --name add_henry_conversations`

### routes/henry.js

All routes mounted at `/api/henry`.

```
POST   /chat                           # Anonymous chat (SSE response, no persistence)
POST   /conversations                  # Create conversation (auth required)
GET    /conversations                  # List conversations (auth required, paginated)
GET    /conversations/:id              # Get conversation + messages (auth required)
DELETE /conversations/:id              # Delete conversation (auth required)
POST   /conversations/:id/messages     # Send message (auth required, SSE response)
PATCH  /messages/:id/rating            # Rate message (auth required)
```

**Rate limiting:**
- Anonymous `/chat`: 10 req / 15 min (by IP)
- Authenticated endpoints: 60 req / 15 min (by userId)
- Applied via express-rate-limit (same pattern as existing calculator routes)

**Middleware stack:**
- `authenticateToken` (required on conversation CRUD, optional on `/chat`)
- `optionalAuth` — new lightweight middleware: tries to authenticate but doesn't reject if no token. Used on `/chat` so logged-in users get personalisation even in anonymous mode.

### services/henryService.js

Core orchestration service. Single main function:

```js
async function* streamResponse({ message, conversationId, user }) {
  // 1. Load conversation history (if conversationId)
  // 2. Build user context (preferences, market)
  // 3. Generate message embedding → vector search for relevant articles
  // 4. Construct Gemini prompt with context
  // 5. Call Gemini with streaming + function calling
  // 6. Handle tool calls (calculators) mid-stream
  // 7. Yield SSE events (thinking, delta, citation, calculator, done)
  // 8. Persist messages (if authenticated)
}
```

**RAG retrieval detail:**

```js
async function retrieveArticles(embedding, { market, location, limit = 10, threshold = 0.3 }) {
  // Raw SQL via prisma.$queryRawUnsafe
  // SELECT id, title, "shortBlurb", "longSummary", slug, "publishedAt",
  //        "sourceUrl", category,
  //        1 - (embedding <=> $1::vector) as similarity
  // FROM articles
  // WHERE status = 'PUBLISHED'
  //   AND embedding IS NOT NULL
  //   AND 1 - (embedding <=> $1::vector) > $threshold
  //   [AND market = $market if provided]
  //   [AND location filters if provided]
  // ORDER BY
  //   (1 - (embedding <=> $1::vector)) * recency_weight DESC
  // LIMIT $limit
  //
  // recency_weight: articles < 7 days = 1.2x, < 30 days = 1.0x, older = 0.8x
}
```

**Context window budget (Gemini 2.0 Flash — 1M token context):**

| Component | Approx tokens | Notes |
|---|---|---|
| System prompt | ~500 | Role, rules, tone |
| User preferences | ~100 | Location, categories, market |
| Retrieved articles (10) | ~5,000 | Title + blurb + summary each |
| Calculator definitions | ~800 | Function schemas |
| Conversation history (20 msgs) | ~4,000 | Trimmed older messages |
| Current message | ~200 | User input |
| **Total** | **~10,600** | Well within limits |

### services/henryTools.js

Gemini function calling definitions. Each tool wraps an existing calculator:

```js
const tools = [
  {
    name: 'calculate_mortgage',
    description: 'Calculate mortgage repayments for a property loan',
    parameters: {
      type: 'object',
      properties: {
        propertyPrice: { type: 'integer', description: 'Property price in cents' },
        depositPercent: { type: 'number', description: 'Deposit as percentage (e.g. 20)' },
        interestRate: { type: 'number', description: 'Annual interest rate (e.g. 6.5)' },
        loanTermYears: { type: 'integer', description: 'Loan term in years (default 30)' },
        market: { type: 'string', enum: ['AU','US','UK','CA','NZ'], description: 'Market (default from user prefs)' }
      },
      required: ['propertyPrice']
    }
  },
  // ... similar for borrowing_power, stamp_duty, rental_yield, rent_vs_buy, buying_costs
];
```

**Tool execution:** When Gemini returns a function call, `henryService` imports the calculator function directly (e.g. `server/calculators/mortgageCalculator.js`) and calls it. No HTTP request. Results are fed back to Gemini for conversational formatting.

**Smart defaults:** If user has preferences, Henry fills in missing tool parameters:
- No market specified → use `user.preferences.defaultCountry`
- No location specified → use `user.preferences.defaultLocation`

### services/henryPrompts.js

Template functions for building the Gemini prompt:

```js
function buildSystemPrompt()              // Static system prompt (role, rules, tone)
function buildUserContext(user)            // Preferences injection
function buildArticleContext(articles)     // Format retrieved articles for context
function buildCalculatorContext()          // Describe available calculators
function formatConversationHistory(msgs)  // Last N messages as [{role, content}]
function generateTitle(firstMessage)      // Short title from first message
```

### SSE Event Format

Each event is a JSON line prefixed by SSE format:

```
event: thinking
data: {"phase": "searching_articles"}

event: delta
data: {"text": "Based on recent articles"}

event: citation
data: {"articleId": "abc123", "title": "Sydney Auctions Hit Record", "slug": "sydney-auctions-hit-record", "similarity": 0.87}

event: calculator
data: {"type": "mortgage", "inputs": {...}, "outputs": {...}}

event: done
data: {"messageId": "msg_xyz", "tokenCount": 342, "citations": [...]}

event: error
data: {"message": "Something went wrong"}
```

### optionalAuth Middleware

```js
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next(); // Continue without user
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (user) req.user = user;
  } catch (e) {
    // Invalid token — continue without user, don't reject
  }
  next();
}
```

## Frontend

### New Files

```
components/
├── henry/
│   ├── HenryPage.tsx             # Full-page chat view
│   ├── HenrySidebar.tsx          # Floating widget + slide-up panel
│   ├── HenryChatWindow.tsx       # Shared chat UI (used by both page + sidebar)
│   ├── HenryMessageBubble.tsx    # Single message (user or assistant)
│   ├── HenryCitationCard.tsx     # Inline article citation
│   ├── HenryCalculatorResult.tsx # Inline calculator result display
│   ├── HenryConversationList.tsx # Sidebar list of past conversations
│   ├── HenryInput.tsx            # Message input bar
│   └── HenryDisclaimer.tsx       # Disclaimer banner
hooks/
│   └── useHenry.ts               # Chat state + SSE streaming logic
services/
│   └── henryService.ts           # API client for Henry endpoints
```

### useHenry Hook

Core state management for Henry chat:

```ts
interface UseHenryReturn {
  messages: Message[];
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  isThinking: boolean;
  error: string | null;

  sendMessage: (content: string) => Promise<void>;
  newConversation: () => void;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  rateMessage: (id: string, rating: 1 | 5) => Promise<void>;
}
```

**SSE consumption:**
- Uses `fetch()` with `ReadableStream` (not `EventSource` — allows POST body + headers)
- Parses SSE events line by line from the stream
- Updates messages array in real-time as `delta` events arrive
- Appends citations and calculator results as they arrive

### HenryPage.tsx

Route: `/:country/henry`

```
┌──────────────────────────────────────────────────┐
│  ┌──────────┐                                    │
│  │ Convo    │  ┌──────────────────────────────┐  │
│  │ List     │  │  Disclaimer banner           │  │
│  │          │  ├──────────────────────────────┤  │
│  │ • Chat 1 │  │                              │  │
│  │ • Chat 2 │  │  Message bubbles             │  │
│  │ • Chat 3 │  │  (scrollable)                │  │
│  │          │  │                              │  │
│  │ [+ New]  │  │                              │  │
│  │          │  ├──────────────────────────────┤  │
│  └──────────┘  │  [Type your message...]  [→] │  │
│                └──────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

- Conversation list on left (hidden on mobile, accessible via hamburger)
- Chat area takes remaining width
- Conversation list only shown to authenticated users
- Empty state: welcome message with suggested questions

### HenrySidebar.tsx

Mounted in app layout (always present on public pages):

```
Collapsed: floating button bottom-right
  ┌─────┐
  │  💬 │   ← branded icon, gold accent
  └─────┘

Expanded: slide-up panel
  ┌────────────────────────┐
  │ Henry          [−] [✕] │  ← minimise / close
  ├────────────────────────┤
  │ Disclaimer (compact)   │
  ├────────────────────────┤
  │                        │
  │  Messages              │
  │                        │
  ├────────────────────────┤
  │ [Type message...]  [→] │
  └────────────────────────┘

Mobile: full-screen overlay instead of panel
```

- State persisted in localStorage (open/closed, current messages for anonymous)
- Widget doesn't load on admin pages
- Z-index above all other content but below modals

### HenryMessageBubble.tsx

Renders a single message:

- **User messages:** right-aligned, dark background (`brand.primary`), white text
- **Assistant messages:** left-aligned, light background (`base.200`), dark text
  - Markdown rendered via a lightweight renderer (react-markdown or similar — check if already in deps)
  - Citations rendered inline as `HenryCitationCard` components
  - Calculator results rendered as `HenryCalculatorResult` blocks
  - Copy button (top-right on hover)
  - Thumbs up/down buttons (bottom-right, only on assistant messages)
- **Streaming state:** assistant message grows as tokens arrive, cursor animation at end

### HenryCitationCard.tsx

Compact card shown inline when Henry cites an article:

```
┌──────────────────────────────────┐
│ 📰 Sydney Auctions Hit Record   │
│ PropertyHack · 2 days ago        │
└──────────────────────────────────┘
```

- Clickable → navigates to article page
- Shows relevance indicator (subtle, e.g. colour intensity)

### HenryCalculatorResult.tsx

Formatted block for calculator outputs:

```
┌──────────────────────────────────┐
│ 🧮 Mortgage Estimate             │
│ Monthly repayment: $3,245        │
│ Total interest: $568,200         │
│ LVR: 80%                        │
│ [Open full calculator →]         │
└──────────────────────────────────┘
```

- Links to the full calculator page with inputs pre-filled (via query params — existing useCalculator hook supports this)
- Styled consistently with existing calculator ResultCard component

### Routing

Add to App.tsx:
```tsx
<Route path="/:country/henry" element={<HenryPage />} />
```

Add HenrySidebar to the public layout wrapper (not inside route — persistent across pages).

### Navigation

Add "Henry" link to Header.tsx navigation. Use gold accent to make it prominent as a key feature.

## Styling

All styling follows existing Tailwind config tokens:

- Chat bubbles: `bg-brand-primary text-white` (user), `bg-base-200 text-gray-900` (assistant)
- Sidebar widget button: `bg-brand-gold text-brand-primary` with hover effect
- Citation cards: `border border-brand-gold/20 bg-white`
- Calculator result blocks: `border border-gray-200 bg-gray-50 rounded-lg`
- Disclaimer: `bg-amber-50 text-amber-800 border-amber-200` (standard warning style)
- Input bar: matches existing form input styling
- Conversation list: similar to admin sidebar styling

## Dependencies

### New
- `@google/generative-ai` — Gemini SDK (may already be installed for article summaries — check)
- `react-markdown` + `remark-gfm` — markdown rendering in chat (check if already in deps)

### Existing (no changes)
- `openai` — for embedding generation (already used)
- `express-rate-limit` — for rate limiting (already used)
- `prisma` — for DB operations (already used)

## Environment Variables

Add to `server/.env`:
```
# Should already exist for article summaries:
GEMINI_API_KEY=...

# New — optional, defaults shown:
HENRY_MAX_ARTICLES=10
HENRY_SIMILARITY_THRESHOLD=0.3
HENRY_MAX_HISTORY_MESSAGES=20
HENRY_RATE_LIMIT_ANON=10
HENRY_RATE_LIMIT_AUTH=60
```

## Security Considerations

- All conversation data ownership-checked (users can only access their own)
- User messages sanitised before sending to Gemini (strip HTML, limit length)
- Gemini responses rendered as markdown only (no raw HTML injection)
- Rate limiting prevents abuse of Gemini API
- No PII sent to Gemini beyond what the user types (preferences are location/categories only)
- Calculator inputs validated server-side before execution (existing validation)
- SSE connections have 60s timeout to prevent resource exhaustion

## Testing Strategy

### Unit Tests
- `henryService` — mock Gemini API, test context construction, tool handling
- `henryTools` — test tool parameter mapping to calculator functions
- `henryPrompts` — test prompt construction with various user states
- `useHenry` hook — test state management, SSE parsing

### Integration Tests
- `/api/henry/chat` — anonymous message flow (mock Gemini, real DB)
- `/api/henry/conversations/*` — CRUD operations, ownership checks
- RAG retrieval — test vector search with real pgvector (test DB)
- Rate limiting — verify limits enforced

### E2E Tests (Playwright)
- Open Henry page, send message, see streaming response
- Open sidebar widget, send message, close and reopen (state persists)
- Authenticated flow: send message, see it in conversation list
- Calculator question: verify calculator result card appears
- Citation: verify article link is clickable and navigates correctly

## Migration Path

1. Database migration (Conversation + Message tables)
2. Backend service + routes
3. Frontend components + hook
4. Integration with existing layout (sidebar widget, header nav)
5. Testing
6. Environment variables on production server
