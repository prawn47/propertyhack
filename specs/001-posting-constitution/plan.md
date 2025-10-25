# Implementation Plan: Posting Constitution

**Branch**: `001-posting-constitution` | **Date**: 2025-10-24 | **Spec**: ../spec.md
**Input**: Feature specification from `/specs/001-posting-constitution/spec.md`

## Summary

Deliver a simple, beautiful LinkedIn posting app with:
- P1: Idea → Draft → Edit → Publish to LinkedIn, with history
- P2: Light gamification (streaks + weekly target + gentle prompts)
- P3: X.com manual-guided flow (character guidance, concise formatting)
- v1 additionally includes basic LinkedIn scheduling (create/list/edit/cancel)

## Technical Context

**Language/Version**: TypeScript (frontend), JavaScript/Node 18+ (backend)  
**Primary Dependencies**: React + Vite, Tailwind/DaisyUI (UI), Express, Passport (OAuth), JWT, Prisma ORM  
**Storage**: SQLite (dev) via Prisma; path for Postgres provided in deployment guide  
**Testing**: NEEDS CLARIFICATION (no test framework configured)  
**Target Platform**: Web app (frontend + backend)  
**Project Type**: Web application (frontend and backend in mono-repo)  
**Performance Goals**: Content generation perceived <10s; publish actions <5s on success  
**Constraints**: Respect platform policies (no implied automation on X), keep UI minimal and accessible  
**Scale/Scope**: Single-team app, single-digit screens, low concurrency initially

## Constitution Check

Gates derived from spec principles (Simplicity, Beauty, Policy Safety, Granular Delivery):
- Simplicity: Limit v1 gamification to streak + weekly target → PASS
- Beauty: Minimal UI surfaces, whitespace, readability prioritized → PASS
- Policy Safety: X is manual-guided; no auto-posting implied → PASS
- Granular Delivery: Phase-by-phase, one task at a time until working → PASS

Re-check after Phase 1 design (post-contracts): No violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/001-posting-constitution/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output (/speckit.plan)
├── data-model.md        # Phase 1 output (/speckit.plan)
├── quickstart.md        # Phase 1 output (/speckit.plan)
├── contracts/           # Phase 1 output (/speckit.plan)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/ (server/)
├── index.js
├── routes/
│   ├── api.js          # content + profile endpoints
│   ├── auth.js         # auth endpoints
│   └── oauth.js        # OAuth callbacks
├── middleware/
│   └── auth.js
├── config/
│   └── passport.js
└── prisma/
    ├── schema.prisma
    └── dev.db

frontend/ (root app)
├── App.tsx
├── components/
│   ├── ContentGenerator.tsx
│   ├── PostCreationWizard.tsx
│   ├── SettingsPanel.tsx
│   └── OAuthCallback.tsx
└── services/
    ├── geminiService.ts
    ├── linkedInService.ts
    └── authService.ts
```

**Structure Decision**: Existing web (frontend+backend) mono-repo retained. New scheduling and gamification logic will extend current server routes and Prisma schema minimally; UI additions use existing components/patterns.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |
