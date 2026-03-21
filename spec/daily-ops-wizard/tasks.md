# Tasks: Daily Ops Wizard

## Phase 1: Database & Backend Foundation

### T1: DailyWizardRun Prisma model + migration
- Add `DailyWizardRun` model to `server/prisma/schema.prisma`
- Run `npx prisma migrate dev --name add_daily_wizard_run`
- Verify model created with `npx prisma studio`
- **Inputs**: schema.prisma, design.md (data model section)
- **Outputs**: New migration file, updated Prisma client
- **Verify**: `npx prisma studio` shows the new table
- **Depends on**: nothing

### T2: Wizard state API routes + service
- Create `server/services/wizardService.js` with: `getOrCreateToday()`, `updateRun()`, `completeRun()`, `getStreak()`, `getCalendarData()`
- Create `server/routes/admin/daily.js` with: `GET /today`, `PATCH /today`, `POST /today/complete`, `GET /streak`
- Register routes in Express app
- **Inputs**: design.md (backend architecture), schema from T1
- **Outputs**: wizardService.js, daily.js routes
- **Verify**: `curl` or Supertest: create run, update step, complete, verify streak
- **Depends on**: T1

### T3: Image edit service + routes
- Create `server/services/imageEditService.js` with: `editImage()`, `generateImage()`, `generateFilename()`, `generateMetadata()`
- Create `server/routes/admin/images.js` with: `POST /edit`, `POST /generate`
- Register routes in Express app
- Image editing: builds combined prompt (edit instructions + style + context) and calls `aiProviderService.generateImage()`
- Filename: `propertyhack-{type}-{market}-{slug}-{date}.{ext}`
- Metadata: alt text, keywords, title stored alongside image
- **Inputs**: design.md (image pipeline section), existing imageGenerationService.js, imagenService.js
- **Outputs**: imageEditService.js, images.js routes
- **Verify**: POST to /images/edit with a prompt returns a new image URL with proper filename
- **Depends on**: nothing

