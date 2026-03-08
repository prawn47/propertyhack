# Henry — Tasks

## Phase 1: Database & Backend Foundation

### T1: Database schema — Conversation and Message models
- Add `Conversation` and `Message` models to `schema.prisma`
- Add `conversations` relation to `User` model
- Run `npx prisma migrate dev --name add_henry_conversations`
- Verify with `npx prisma studio`
- **Priority:** 1 (critical path)
- **Deps:** none

### T2: Henry service — core orchestration
- Create `server/services/henryService.js`
- Implement `streamResponse()` generator function
- RAG retrieval: embed user message → pgvector similarity search with recency weighting
- Context window construction: system prompt + user prefs + articles + history + message
- Gemini API call with streaming enabled
- Yield SSE events: `thinking`, `delta`, `citation`, `calculator`, `done`, `error`
- Persist user message + assistant response to DB (when conversationId provided)
- **Priority:** 1 (critical path)
- **Deps:** T1

### T3: Henry prompts — system prompt and context templates
- Create `server/services/henryPrompts.js`
- `buildSystemPrompt()` — role, rules, tone, disclaimers, current date
- `buildUserContext(user)` — inject preferences (location, categories, market)
- `buildArticleContext(articles)` — format retrieved articles for context
- `buildCalculatorContext()` — describe available calculators for function calling
- `formatConversationHistory(messages)` — last N messages as role/content pairs
- `generateTitle(firstMessage)` — Gemini call to summarise first message into short title
- **Priority:** 1 (critical path)
- **Deps:** none

### T4: Henry tools — Gemini function calling for calculators
- Create `server/services/henryTools.js`
- Define function declarations for all 6 calculator types (mortgage, borrowing power, stamp duty, rental yield, rent vs buy, buying costs)
- Implement `executeToolCall(name, args, userPrefs)` — maps function call to direct calculator import, fills smart defaults from user prefs
- Return structured result for Gemini to format conversationally
- **Priority:** 1 (critical path)
- **Deps:** none

### T5: Henry API routes
- Create `server/routes/henry.js`
- `POST /api/henry/chat` — anonymous chat (optionalAuth, SSE response, no persistence)
- `POST /api/henry/conversations` — create conversation (auth required)
- `GET /api/henry/conversations` — list conversations (auth required, paginated, newest first)
- `GET /api/henry/conversations/:id` — get conversation + messages (ownership check)
- `DELETE /api/henry/conversations/:id` — delete conversation (ownership check)
- `POST /api/henry/conversations/:id/messages` — send message (ownership check, SSE response)
- `PATCH /api/henry/messages/:id/rating` — rate message (ownership check)
- Create `optionalAuth` middleware
- Rate limiting: 10/15min anon, 60/15min auth
- Input validation: max 2000 chars, sanitise HTML
- Mount routes in `server/index.js`
- **Priority:** 1 (critical path)
- **Deps:** T1, T2, T3, T4

### T6: Install dependencies
- Check if `@google/generative-ai` is already installed (used for article summaries)
- Install if missing
- Check if `react-markdown` and `remark-gfm` are already installed
- Install if missing
- **Priority:** 1
- **Deps:** none

## Phase 2: Frontend Chat Core

### T7: Henry API client service
- Create `services/henryService.ts`
- Functions for all API endpoints (create conversation, list, get, delete, send message, rate)
- SSE stream consumer using `fetch()` + `ReadableStream` (not EventSource — needs POST + headers)
- Parse SSE events line by line, return async iterator or callback pattern
- **Priority:** 1 (critical path)
- **Deps:** T5

### T8: useHenry hook
- Create `hooks/useHenry.ts`
- State: messages, conversations, activeConversationId, isStreaming, isThinking, error
- `sendMessage()` — calls API, consumes SSE stream, updates messages in real-time
- `newConversation()` — reset state
- `loadConversation()` — fetch and display existing conversation
- `deleteConversation()` — remove and reset if active
- `rateMessage()` — thumbs up/down
- Handle auth vs anonymous mode (use AuthContext)
- Anonymous: store messages in local state only
- **Priority:** 1 (critical path)
- **Deps:** T7

