# Automated Social Media Publishing — Tasks

## Phase 1: Foundation (DB + Infrastructure)

### T1: Schema changes & migration
- Add `SocialAccount` model, `SocialConfig` model to Prisma schema
- Modify `SocialPost`: add `platform`, `headline`, `hashtags`, `processedImage`, `errorReason`, `retryCount` fields
- Add `PENDING_APPROVAL` to `SocialPostStatus` enum
- Run migration via `npx prisma db push`
- Seed a default `SocialConfig` row (default tone prompt, empty hashtags, 60 min max delay, 5 min gap)
- **Dependencies:** none
- **Priority:** 1

### T2: Token encryption utility
- Create `server/utils/encryption.js` with AES-256-GCM encrypt/decrypt
- Add `SOCIAL_TOKEN_ENCRYPTION_KEY` to `.env.example`
- Unit tests for round-trip encrypt/decrypt, different IVs per call
- **Dependencies:** none
- **Priority:** 1

### T3: Social generate queue + worker skeleton
- Create `server/queues/socialGenerateQueue.js` (same pattern as existing queues)
- Create `server/workers/socialGenerateWorker.js` (skeleton — calls socialGenerationService)
- Register queue and worker in `server/index.js`
- **Dependencies:** T1
- **Priority:** 1

---

## Phase 2: Core Services

### T4: Social headline service (Gemini)
- Create `server/services/socialHeadlineService.js`
- Single Gemini call returning structured JSON with headlines + hashtags per platform
- Prompt includes article title, blurb, category, location, market, tone guidelines
- Platform-specific character limits enforced
- Fallback to truncated article title if Gemini fails
- 1-second delay before Gemini call (rate limit pattern from summarise worker)
- Unit tests with mocked Gemini responses
- **Dependencies:** T1 (needs SocialConfig for tone prompt)
- **Priority:** 1