### T4: Metrics aggregation service + route
- Create `server/services/metricsService.js` with: `getAggregatedMetrics()`
- Pulls newsletter stats from `beehiivService.getPostStats()` for most recent SENT newsletter
- Pulls social stats from SocialPost records (yesterday's PUBLISHED posts, aggregate platformResults)
- Pulls website stats from Article view counts (sum of yesterday's views)
- Computes trend arrows (current vs previous period)
- Add `GET /api/admin/daily/metrics` to daily routes
- **Inputs**: design.md (metrics section), beehiivService.js, Prisma schema
- **Outputs**: metricsService.js, metrics route
- **Verify**: GET /metrics returns structured data with newsletter/social/website sections
- **Depends on**: T2 (routes file)

### T5: Hot take AI suggestion service + route
- Create `server/services/hotTakeService.js` with: `suggestTakes(articleId)`
- Fetches article content from DB
- Calls `aiProviderService.generateText()` with prompt requesting 3 angles (contrarian, data-driven, relatable)
- Parses response into `{ suggestions: [{ angle, text }] }`
- Add `POST /api/admin/daily/suggest-takes` to daily routes
- **Inputs**: design.md (hot take section), aiProviderService.js
- **Outputs**: hotTakeService.js, suggest-takes route
- **Verify**: POST with an article ID returns 3 suggestions with different angles
- **Depends on**: T2 (routes file)

### T6: Newsletter manual-send endpoint
- Add `POST /api/admin/newsletters/:id/send-manual` to existing newsletter routes
- Updates status to SENT, sets sentAt timestamp — does NOT call Beehiiv API
- Validates newsletter exists and is APPROVED
- **Inputs**: existing server/routes/admin/newsletters.js
- **Outputs**: Modified newsletters.js with new endpoint
- **Verify**: POST to /send-manual updates newsletter status without Beehiiv call
- **Depends on**: nothing

### T7: Modify image generation for proper naming + metadata
- Update `server/services/imageGenerationService.js`:
  - Add `generateFilename(type, market, slug, date)` function
  - Add `generateMetadata(title, keywords)` function
  - Modify `generateArticleImage()` to use descriptive filename + save alt text
- Update `server/services/imagenService.js`:
  - Modify newsletter hero image to use `propertyhack-newsletter-{jurisdiction}-{date}-hero.{ext}`
  - Add alt text generation for newsletter images
- **Inputs**: existing imageGenerationService.js, imagenService.js
- **Outputs**: Modified services with naming + metadata
- **Verify**: Generate an image; verify filename follows convention and alt text is set
- **Depends on**: nothing

## Phase 2: Frontend Wizard Shell

### T8: DailyWizard shell + WizardStepper components
- Create `components/admin/daily/DailyWizard.tsx` — shell component with step routing
- Create `components/admin/daily/WizardStepper.tsx` — 6-step progress bar
- Create `hooks/useDailyWizard.ts` — wizard state management hook (fetches/creates run, navigates steps, auto-saves)
- Add route `/admin/daily` in App.tsx
- Placeholder content for each step ("Step N: Coming soon")
- **Inputs**: design.md (frontend architecture), App.tsx, existing admin route structure
- **Outputs**: DailyWizard.tsx, WizardStepper.tsx, useDailyWizard.ts, App.tsx route
- **Verify**: Navigate to /admin/daily, see stepper with 6 steps, click through placeholders
- **Depends on**: T2

### T9: Shared ImageEditor component
- Create `components/admin/daily/ImageEditor.tsx`
- Three modes: preview (default), edit (text input + apply), upload (file input)
- Regenerate button calls `POST /api/admin/images/generate`
- Edit button opens prompt input, calls `POST /api/admin/images/edit`
- Upload button accepts file, uploads to existing image upload endpoint
- Loading spinner overlay during generation
- Props: `imageUrl`, `onImageChange`, `aspectRatio?`, `style?`
- **Inputs**: design.md (image editor section), image edit API from T3
- **Outputs**: ImageEditor.tsx
- **Verify**: Render with a test image, verify regenerate/edit/upload all trigger correct actions
- **Depends on**: T3

### T10: Shared CopyToClipboard component
- Create `components/shared/CopyToClipboard.tsx`
- Props: `content`, `label`, `format` ('text' | 'html'), `onCopied?`
- Uses `navigator.clipboard.writeText()` for text
- Uses `navigator.clipboard.write()` with `ClipboardItem` for HTML
- Shows "Copied ✓" state for 2 seconds
- Tracks "hasCopied" state (for checklist features)
- **Inputs**: design.md (clipboard section)
- **Outputs**: CopyToClipboard.tsx
- **Verify**: Render component, click copy, verify clipboard contains expected content
- **Depends on**: nothing

### T11: StreakCounter + CalendarView components
- Create `components/admin/daily/StreakCounter.tsx` — flame icon + streak number, gold when active
- Create `components/admin/daily/CalendarView.tsx` — mini month calendar with completion dots
- StreakCounter props: `streak`, `maxStreak`
- CalendarView props: `completedDates[]`, `month`, `year`
- Uses brand colors (gold for completed, grey for missed)
- **Inputs**: design.md (streak section), tailwind.config.js for brand colors
- **Outputs**: StreakCounter.tsx, CalendarView.tsx
- **Verify**: Render with test data, verify visual appearance
- **Depends on**: nothing

## Phase 3: Wizard Steps (Newsletter)

### T12: Step 1 — Newsletter Review
- Create `components/admin/daily/Step1_NewsletterReview.tsx`
- Fetches latest DRAFT newsletter for AU: `GET /api/admin/newsletters?jurisdiction=AU&status=DRAFT&limit=1`
- Reuses existing `NewsletterEditor` component for content editing
- Adds wrapper UI: section-level copy buttons (using CopyToClipboard), approve/skip buttons
- Integrates ImageEditor for hero image (regenerate, edit with prompt, upload)
- "No draft" state: shows message + "Generate Now" button (calls newsletter generation endpoint)
- Approve button: calls `POST /api/admin/newsletters/:id/approve`, updates wizard state, advances to Step 2
- **Inputs**: design.md (Step 1), NewsletterEditor.tsx, ImageEditor from T9, CopyToClipboard from T10
- **Outputs**: Step1_NewsletterReview.tsx
- **Verify**: Load wizard, see newsletter draft, edit text, edit image with prompt, copy section, approve
- **Depends on**: T8, T9, T10

### T13: Step 2 — Newsletter Send (Beehiiv Copy-Paste)
- Create `components/admin/daily/Step2_NewsletterSend.tsx`
- Checklist UI with 3 items:
  1. Subject line — copy button
  2. Hero image — download button (fetches image, triggers download with descriptive filename)
  3. Newsletter body — copy button (HTML format)
- Each item tracks copied/downloaded state
- Progress indicator: "2 of 3 items ready"
- "Open Beehiiv" button opens new tab
- "Mark as Sent" button: calls `POST /api/admin/newsletters/:id/send-manual`, advances to Step 3
- "Skip" button: advances without marking sent
- **Inputs**: design.md (Step 2), CopyToClipboard from T10, send-manual endpoint from T6
- **Outputs**: Step2_NewsletterSend.tsx
- **Verify**: See checklist, copy each item, verify "Copied ✓" states, mark as sent
- **Depends on**: T6, T8, T10

## Phase 4: Wizard Steps (Social)

### T14: Step 3 — Social Posts Review
- Create `components/admin/daily/Step3_SocialReview.tsx`
- Fetches today's DRAFT/PENDING_APPROVAL social posts
- Grid layout with cards showing: platform icon, text (truncated), image thumbnail, hashtags
- Platform filter tabs (All, Twitter, Instagram, Facebook)
- Per-card actions: approve, edit text (inline), edit image (ImageEditor), reject, regenerate
- Bulk approve toolbar: "Approve All" and "Approve Selected" (with checkboxes)
- Post count summary: "5 posts, 3 approved, 1 rejected"
- "Continue" button advances to Step 4 (requires at least 1 approved post, or skip)
- **Inputs**: design.md (Step 3), ImageEditor from T9, existing social post API
- **Outputs**: Step3_SocialReview.tsx
- **Verify**: See social post grid, filter by platform, approve/edit/reject posts, bulk approve
- **Depends on**: T8, T9

### T15: Step 4 — Hot Take Composer
- Create `components/admin/daily/Step4_HotTake.tsx`
- Shows top AU article (highest relevance score, published today) with title, summary, image
- "See more stories" expander for next 4-5 articles
- Text composer: large textarea with character counter (per-platform: 280/2200/63206)
- Platform selector: multi-select for which platforms to post on
- "Suggest Takes" button: calls `POST /api/admin/daily/suggest-takes`, shows 3 clickable suggestion cards
- Clicking a suggestion populates the textarea (user can then edit)
- ImageEditor for optional hot take image
- "Add to Queue" button: creates new SocialPost via `POST /api/admin/socialPosts`, advances to Step 5
- "Skip" advances without creating a post
- **Inputs**: design.md (Step 4), ImageEditor from T9, hot take API from T5
- **Outputs**: Step4_HotTake.tsx
- **Verify**: See top story, get AI suggestions, write hot take, generate image, add to queue
- **Depends on**: T5, T8, T9

## Phase 5: Wizard Steps (Publish + Metrics)

### T16: Step 5 — Schedule & Publish
- Create `components/admin/daily/Step5_Publish.tsx`
- Fetches all SCHEDULED social posts for today
- Vertical timeline layout ordered by scheduledFor time
- Each entry: time, platform icon, text preview, image thumbnail, status badge
- Newsletter shown at top: "Newsletter sent ✓" or "Newsletter skipped"
- Per-post time picker for scheduling
- Auto-suggest posting times: spread evenly 9am-6pm AEST with min gap from SocialConfig
- "Publish Now" and "Schedule" buttons per post
- "Copy to Clipboard" fallback for unconnected platforms (text + image download)
- "Publish All" button: schedules/publishes all at once
- Status tracking: queued → publishing → published (poll or optimistic update)
- "Continue" button advances to Step 6
- **Inputs**: design.md (Step 5), social post APIs, SocialConfig for timing rules
- **Outputs**: Step5_Publish.tsx
- **Verify**: See timeline of posts, adjust times, publish/schedule, see status updates
- **Depends on**: T8

### T17: Step 6 — Metrics + Completion
- Create `components/admin/daily/Step6_Metrics.tsx`
- Fetches metrics via `GET /api/admin/daily/metrics`
- Three cards:
  - Newsletter: open rate, click rate, subscriber count, top clicked articles
  - Social: per-platform reach/engagement/followers with trends
  - Website: visits, top articles, new email signups
- Trend arrows (↑ green, ↓ red, → grey) vs previous period
- "No data" states for missing metrics (e.g., no newsletter sent yesterday)
- StreakCounter component showing current streak
- CalendarView showing current month with completion dots
- "Complete Today's Run" button: calls `POST /api/admin/daily/today/complete`, shows success state
- **Inputs**: design.md (Step 6), metrics API from T4, StreakCounter + CalendarView from T11
- **Outputs**: Step6_Metrics.tsx
- **Verify**: See metrics cards, trend arrows, streak, calendar. Complete run, verify streak updates.
- **Depends on**: T4, T8, T11

## Phase 6: Integration & Polish

### T18: Dashboard CTA + sidebar nav
- Modify `components/admin/IngestionMonitor.tsx`:
  - Add "Start Today's Run" card (gold accent) when today's run is incomplete
  - Add "Today's Run Complete ✓" card with streak when done
  - Fetch today's run status via `GET /api/admin/daily/today`
- Modify `components/layout/AdminLayout.tsx`:
  - Add "Daily Run" as first sidebar nav item (above Dashboard)
  - Gold highlight when today's run is incomplete
- **Inputs**: design.md (dashboard/sidebar section), wizard API from T2
- **Outputs**: Modified IngestionMonitor.tsx, modified AdminLayout.tsx
- **Verify**: Dashboard shows CTA, sidebar shows Daily Run link, both reflect completion state
- **Depends on**: T2, T8

### T19: Wizard state persistence + resume
- Enhance `useDailyWizard` hook:
  - On mount: fetch today's run, if incomplete resume from `currentStep`
  - Auto-save state changes to backend (debounced 2s)
  - Handle edge cases: run already complete (show completion summary), no run yet (create)
  - Save on step transitions and approval actions
  - Handle network errors gracefully (retry, show toast)
- Test resume flow: start wizard, close tab, reopen, verify correct step loads
- **Inputs**: useDailyWizard.ts from T8, wizard API from T2
- **Outputs**: Enhanced useDailyWizard.ts
- **Verify**: Start wizard, advance to step 3, close browser, reopen, verify resumes at step 3
- **Depends on**: T2, T8

### T20: End-to-end walkthrough test
- Create E2E test or manual test script that walks through the full wizard:
  1. Open /admin/daily
  2. Step 1: Review newsletter, edit image, copy sections, approve
  3. Step 2: Copy subject/body/image, mark sent
  4. Step 3: Review social posts, approve 3, reject 1
  5. Step 4: Write hot take, use AI suggestion, generate image, add to queue
  6. Step 5: Schedule all posts, verify timeline
  7. Step 6: Check metrics, complete run, verify streak
- Fix any integration issues found
- **Inputs**: All previous tasks complete
- **Outputs**: Working end-to-end wizard
- **Verify**: Full walkthrough completes without errors
- **Depends on**: T12-T19

## Dependency Graph

```
Phase 1 (Backend):
  T1 ─────→ T2 ─────→ T4, T5
  T3 (independent)
  T6 (independent)
  T7 (independent)

Phase 2 (Shell):
  T2 ──────→ T8
  T3 ──────→ T9
  T10 (independent)
  T11 (independent)

Phase 3 (Newsletter):
  T8, T9, T10 ──→ T12
  T6, T8, T10 ──→ T13

Phase 4 (Social):
  T8, T9 ────────→ T14
  T5, T8, T9 ───→ T15

Phase 5 (Publish + Metrics):
  T8 ─────────────→ T16
  T4, T8, T11 ──→ T17

Phase 6 (Integration):
  T2, T8 ────────→ T18
  T2, T8 ────────→ T19
  T12-T19 ───────→ T20
```

## Parallelism

**Wave 1** (all independent): T1, T3, T6, T7, T10, T11
**Wave 2** (needs T1): T2
**Wave 3** (needs T2, T3): T4, T5, T8, T9
**Wave 4** (needs T8, T9, T10, etc.): T12, T13, T14, T15
**Wave 5** (needs T8, etc.): T16, T17, T18, T19
**Wave 6** (needs everything): T20
