# SEO & Content Relevance — Proposal

## Problem

SEO keywords exist but are underutilised (only used for image alt text, not meta tags). Keywords only cover AU/NZ — no coverage for UK, US, or CA markets. The content relevance gate is binary (property-related or not) with no nuance, leading to borderline-irrelevant articles being published. There's no documented criteria for what makes a good content source, making feed curation subjective.

## Who This Affects

- **Search engines**: Missing keyword-enriched meta tags means lower ranking potential across all 5 jurisdictions
- **Readers**: Irrelevant articles dilute feed quality and reduce trust
- **Dan (admin)**: No systematic way to evaluate source quality or article relevance without reading each one

## Success Criteria

1. SEO admin panel reorganised by jurisdiction (AU, NZ, UK, US, CA) with area dropdowns
2. 50-80 keywords seeded per jurisdiction covering market terms, investment language, regulatory terminology, and local jargon
3. Keywords injected into crawler SSR meta tags, location page descriptions, and article meta — contextually, not stuffed
4. Articles receive a relevance score (1-10) during summarisation; <4 auto-rejected, 4-6 held as DRAFT for review, 7+ auto-published
5. Existing draft articles audited and cleaned based on relevance scoring
6. Feed selection criteria defined as an editable system prompt in admin, covering: narratives, price data, macro/rates, opinions, development, proptech

## Out of Scope

- Automated feed discovery (criteria defined here, discovery deferred)
- AI model switching (Spec 3 — but relevance scoring uses whatever model is configured)
- Newsletter generation (Spec 3 — but feed criteria prompt is a dependency)

## Dependencies

- Spec 1 (admin-ux-fixes): Source editor must work before feed criteria can be practically applied
- Spec 3 (ai-infrastructure): Newsletter generation consumes the feed quality criteria prompt defined here
