# Property Calculators — Proposal

## Problem Statement
PropertyHack is a property news site — readers are actively researching property decisions. Right now they leave the site to use calculators on bank or competitor sites, breaking engagement and losing traffic to tools that could live natively on the platform.

## Why Now
- Calculators are the highest-intent pages in property media (users are actively buying/investing)
- SEO opportunity: "stamp duty calculator NSW", "mortgage repayment calculator" etc. are high-volume keywords
- Subscriber value: saved scenarios give subscribers a reason to stay logged in and return
- No existing calculator infrastructure to migrate — clean build

## Scope — In for v1

### 5 Calculators
1. **Mortgage Repayment** — monthly/fortnightly/weekly repayments, amortisation chart, P&I vs IO comparison
2. **Stamp Duty** — all 8 states/territories, buyer type concessions, first home buyer exemptions
3. **Rental Yield** — gross and net yield with expandable expense breakdown
4. **Borrowing Power** — income-based estimate with HEM floor and APRA serviceability buffer
5. **Rent vs Buy** — net wealth comparison over time, breakeven analysis

### Saved Scenarios (Subscribers Only)
- Save named scenarios with all inputs + outputs
- Unified dashboard: list, filter by type, search, open/rename/duplicate/delete
- Soft CTA for non-subscribers — no feature gating on calculator functionality itself

### Design Requirements
- Native to existing site design (not widgets or iframes)
- Live-updating results (debounced ~300ms)
- Responsive mobile-first
- SEO-optimised pages with structured data
- Shareable URLs via query params
- WCAG 2.1 AA accessible

## Explicitly Deferred
- Real-time rate feeds from lenders
- PDF export
- Email results
- CRM / lead capture integration
- Multi-currency (AUD only)
- Lender product comparison
- Compare mode (side-by-side scenarios) — nice-to-have, not v1

## Affected Areas
- **Frontend**: New `/tools/*` routes, 5 calculator components, scenario dashboard component
- **Backend**: New `/api/scenarios` REST endpoints (CRUD)
- **Database**: New `SavedScenario` model (Prisma)
- **Auth**: Scenario save/load gated to authenticated subscribers
- **SEO**: New pages need meta tags, JSON-LD, sitemap entries

## Breaking Risk
- **None** — entirely additive. No changes to existing routes, models, or API contracts.
- New Prisma model requires a migration but touches no existing tables.

## Acceptance Criteria

### Calculators
1. All 5 calculators render correctly on desktop and mobile
2. Inputs live-update results with ~300ms debounce
3. Default values are sensible Australian defaults
4. Currency fields auto-format with commas
5. Charts render and are interactive (hover values)
6. Share button generates a URL that restores calculator state
7. Reset button clears to defaults
8. Stamp duty brackets match current state/territory rates
9. Monetary calculations avoid floating-point errors (integer cents or decimal library)

### Saved Scenarios
10. Non-subscribers can use all calculators without restriction
11. Subscribers see "Save Scenario" button on results
12. Non-subscribers see soft CTA linking to subscription
13. Saved scenarios appear on dashboard with name, type badge, headline result, date
14. Dashboard supports filter by type and search by name
15. Open restores full calculator state (inputs + results)
16. Rename, duplicate, delete all work (delete has confirmation)
17. Max 100 saved scenarios per user (rate-limited)

### Technical
18. Calculator pages have proper meta tags, H1, JSON-LD
19. URLs are clean: `/tools/mortgage-calculator`, `/tools/stamp-duty-calculator`, etc.
20. API endpoints follow REST conventions at `/api/scenarios`
21. All inputs validated at API boundary
22. Keyboard navigable, screen reader friendly
