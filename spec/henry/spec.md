# Henry — Specification

## Overview

Henry is a RAG-powered property AI assistant. It answers property questions using PropertyHack's article corpus (via vector similarity), calculator APIs (for estimates), and user preferences (for personalisation). Powered by Google Gemini 2.0 Flash.

## Personas

### Casual Browser (anonymous)
- Lands on PropertyHack, curious about property trends
- Wants quick answers without signing up
- Session-only chat, no personalisation

### Registered User (authenticated)
- Has set location/category preferences in their profile
- Expects Henry to know their market context
- Wants conversation history preserved across sessions
- May ask calculator-type questions inline

## Features

### F1: Chat Interface

**Full-page view** at `/:country/henry`
- Clean chat UI with message bubbles (user + Henry)
- Input bar with send button + enter-to-send
- Streaming response display (tokens appear progressively)
- "Henry is thinking..." indicator during retrieval phase
- Disclaimer banner at top: "Henry provides general property information only — not financial advice. Always consult a qualified professional."
- Conversation list sidebar (authenticated users) showing past conversations
- "New conversation" button

**Sidebar widget** on all public pages
- Floating button (bottom-right corner) to open/close
- Slides up as a panel (400px wide, 600px tall max)
- Same chat functionality as full page, condensed layout
- Minimises to floating button when closed
- Badge indicator when Henry has a suggestion (deferred — not v1)
- On mobile: opens as full-screen overlay instead of sidebar

**Shared behaviour**
- Markdown rendering in responses (bold, lists, links)
- Article citations rendered as clickable cards (title + source + link)
- Calculator results rendered as formatted result blocks
- Auto-scroll to latest message
- Copy button on Henry's responses
- Rate response thumbs up/down (stored but not acted on in v1)

### F2: RAG Retrieval

When a user sends a message:
1. Generate embedding for the user's message using existing `generateEmbedding()` (OpenAI text-embedding-3-small)
2. Query pgvector for top-K similar articles (K=10, similarity threshold > 0.3)
3. Apply filters: user's preferred market/location if set, recency bias (newer articles weighted higher)
4. Include article metadata in Gemini context: title, shortBlurb, longSummary, publishedAt, sourceUrl, category
5. Gemini generates response grounded in retrieved articles
6. Response includes structured citations linking back to articles on PropertyHack

**Context window construction:**
```
[System prompt — role, tone, disclaimers, current date]
[User preferences — location, market, categories if authenticated]
[Retrieved articles — top K relevant, formatted as context]
[Calculator context — available calculators and their capabilities]
[Conversation history — last N messages for continuity]
[Current user message]
```

### F3: Calculator Integration

Henry can invoke calculators when questions involve numbers/estimates. This is implemented as **function calling** with Gemini — the model decides when a calculator is relevant.

Available tools exposed to Gemini:
| Tool | Trigger examples |
|---|---|
| `calculate_mortgage` | "What would repayments be on a $600k loan?" |
| `calculate_borrowing_power` | "How much can I borrow on $120k salary?" |
| `calculate_stamp_duty` | "What's stamp duty on $900k in VIC?" |
| `calculate_rental_yield` | "Is 5% yield good for a $500k property at $450/week?" |
| `calculate_rent_vs_buy` | "Should I rent or buy in Sydney?" |
| `calculate_buying_costs` | "What are the total costs to buy a $700k house in NZ?" |

Each tool maps to the existing `POST /api/calculators/<type>/calculate` backend endpoint (called server-side, not via HTTP — direct function import).

Henry presents calculator results conversationally with context, not as raw numbers. Always includes caveats ("this is an estimate based on the inputs provided").

### F4: User Context & Personalisation

**Anonymous users:**
- No preference injection
- Can still ask location-specific questions explicitly
- Session-based conversation (stored in memory, lost on page refresh — or localStorage for sidebar persistence)

**Authenticated users:**
- Preferences from `user.preferences` injected into system prompt:
  - `defaultLocation` → "User is primarily interested in {location}"
  - `defaultCategories` → "User follows these topics: {categories}"
  - `defaultCountry` → market context for calculator defaults
- Henry uses these as defaults but respects explicit overrides in conversation
- Saved scenarios context: Henry can reference user's saved calculator scenarios if relevant (read-only)

### F5: Conversation Persistence

**Data model:**

