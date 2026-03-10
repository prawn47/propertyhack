# AI Infrastructure — Multi-Model & Newsletter Generation — Proposal

## Problem

The platform is locked to Google Gemini with no flexibility to use other AI providers. There's no newsletter generation despite having all the building blocks: vector embeddings on every article, subscriber segmentation by country, and Beehiiv integration. The growing article corpus is underutilised — no mechanism to surface trends, cross-pollinate insights across markets, or drive traffic back to the site through intelligent content.

## Who This Affects

- **Dan (admin)**: Can't switch AI providers for cost, quality, or availability reasons. Can't generate newsletters without manual effort. Can't leverage the article corpus for insights.
- **Subscribers**: Receive no newsletter content despite signing up. No engagement loop driving them back to the site.
- **The business**: Missing a key retention and traffic channel. No differentiation through editorial voice per market.

## Success Criteria

1. AI provider abstraction supports Gemini, Claude (Anthropic API), OpenAI, and Ollama (local dev)
2. Admin UI allows selecting provider + model per task (summarisation, alt text, image gen, newsletter, relevance scoring)
3. Newsletter generation produces jurisdiction-specific drafts using vector search for today's articles + historical trends
4. Newsletters contain inline backlinks to older PropertyHack articles woven naturally into the narrative
5. "Worth revisiting" footer section with 3-5 vector-similar older articles per jurisdiction
6. All newsletter links point to PropertyHack URLs, driving traffic back to the site
7. Editable tone of voice per jurisdiction via admin-managed system prompts
8. Newsletter admin UI: draft list, rich text editor, preview, one-click Beehiiv publish, send history
9. Ollama works as an optional local provider when `OLLAMA_ENABLED=true`

## Out of Scope

- Paid newsletter tiers / Stripe gating
- User-facing newsletter archive on the public site
- Automated social media posting from newsletter content
- Beehiiv template design/branding (use Beehiiv's existing templates)

## Dependencies

- Spec 2 (seo-and-relevance): Feed quality criteria prompt feeds into newsletter generation
- Spec 2 (seo-and-relevance): Relevance scoring ensures only quality articles enter the newsletter pool
- Existing: pgvector embeddings, Beehiiv subscriber sync, Henry's vector search pattern
