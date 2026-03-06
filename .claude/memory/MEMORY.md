# PropertyHack Memory

## Project Status
- Spec complete: proposal.md, spec.md, design.md, tasks.md in /spec/news-aggregation/
- Beads initialized, 38 tasks created with full dependency graph
- CLAUDE.md scaffolded
- No code changes yet — spec phase only

## Key Decisions
- Vultr Sydney VPS, Docker Compose (Caddy + Express + Postgres + Redis)
- pgvector for vector search (not separate vector DB)
- Gemini 2.0 Flash for summarisation, OpenAI for embeddings
- 7 ingestion methods: RSS, NewsAPI.org, NewsAPI.ai, Perplexity, scraping, newsletters, social
- Admin-only auth for v1, anonymous readers
- Paywall and deep research deferred

## Branding
- Colors: black (#2b2b2b), gold (#d4b038), cream (#f0f0f0), white (#ffffff)
- Defined in tailwind.config.js — use tokens only
- QUORD references must be fully purged

## Wave 1 (ready to start)
- T1.1 (propertyhack-8aj): Legacy Cleanup
- T1.3 (propertyhack-7zl): Docker Compose + Caddy
- T6.1 (propertyhack-wzl): Test Infrastructure Setup