### T9: HenryChatWindow — shared chat UI
- Create `components/henry/HenryChatWindow.tsx`
- Scrollable message area with auto-scroll to latest
- Renders `HenryMessageBubble` for each message
- "Henry is thinking..." indicator
- Empty state: welcome message + 3-4 suggested questions (clickable)
- Accepts messages + handlers via props (used by both page and sidebar)
- **Priority:** 1 (critical path)
- **Deps:** T8

### T10: HenryMessageBubble
- Create `components/henry/HenryMessageBubble.tsx`
- User messages: right-aligned, `bg-brand-primary text-white`
- Assistant messages: left-aligned, `bg-base-200`, markdown rendered
- Streaming state: cursor animation at end of growing message
- Copy button on hover (assistant messages only)
- Thumbs up/down buttons (assistant messages only)
- Renders inline `HenryCitationCard` and `HenryCalculatorResult` components
- **Priority:** 1
- **Deps:** T9

### T11: HenryCitationCard
- Create `components/henry/HenryCitationCard.tsx`
- Compact card: article title, source, relative date
- Clickable → navigates to `/:country/article/:slug`
- Styled: `border-brand-gold/20 bg-white`
- **Priority:** 2
- **Deps:** T10

### T12: HenryCalculatorResult
- Create `components/henry/HenryCalculatorResult.tsx`
- Formatted block showing key calculator outputs
- "Open full calculator" link with inputs pre-filled via query params
- Styled consistently with existing calculator ResultCard
- **Priority:** 2
- **Deps:** T10

### T13: HenryInput — message input bar
- Create `components/henry/HenryInput.tsx`
- Text input + send button
- Enter to send, Shift+Enter for newline
- Disabled state while streaming
- Character count indicator near 2000 char limit
- **Priority:** 1
- **Deps:** none

### T14: HenryDisclaimer
- Create `components/henry/HenryDisclaimer.tsx`
- Banner: "Henry provides general property information only — not financial advice. Always consult a qualified professional."
- Styled: `bg-amber-50 text-amber-800 border-amber-200`
- Dismissable per session (localStorage flag)
- Compact variant for sidebar
- **Priority:** 2
- **Deps:** none

## Phase 3: Page & Widget Integration

### T15: HenryPage — full-page chat view
- Create `components/henry/HenryPage.tsx`
- Route: `/:country/henry`
- Layout: conversation list sidebar (left) + chat area (right)
- Conversation list: authenticated users only, with "New conversation" button
- Mobile: conversation list behind hamburger toggle
- SEO head: title "Henry — Property AI Assistant | PropertyHack"
- **Priority:** 1 (critical path)
- **Deps:** T9, T13, T14

### T16: HenryConversationList
- Create `components/henry/HenryConversationList.tsx`
- List of past conversations (title + relative date)
- Active conversation highlighted
- Delete button (with confirmation)
- "New conversation" button at top
- Only rendered for authenticated users
- **Priority:** 2
- **Deps:** T8

### T17: HenrySidebar — floating widget
- Create `components/henry/HenrySidebar.tsx`
- Floating button: bottom-right, `bg-brand-gold text-brand-primary`
- Expanded: slide-up panel (400px wide, 600px tall max)
- Mobile: full-screen overlay
- State (open/closed) persisted in localStorage
- Anonymous messages persisted in localStorage for sidebar continuity
- Not rendered on admin pages
- Z-index management: above content, below modals
- **Priority:** 1
- **Deps:** T9, T13, T14

### T18: App integration — routing and layout
- Add `/:country/henry` route to App.tsx
- Mount `HenrySidebar` in public layout wrapper (persistent across pages)
- Add "Henry" nav link to Header.tsx (gold accent styling)
- **Priority:** 1
- **Deps:** T15, T17

## Phase 4: Polish & Edge Cases

### T19: Markdown rendering in messages
- Configure react-markdown with remark-gfm for assistant messages
- Support: bold, italic, lists, links, code blocks
- Links open in new tab
- Sanitise output (no raw HTML passthrough)
- **Priority:** 2
- **Deps:** T10