### T5: Social image service (Sharp)
- Add `sharp` to package.json
- Create `server/services/socialImageService.js`
- Resize/crop: 1200x630 (FB/X landscape), 1080x1080 (IG square)
- Fallback image: dark background (#2b2b2b) with PropertyHack branding
- Output to `server/public/images/social/{articleId}-{platform}.jpg`
- Create output directory on startup if missing
- Unit tests with test images
- **Dependencies:** none
- **Priority:** 1

### T6: Social generation service (orchestrator)
- Create `server/services/socialGenerationService.js`
- Load article, connected accounts, config
- Call headline service, image service
- Calculate randomised schedule times with anti-bunching
- Create `SocialPost` records (one per platform, status SCHEDULED or PENDING_APPROVAL)
- Enqueue delayed `social-publish` jobs
- Skip silently if no accounts connected
- Integration tests
- **Dependencies:** T1, T3, T4, T5
- **Priority:** 1

---

## Phase 3: Platform API Integrations

### T7: Twitter/X adapter (real API)
- Add `twitter-api-v2` to package.json
- Replace stub in `server/services/social/twitterAdapter.js`
- OAuth 1.0a auth, media upload via v1.1, tweet via v2
- Return real post ID and URL
- Handle rate limit errors (throw with identifiable error type)
- Add `SOCIAL_DRY_RUN` env var check — if true, use existing stub behaviour
- **Dependencies:** T2 (credentials from encrypted storage)
- **Priority:** 2

### T8: Facebook adapter (real API)
- Replace stub in `server/services/social/facebookAdapter.js`
- Graph API v19: photo post with caption, or link post fallback
- Page Access Token auth
- Return post ID and permalink
- Handle token expiry errors
- Respect `SOCIAL_DRY_RUN` flag
- **Dependencies:** T2
- **Priority:** 2

### T9: Instagram adapter (real API)
- Replace stub in `server/services/social/instagramAdapter.js`
- Graph API v19: two-step container create → publish
- Image must be publicly accessible URL (document local dev caveat)
- Return media ID and permalink
- Handle token expiry errors
- Respect `SOCIAL_DRY_RUN` flag
- **Dependencies:** T2
- **Priority:** 2

### T10: Update social publish worker
- Modify `server/workers/socialPublishWorker.js`
- Read credentials from `SocialAccount` model (decrypt tokens), fall back to env vars
- On auth failure: mark `SocialAccount.isConnected = false`, set `lastError`
- Update to work with single-platform posts (new `platform` field instead of `platforms` array)
- Remove LinkedIn from `server/services/social/index.js`
- **Dependencies:** T1, T7, T8, T9
- **Priority:** 2

---

## Phase 4: Pipeline Integration

### T11: Hook social generation into article pipeline
- Modify `server/workers/articleImageWorker.js`: after image processing completes, add `socialGenerateQueue.add('social-generate', { articleId })`
- Only trigger if article status is PUBLISHED
- Log social generation trigger
- **Dependencies:** T3, T6
- **Priority:** 2

### T12: Admin manual publish trigger
- Modify `server/routes/admin/articles.js`: when admin manually publishes an article (status change to PUBLISHED), also trigger social generation
- Avoid double-trigger if article was already published via pipeline
- **Dependencies:** T6
- **Priority:** 2

---

## Phase 5: Admin Backend (API Routes)

### T13: Social accounts API
- Create `server/routes/admin/socialAccounts.js`
- `GET /` — list all accounts with connection status
- `PUT /:platform` — update account config / toggle auto-publish
- `POST /:platform/connect` — save credentials (encrypted)
- `POST /:platform/disconnect` — set isConnected=false, clear tokens
- `POST /:platform/test` — verify credentials work (make a lightweight API call)
- Register in `server/index.js`
- All routes behind `authenticateToken` + `requireSuperAdmin`
- **Dependencies:** T1, T2
- **Priority:** 2

### T14: Social config API
- Create `server/routes/admin/socialConfig.js`
- `GET /` — return current config
- `PUT /` — update tone prompt, default hashtags, timing settings, fallback image
- Register in `server/index.js`
- **Dependencies:** T1
- **Priority:** 2

### T15: Enhance social posts API
- Modify `server/routes/admin/socialPosts.js`
- Add query filters: `platform`, `dateFrom`, `dateTo`, `search`
- Add `POST /:id/retry` — re-enqueue failed post to social-publish queue, reset status to SCHEDULED
- Add `POST /:id/approve` — change PENDING_APPROVAL to SCHEDULED, enqueue delayed job
- Add `GET /stats` — counts for this week/month, per platform, failed count
- **Dependencies:** T1
- **Priority:** 2

---

## Phase 6: Admin Frontend

### T16: Social settings page
- Create `components/admin/social/SocialSettings.tsx`
- Create `components/admin/social/SocialAccountCard.tsx` — connection status, connect/disconnect buttons, auto-publish toggle
- Create `components/admin/social/SocialConfigForm.tsx` — tone prompt textarea, hashtag tag input, timing number inputs, fallback image upload
- Add route `/admin/settings/social` to `App.tsx`
- Add nav link in admin sidebar
- **Dependencies:** T13, T14
- **Priority:** 3

### T17: Enhanced social post list
- Move existing `SocialPostList.tsx` to `components/admin/social/`
- Create `components/admin/social/SocialStatsBar.tsx` — stats strip at top
- Create `components/admin/social/SocialPostCard.tsx` — post card with platform icon, status badge, action buttons
- Add platform/status/date/search filters
- Retry button for failed posts
- Cancel/edit buttons for scheduled posts
- Direct link to live post on platform (opens new tab)
- **Dependencies:** T15
- **Priority:** 3

### T18: Enhanced social post editor
- Move existing `SocialPostEditor.tsx` to `components/admin/social/`
- Add approve button for PENDING_APPROVAL posts
- Show per-platform preview with accurate formatting
- Show countdown timer for scheduled posts
- **Dependencies:** T15
- **Priority:** 3

---

## Phase 7: Polish & Monitoring

### T19: Connection health monitoring
- Add a scheduled job (node-cron, every 6 hours) that checks each connected SocialAccount
- Makes a lightweight API call per platform to verify credentials
- If expired/broken: set `isConnected = false`, set `lastError`, set `lastCheckedAt`
- Show alert banner in admin dashboard when any account is disconnected/expired
- **Dependencies:** T10, T13
- **Priority:** 3

### T20: Migration — existing social posts
- Write a one-time migration script to convert existing `SocialPost` records from multi-platform (platforms array) to single-platform (one row per platform)
- Safely handles posts with no platforms set
- **Dependencies:** T1
- **Priority:** 3

---

## Dependency Graph

```
T1 (schema) ──┬── T3 (queue) ──┬── T6 (orchestrator) ── T11 (pipeline hook)
               │                │                         T12 (manual trigger)
               │                │
               ├── T4 (headlines) ──┘
               ├── T14 (config API)
               ├── T15 (posts API) ── T17 (post list UI)
               │                      T18 (post editor UI)
               └── T20 (migration)

T2 (encryption) ── T7 (Twitter) ──┐
                    T8 (Facebook) ─┤── T10 (publish worker) ── T19 (health monitor)
                    T9 (Instagram) ┘

T5 (image service) ── T6 (orchestrator)

T13 (accounts API) ── T16 (settings UI)
T14 (config API) ───┘

T13 depends on T1, T2
```

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 — Foundation | T1, T2, T3 | Schema, encryption, queue setup |
| 2 — Core Services | T4, T5, T6 | AI headlines, image processing, orchestrator |
| 3 — Platform APIs | T7, T8, T9, T10 | Real API integrations, publish worker update |
| 4 — Pipeline | T11, T12 | Hook into article pipeline + manual trigger |
| 5 — Admin API | T13, T14, T15 | Account management, config, enhanced post routes |
| 6 — Frontend | T16, T17, T18 | Settings page, enhanced post list/editor |
| 7 — Polish | T19, T20 | Health monitoring, data migration |

**Total: 20 tasks across 7 phases**
