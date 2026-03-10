# Admin UX Fixes & Data Quality — Proposal

## Problem

Several admin workflows are broken or degraded, and article data quality has gaps that require manual intervention. Specifically:

- **Source editor returns 404** when clicking "Edit" on any ingestion source, blocking source configuration
- **Subscribers page fails to load**, preventing subscriber management
- **No admin ↔ live site navigation** — admins must manually type URLs to switch between admin and public site
- **Duplicate feeds can be added** — no source-level deduplication, only article-level (downstream)
- **Broken images show as broken** — public components lack `onError` fallback handlers on `<img>` tags
- **Image alt text missing** on many articles despite the generation pipeline existing
- **Stale draft articles** accumulate — articles with no title/summary or irrelevant content clog the system
- **Duplicate images** — no mechanism to detect or prevent two articles sharing the same generated image
- **No site mechanics documentation** — no single document explains how the platform works end-to-end

## Who This Affects

- **Dan (admin)**: Can't edit sources, can't manage subscribers, wastes time navigating between admin and public site, has to manually identify and clean up bad data
- **Public users**: See broken images, missing alt text hurts accessibility and SEO

## Success Criteria

1. Source editor loads and saves correctly for all sources
2. Subscriber list loads and displays all subscribers
3. Admin sidebar has "View Site" link; public site shows "Admin" button when logged in
4. Adding a source with a duplicate feed URL is blocked with a clear warning
5. Broken images gracefully fall back to SVG placeholder on public pages
6. All published articles have image alt text
7. Draft articles with no title/summary are cleaned up; remaining drafts scored for relevance
8. No two articles share the same generated image file
9. `docs/site-mechanics.md` exists and accurately describes the full platform

## Out of Scope

- Banner ad placement (separate spec)
- New source discovery (Spec 2 defines criteria, discovery is deferred)
- AI model switching (Spec 3)
- Newsletter generation (Spec 3)
