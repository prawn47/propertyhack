# Posting App Constitution

## Core Principles

### I. Simplicity First
Prefer the simplest solution that delivers user value. Avoid scope creep, unnecessary abstractions, and premature optimization.

### II. Beautiful, Accessible UI
Design for clarity and calm: whitespace, typography, and contrast. Meet basic accessibility: keyboard navigation, focus states, and readable copy.

### III. Policy Safety
Respect platform rules. Do not imply or implement automation where prohibited. Make user actions explicit.

### IV. Incremental Delivery
Deliver in small, working increments. Each task should keep the app functional. Validate after each step before moving on.

### V. Preserve User Work
On any failure, preserve all user inputs and drafts. Never lose content during errors or refreshes.

## Development Workflow & Quality Gates
- After each task or phase, perform a smoke check of core flows before proceeding.
- Critical flows: Auth → Idea → Draft → Edit → Publish; Schedule create/edit/cancel; X preparation.
- Document user-facing changes briefly in quickstart or tasks checkpoints.

## Governance
- This constitution governs specs, plans, and tasks. Conflicts must be resolved by adjusting artifacts—not by ignoring principles.
- Amendments require explicit documentation and rationale within this file.

**Version**: 1.0.0 | **Ratified**: 2025-10-24 | **Last Amended**: 2025-10-24
