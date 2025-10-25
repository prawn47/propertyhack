# Feature Specification: Posting Constitution

**Feature Branch**: `001-posting-constitution`  
**Created**: 2025-10-24  
**Status**: Draft  
**Input**: User description: "We are building a LinkedIn posting app that prompts people to post and gamifies being consistent on LinkedIn. It also functions with X.com to help people become thought leaders on X. We have built up the framework for the app which is currently in the codebase. Please review this codebase and create a constitution based upon it. We would like to keep the application as simple as possible, and the styling absolutely beautiful."

## User Scenarios & Testing (mandatory)

### User Story 1 - Create and publish a LinkedIn post (Priority: P1)

Users can generate a post idea, turn it into a well-structured draft, lightly edit, and publish to LinkedIn — all in one focused flow.

**Why this priority**: This is the core value: help users consistently publish high-quality posts on LinkedIn with minimal friction.

**Independent Test**: A new user can authenticate, generate a draft from a topic, edit it, and publish to LinkedIn, with the post recorded in their history.

**Acceptance Scenarios**:
1. Given an authenticated user with default profile settings, When they enter a topic and request ideas, Then they receive at least 3 usable post ideas.
2. Given an authenticated user with selected idea, When they generate a draft, Then they receive a titled draft with scannable paragraphs and a clear CTA.
3. Given an editable draft, When the user edits title/body and chooses Publish, Then the post is published to LinkedIn and saved to their published list.
4. Given a publish attempt fails, When an error occurs, Then the user sees a helpful message and the draft remains editable (not lost).
5. Given an editable draft, When the user chooses Schedule and selects a date/time, Then the post is scheduled and visible in an upcoming list; at the scheduled time it is published automatically or prompts completion if manual action is required by platform policy.

---

### User Story 2 - Build consistency via gentle gamification (Priority: P2)

Users are prompted to maintain a posting habit with a daily nudge, visible streaks, and a simple progress target per week.

**Why this priority**: Consistency compounds reach. Light-weight gamification increases posting frequency without adding complexity.

**Independent Test**: A user sees their current streak and weekly target, receives a soft prompt if they haven’t posted today, and streak updates when they publish.

**Acceptance Scenarios**:
1. Given a user has posted today, When they view their dashboard, Then they see streak incremented and weekly progress updated.
2. Given a user has not posted by the preferred time, When the time passes, Then the app presents a non-intrusive prompt to create a post.
3. Given a user breaks a streak, When they return, Then the app shows the last streak, resets current streak, and encourages restarting.

---

### User Story 3 - Support X.com thought leadership workflow (Priority: P3)

Users adapt drafts for X and complete posting with minimal friction, including character guidance and formatting assistance.

**Why this priority**: Cross-posting expands reach. Start simple with a manual-but-streamlined flow that respects platform constraints.

**Independent Test**: A user can take a draft, see character guidance for X, and successfully complete posting to X via a streamlined flow.

**Acceptance Scenarios**:
1. Given a finalized draft, When the user selects "Prepare for X", Then the app provides character guidance and a concise version.
2. Given a prepared X version, When the user proceeds, Then they can complete posting to X through a manual, guided flow.
3. Given an X preparation exceeds limits, When validation runs, Then the app suggests a compliant shortened version.

---

### Edge Cases

- Authentication fails or token expires mid-flow → user is safely returned to login and unsaved work is preserved.
- Publishing to LinkedIn fails (rate limits, permissions) → friendly error, draft remains editable, no duplicate records.
- Scheduled publish time arrives during outage → item remains scheduled with a visible status and retry guidance; user can manually publish.
- Scheduled publish requires manual action by policy → user receives an in-app prompt at scheduled time to complete publishing.
- Content generation unavailable (quota, outage) → graceful fallback with retry and manual draft option.
- User with no settings/profile examples → sensible defaults applied without blocking.
- Network interruptions during publish → retry guidance and idempotent save behavior to avoid duplicates.

