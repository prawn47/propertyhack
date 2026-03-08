# Automated Social Media Publishing — Design

## Architecture Overview

The social publishing system extends the existing 5-stage ingestion pipeline by adding a social post generation step after article summarisation. It introduces three new services, two new DB models, and extends the existing worker/queue infrastructure.

```
Article Pipeline (existing)                Social Pipeline (new)
─────────────────────────                  ─────────────────────
fetch → process → summarise → image →     socialGenerate → [delay] → socialPublish
                      │         embed            ▲
                      │                          │
                      └── sets status=PUBLISHED ─┘
                          triggers social posts
```

## Pipeline Integration

### Trigger Point

The `articleSummariseWorker` (line 72 of `server/workers/articleSummariseWorker.js`) sets `status: 'PUBLISHED'`. After this update and the existing `articleImageQueue.add()` call, add a new call:

```js
await socialGenerateQueue.add('social-generate', { articleId });
```

This enqueues the social generation job. The social pipeline runs in parallel with the image/embed pipeline — it doesn't block or depend on the article image being downloaded first (it uses the original `imageUrl` from the source, not the locally cached image).

**Wait — actually it should wait for the article image.** The social image processing needs a source image. Two options:

1. Trigger social generation after the image worker completes (serial)
2. Trigger social generation immediately but have it check for a local image (parallel with fallback)

**Decision: Option 1 — trigger from `articleImageWorker` completion.** This ensures the local image is available for Sharp to resize. The image worker already downloads and saves the article image. We add the social queue call at the end of `articleImageWorker`.

### New Queue: `social-generate`

Responsible for:
1. Checking which platforms have connected, enabled accounts
2. Generating AI headline + hashtags via Gemini
3. Processing the image (resize/crop per platform via Sharp)
4. Calculating randomised, staggered publish times (anti-bunching)
5. Creating `SocialPost` records (one per platform)
6. Enqueuing delayed `social-publish` jobs

### Modified Queue: `social-publish`

The existing worker already handles per-platform dispatch. Changes:
- Read credentials from `SocialAccount` model instead of env vars (env vars kept as fallback)
- Update to call real API adapters instead of stubs
- On auth failure, mark `SocialAccount.isConnected = false`

---

## Service Architecture

### New: `server/services/socialGenerationService.js`

Orchestrates the social post creation for an article.

```js
async function generateSocialPosts(articleId) {
  // 1. Load article with source info
  // 2. Load connected social accounts (SocialAccount where isConnected=true)
  // 3. If no accounts connected, return early
  // 4. Load SocialConfig (tone prompt, default hashtags, timing)
  // 5. Call Gemini for headlines + contextual hashtags (one call, all platforms)
  // 6. Process image per platform (Sharp resize/crop)
  // 7. Calculate scheduledFor per platform (random delay + anti-bunching)
  // 8. Create SocialPost records
  // 9. Enqueue delayed social-publish jobs
  return createdPosts;
}
```

### New: `server/services/socialHeadlineService.js`

Handles Gemini calls for headline + hashtag generation.

```js
async function generateHeadlines(article, tonePrompt) {
  // Single Gemini call returning structured JSON:
  // {
  //   facebook: { headline: "...", hashtags: ["#...", ...] },
  //   twitter:  { headline: "...", hashtags: ["#...", ...] },
  //   instagram: { headline: "...", hashtags: ["#...", ...] }
  // }
  //
  // Prompt includes:
  // - Article title, blurb, category, location, market
  // - Platform character limits
  // - Tone guidelines from SocialConfig.tonePrompt
  // - Instruction to include link placeholder for FB/X, "Link in bio" for IG
}
```

Uses the same `@google/generative-ai` package and Gemini 2.0 Flash model as `articleSummaryService.js`. Includes 1-second delay before call to respect rate limits (same pattern as summarise worker).

### New: `server/services/socialImageService.js`

Handles image processing with Sharp.