### T20: Mobile responsiveness
- HenryPage: single-column layout on mobile, conversation list as slide-over
- HenrySidebar: full-screen overlay on screens < 768px
- Touch-friendly input and buttons
- Test across breakpoints
- **Priority:** 2
- **Deps:** T15, T17

### T21: Error handling and edge cases
- Gemini API timeout/failure → friendly error message in chat
- Embedding failure → skip RAG, respond with caveat
- Calculator failure → skip result, link to full calculator
- Network disconnect during SSE → show reconnect prompt
- Rate limit hit → show wait message
- Empty conversation state → welcome screen
- **Priority:** 2
- **Deps:** T2, T8

## Phase 5: Testing

### T22: Backend unit tests
- `henryService` — mock Gemini, test context construction, tool call handling, message persistence
- `henryTools` — test parameter mapping, smart defaults, error handling
- `henryPrompts` — test prompt construction with various user states (anon, prefs, no prefs)
- **Priority:** 2
- **Deps:** T2, T3, T4

### T23: Backend integration tests
- `/api/henry/chat` — anonymous message flow (mock Gemini, real DB)
- `/api/henry/conversations/*` — full CRUD cycle, ownership enforcement
- RAG retrieval — vector search with test embeddings
- Rate limiting verification
- **Priority:** 2
- **Deps:** T5

### T24: Frontend unit tests
- `useHenry` hook — state management, SSE parsing, auth vs anon mode
- `HenryMessageBubble` — rendering variants (user, assistant, streaming, with citations)
- `HenryChatWindow` — message list, auto-scroll, empty state
- **Priority:** 3
- **Deps:** T8, T9, T10

### T25: E2E tests (Playwright)
- Open Henry page → send message → see streaming response
- Open sidebar widget → send message → close → reopen (state preserved)
- Authenticated: send message → see conversation in list → reload → conversation persists
- Calculator question → calculator result card appears with link
- Citation → article link clickable and navigates correctly
- Mobile: sidebar opens as full-screen overlay
- **Priority:** 3
- **Deps:** T18

## Phase 6: Production Readiness

### T26: Environment variables and deployment config
- Add `HENRY_*` env vars to `server/.env.example`
- Document in deployment notes
- Verify Gemini API key works for chat (may need different scope than summaries)
- Test SSE through Caddy reverse proxy
- **Priority:** 2
- **Deps:** T5

### T27: Conversation cleanup job
- Add scheduled job: archive conversations older than 90 days
- Archived conversations excluded from default list but still queryable
- Can be a simple cron job or BullMQ scheduled task
- **Priority:** 3
- **Deps:** T1

## Dependency Graph

```
T1 (schema) ──────┬──→ T2 (service) ──→ T5 (routes) ──→ T7 (API client) ──→ T8 (hook) ──→ T9 (chat window) ──→ T15 (page)
                   │                                                                    │                    ──→ T17 (sidebar)
                   │                                                                    │                           │
T3 (prompts) ─────┤                                                                    │                    T18 (integration)
T4 (tools) ───────┤                                                                    │                           │
T6 (deps) ────────┘                                                                    │                    T20 (mobile)
                                                                                       │
T13 (input) ───────────────────────────────────────────────────────────────────────────┘
T14 (disclaimer) ──────────────────────────────────────────────────────────────────────┘
T10 (bubble) ──→ T11 (citation card)
              ──→ T12 (calc result)
              ──→ T19 (markdown)

T2,T3,T4 ──→ T22 (backend unit tests)
T5 ──→ T23 (backend integration tests)
T8,T9,T10 ──→ T24 (frontend unit tests)
T18 ──→ T25 (E2E tests)
T1 ──→ T27 (cleanup job)
```

## Wave Execution Plan

**Wave 1** (no deps — all parallel): T1, T3, T4, T6, T13, T14
**Wave 2** (after T1): T2
**Wave 3** (after T2+T3+T4): T5
**Wave 4** (after T5): T7
**Wave 5** (after T7): T8
**Wave 6** (after T8): T9, T10, T16
**Wave 7** (after T9+T10): T11, T12, T15, T17, T19
**Wave 8** (after T15+T17): T18
**Wave 9** (polish + tests): T20, T21, T22, T23, T24, T26, T27
**Wave 10** (after T18): T25
