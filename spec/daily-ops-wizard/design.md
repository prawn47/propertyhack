# Design: Daily Ops Wizard

## Architecture Overview

The Daily Ops Wizard is a frontend-heavy feature that wraps existing backend functionality. The primary new backend work is wizard state management, image editing endpoints, and metrics aggregation. All newsletter and social post operations use existing APIs.

```
┌─────────────────────────────────────────────────┐
│                  Admin Frontend                   │
│                                                   │
│  /admin/daily ─── DailyWizard (shell)            │
│    ├── WizardStepper (navigation)                │
│    ├── Step1_NewsletterReview                     │
│    │     ├── NewsletterEditor (existing, reused)  │
│    │     ├── ImageEditor (new shared component)   │
│    │     └── CopyToClipboard (new shared)         │
│    ├── Step2_NewsletterSend                       │
│    │     ├── SendChecklist                        │
│    │     └── CopyToClipboard                      │
│    ├── Step3_SocialReview                         │
│    │     ├── SocialPostGrid                       │
│    │     ├── SocialPostCard (existing, extended)   │
│    │     └── ImageEditor                          │
│    ├── Step4_HotTake                              │
│    │     ├── StoryContext                         │
│    │     ├── TakeComposer                         │
│    │     ├── AiSuggestTakes                       │
│    │     └── ImageEditor                          │
│    ├── Step5_Publish                              │
│    │     ├── ContentTimeline                      │
│    │     └── ScheduleControls                     │
│    └── Step6_Metrics                              │
│          ├── MetricsCards                         │
│          ├── StreakCounter                         │
│          └── CalendarView                         │
│                                                   │
└──────────────────┬────────────────────────────────┘
                   │ API calls
┌──────────────────▼────────────────────────────────┐
│                  Express Backend                   │
│                                                    │
│  NEW routes:                                       │
│    /api/admin/daily/*     → wizardController.js    │
│    /api/admin/images/*    → imageController.js     │
│                                                    │
│  EXISTING routes (no changes):                     │
│    /api/admin/newsletters/*                        │
│    /api/admin/socialPosts/*                        │
│    /api/admin/socialAccounts/*                     │
│                                                    │
│  NEW services:                                     │
│    wizardService.js       → state CRUD + streak    │
│    imageEditService.js    → prompt-based editing   │
│    metricsService.js      → aggregated metrics     │
│    hotTakeService.js      → AI suggestion gen      │
│                                                    │
│  MODIFIED services:                                │
│    imageGenerationService.js → naming + metadata   │
│    imagenService.js          → naming + metadata   │
│                                                    │
└────────────────────────────────────────────────────┘
```

## Frontend Architecture

### New Components

All new components go in `components/admin/daily/`.

#### DailyWizard.tsx (Shell)
- Top-level component for `/admin/daily` route
- Manages wizard state via `useDailyWizard` hook
- Renders WizardStepper + current step component
- Handles step navigation (next, back, skip)
- Auto-saves wizard state on step transitions

#### WizardStepper.tsx
- Horizontal progress bar with 6 labeled steps
- Props: `steps[]`, `currentStep`, `completedSteps[]`, `onStepClick`
- Uses Tailwind: gold accent for active step, checkmark for completed, grey for future
- Responsive: collapses to numbered dots on narrow screens

#### Step1_NewsletterReview.tsx
- Fetches latest DRAFT newsletter for AU via `GET /api/admin/newsletters?jurisdiction=AU&status=DRAFT&limit=1`
- Reuses `NewsletterEditor` component (imported from existing `components/admin/NewsletterEditor.tsx`)
- Wraps it with additional UI: copy buttons per section, image editor, approve/skip actions
- Extracts newsletter HTML sections by parsing the TipTap content for `<section>` or `<h2>` boundaries

