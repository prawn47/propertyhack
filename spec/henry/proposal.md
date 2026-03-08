# Henry — Property AI Assistant

## Problem

PropertyHack has hundreds of AI-summarised articles with vector embeddings, 10 property calculators across 5 markets, and user accounts with saved preferences — but no way for users to interact with this knowledge conversationally. Users must manually search articles, run calculators separately, and connect the dots themselves.

## Solution

**Henry** is a RAG-powered property AI assistant that connects all existing PropertyHack data into a conversational interface. Users ask questions in natural language. Henry retrieves relevant articles via vector similarity, provides calculator-informed estimates, and tailors responses to the user's preferred location and interests.

Henry is neutral and informative — never gives direct financial advice.

## Why Now

- Embeddings and vector search already exist (pgvector, 1536-dim, cosine similarity)
- Gemini API already integrated for article summaries
- User accounts exist with location/category preferences
- Calculators have backend APIs that can be called programmatically
- All the building blocks are in place — Henry connects them

## Scope — v1

### In
- Chat UI: full-page view (`/:country/henry`) + persistent sidebar widget on all public pages
- RAG retrieval: semantic search across article embeddings to ground responses
- Calculator awareness: Henry can invoke calculator APIs to provide estimates inline
- User context: logged-in users get responses tailored to their preferred location/market and category interests
- Conversation history: persisted server-side for authenticated users; session-only for anonymous
- Streaming responses via SSE (Server-Sent Events)
- Disclaimer banner: "Henry provides general information only, not financial advice"

### Out (deferred)
- Voice input/output
- Image/document analysis
- Proactive notifications ("new article about Sydney auctions")
- Admin-facing analytics on Henry usage
- Fine-tuning or custom model training
- Multi-turn tool chaining (e.g. "run that calc again but with 5% deposit")

## Affected Areas

| Area | Impact |
|---|---|
| Database | New tables: `Conversation`, `Message` |
| Backend | New routes: `/api/henry/*`, new service: `henryService.js` |
| Frontend | New components: `HenryChat`, `HenrySidebar`, `HenryPage` |
| Auth | Uses existing JWT auth — no changes to auth itself |
| Embeddings | Read-only consumption of existing article embeddings |
| Calculators | Read-only calls to existing calculator endpoints (server-side) |

## Breaking Risk

**None.** Fully additive. No changes to existing APIs, data models, or user flows.

## Acceptance Criteria

1. User asks "What's happening in Sydney property?" → Henry returns a response grounded in recent PropertyHack articles about Sydney, citing sources with links
2. User asks "How much can I borrow on $150k salary?" → Henry calls the borrowing power calculator and returns an estimated range with caveats
3. User asks "What's the stamp duty on a $800k house in NSW?" → Henry calls the stamp duty calculator and returns the figure
4. Logged-in user with preferences set to "Melbourne" + "Auctions" gets Melbourne-focused responses by default without specifying location
5. Henry never says "you should buy" or "I recommend" — always neutral, informational, with disclaimer
6. Conversation history is retrievable for logged-in users across sessions
7. Anonymous users can chat (session-only history, no preference tailoring)
8. Responses cite specific articles with clickable links when drawing on article content
9. Henry can identify trends across multiple articles (e.g. "auction clearance rates have been rising in Brisbane based on 3 recent articles")
