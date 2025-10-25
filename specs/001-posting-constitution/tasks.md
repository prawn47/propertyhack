# Tasks: Posting Constitution

**Input**: Design documents from `/specs/001-posting-constitution/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: The user requested that each task be small and verified before proceeding. Include a brief manual QA/smoke step after key increments.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure local environment and dependencies are ready

- [X] T001 Create env files from `DEPLOYMENT.md` in `server/.env` and `./.env.local`
- [X] T002 [P] Install dependencies in root and server (`/Users/dan/Projects/quord_g0/package.json`, `/Users/dan/Projects/quord_g0/server/package.json`)
- [X] T003 [P] Generate Prisma client (`/Users/dan/Projects/quord_g0/server/prisma/schema.prisma`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Minimal data and contract scaffolding for scheduling and types

- [X] T004 Add `ScheduledPost` model to `server/prisma/schema.prisma` per data-model.md
- [X] T005 Run migration and update generated client in `server/prisma/`
- [X] T006 Add ScheduledPost type to `./types.ts` (align with schema fields)
- [X] T007 Scaffold server routes for scheduled posts in `server/routes/api.js` (no logic yet)
- [X] T008 [P] Add placeholder UI section for "Scheduled" list in `components/DashboardSection.tsx`
- [X] T009 [P] Verify app boots and navigates (smoke) using `specs/001-posting-constitution/quickstart.md`

**Checkpoint**: Foundation ready - proceed to US1 only after app remains stable

---

## Phase 3: User Story 1 - Create and publish a LinkedIn post (Priority: P1) 🎯 MVP

**Goal**: Idea → Draft → Edit → Publish now OR Schedule; store publish history

**Independent Test**: New user can authenticate, create draft, publish now, and see it in history; or schedule and see in upcoming list

### Implementation

- [X] T010 [US1] Add "Schedule" button in editor `components/PostCreationWizard.tsx`
- [X] T011 [US1] Create client scheduler API in `services/linkedInService.ts` or new `services/schedulingService.ts` (POST/GET/PATCH/DELETE /posts/scheduled)
- [X] T012 [US1] Implement POST `/posts/scheduled` in `server/routes/api.js` (create ScheduledPost)
- [X] T013 [US1] Implement GET `/posts/scheduled` in `server/routes/api.js` (list by user)
- [X] T014 [US1] Implement PATCH `/posts/scheduled/:id` in `server/routes/api.js` (reschedule)
- [X] T015 [US1] Implement DELETE `/posts/scheduled/:id` in `server/routes/api.js` (cancel)
- [X] T016 [US1] Render upcoming scheduled list in `components/DashboardSection.tsx` with reschedule/cancel actions
- [X] T017 [US1] Fix/complete LinkedIn publish flow in `services/linkedInService.ts` (finalize fetch request + error handling)
- [X] T018 [US1] Ensure publish-now persists history via `services/dbService.ts` and server API
- [X] T019 [US1] Manual QA: Idea → Draft → Publish now; verify UI + DB (check `server/prisma/dev.db`)
- [X] T020 [US1] Manual QA: Draft → Schedule; verify appears in "Scheduled"; cancel/reschedule flows
- [X] T021 [US1] Wire idea generation endpoint usage in `components/ContentGenerator.tsx` and verify at least 3 ideas
- [X] T022 [US1] Wire draft generation from idea in `components/PostCreationWizard.tsx` using `services/geminiService.ts`
- [X] T023 [US1] Verify draft editing in `components/DraftEditor.tsx` (title/body) persists to local state
- [X] T024 [US1] Implement draft save/load in `services/dbService.ts` and UI to resume editing
- [X] T025 [US1] Failure preservation QA: simulate publish failure and verify draft remains intact
- [X] T043 [US1] Ensure saved drafts appear persistently on dashboard in `components/DashboardSection.tsx` (state refresh/refetch)
- [X] T044 [US1] Fix draft save/update detection in `services/dbService.ts` (use server-assigned id; remove brittle date check)
- [X] T045 [US1] Add Delete action in drafts list in `components/DashboardSection.tsx` (confirm modal)
- [X] T046 [US1] Wire Delete to `deleteDraft()` and `/api/posts/drafts/:id` in `server/routes/api.js`
- [X] T047 [US1] Add "Edit Image with AI" action in `components/DraftEditor.tsx` next to Replace image
- [X] T048 [US1] Implement `editDraftImageWithAI()` in `services/geminiService.ts` (accept existing or uploaded image)
- [X] T049 [US1] Apply AI edits to user-uploaded images (ensure upload → base64 pipeline supports editing)
- [X] T050 [US1] Persist edited image to `DraftPost.imageUrl` via `services/dbService.ts` and refresh editor/preview
- [X] T051 [US1] Manual QA: Save draft → visible on dashboard; delete draft works; AI image edit works for uploaded images

**Checkpoint**: US1 fully functional and independently testable; no regressions from Phase 1–2

---

## Phase 4: User Story 2 - Build consistency via gentle gamification (Priority: P2)

**Goal**: Visible streaks and weekly target; gentle prompt at preferred time

**Independent Test**: Streak increments on daily publish; weekly progress visible; prompt appears after preferred time if no post today

### Implementation

- [X] T026 [US2] Add derived streak endpoint `/stats/streak` in `server/routes/api.js` (calculate from `PublishedPost`)
- [X] T027 [US2] Display streak + weekly target in `components/DashboardSection.tsx`
- [X] T028 [US2] Add preferred-time prompt in `App.tsx` using `UserSettings.preferredTime`
- [X] T029 [US2] Manual QA: Publish on consecutive days; verify streak/weekly progress; verify prompt timing

**Checkpoint**: US2 independently functional; no regressions in US1 flows

---

## Phase 5: User Story 3 - Support X.com thought leadership workflow (Priority: P3)

**Goal**: Manual, guided prep for X with character guidance and concise rewrite

**Independent Test**: User can prepare a concise X version with character guidance and complete posting manually

### Implementation

- [X] T030 [US3] Add "Prepare for X" action in `components/PostCreationWizard.tsx`
- [X] T031 [US3] Implement character counter + limit guidance in `components/DraftEditor.tsx`
- [X] T032 [US3] Add `generateConciseForX()` in `services/geminiService.ts` (concise rewrite)
- [X] T033 [US3] Add guided-completion UI (copy to clipboard/open X) in `components/PostCreationWizard.tsx`
- [X] T034 [US3] Manual QA: Prepare for X → verify character guidance and concise output → complete posting manually

**Checkpoint**: US3 independently functional; no regressions in US1–US2

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Aesthetic, accessibility, and documentation improvements

- [ ] T035 Implement scheduled execution path: at time, attempt auto-publish or show in-app prompt (FR-018)
- [ ] T036 Auth smoke QA: login, token redirect, and refresh behavior across `components/OAuthCallback.tsx` and `services/authService.ts`
- [ ] T037 Settings update QA: update `SettingsPanel.tsx` values (tone, preferredTime) and verify persistence
- [ ] T038 Policy guardrail: review copy in X flow to avoid implying automation; add label/tooltips in `PostCreationWizard.tsx`
- [ ] T039 [P] Update `specs/001-posting-constitution/quickstart.md` with scheduling and X steps
- [ ] T040 UI polish pass (spacing/typography) in `components/*`
- [ ] T041 Accessibility sweep (focus states/ARIA) in `components/*`
- [X] T042 LinkedIn OAuth integration: Update scope for posting permissions, store access tokens in database
- [X] T043 LinkedIn connection UI: Add connection status display and management in Settings
- [X] T044 LinkedIn token storage: Store and manage LinkedIn access tokens with expiry
- [X] T045 LinkedIn permissions: Update OAuth scope to include `w_member_social` for posting
- [ ] T046 [P] Create smoke checklist `specs/001-posting-constitution/smoke.md` for release validation

---

## Dependencies & Execution Order

### Phase Dependencies
- Setup → Foundational → US1 → US2 → US3 → Polish

### User Story Dependencies
- US1 has no dependency on other stories
- US2 depends on Foundational; should not break US1
- US3 depends on Foundational; should not break US1–US2

### Within Each User Story
- Manual QA follows after implementation tasks
- Keep edits localized; avoid cross-story coupling

### Parallel Opportunities
- T002 and T003 can run in parallel
- T008 and T009 can run in parallel
- Within US1, server route implementations (T012–T015) can be parallelized by different devs

---

## Implementation Strategy

### MVP First (US1)
1. Complete Setup + Foundational
2. Complete US1 (include scheduling)
3. Validate end-to-end and stabilize

### Incremental Delivery
- Proceed to US2 only after US1 passes manual QA and app remains stable
- Proceed to US3 only after US2 passes manual QA