#### Step2_NewsletterSend.tsx
- Simple checklist UI with 3 items: subject, hero image, body
- Each item has a copy/download button that tracks "done" state in local component state
- "Open Beehiiv" button: `window.open('https://app.beehiiv.com', '_blank')`
- "Mark as Sent" calls `POST /api/admin/newsletters/:id/send-manual` (new lightweight endpoint that just updates status without calling Beehiiv API)

#### Step3_SocialReview.tsx
- Fetches today's social posts via `GET /api/admin/socialPosts?status=DRAFT,PENDING_APPROVAL&createdToday=true`
- Renders a grid of cards (reuses/extends `SocialPostCard`)
- Adds bulk approve toolbar
- Each card includes `ImageEditor` for image editing
- Platform filter tabs at top

#### Step4_HotTake.tsx
- Fetches top AU articles today via `GET /api/admin/articles?market=AU&status=PUBLISHED&sort=-relevanceScore&limit=5`
- Text composer with character counter (multi-platform aware)
- AI suggestions via `POST /api/admin/daily/suggest-takes`
- Image generation via `POST /api/admin/images/generate`
- Creates social post via `POST /api/admin/socialPosts`

#### Step5_Publish.tsx
- Fetches all SCHEDULED social posts for today
- Timeline layout: vertical list ordered by `scheduledFor` time
- Time pickers per post, drag-and-drop reorder
- Publish/schedule actions per post and in bulk
- Copy-to-clipboard fallback for unconnected platforms

#### Step6_Metrics.tsx
- Fetches aggregated metrics via `GET /api/admin/daily/metrics`
- Three cards: Newsletter, Social, Website
- Trend arrows computed from current vs previous period
- Streak counter + calendar mini-view
- "Complete Today's Run" button

### Shared Components

#### ImageEditor.tsx (`components/admin/daily/ImageEditor.tsx`)
- Reusable component used in Steps 1, 3, 4
- Props: `imageUrl`, `onImageChange`, `aspectRatio`, `style`
- UI: image preview + action bar (Regenerate, Edit, Upload)
- "Edit" mode: text input + "Apply" button → calls `POST /api/admin/images/edit`
- "Upload" mode: file input with drag-and-drop
- Loading state during generation (spinner overlay on image)

#### CopyToClipboard.tsx (`components/shared/CopyToClipboard.tsx`)
- Button component that copies text/HTML to clipboard
- Props: `content`, `label`, `format` ('text' | 'html')
- Uses `navigator.clipboard.writeText()` for text, `navigator.clipboard.write()` with `ClipboardItem` for HTML
- Shows "Copied ✓" toast for 2 seconds after copy
- Tracks "copied" state for checklist features

#### StreakCounter.tsx (`components/admin/daily/StreakCounter.tsx`)
- Displays current streak as a number with flame icon
- Props: `streak`, `maxStreak`
- Gold color when streak is active, grey when broken

#### CalendarView.tsx (`components/admin/daily/CalendarView.tsx`)
- Mini month calendar
- Props: `completedDates[]`, `month`, `year`
- Green dots for completed days, grey for missed weekdays, empty for weekends
- Uses brand colors from Tailwind config

### Hooks

#### useDailyWizard.ts
- Manages wizard state: fetches/creates today's run, handles step navigation
- Returns: `{ run, currentStep, goToStep, nextStep, prevStep, skipStep, updateRun, completeRun }`
- Auto-saves to backend on state changes (debounced 2s)
- Handles edge cases: no run exists, run already complete, resume from last step

#### useDailyMetrics.ts
- Fetches aggregated metrics for the metrics step
- Returns: `{ newsletter, social, website, loading, error }`
- Caches for 5 minutes to avoid excessive API calls

### Route Addition

In `App.tsx`, add the wizard route inside the admin routes:
```tsx
<Route path="/admin/daily" element={<RequireAdmin><DailyWizard /></RequireAdmin>} />
```

### Dashboard Modification