```js
async function processImageForPlatform(sourceImagePath, platform) {
  // platform configs:
  // facebook:  { width: 1200, height: 630, fit: 'cover' }
  // twitter:   { width: 1200, height: 630, fit: 'cover' }
  // instagram: { width: 1080, height: 1080, fit: 'cover' }
  //
  // If sourceImagePath is null/missing, generate fallback:
  // - Dark background (#2b2b2b) with PropertyHack logo centred
  //
  // Output: /public/images/social/{articleId}-{platform}.jpg
  // Returns: relative URL path
}
```

### Modified: `server/services/social/twitterAdapter.js`

Replace stub with real X API v2 calls using `twitter-api-v2` package.

```js
const { TwitterApi } = require('twitter-api-v2');

async function publish(post, credentials) {
  const client = new TwitterApi({
    appKey: credentials.apiKey,
    appSecret: credentials.apiSecret,
    accessToken: credentials.accessToken,
    accessSecret: credentials.accessSecret,
  });

  let mediaId;
  if (post.processedImage) {
    // Upload image via v1.1 media upload
    mediaId = await client.v1.uploadMedia(post.processedImage);
  }

  const tweet = await client.v2.tweet({
    text: post.content,
    ...(mediaId && { media: { media_ids: [mediaId] } }),
  });

  return {
    platformPostId: tweet.data.id,
    url: `https://x.com/i/status/${tweet.data.id}`,
  };
}
```

### Modified: `server/services/social/facebookAdapter.js`

Replace stub with Facebook Graph API calls using `node-fetch` / built-in fetch.

```js
async function publish(post, credentials) {
  const { pageAccessToken, pageId } = credentials;
  const baseUrl = `https://graph.facebook.com/v19.0/${pageId}`;

  let result;
  if (post.processedImage) {
    // Photo post with caption
    const formData = new FormData();
    formData.append('source', fs.createReadStream(post.processedImage));
    formData.append('message', post.content);
    formData.append('access_token', pageAccessToken);
    result = await fetch(`${baseUrl}/photos`, { method: 'POST', body: formData });
  } else {
    // Link post
    result = await fetch(`${baseUrl}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: post.content,
        link: post.articleUrl,
        access_token: pageAccessToken,
      }),
    });
  }

  const data = await result.json();
  if (data.error) throw new Error(data.error.message);

  return {
    platformPostId: data.id || data.post_id,
    url: `https://www.facebook.com/${data.id || data.post_id}`,
  };
}
```

### Modified: `server/services/social/instagramAdapter.js`

Replace stub with Instagram Graph API (two-step publish via Meta).

```js
async function publish(post, credentials) {
  const { pageAccessToken, instagramAccountId } = credentials;
  const baseUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}`;

  // Step 1: Create media container
  // Image must be a publicly accessible URL
  const containerRes = await fetch(`${baseUrl}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: post.imageUrl,  // must be public URL
      caption: post.content,
      access_token: pageAccessToken,
    }),
  });
  const container = await containerRes.json();
  if (container.error) throw new Error(container.error.message);

  // Step 2: Publish the container
  const publishRes = await fetch(`${baseUrl}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: container.id,
      access_token: pageAccessToken,
    }),
  });
  const published = await publishRes.json();
  if (published.error) throw new Error(published.error.message);

  // Get permalink
  const mediaRes = await fetch(
    `https://graph.facebook.com/v19.0/${published.id}?fields=permalink&access_token=${pageAccessToken}`
  );
  const media = await mediaRes.json();

  return {
    platformPostId: published.id,
    url: media.permalink || `https://www.instagram.com/`,
  };
}
```

**Instagram caveat:** The `image_url` must be a publicly accessible URL. Since PropertyHack serves images via Caddy in production, the processed image URL will work. For local dev, Instagram posting will only work if the dev server is exposed via a tunnel (ngrok or similar).

---

## Timing & Anti-Bunching Algorithm

```js
async function calculateScheduleTimes(articleId, platforms, config) {
  const now = new Date();
  const { minPostGapMins, maxDelayMins } = config;
  const schedules = {};

  for (const platform of platforms) {
    // Random delay: 5 to maxDelayMins minutes
    let delayMs = (Math.floor(Math.random() * (maxDelayMins - 5)) + 5) * 60 * 1000;
    let scheduledFor = new Date(now.getTime() + delayMs);

    // Anti-bunching: check last scheduled/published post for this platform
    const lastPost = await prisma.socialPost.findFirst({
      where: {
        platform,
        status: { in: ['SCHEDULED', 'PUBLISHED'] },
        scheduledFor: { gte: new Date(now.getTime() - maxDelayMins * 60 * 1000) },
      },
      orderBy: { scheduledFor: 'desc' },
    });

    if (lastPost?.scheduledFor) {
      const gap = scheduledFor.getTime() - lastPost.scheduledFor.getTime();
      if (gap < minPostGapMins * 60 * 1000) {
        // Nudge forward past the minimum gap
        scheduledFor = new Date(lastPost.scheduledFor.getTime() + minPostGapMins * 60 * 1000);
      }
    }

    schedules[platform] = scheduledFor;
  }

  return schedules;
}
```

---

## Token Encryption

Social account tokens are encrypted at rest using AES-256-GCM with a key derived from a `SOCIAL_TOKEN_ENCRYPTION_KEY` env var.

```js
// server/utils/encryption.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.SOCIAL_TOKEN_ENCRYPTION_KEY, 'hex'); // 32 bytes

