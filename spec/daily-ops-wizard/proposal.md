# Proposal: Daily Ops Wizard

## Problem

PropertyHack has a fully automated content engine — news ingestion, AI summarisation, newsletter generation, social post generation, image generation — but no streamlined way for the founder to operate the daily growth machine. The admin panel has all the features scattered across separate pages (newsletters, social posts, dashboard). The founder needs to:

1. Review and approve the weekly newsletter, then copy-paste it block-by-block into Beehiiv
2. Review and approve daily social posts across platforms
3. Write a daily hot take / commentary piece
4. Schedule and publish everything
5. Check yesterday's metrics to know what's working

Currently this requires navigating 4-5 separate admin pages, remembering which steps to do in which order, and manually tracking whether today's routine is complete. The friction means the routine doesn't happen consistently, and consistency is the #1 driver of growth.

## Proposed Solution

A **Daily Ops Wizard** at `/admin/daily` — a guided, step-by-step workflow that walks the founder through the entire daily content routine in one place. The wizard:

- Presents each step in order with a progress stepper
- Shows AI-generated content ready for review at each step
- Supports inline editing of text and images (with prompt-based image refinement)
- Provides copy-to-clipboard for newsletter content (block-by-block for Beehiiv)
- Provides image download with proper naming and meta tags
- Tracks daily completion with streaks and a calendar view
- Persists state so you can close and resume

## Content Cadence (Launch)

| Channel | Frequency | Jurisdictions | Notes |
|---------|-----------|---------------|-------|
| Newsletter | Weekly (Monday AM AEST) | AU only | Copy-paste to Beehiiv to use their ad network |
| Social posts | 3-5/day | AU-focused, global content | 1 Instagram, 1 Twitter, 1 Facebook account |
| Hot take | 1/day | AU-focused | Original founder commentary |

Scale triggers:
- Add NZ/UK newsletter at 500+ AU subscribers
- Go daily newsletter at 2,000+ subscribers with 35%+ open rate
- Add jurisdiction-specific social accounts at 1,000+ followers

## Scope

### In Scope (v1)
- 6-step wizard UI with stepper progress bar
- Step 1: Newsletter review — rich text editing, section-level controls, copy-to-clipboard per block
- Step 2: Newsletter images — review, regenerate, edit with prompts, download with proper filename + meta
- Step 3: Social posts review — grid view, approve/edit/reject, bulk approve
- Step 4: Hot take composer — text input, AI-suggested angles, image generation
- Step 5: Schedule & publish — timeline view, publish/schedule/copy-to-clipboard per post
- Step 6: Yesterday's metrics — newsletter opens, social engagement, site traffic, trends
- Image editing with additional prompts across all steps (retro camera film aesthetic)
- Image naming: `{market}-{type}-{slug}-{date}.{ext}` with SEO meta tags (alt text, keywords)
- Wizard state persistence (resume where you left off)
- Daily completion tracking with streak counter and calendar view
- "Start Today's Run" CTA on admin dashboard

### Deferred
- Beehiiv API auto-send (using copy-paste to leverage Beehiiv ad network)
- Referral program configuration
- Paid ad management / boost budgets
- Advanced analytics beyond basic metrics
- Per-jurisdiction social accounts (manual setup when scale triggers hit)
- Weekly review wizard (separate feature, lower priority)

## Affected Areas

| Area | Impact |
|------|--------|
| Admin frontend | New wizard page + components, dashboard CTA addition |
| Admin routes (API) | New endpoints for wizard state, metrics aggregation, image editing |
| Database | New model for wizard completion tracking (DailyWizardRun) |
| Image service | Extend with prompt-based editing, proper naming, meta tags |
| Existing pages | No changes — wizard wraps existing functionality |

## Breaking Risk

**Low.** This is purely additive. The wizard calls the same APIs that the existing admin pages use. No existing pages are modified or removed. The founder can still use the individual pages if preferred.

## Acceptance Criteria

1. Founder logs into admin, sees "Start Today's Run" on dashboard
2. Clicking it opens the 6-step wizard at `/admin/daily`
3. Step 1: Can review AI-generated newsletter, edit text inline, approve sections
4. Step 2: Can view newsletter images, regenerate with prompts, download with proper names, copy newsletter blocks to clipboard for Beehiiv
5. Step 3: Can review AI-generated social posts in a grid, approve/edit/reject each, bulk approve
6. Step 4: Can write a hot take, get AI-suggested angles, generate/edit an image
7. Step 5: Can see all approved content in a timeline, schedule or copy-to-clipboard each post
8. Step 6: Can see yesterday's newsletter opens, social engagement, and site traffic with trend arrows
9. Wizard state persists across browser sessions
10. Completion is tracked — calendar shows green/grey days, streak counter works
11. All generated images have descriptive filenames and SEO meta tags (alt text, keywords)
12. Full wizard can be completed in under 30 minutes