In `IngestionMonitor.tsx` (the admin dashboard), add a card at the top:
- If today's run is not complete: gold-accented "Start Today's Run" CTA card with link to `/admin/daily`
- If complete: "Today's Run Complete ✓" card with streak info
- Fetch today's run status via `GET /api/admin/daily/today`

### Sidebar Modification

In `AdminLayout.tsx`, add "Daily Run" as the first nav item (above Dashboard):
- Icon: play-circle or zap
- Gold highlight when today's run is incomplete
- Links to `/admin/daily`

## Backend Architecture

### New Routes

#### `server/routes/admin/daily.js`
```
GET    /api/admin/daily/today       → get or create today's run
PATCH  /api/admin/daily/today       → update run state
POST   /api/admin/daily/today/complete → mark complete
GET    /api/admin/daily/streak      → streak count + calendar data
GET    /api/admin/daily/metrics     → aggregated metrics
POST   /api/admin/daily/suggest-takes → AI hot take suggestions
```

#### `server/routes/admin/images.js`
```
POST   /api/admin/images/edit       → edit image with prompt
POST   /api/admin/images/generate   → generate new image
```

#### Modification to existing newsletter routes
Add one new endpoint to `server/routes/admin/newsletters.js`:
```
POST   /api/admin/newsletters/:id/send-manual → mark as sent (status update only, no Beehiiv API call)
```

### New Services

#### `server/services/wizardService.js`
- `getOrCreateToday()` — finds today's run or creates a new one
- `updateRun(id, data)` — partial update of run fields
- `completeRun(id)` — sets completedAt, calculates streak
- `getStreak()` — counts consecutive weekday completions
- `getCalendarData(month, year)` — returns completed dates for calendar view

#### `server/services/imageEditService.js`
- `editImage(imageUrl, editPrompt, style, aspectRatio)` — generates a new image based on edit instructions
  - Builds prompt: `"Edit this image: [editPrompt]. Maintain [style] aesthetic. [original context]"`
  - Calls `aiProviderService.generateImage()` with the combined prompt
  - Saves to R2 with proper filename
  - Returns `{ imageUrl, altText, filename }`
- `generateImage(prompt, style, aspectRatio, context)` — generates from scratch with naming
  - Uses existing image generation logic but adds naming convention + metadata
  - Returns `{ imageUrl, altText, filename }`

#### `server/services/metricsService.js`
- `getAggregatedMetrics()` — pulls data from multiple sources:
  - Newsletter: calls `beehiivService.getPostStats()` for the most recent sent newsletter
  - Social: queries SocialPost records for yesterday's published posts + platform results
  - Website: basic stats from Article view counts (or Cloudflare Analytics API if available)
  - Computes trend arrows by comparing current vs previous period

#### `server/services/hotTakeService.js`
- `suggestTakes(articleId)` — generates 3 commentary angles
  - Fetches the article content
  - Calls `aiProviderService.generateText()` with a prompt requesting 3 takes:
    1. Contrarian / against-the-grain
    2. Data-driven / analytical
    3. Relatable / personal / "what this means for you"
  - Returns `{ suggestions: [{ angle: string, text: string }] }`

### Modifications to Existing Services

#### `server/services/imageGenerationService.js`
- Add `generateFilename(type, market, slug, date)` function
- Add `generateMetadata(title, keywords, description)` function
- Modify `generateArticleImage()` to use new filename and save metadata
- Export these functions for use by `imageEditService`

#### `server/services/imagenService.js`
- Modify newsletter hero image generation to use descriptive filename
- Add alt text generation (short description of the image)
- Save metadata alongside image

### Database Migration

One new model:

