# Spec: Daily Ops Wizard

## Overview

A guided step-by-step wizard at `/admin/daily` that walks the founder through the complete daily content operations routine. The wizard wraps existing admin functionality (newsletter editing, social post management, image generation) into a linear flow optimised for a 30-minute daily session.

## Personas

### Founder/Operator (Dan)
- Non-technical, uses the admin panel daily
- Needs a predictable routine that fits around other work
- Wants to review AI-generated content, apply editorial judgment, and publish
- Copy-pastes newsletter content into Beehiiv (to use their ad network)
- Posts to social accounts (initially 1 per platform: Instagram, Twitter, Facebook)

## Features

### F1: Wizard Shell & Navigation

The wizard is a full-page view at `/admin/daily` with:

**F1.1: Stepper Progress Bar**
- Horizontal stepper showing all 6 steps with labels and completion state
- Steps: Newsletter Review → Newsletter Send → Social Posts → Hot Take → Publish → Metrics
- Current step highlighted, completed steps show checkmark, future steps greyed
- Click any completed or current step to navigate (can't skip ahead to unvisited steps)
- Back button on each step returns to previous

**F1.2: Wizard State Persistence**
- Wizard state (current step, approvals, edits) saved to `DailyWizardRun` record
- On page load: if today's run exists and is incomplete, resume from last step
- If today's run is complete, show completion summary with option to redo
- State saved on every step transition and every approval action

**F1.3: Dashboard Integration**
- Admin dashboard (`/admin`) shows a "Start Today's Run" CTA card when today's wizard is not yet complete
- Shows "Today's Run Complete ✓" with streak info when done
- CTA links to `/admin/daily`
- Sidebar nav gets a "Daily Run" item pinned at the top (above Dashboard)

**Acceptance Criteria:**
- [ ] Stepper renders 6 steps with correct labels
- [ ] Navigation between completed steps works (forward and back)
- [ ] Can't skip to a step that hasn't been reached yet
- [ ] Wizard state persists across page refreshes and browser sessions
- [ ] Dashboard shows appropriate CTA based on today's completion status
- [ ] "Daily Run" appears in sidebar nav

### F2: Step 1 — Newsletter Review

Displays today's most recent AI-generated newsletter draft for the operator's primary jurisdiction (AU).

**F2.1: Newsletter Selection**
- Auto-loads the latest DRAFT newsletter for AU jurisdiction
- If no draft exists, shows "No newsletter draft for today" with a "Generate Now" button
- Shows newsletter metadata: jurisdiction, cadence, generated timestamp, article count

**F2.2: Content Review & Editing**
- Subject line displayed as an editable text input
- Newsletter body shown in the existing TipTap rich text editor (reuse `NewsletterEditor` component)
- Each section of the newsletter is visually separated with section headers
- Section-level actions: edit, remove section, reorder
- Global "Property Pulse" summary textarea (if present)
- Referenced articles panel showing which articles are included

**F2.3: Newsletter Image Review**
- Hero image displayed prominently above the newsletter content
- Three image actions:
  - **Regenerate**: generates a completely new image with the original prompt
  - **Edit with prompt**: opens a text input where the user describes changes. The image is regenerated with the original prompt + user's edit instructions appended
  - **Upload**: manual image upload as fallback
- All generated images use the retro camera film aesthetic (15 styles from existing `imageGenerationService`)
- Image preview updates in-place after regeneration

**F2.4: Copy-to-Clipboard (Beehiiv)**
- "Copy Subject" button — copies subject line to clipboard
- "Copy All Content" button — copies the full newsletter HTML to clipboard
- Per-section "Copy" buttons — copies individual section HTML
- "Download Hero Image" button — downloads the hero image with a proper filename:
  - Format: `propertyhack-newsletter-{jurisdiction}-{date}-hero.{ext}`
  - Example: `propertyhack-newsletter-au-2026-03-21-hero.png`
- Copy confirmation toast ("Copied to clipboard!")

**F2.5: Approval**
- "Approve Newsletter" button at bottom of step
- Approval updates the `NewsletterDraft` status from DRAFT to APPROVED
- Advances wizard to Step 2
- Can also "Skip" if no newsletter this session (e.g., not newsletter day)

**Acceptance Criteria:**
- [ ] Latest AU draft newsletter loads automatically
- [ ] Subject line is editable inline
- [ ] TipTap editor allows full content editing
- [ ] Hero image displays with regenerate, edit-with-prompt, and upload options
- [ ] Image regeneration with prompt produces a new image in retro film style
- [ ] Copy-to-clipboard works for subject, full content, and individual sections
- [ ] Hero image downloads with descriptive filename
- [ ] Approve button updates newsletter status and advances to Step 2
- [ ] Skip button advances without approving

### F3: Step 2 — Newsletter Send (Copy-Paste to Beehiiv)

A focused "send checklist" step that guides the copy-paste workflow into Beehiiv.

**F3.1: Send Checklist**
- Visual checklist of items to copy into Beehiiv:
  1. ☐ Subject line (with copy button + "Copied ✓" state)
  2. ☐ Hero image (with download button + "Downloaded ✓" state)
  3. ☐ Newsletter body (with copy button + "Copied ✓" state)
- Each item tracks whether it's been copied/downloaded this session
- Progress indicator: "2 of 3 items ready"

**F3.2: Beehiiv Quick Link**
- "Open Beehiiv Editor" button — opens Beehiiv dashboard in a new tab
- Shows subscriber count for the target jurisdiction (fetched from Beehiiv API or local DB)
- Reminder text: "Paste content into Beehiiv, then come back and mark as sent"

**F3.3: Mark as Sent**
- "Mark Newsletter as Sent" button (enabled only after all checklist items are checked)
- Updates `NewsletterDraft` status to SENT and sets `sentAt` timestamp
- Advances to Step 3
- Can also "Skip" if newsletter was already sent or not applicable

**Acceptance Criteria:**
- [ ] Checklist shows subject, hero image, and body with individual copy/download buttons
- [ ] Each item shows "Copied ✓" / "Downloaded ✓" state after action
- [ ] Beehiiv opens in new tab
- [ ] Subscriber count displays
- [ ] "Mark as Sent" updates newsletter status
- [ ] Skip button available

### F4: Step 3 — Social Posts Review

Grid view of AI-generated social posts for today's top stories.

**F4.1: Post Grid**
- Shows all social posts with status DRAFT or PENDING_APPROVAL created today
- Card layout: each card shows platform icon(s), text content (truncated), image thumbnail, hashtags
- Filter by platform (All, Twitter, Instagram, Facebook)
- Sort by article relevance score (highest first)

**F4.2: Per-Post Actions**
- **Approve**: moves post to PENDING_APPROVAL → SCHEDULED status
- **Edit text**: inline text editing with character count per platform
- **Edit image**: same prompt-based editing as newsletter (regenerate, edit with prompt, upload)
- **Reject**: sets status to DRAFT with a "rejected" flag (hidden from future wizard runs)
- **Regenerate**: generates entirely new post content + image for the same article

**F4.3: Bulk Actions**
- "Approve All" button — approves all visible posts at once
- "Approve Selected" — checkbox per card, approve checked ones
- Post count summary: "5 posts ready, 2 approved, 1 rejected"

**F4.4: Image Generation & Editing**
- Each social post can have an AI-generated image
- Image uses the same retro camera film aesthetic as article images
- Prompt-based editing: user types "make it warmer" or "switch to Fuji Velvia" and image regenerates
- Platform-specific aspect ratios:
  - Instagram: 1:1 (1080x1080)
  - Twitter: 16:9 (1200x675)
  - Facebook: 16:9 (1200x630)
- Image filename format: `propertyhack-social-{platform}-{slug}-{date}.{ext}`
- Images saved with alt text and keywords in metadata

**F4.5: Advance**
- "Continue" button (available once at least 1 post is approved)
- Shows count: "3 posts approved, ready to schedule"
- Advances to Step 4

**Acceptance Criteria:**
- [ ] Grid displays today's draft/pending social posts
- [ ] Platform filter works
- [ ] Approve, edit, reject, regenerate all work per-post
- [ ] Bulk approve works
- [ ] Image editing with prompts generates new images in retro film style
- [ ] Platform-specific aspect ratios applied
- [ ] Images have descriptive filenames and alt text
- [ ] Continue button shows approved count and advances

### F5: Step 4 — Hot Take / Commentary

Original content creation step where the founder writes a daily opinion piece.

**F5.1: Story Context**
- Shows today's biggest AU property story (highest relevance score, most recent)
- Article title, summary, source, and image displayed as context
- "See more stories" expander showing the next 4-5 top stories

**F5.2: Commentary Composer**
- Large text input for writing the hot take
- Character counter (280 for Twitter, 2200 for Instagram, 63206 for Facebook)
- Platform selector: which platforms to post this on (multi-select)

**F5.3: AI Assist**
- "Suggest Takes" button generates 3 different commentary angles using AI:
  - A contrarian take
  - A data-driven observation
  - A relatable/personal angle
- Each suggestion is a clickable card — clicking it populates the text input
- User can then edit the suggestion as a starting point

**F5.4: Image Generation**
- "Generate Image" button creates an image for the hot take
- Uses the same retro camera film aesthetic
- Prompt is derived from the commentary text + the referenced article
- Same edit-with-prompt, regenerate, upload options as other steps
- Platform-appropriate aspect ratio based on selected platforms

**F5.5: Add to Queue**
- "Add to Queue" button saves the hot take as a new SocialPost record
- Links to the referenced article (if applicable)
- Status set to SCHEDULED
- Advances to Step 5
- "Skip" if no hot take today

**Acceptance Criteria:**
- [ ] Top AU story displayed with summary
- [ ] Text composer with character count per platform
- [ ] AI suggest generates 3 different angles
- [ ] Clicking a suggestion populates the composer
- [ ] Image generation works with prompt editing
- [ ] "Add to Queue" creates a SocialPost record
- [ ] Skip advances without creating a post

### F6: Step 5 — Schedule & Publish

Timeline view of all approved content ready to go out.

**F6.1: Content Timeline**
- Vertical timeline showing all approved social posts (from Step 3 + Step 4) ordered by scheduled time
- Each entry shows: time, platform icon, text preview, image thumbnail, status
- Newsletter shown at the top as "Already sent ✓" (or "Skipped" if skipped)

**F6.2: Scheduling**
- Each post has a time picker for scheduling
- Auto-suggested times: spread posts evenly across the day (9am-6pm AEST) with minimum gap from SocialConfig.minPostGapMins
- Drag-and-drop reordering changes scheduled times

**F6.3: Publishing Actions**
- Per-post: "Publish Now" (immediate) or "Schedule" (at set time)
- For platforms with connected accounts: publishes via the existing social publishing pipeline
- For platforms without connected accounts: "Copy to Clipboard" button with formatted text + "Download Image" button
- "Publish All" button — schedules/publishes all posts at once

**F6.4: Status Tracking**
- Real-time status updates as posts publish (queued → publishing → published)
- Failed posts show error with "Retry" button
- "All Published ✓" summary when everything is out

**Acceptance Criteria:**
- [ ] Timeline displays all approved posts with scheduling
- [ ] Auto-suggested times spread posts across the day
- [ ] Publish Now and Schedule both work
- [ ] Copy-to-clipboard available for unconnected platforms
- [ ] Publish All works for batch publishing
- [ ] Status updates in real-time

### F7: Step 6 — Yesterday's Metrics

Quick metrics dashboard showing how yesterday's content performed.

**F7.1: Newsletter Metrics**
- Open rate (with trend arrow vs previous send)
- Click rate (with trend arrow)
- Subscriber count (with net change)
- Top 3 clicked articles
- Data source: Beehiiv API (getPostStats) or cached locally

**F7.2: Social Metrics**
- Per-platform summary: reach, engagement (likes + comments + shares), new followers
- Trend arrows vs previous day
- Top performing post with engagement count
- Data source: platform APIs where connected, manual entry otherwise

**F7.3: Website Metrics**
- Total visits (with trend arrow)
- Top 3 visited articles
- New email signups
- Data source: basic analytics (could be Cloudflare Analytics API or simple page view counter)

**F7.4: Completion**
- "Complete Today's Run" button marks the DailyWizardRun as complete
- Shows streak counter: "🔥 5 day streak!"
- Shows calendar mini-view of the current month with completed days highlighted
- Advances to a completion summary

**Acceptance Criteria:**
- [ ] Newsletter metrics display (or "No data" if no newsletter sent yesterday)
- [ ] Social metrics display per platform
- [ ] Website metrics display
- [ ] Trend arrows show direction vs previous period
- [ ] "Complete" button marks run as done
- [ ] Streak counter and calendar display correctly

### F8: Image Pipeline Enhancements

Shared image generation and editing capabilities used across all wizard steps.

**F8.1: Prompt-Based Image Editing**
- New API endpoint: `POST /api/admin/images/edit`
- Accepts: original image URL + edit prompt + style parameters
- Generates a new image incorporating the edit instructions
- Maintains the retro camera film aesthetic from the original
- Returns the new image URL

**F8.2: Image Naming Convention**
- All wizard-generated images follow the pattern:
  - Newsletter: `propertyhack-newsletter-{jurisdiction}-{YYYY-MM-DD}-hero.{ext}`
  - Social: `propertyhack-social-{platform}-{slug}-{YYYY-MM-DD}.{ext}`
  - Hot take: `propertyhack-hottake-{slug}-{YYYY-MM-DD}.{ext}`
- Slug derived from article title or newsletter subject (lowercase, hyphens, max 50 chars)

**F8.3: Image Metadata**
- All generated images include:
  - `alt` text: AI-generated description of the image content
  - Keywords: derived from article keywords + market
  - Title: article title or newsletter subject
- Metadata stored in the database alongside the image URL
- Download filenames use the naming convention above (not random UUIDs)

**F8.4: Aspect Ratio Support**
- Images generated at platform-appropriate dimensions:
  - Newsletter hero: 1200x630 (landscape)
  - Instagram: 1080x1080 (square)
  - Twitter: 1200x675 (landscape)
  - Facebook: 1200x630 (landscape)
  - Stories: 1080x1920 (portrait) — deferred for v1
- Aspect ratio parameter passed to image generation service

**Acceptance Criteria:**
- [ ] Edit endpoint accepts original URL + prompt and returns new image
- [ ] All generated images follow naming convention
- [ ] Images have alt text, keywords, and title metadata
- [ ] Downloads use descriptive filenames
- [ ] Platform-specific aspect ratios are applied

### F9: Streak Tracking & Completion

**F9.1: DailyWizardRun Model**
- Tracks each day's wizard progress
- Fields: date, currentStep, stepsCompleted (JSON array), newsletterApproved, socialPostsApproved (count), hotTakeCreated, allPublished, metricsReviewed, completedAt, streakDay

**F9.2: Streak Counter**
- Counts consecutive days with a completed wizard run
- Resets to 0 if a weekday is missed (weekends don't break the streak)
- Displayed on the metrics step and on the admin dashboard

**F9.3: Calendar View**
- Mini calendar showing the current month
- Green dots for completed days, grey for missed weekdays, no dot for weekends
- Displayed on the admin dashboard and the final wizard step

**Acceptance Criteria:**
- [ ] DailyWizardRun created when wizard starts, updated at each step
- [ ] Streak counts consecutive weekday completions
- [ ] Weekends don't break streaks
- [ ] Calendar view renders correctly with completion dots

## Data Model

### New Model: DailyWizardRun

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

### Modified: Image metadata

Add to the image generation pipeline (not a schema change — metadata stored as part of the image record or in R2 object metadata):
- `altText`: AI-generated image description
- `keywords`: array of SEO keywords
- `title`: source article/newsletter title
- `filename`: descriptive filename following naming convention

## API Endpoints

### Wizard State
- `GET /api/admin/daily/today` — get or create today's DailyWizardRun
- `PATCH /api/admin/daily/today` — update wizard state (current step, approvals, etc.)
- `POST /api/admin/daily/today/complete` — mark today's run as complete
- `GET /api/admin/daily/streak` — get current streak count + calendar data

### Image Editing
- `POST /api/admin/images/edit` — generate edited image from prompt
  - Body: `{ imageUrl, editPrompt, style, aspectRatio }`
  - Returns: `{ imageUrl, altText, filename }`
- `POST /api/admin/images/generate` — generate new image from scratch
  - Body: `{ prompt, style, aspectRatio, context }`
  - Returns: `{ imageUrl, altText, filename }`

### Metrics Aggregation
- `GET /api/admin/daily/metrics` — aggregated metrics for the metrics step
  - Returns: newsletter stats (from Beehiiv), social stats (from platform APIs), website stats
  - Includes trend comparisons vs previous period

### AI Assist (Hot Take)
- `POST /api/admin/daily/suggest-takes` — generate 3 commentary angles
  - Body: `{ articleId }`
  - Returns: `{ suggestions: [{ angle, text }] }`

### Existing Endpoints Used (no changes needed)
- `GET /api/admin/newsletters` — list drafts
- `PUT /api/admin/newsletters/:id` — update newsletter content
- `POST /api/admin/newsletters/:id/approve` — approve newsletter
- `GET /api/admin/socialPosts` — list social posts
- `POST /api/admin/socialPosts/:id/approve` — approve social post
- `PUT /api/admin/socialPosts/:id` — update social post
- `POST /api/admin/socialPosts` — create new social post (for hot take)

## Non-Functional Requirements

- Wizard page load time: <2 seconds including newsletter content
- Image generation: <15 seconds per image (existing baseline)
- Image editing with prompt: <15 seconds
- Copy-to-clipboard: instant, works across browsers
- Wizard state save: debounced, every 5 seconds during editing
- Mobile-responsive: the wizard should work on tablet (not optimised for phone)