```
Conversation
  id            String    @id @default(cuid())
  userId        String?   (nullable — future use for anonymous persistence)
  title         String    (auto-generated from first message, max 80 chars)
  createdAt     DateTime
  updatedAt     DateTime
  messages      Message[]

Message
  id              String    @id @default(cuid())
  conversationId  String
  role            String    (user | assistant | system)
  content         String    (markdown text)
  citations       Json?     (array of {articleId, title, slug, relevance})
  calculatorCall  Json?     ({type, inputs, outputs} if calculator was invoked)
  rating          Int?      (1 = thumbs down, 5 = thumbs up)
  tokenCount      Int?      (for usage tracking)
  createdAt       DateTime
```

**Behaviour:**
- New conversation created on first message (or explicit "new conversation")
- Title auto-generated: Gemini summarises first user message into short title
- Authenticated users see conversation list (newest first, paginated)
- Can delete individual conversations
- Last 20 messages sent as history context to Gemini (to stay within token limits)
- Conversations older than 90 days auto-archived (queryable but not in default list)

### F6: Streaming Responses

- Backend uses SSE (Server-Sent Events) via `res.write()` on a kept-alive connection
- Event types:
  - `thinking` — sent when retrieval/calculator calls are happening
  - `delta` — incremental text token
  - `citation` — structured citation data (sent after relevant text chunk)
  - `calculator` — calculator result data
  - `done` — stream complete, includes full message metadata
  - `error` — error occurred
- Frontend uses `EventSource` or `fetch` with `ReadableStream` to consume SSE
- Timeout: 60 seconds max per response

## API Endpoints

### Chat
- `POST /api/henry/conversations` — create new conversation (auth optional)
- `GET /api/henry/conversations` — list user's conversations (auth required)
- `GET /api/henry/conversations/:id` — get conversation with messages (auth required, ownership check)
- `DELETE /api/henry/conversations/:id` — delete conversation (auth required, ownership check)
- `POST /api/henry/conversations/:id/messages` — send message + get streamed response (SSE)
- `POST /api/henry/chat` — anonymous one-off chat (no persistence, SSE response)
- `PATCH /api/henry/messages/:id/rating` — rate a message (auth required)

### Rate Limits
- Anonymous: 10 messages per 15 minutes
- Authenticated: 60 messages per 15 minutes
- Max message length: 2000 characters
- Max conversation history sent to model: 20 messages

## Technical Decisions

### Why Gemini (not OpenAI for generation)?
- Already used for article summaries — existing API key and billing
- Gemini 2.0 Flash is fast and cheap, good for conversational use
- Native function calling support for calculator integration
- OpenAI still used for embeddings (text-embedding-3-small) — no change

### Why SSE (not WebSockets)?
- Simpler server implementation (no ws library, works with existing Express)
- Unidirectional streaming is all we need (user sends HTTP POST, response streams back)
- Works through Caddy reverse proxy without extra config
- No persistent connection management needed

### Why server-side calculator calls (not client-side)?
- Keeps calculator logic as single source of truth
- Henry can compose multiple calculator calls without round-trips
- No CORS or auth token forwarding complexity
- Calculator functions imported directly — no HTTP overhead

## System Prompt (draft)

```
You are Henry, PropertyHack's property information assistant. You help users understand property news, market trends, and provide general property information for Australia, New Zealand, the United Kingdom, the United States, and Canada.

RULES:
- You provide general information only — NEVER give direct financial advice
- Always recommend consulting a qualified financial advisor, mortgage broker, or legal professional for personal decisions
- When citing articles, reference them by title and include the link
- When using calculator results, present them conversationally with appropriate caveats
- Be concise but thorough — aim for 2-4 paragraphs unless the question warrants more
- If you don't have relevant information, say so honestly rather than speculating
- Stay focused on property — politely redirect off-topic questions
- Use Australian English spelling by default, unless the user's market context suggests otherwise
- Never mention that you're powered by Gemini or any specific AI model — you are Henry

TONE:
- Friendly, knowledgeable, neutral
- Like a well-informed property journalist, not a salesperson
- Use plain language — avoid jargon unless the user uses it first
```

## Error Handling

| Scenario | Behaviour |
|---|---|
| Gemini API down | Return friendly error: "I'm having trouble thinking right now. Please try again in a moment." |
| Embedding generation fails | Skip RAG, respond from general knowledge with caveat: "I couldn't search our articles just now, but generally..." |
| Calculator call fails | Skip calculator result, explain: "I wasn't able to run that calculation — you can try it directly at [calculator link]" |
| Rate limit hit | Return 429 with message: "You've sent a lot of messages recently. Please wait a few minutes." |
| Message too long | Return 400: "Please keep your message under 2000 characters." |
| Conversation not found | Return 404 |
| Gemini content filter | Return friendly message: "I can't help with that particular question. Try rephrasing or ask me something about property." |
