# Research: Posting Constitution

Created: 2025-10-24  
Branch: 001-posting-constitution

## Unknowns and Decisions

### Testing approach (framework/tools)
- Decision: Add lightweight integration testing post-MVP; defer full test stack until after P1 delivery.
- Rationale: User requested granular delivery and working app before moving on; keep momentum.
- Alternatives considered: Vitest/Jest + Playwright end-to-end immediately (slower initial delivery).

### LinkedIn scheduling behavior at execution time
- Decision: Provide basic scheduling (create/list/edit/cancel). Attempt auto-publish at scheduled time; if platform constraints require manual completion, prompt user in-app.
- Rationale: Meets v1 need without overcommitting to background workers or complex retries.
- Alternatives considered: No scheduling; full job queue with robust retries (higher complexity).

### X.com posting method
- Decision: Manual, guided flow only; auto-posting is roadmap.
- Rationale: Simplicity and policy safety.
- Alternatives considered: Auto-posting via API (policy and compliance risk, scope creep).

## Best Practices Notes

- Content UX: Short paragraphs, strong open, CTA; avoid emoji overuse; platform-appropriate tone.
- Gamification: Keep metrics visible but subtle; avoid manipulative dark patterns.
- Error UX: Preserve user work always; provide actionable recovery.
- Accessibility: High contrast, keyboard navigable, concise copy.

## Integrations

- LinkedIn: Publishing via current approach; ensure clear user feedback on success/failure; handle rate limits gracefully.
- X.com: Provide character counter and concise rewrite; guide users to complete posting.