```prisma
model DailyWizardRun {
  id                    String    @id @default(cuid())
  date                  DateTime  @db.Date
  currentStep           Int       @default(1) @map("current_step")
  newsletterId          String?   @map("newsletter_id")
  newsletterApproved    Boolean   @default(false) @map("newsletter_approved")
  newsletterSent        Boolean   @default(false) @map("newsletter_sent")
  socialPostsApproved   Int       @default(0) @map("social_posts_approved")
  hotTakeCreated        Boolean   @default(false) @map("hot_take_created")
  hotTakePostId         String?   @map("hot_take_post_id")
  allPublished          Boolean   @default(false) @map("all_published")
  metricsReviewed       Boolean   @default(false) @map("metrics_reviewed")
  completedAt           DateTime? @map("completed_at")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  @@unique([date])
  @@map("daily_wizard_runs")
}
```

Migration: `npx prisma migrate dev --name add_daily_wizard_run`

## Component Reuse Strategy

The wizard wraps existing components rather than rebuilding. Key reuse points:

| Existing Component | Reused In | How |
|---|---|---|
| `NewsletterEditor.tsx` | Step 1 | Imported directly, wrapped with wizard-specific UI (copy buttons, image editor, approve action) |
| `SocialPostCard.tsx` | Step 3 | Extended with ImageEditor and wizard approve/reject actions |
| `SocialPostEditor.tsx` | Step 4 | Composer pattern borrowed for hot take (not imported directly — simpler UI needed) |
| TipTap rich text editor | Step 1 | Via NewsletterEditor |

Components NOT reused (wizard-specific alternatives needed):
- `SocialPostList.tsx` — wizard needs a grid view with bulk actions, not a list
- `NewsletterList.tsx` — wizard auto-selects the latest draft, no list needed
- `IngestionMonitor.tsx` — different metrics focus (content performance, not ingestion health)

## Image Pipeline Flow

```
User clicks "Edit Image"
  → Opens text input
  → User types "make it warmer, Kodak Portra style"
  → Frontend calls POST /api/admin/images/edit
    → Backend: imageEditService.editImage(url, prompt, style, ratio)
      → Builds combined prompt with edit instructions + style
      → Calls aiProviderService.generateImage('image-generation', combinedPrompt)
      → Generates filename: propertyhack-social-instagram-sydney-prices-2026-03-21.png
      → Generates alt text via AI
      → Saves to R2 with metadata
      → Returns { imageUrl, altText, filename }
  → Frontend updates image preview
  → User can edit again, regenerate, or accept
```

## Clipboard Flow (Newsletter → Beehiiv)

```
Step 1: User reviews/edits newsletter in TipTap editor
  → Approves newsletter (status → APPROVED)

Step 2: Send checklist appears
  → "Copy Subject" → navigator.clipboard.writeText(subject)
  → "Download Hero Image" → fetch(imageUrl) → saveAs(descriptiveFilename)
  → "Copy Body" → navigator.clipboard.write(ClipboardItem with HTML)
  → User opens Beehiiv in new tab
  → User pastes content into Beehiiv editor
  → User returns and clicks "Mark as Sent"
  → Backend updates status → SENT, sets sentAt
```

## Error Handling

- **No newsletter draft**: Step 1 shows "No draft available" with "Generate Now" button (calls existing newsletter generation endpoint)
- **No social posts**: Step 3 shows "No posts generated today" with "Generate Posts" button (triggers social generation worker)
- **Image generation fails**: Shows fallback SVG (existing behaviour) with "Try Again" button
- **Beehiiv API down**: Metrics step shows "Unable to fetch newsletter stats" — doesn't block wizard completion
- **Social API down**: Publish step offers copy-to-clipboard for all posts
- **Wizard state save fails**: Retry with exponential backoff, show unobtrusive error toast. Local state preserved in React state.

## Testing Strategy

- **Unit tests**: wizardService (streak calculation, state transitions), imageEditService (filename generation, metadata), metricsService (aggregation, trends)
- **Integration tests**: wizard API endpoints (create/update/complete run, streak calculation)
- **Component tests**: WizardStepper navigation, CopyToClipboard, ImageEditor interactions
- **E2E**: Full wizard walkthrough (generate → review → approve → send → schedule → metrics → complete)