## Requirements (mandatory)

### Functional Requirements

- FR-001: Users MUST authenticate to access posting and generation features.
- FR-002: Users MUST be able to view and update personal posting preferences (voice, industry, goals, keywords, examples, preferred time).
- FR-003: The system MUST generate at least 3 post ideas given a topic input.
- FR-004: The system MUST generate a complete draft (title + body) from a selected idea aligned to the user’s preferences.
- FR-005: Users MUST be able to edit the generated draft (title/body) before publishing.
- FR-006: Users MUST be able to publish a draft to LinkedIn and receive confirmation of success.
- FR-007: The system MUST store published posts in the user’s history with timestamp and content snapshot.
- FR-008: The system MUST allow saving drafts and returning to them later for editing and publishing.
- FR-009: The system MUST provide clear error messaging and preserve user work on failures.
- FR-010: The system MUST surface light-weight gamification: daily streak count and weekly posting target progress.
- FR-011: The system MUST nudge users at their preferred time if they haven’t posted that day (non-intrusive prompt within the app experience).
- FR-012: The system MUST provide an X preparation flow with character guidance and concise formatting suggestions.
- FR-013: The system MUST avoid platform policy violations by not implying automated posting where prohibited; guidance and manual completion flows are acceptable.
- FR-014: The system MUST present a minimal, elegant UI that emphasizes clarity, whitespace, and scannability.
- FR-015: X.com support in v1 MUST be manual, guided posting only; automated posting is explicitly out-of-scope for v1 and documented on the roadmap.
- FR-016: Users MUST be able to schedule a LinkedIn post for a future date/time in their selected time zone.
- FR-017: Users MUST be able to view, edit (reschedule), and cancel upcoming scheduled posts.
- FR-018: At the scheduled time, the system MUST either (a) publish the scheduled post automatically when permitted, recording the result in history, or (b) present a prominent in-app prompt to complete publishing manually when platform policy requires user action. The system MUST update scheduled status accordingly.
  
  NOTE (v1): Scheduled execution will use an in-app prompt at the scheduled time (no auto-publish). Auto-publish may be considered later behind a feature flag where policy and token scope permit.
- FR-019: Gamification depth in v1 MUST be limited to streaks and a weekly posting target; badges/levels are documented on the roadmap.

### Assumptions

- A1: Initial X support focuses on preparation and a streamlined manual completion flow; automation may require future scope and approvals.
- A2: LinkedIn includes basic scheduling (create, list, edit, cancel). Advanced scheduling features (bulk, recurring) may be considered later.
- A3: Gamification is intentionally minimal (streak + weekly target) to keep the app simple and tasteful.
- A4: Content generation aims for professional tone, concise structure, and platform-appropriate formatting; emojis are optional and minimized.
- A5: Styling is elegant and minimal; accessibility and readability take precedence over decorative elements.

### Key Entities

- User: person using the app; has email, verification state, and lifecycle timestamps.
- UserSettings: per-user preferences for tone, industry, position, audience, goals, keywords, example snippets, time zone, preferred nudge time.
- DraftPost: user-owned in-progress content with title, body, optional image, and updated timestamps.
- PublishedPost: user-owned published record with title, body snapshot, optional image, and published timestamp.
- Streak (conceptual): derived metric counting consecutive posting days; may be persisted or computed; resets when a day is missed.

## Success Criteria (mandatory)

### Measurable Outcomes

- SC-001: 90% of authenticated users can create and publish a LinkedIn post within 5 minutes on first attempt.
- SC-002: 95% of generation requests return usable content within 10 seconds.
- SC-003: 80% of weekly active users maintain a 3+ day streak after two weeks of use.
- SC-004: 90% of failed publish attempts preserve the full draft with no data loss.
- SC-005: At least 70% of drafts prepared for X are within character guidance on first suggestion.
- SC-006: 85% of users rate the interface as “clean and beautiful” in a post-task survey.
