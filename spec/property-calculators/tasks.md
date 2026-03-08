# Property Calculators — Tasks

## Phase 1: Database & Auth Foundation
Everything else depends on this. User model changes, registration, login, Google OAuth.

### T1. Prisma Schema — User Model Extension + SavedScenario
- Extend User model: add `role`, `googleId`, `avatarUrl`, `emailVerified`, `otpCode`, `otpExpiresAt`, `otpPurpose`, `newsletterOptIn`, `preferences`
- Make `passwordHash` nullable
- Add `SavedScenario` model with `CalculatorType` enum
- Add `savedScenarios` relation on User
- Create Prisma migration
- Data migration script: set `role = 'admin'` for users where `superAdmin = true`
- Run `npx prisma generate`
- **Dependencies:** none

### T2. Auth Middleware — optionalAuth + RequireAdmin Split
- Add `optionalAuth` middleware to `server/middleware/auth.js`
- Export `optionalAuth` alongside existing exports
- Update `authenticateToken` to select new User fields (`role`, `emailVerified`, `avatarUrl`)
- **Dependencies:** T1

### T3. Email Service — Resend Integration
- Create `server/services/emailService.js`
- Implement `sendWelcomeEmail(to, displayName)`
- Implement `sendVerificationOtp(to, otpCode)`
- Implement `sendPasswordResetOtp(to, otpCode)`
- HTML email templates (inline, simple)
- Uses `RESEND_API_KEY` and `RESEND_FROM_EMAIL` env vars
- **Dependencies:** none

### T4. Beehiiv Service
- Create `server/services/beehiivService.js`
- Implement `subscribe(email)` — POST to Beehiiv API
- Implement `unsubscribe(email)` — DELETE/PATCH via Beehiiv API
- Uses `BEEHIIV_API_KEY` and `BEEHIIV_PUBLICATION_ID` env vars
- Graceful error handling (newsletter failure should not block registration)
- **Dependencies:** none

### T5. Auth Routes — Registration + Email Verification + Password Reset
- Extend `server/routes/auth.js`:
  - `POST /api/auth/register` — validate, create user, hash password, generate OTP, send welcome + verification email, subscribe to Beehiiv if opted in, return JWT tokens
  - `POST /api/auth/verify-email` — validate OTP, set `emailVerified: true`
  - `POST /api/auth/resend-otp` — generate new OTP, send via email (3/15min rate limit)
  - `POST /api/auth/forgot-password` — find user by email, generate OTP, send reset email
  - `POST /api/auth/reset-password` — validate OTP, hash new password, clear OTP fields
- Modify existing `POST /api/auth/login` — remove `superAdmin` gate so any user can log in
- Rate limit: 5 attempts/15min on register, login, verify, reset; 3/15min on resend, forgot
- **Dependencies:** T1, T2, T3, T4

### T6. Google OAuth — Passport Setup + Routes
- Create `server/passport.js` — configure `passport-google-oauth20` strategy
- Add `passport.initialize()` to `server/index.js`
- Add routes to `server/routes/auth.js`:
  - `GET /api/auth/google` — initiate OAuth flow
  - `GET /api/auth/google/callback` — handle callback, find/create user, issue JWT tokens, redirect to frontend
- Handle linking: if email already exists with password account, link `googleId`
- Google users get `emailVerified: true` automatically
- **Dependencies:** T1, T2

### T7. Frontend Auth — AuthContext + Login/Register Pages
- Create `contexts/AuthContext.tsx` — user state, login/logout/register methods, token management
- Refactor `App.tsx` to use AuthContext (replace inline auth state)
- Update `components/LoginPage.tsx`:
  - Add "Sign in with Google" button
  - Add "Forgot password?" link
  - Add "Don't have an account? Sign up" link
  - Remove admin-only assumption — redirect admin users to `/admin`, regular users to `/`
- Create `components/auth/RegisterPage.tsx` — email/password + Google + newsletter checkbox
- Create `components/auth/VerifyEmailPage.tsx` — OTP input + resend button
- Create `components/auth/ForgotPasswordPage.tsx` — email input
- Create `components/auth/ResetPasswordPage.tsx` — OTP + new password
- Create `components/auth/GoogleAuthCallback.tsx` — extract tokens from URL hash, store, redirect
- Add all new routes to `App.tsx`
- Split `RequireAuth` into `RequireAuth` (any user) and `RequireAdmin` (admin only)
- Update all `/admin/*` routes to use `RequireAdmin`
- Update `services/authService.ts` — add register, verifyEmail, resendOtp, forgotPassword, resetPassword methods
- **Dependencies:** T5, T6

## Phase 2: User Profile & Preferences
Depends on auth being complete.

### T8. Profile API Routes
- Create `server/routes/user/profile.js`:
  - `GET /api/user/profile` — return current user (exclude sensitive fields)
  - `PUT /api/user/profile` — update displayName, preferences
  - `PUT /api/user/profile/password` — change password (requires current password, email/password users only)
  - `PUT /api/user/profile/newsletter` — toggle newsletter opt-in (call Beehiiv subscribe/unsubscribe)
  - `DELETE /api/user/profile` — delete account (require "DELETE" confirmation string, cascade delete scenarios, unsubscribe from Beehiiv, delete user)
- Register route in `server/index.js`: `app.use('/api/user', authenticateToken, profileRoutes)`
- Input validation with express-validator on all endpoints
- **Dependencies:** T1, T2, T3, T4

### T9. Profile Frontend
- Create `components/user/ProfilePage.tsx`:
  - Account section: avatar, display name (editable), email (read-only with verified badge)
  - Change password (shown for email/password users only)
  - News preferences: default location dropdown, category multi-select, date range select
  - Newsletter toggle
  - Saved scenarios summary + link to dashboard
  - Danger zone: delete account button → confirmation modal (type "DELETE")
- Create `services/userService.ts` — API calls for profile CRUD
- Create `hooks/useUserPreferences.ts` — load preferences from AuthContext
- Add `/profile` route to `App.tsx`
- **Dependencies:** T7, T8

### T10. Homepage Preference Integration
- Modify `components/public/HomePage.tsx`:
  - Read user preferences from AuthContext
  - Pass as `initialFilters` to FilterBar on mount
