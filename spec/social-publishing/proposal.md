# Automated Social Media Publishing — Proposal

## Problem

PropertyHack aggregates hundreds of articles daily across global property markets. Each article should be promoted on social media to drive traffic back to the site. Doing this manually is unsustainable — it would require hiring dedicated social media staff. The system needs to automatically generate and publish platform-tailored social posts whenever an article goes live.

## Who Benefits

- **Platform owner (Dan)** — hands-off article promotion, no manual posting or hiring
- **Readers** — discover articles through social feeds they already follow
- **Site growth** — automated, consistent social presence across three platforms

## What Already Exists

Significant scaffolding is already in place:

- **Prisma model**: `SocialPost` with status enum (DRAFT/SCHEDULED/PUBLISHED/FAILED), platform results JSON, article relation
- **Admin routes**: Full CRUD at `/api/admin/social-posts` + publish and preview endpoints
- **BullMQ worker**: `social-publish` queue with per-platform adapter dispatch
- **Platform adapters**: `twitterAdapter.js`, `facebookAdapter.js`, `instagramAdapter.js` — all stubs (log + fake IDs)
- **Admin UI**: `SocialPostList.tsx` (paginated table, status filter) and `SocialPostEditor.tsx` (content form, platform previews, scheduling)

## What Needs Building

1. **Real API integrations** — Replace adapter stubs with actual Facebook Graph API, X (Twitter) API v2, and Instagram Graph API calls
2. **Auto-trigger on article publish** — When an article status changes to PUBLISHED, automatically generate social posts with randomised delays (up to 1 hour, staggered per platform, anti-bunching)
3. **AI headline generation** — Use Gemini to generate short, platform-appropriate headlines from article titles (not copy-paste)
4. **Image processing** — Resize/crop featured images per platform (landscape for FB/X, square for IG), branded fallback when no image
5. **Hashtag generation** — Auto-generate relevant hashtags from article content/category/location + configurable default hashtags
6. **Social account management** — Settings UI to connect/disconnect accounts, show connection health, OAuth flows for each platform
7. **Publishing controls** — Auto-publish vs manual approval toggle (per platform or global), edit/cancel during delay window
8. **Dashboard enhancements** — Failed post retry, quick stats, direct links to live posts
9. **Connection monitoring** — Proactive alerts when OAuth tokens expire or connections break

## Scope — v1

### In Scope

- Facebook Page, X (Twitter), Instagram Business posting
- Auto-trigger from article pipeline
- AI-generated headlines (Gemini)
- Platform-specific formatting and hashtags
- Randomised, staggered post timing
- Admin dashboard: post feed, filters, retry failed
- Account connection management with health checks
- Auto-publish mode with edit-during-delay window

### Out of Scope (Deferred)

- Engagement analytics (likes, shares, reach) — use native platform tools
- Replying to comments/DMs from backend
- LinkedIn, TikTok, or other platforms
- A/B testing headlines or images
- Paid promotion / boosting
- User-generated content

## Acceptance Criteria

1. Article published on site → social posts auto-queued for FB, X, IG within seconds
2. Each post has AI-generated headline, formatted image, link, and relevant hashtags
3. Posts publish to real platform APIs after randomised delay (staggered per platform)
4. Multiple articles within short window don't bunch posts — minimum 5-min gap per platform
5. Admin can edit headline/image/hashtags or cancel during delay window
6. Failed posts show error reason and retry button in dashboard
7. Settings page shows connected accounts with health status
8. Auto-publish / manual-approval toggle works per platform

## API Keys Required

To connect each platform, you'll need developer accounts and API credentials:

### Facebook & Instagram (same Meta developer account)

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create an app (type: Business)
3. Add the **Facebook Login** and **Instagram Graph API** products
4. Required permissions: `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`
5. Get your **App ID**, **App Secret** from app settings
6. You'll need a **Facebook Page** connected to an **Instagram Business Account**
7. Generate a long-lived **Page Access Token** (the OAuth flow will handle this)

### X (Twitter)

1. Go to [X Developer Portal](https://developer.x.com/)
2. Apply for a developer account (Free tier supports posting)
3. Create a project and app
4. Enable **OAuth 2.0** with read+write permissions
5. Get your **API Key**, **API Key Secret**, **Bearer Token**
6. Generate **Access Token** and **Access Token Secret** (for your account)
7. Note: Free tier allows 1,500 posts/month — sufficient for hundreds of articles

### Environment Variables Needed

Add these to `server/.env`:

```env
# Facebook / Instagram (Meta)
META_APP_ID=
META_APP_SECRET=
META_PAGE_ID=
META_PAGE_ACCESS_TOKEN=
META_INSTAGRAM_ACCOUNT_ID=

# X (Twitter)
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=
TWITTER_BEARER_TOKEN=
```

## Breaking Risk

**Low** — this is additive. No existing API contracts or data models change. The SocialPost model already exists. The only schema change needed is adding fields for auto-trigger config and hashtag defaults.