function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decrypt(ciphertext) {
  const [ivHex, tagHex, encrypted] = ciphertext.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

Add to `server/.env`:
```
SOCIAL_TOKEN_ENCRYPTION_KEY=   # generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Admin UI Components

### New: Social Settings Page (`/admin/settings/social`)

```
┌─────────────────────────────────────────────────────┐
│ Social Publishing Settings                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Connected Accounts                                  │
│ ┌─────────────┬──────────┬────────────┬───────────┐ │
│ │ Facebook    │ 🟢 Connected │ Auto-publish: ON │ Disconnect │
│ │ X (Twitter) │ 🔴 Not connected │          │ Connect    │
│ │ Instagram   │ 🟢 Connected │ Auto-publish: ON │ Disconnect │
│ └─────────────┴──────────┴────────────┴───────────┘ │
│                                                     │
│ Publishing Config                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Tone: [Informative, concise, neutral...      ]  │ │
│ │ Default hashtags: [#PropertyNews] [#RealEstate] │ │
│ │ Max delay: [60] mins    Min gap: [5] mins       │ │
│ │ Fallback image: [Upload / URL]                  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [Save Settings]                                     │
└─────────────────────────────────────────────────────┘
```

### Enhanced: Social Post List (`/admin/social`)

```
┌─────────────────────────────────────────────────────┐
│ Social Posts                                        │
├─────────────────────────────────────────────────────┤
│ 📊 This week: 142 posted │ FB: 48 │ X: 47 │ IG: 47 │ ⚠ 3 failed │
├─────────────────────────────────────────────────────┤
│ Filters: [All platforms ▼] [All statuses ▼] [Date range] [Search...] │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🖼 "Sydney auction clearance rates hit 78%..."  │ │
│ │ 📘 Facebook │ ✅ Published │ 2 hours ago        │ │
│ │ [View on Facebook ↗]                            │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ 🖼 "Melbourne median price crosses $1M mark"    │ │
│ │ 🐦 X │ ❌ Failed: Rate limit exceeded           │ │
│ │ [Retry] [Edit & Retry]                          │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ 🖼 "First home buyer grants extended to 2027"   │ │
│ │ 📸 Instagram │ ⏰ Scheduled: in 23 minutes      │ │
│ │ [Edit] [Cancel]                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Component Structure

```
components/admin/
├── social/
│   ├── SocialSettings.tsx        # Account connections + config
│   ├── SocialAccountCard.tsx     # Single platform connection card
│   ├── SocialConfigForm.tsx      # Tone, hashtags, timing config
│   ├── SocialPostList.tsx        # Enhanced (replace existing)
│   ├── SocialPostCard.tsx        # Individual post in the feed
│   ├── SocialPostEditor.tsx      # Enhanced (replace existing)
│   └── SocialStatsBar.tsx        # Quick stats strip
```

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `server/services/socialGenerationService.js` | Orchestrate social post creation from article |
| `server/services/socialHeadlineService.js` | Gemini headline + hashtag generation |
| `server/services/socialImageService.js` | Sharp image resize/crop per platform |
| `server/utils/encryption.js` | AES-256-GCM encrypt/decrypt for tokens |
| `server/workers/socialGenerateWorker.js` | BullMQ worker for social generation |
| `server/queues/socialGenerateQueue.js` | Queue definition for social generation |
| `server/routes/admin/socialAccounts.js` | CRUD + connect/disconnect/test endpoints |
| `server/routes/admin/socialConfig.js` | Config get/update endpoints |
| `components/admin/social/SocialSettings.tsx` | Settings page |
| `components/admin/social/SocialAccountCard.tsx` | Platform connection card |
| `components/admin/social/SocialConfigForm.tsx` | Config form |
| `components/admin/social/SocialPostCard.tsx` | Post feed card |
| `components/admin/social/SocialStatsBar.tsx` | Stats strip |

### Modified Files

| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | Add `SocialAccount`, `SocialConfig` models; modify `SocialPost`; add `PENDING_APPROVAL` enum |
| `server/workers/articleImageWorker.js` | Add `socialGenerateQueue.add()` after image processing |
| `server/workers/socialPublishWorker.js` | Read credentials from `SocialAccount` model; handle auth failures |
| `server/services/social/twitterAdapter.js` | Replace stub with real X API v2 calls |
| `server/services/social/facebookAdapter.js` | Replace stub with real Graph API calls |
| `server/services/social/instagramAdapter.js` | Replace stub with real Graph API calls |
| `server/services/social/index.js` | Remove LinkedIn adapter reference |
| `server/routes/admin/socialPosts.js` | Add filters, retry, approve, stats endpoints |
| `server/index.js` | Register new routes and worker |
| `components/admin/SocialPostList.tsx` | Move to `social/` subfolder, enhance with filters + stats |
| `components/admin/SocialPostEditor.tsx` | Move to `social/` subfolder, enhance with platform-specific views |
| `App.tsx` | Add route for `/admin/settings/social` |

### Dependencies to Add

```json
{
  "sharp": "^0.33.x",
  "twitter-api-v2": "^1.17.x"
}
```

---

## Testing Strategy

### Unit Tests

| Service | Key Tests |
|---------|-----------|
| `socialHeadlineService` | Returns valid headlines per platform; respects char limits; fallback on Gemini failure |
| `socialImageService` | Correct dimensions per platform; fallback image generation; handles missing source image |
| `socialGenerationService` | Creates correct number of posts; anti-bunching logic; skips disconnected accounts |
| `encryption` | Round-trip encrypt/decrypt; different IVs per call |

### Integration Tests

| Area | Key Tests |
|------|-----------|
| Social generate worker | Article publish → social posts created with correct status |
| Social publish worker | Post dispatch → adapter called → status updated |
| Admin API | CRUD social accounts; update config; retry failed posts; approve pending |
| Anti-bunching | Multiple articles in quick succession → minimum gap respected |

### E2E Tests (Playwright)

- Social settings page: connect/disconnect flow, config save
- Social post list: filter by platform/status, retry failed post
- Social post editor: edit headline during delay window, cancel post

### Platform API Testing

Real API calls tested manually (not in CI) — use each platform's sandbox/test mode where available. The stubs remain available via a `SOCIAL_DRY_RUN=true` env var for local dev and CI.