- Modify `components/public/FilterBar.tsx`:
  - Accept optional `initialFilters` prop
  - Apply on mount if provided (don't override if user has already interacted)
- **Dependencies:** T9

### T11. Header & Footer Updates
- Modify `components/layout/Header.tsx`:
  - Add "Tools" dropdown nav item (desktop: hover dropdown, mobile: collapsible)
  - Add user menu (right side): anonymous → "Sign In" link; authenticated → avatar dropdown with Profile, Saved Scenarios, Sign Out; admin → + Admin Panel link
- Modify `components/layout/Footer.tsx`:
  - Add "Tools" section with links to all 5 calculator pages
- **Dependencies:** T7

## Phase 3: Calculator Backend
Calculator engines and API endpoints. No dependency on auth (public endpoints).

### T12. Calculator Config Data
- Create `server/config/calculators/stampDutyBrackets.json` — all 8 states/territories with current brackets, first home buyer thresholds, foreign surcharges, VIC off-the-plan
- Create `server/config/calculators/hemTable.json` — HEM values indexed by income bracket, dependants count, single/couple
- Create `server/config/calculators/hecsThresholds.json` — ATO HECS repayment rate thresholds
- Research and populate with current (2025-26) Australian data
- **Dependencies:** none

### T13. Mortgage Calculator Engine
- Create `server/calculators/mortgageCalculator.js`
- Implement `calculate(inputs) → outputs`:
  - P&I amortisation formula
  - Interest Only calculation
  - Weekly/fortnightly/monthly frequency conversion
  - LVR calculation + LMI warning flag
  - Year-by-year amortisation data (for chart)
  - All monetary values in integer cents
- Unit tests with known input/output pairs
- **Dependencies:** none

### T14. Stamp Duty Calculator Engine
- Create `server/calculators/stampDutyCalculator.js`
- Implement `calculate(inputs) → outputs`:
  - Load brackets from config JSON
  - Walk bracket array to compute base duty
  - Apply first home buyer exemption/concession logic
  - Apply foreign buyer surcharge
  - VIC off-the-plan concession
  - Total upfront cost (duty + legal + inspection estimates)
  - Effective rate calculation
- Unit tests: verify against official state calculator results for each state
- **Dependencies:** T12

### T15. Rental Yield Calculator Engine
- Create `server/calculators/rentalYieldCalculator.js`
- Implement `calculate(inputs) → outputs`:
  - Gross yield
  - Net yield with itemised expenses
  - Management fees as % of rent
  - Chart data: gross vs net bar chart points
- Unit tests
- **Dependencies:** none

### T16. Borrowing Power Calculator Engine
- Create `server/calculators/borrowingPowerCalculator.js`
- Implement `calculate(inputs) → outputs`:
  - Net income estimation (simplified ATO tax brackets)
  - HEM floor application from config
  - HECS repayment from config thresholds
  - Credit card 3% monthly commitment
  - APRA serviceability buffer (+3%)
  - Max borrowing iterative solve
  - Deposit needed at 80% and 90% LVR
- Unit tests
- **Dependencies:** T12

### T17. Rent vs Buy Calculator Engine
- Create `server/calculators/rentVsBuyCalculator.js`
- Implement `calculate(inputs) → outputs`:
  - Uses mortgage calculator for loan repayments
  - Uses stamp duty calculator for buying costs (NSW default)
  - 30-year simulation: property value growth, rent increases, investment returns
  - Net position for both scenarios per year
  - Breakeven year detection
  - Summary statement generation
  - Chart data: two lines (buy vs rent+invest) over time
- Unit tests
- **Dependencies:** T13, T14

### T18. Calculator API Routes
- Create `server/routes/public/calculators.js`:
  - `POST /api/calculators/mortgage/calculate`
  - `POST /api/calculators/stamp-duty/calculate`
  - `POST /api/calculators/rental-yield/calculate`
  - `POST /api/calculators/borrowing-power/calculate`
  - `POST /api/calculators/rent-vs-buy/calculate`
- Input validation with express-validator for each endpoint
- Calculator-specific rate limiter: 60 req/min per IP
- Register routes in `server/index.js`
- Integration tests for each endpoint
- **Dependencies:** T13, T14, T15, T16, T17

## Phase 4: Calculator Frontend
The UI for all 5 calculators.

### T19. Shared Calculator Components
- Create `components/calculators/shared/CurrencyInput.tsx` — auto-format with commas, $ prefix, integer cents internally
- Create `components/calculators/shared/SliderInput.tsx` — range slider + numeric input, configurable min/max/step
- Create `components/calculators/shared/PercentageInput.tsx` — numeric input with % suffix
- Create `components/calculators/shared/ExpandableSection.tsx` — collapsible wrapper with smooth animation
- Create `components/calculators/shared/ResultCard.tsx` — headline number display (big/bold)
- Create `components/calculators/shared/ShareButton.tsx` — encode inputs as URL query params, copy to clipboard
- Create `components/calculators/shared/SaveScenarioButton.tsx` — save modal (authenticated) or CTA (anonymous)
- Create `services/calculatorService.ts` — API client for all 5 calculator endpoints
- Create `hooks/useCalculator.ts` — generic hook: state, debounced API call, URL param sync, reset
- Install `recharts` dependency
- All components use existing Tailwind design tokens (brand colours, spacing)
- WCAG 2.1 AA: proper labels, keyboard nav, aria attributes
- **Dependencies:** T18

### T20. Mortgage Calculator Page
- Create `components/calculators/MortgageCalculator.tsx`
- Create `components/calculators/CalculatorLayout.tsx` — shared two-column layout (inputs left, results right; stacked on mobile)
- Inputs: property price, deposit (AUD/% toggle), loan term (slider), interest rate, repayment type toggle (P&I/IO), frequency select
- Outputs: headline repayment amount, total interest, total repaid, LVR, LMI warning
- Amortisation chart (Recharts stacked area: principal vs interest over time)
- Expandable yearly breakdown table
- Meta tags + JSON-LD + breadcrumb
- Add route to `App.tsx`
- **Dependencies:** T19

### T21. Stamp Duty Calculator Page
- Create `components/calculators/StampDutyCalculator.tsx`
- Inputs: property price, state/territory select, buyer type, property type, primary residence toggle
- VIC off-the-plan checkbox (shown conditionally)
- Outputs: headline stamp duty amount, concession notes, total upfront cost, effective rate
- Meta tags + JSON-LD + breadcrumb
- Add route to `App.tsx`
- **Dependencies:** T19

### T22. Rental Yield Calculator Page
- Create `components/calculators/RentalYieldCalculator.tsx`
- Inputs: purchase price, weekly rent; advanced section with all expense fields
- Outputs: headline gross yield %, net yield %, annual income, expenses, net income
- Bar chart: gross vs net yield
- Benchmark note
- Meta tags + JSON-LD + breadcrumb
- Add route to `App.tsx`
- **Dependencies:** T19

### T23. Borrowing Power Calculator Page
- Create `components/calculators/BorrowingPowerCalculator.tsx`
- Inputs: applicant toggle (1/2), incomes, other income, monthly expenses; liabilities section (credit cards, loans, HECS), dependants, assessment rate
- Conditional second applicant fields
- Outputs: headline max borrowing, monthly repayment, deposit needed (80%/90% LVR)
- Visual bar/gauge
- Disclaimer text
- Meta tags + JSON-LD + breadcrumb
- Add route to `App.tsx`
- **Dependencies:** T19

### T24. Rent vs Buy Calculator Page
- Create `components/calculators/RentVsBuyCalculator.tsx`
- Inputs: purchase price, weekly rent, deposit, mortgage rate, loan term, growth rate, rent increase rate, investment return rate
- Outputs: headline breakeven year, summary statement, net position at 5/10/15/20/25/30 years
- Two-line chart (Recharts line: buy wealth vs rent+invest wealth)
- Expandable year-by-year table
- Meta tags + JSON-LD + breadcrumb
- Add route to `App.tsx`
- **Dependencies:** T19

### T25. Tools Index Page
- Create `components/calculators/ToolsIndex.tsx` — landing page at `/tools`
- Card grid listing all 5 calculators with icon, name, short description, link
- Meta tags for SEO ("Property Calculators Australia")
- Add route to `App.tsx`
- **Dependencies:** T19

## Phase 5: Saved Scenarios
Depends on auth (Phase 1) and calculators (Phase 3/4).

### T26. Scenario API Routes
- Create `server/routes/public/scenarios.js`:
  - `GET /api/scenarios` — list user's scenarios, optional `?type=` and `?search=` query filters
  - `POST /api/scenarios` — create (validate inputs, check 100 scenario limit)
  - `GET /api/scenarios/:id` — get single (verify ownership, return 404 if not owner)
  - `PUT /api/scenarios/:id` — rename (verify ownership)
  - `POST /api/scenarios/:id/duplicate` — duplicate with "(copy)" suffix
  - `DELETE /api/scenarios/:id` — delete (verify ownership)
- Register routes in `server/index.js`: `app.use('/api/scenarios', authenticateToken, scenarioRoutes)`
- Integration tests for CRUD + authorization + limit enforcement
- **Dependencies:** T1, T2

### T27. Scenario Dashboard Frontend
- Create `components/user/ScenarioDashboard.tsx`:
  - Card/list view of saved scenarios sorted by most recent
  - Each card: name, calculator type badge (colour-coded), headline result, date
  - Filter by calculator type (clickable tag buttons)
  - Search by name (debounced input)
  - Actions: Open (navigate to calculator), Rename (inline edit), Duplicate, Delete (confirmation modal)
- Create `services/scenarioService.ts` — API client for scenario CRUD
- Add `/profile/scenarios` route to `App.tsx`
- **Dependencies:** T19, T26

### T28. Calculator — Save + Restore Integration
- Update `SaveScenarioButton.tsx` to call scenario API on save
- Update `useCalculator.ts` to detect `?scenario=:id` query param:
  - Fetch scenario from API
  - Populate inputs from saved data
  - Display saved outputs immediately
  - Subsequent input changes trigger fresh calculation
- Toast notification on save success
- **Dependencies:** T20, T21, T22, T23, T24, T26, T27

## Phase 6: SEO & Polish

### T29. Calculator SEO — Sitemaps + Crawler SSR
- Add calculator URLs to `server/routes/sitemap.js`
- Add `/tools` and all 5 calculator pages as `<url>` entries
- Extend `server/middleware/crawlerSsr.js` to serve meta tags for `/tools/*` routes
- Verify JSON-LD renders correctly for search engine crawlers
- **Dependencies:** T20, T21, T22, T23, T24, T25

### T30. E2E Tests
- Playwright tests:
  - Registration flow: register → verify email → login → see profile
  - Google OAuth flow (mocked)
  - Calculator flow: enter inputs → see results → share link → open shared link → verify same results
  - Save scenario flow: calculate → save → view dashboard → open → verify restored
  - Account deletion flow
  - Profile preferences: set defaults → visit homepage → verify filters applied
- **Dependencies:** T28, T29

---

## Dependency Graph

```
Phase 1 (Auth Foundation):
T1 ──────────────┬──→ T2 ──┬──→ T5 ──→ T7
                 │         │         ↗
T3 (Resend) ─────┼─────────┼──→ T5
T4 (Beehiiv) ────┼─────────┼──→ T5
                 │         └──→ T6 ──→ T7
                 │
Phase 2 (Profile):│
                 │    T7 ──┬──→ T9 ──→ T10
                 │    T8 ──┘
                 │    T7 ──→ T11
                 │
Phase 3 (Calc Backend — can run parallel with Phase 2):
T12 ─────────────┬──→ T14 ──┐
                 └──→ T16   │
T13 ─────────────────────┐  │
T15 ────────────────────┐│  │
                        ││  │
                        ↓↓  ↓
                    T17 (uses T13+T14)
                        │
                    T18 (all engines)
                        │
Phase 4 (Calc Frontend):│
                    T19 ──→ T20, T21, T22, T23, T24, T25
                        │
Phase 5 (Scenarios):    │
T26 ────────────────────┼──→ T27 ──→ T28
                        │
Phase 6 (SEO + E2E):
                    T29, T30
```

## Parallelism Notes

- **T3, T4, T12, T13, T15** can all start immediately (no dependencies)
- **T1** can also start immediately and unblocks the most tasks
- **Phase 2 and Phase 3** are fully independent — can run in parallel
- **Phase 4** depends on Phase 3 (backend endpoints)
- **Phase 5** depends on Phase 1 (auth) + Phase 4 (calculator UI)
- **Phase 6** is final polish after everything else

## Estimated Task Sizes

| Task | Size | Notes |
|---|---|---|
| T1 | S | Schema + migration |
| T2 | S | Middleware tweak |
| T3 | M | Email service + templates |
| T4 | S | Simple API wrapper |
| T5 | L | 6 new endpoints, OTP logic, validation |
| T6 | M | Passport config + OAuth flow |
| T7 | XL | AuthContext, 5 new pages, App.tsx refactor |
| T8 | M | 5 endpoints, deletion logic |
| T9 | L | Full profile page UI |
| T10 | S | Wire preferences to FilterBar |
| T11 | M | Header dropdown + user menu + footer |
| T12 | M | Research + populate config data |
| T13 | M | Amortisation math + chart data |
| T14 | M | Bracket logic + state configs |
| T15 | S | Simple math |
| T16 | M | HEM + HECS + iterative solve |
| T17 | M | Simulation + reuses T13/T14 |
| T18 | M | 5 endpoints + validation |
| T19 | L | 7 shared components + hook + service |
| T20 | L | Full calculator page + chart |
| T21 | M | Calculator page |
| T22 | M | Calculator page |
| T23 | M | Calculator page + conditional fields |
| T24 | L | Calculator page + two-line chart |
| T25 | S | Landing page with cards |
| T26 | M | CRUD + auth checks + limits |
| T27 | L | Dashboard UI + filters + actions |
| T28 | M | Save/restore integration |
| T29 | S | Sitemap + crawler SSR entries |
| T30 | L | Full E2E test suite |
