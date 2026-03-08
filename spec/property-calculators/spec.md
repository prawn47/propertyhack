# Property Calculators — Specification

## 1. Problem
PropertyHack readers are actively making property decisions — buying, investing, comparing. They leave the site to use calculators on bank or competitor sites, losing engagement and SEO traffic on high-intent keywords. There's also no reason for readers to create accounts — the site is read-only.

## 2. Personas

### Casual Researcher
- Browsing property news, wants quick numbers (mortgage repayment, stamp duty)
- Won't create an account. Needs frictionless calculator access.

### Active Buyer
- Comparing multiple scenarios (different properties, deposit levels, states)
- Will create an account to save and revisit scenarios
- Wants default filters so the feed shows their market/interests on return

### Property Investor
- Evaluating rental yields, borrowing power, rent vs buy
- Multiple scenarios across properties. Saves and compares regularly.

## 3. Features

### 3.1 User Registration & Authentication

The site currently has admin-only auth. This feature adds public user registration.

#### 3.1.1 Registration
- **Email/password signup** with Resend transactional emails:
  - Welcome email on registration
  - Email verification (OTP code sent to email)
  - Forgot password flow (OTP-based reset)
- **Google OAuth signup** via Passport.js `passport-google-oauth20`
- During signup, prompt: "Subscribe to our newsletter to stay up to date" (checkbox, default checked)
  - If checked, subscribe the user's email to Beehiiv via their API
- Acceptance criteria:
  - User can register with email/password and receives welcome email
  - User can register with Google OAuth in one click
  - Email verification is required before account is active
  - OTP codes expire after 10 minutes
  - Newsletter checkbox subscribes to Beehiiv on opt-in

#### 3.1.2 Login
- Email/password login
- Google OAuth login
- Forgot password: enter email → receive OTP → enter OTP + new password
- Acceptance criteria:
  - Existing users can log in with either method
  - Forgot password flow works end-to-end
  - Failed login attempts are rate-limited (5 attempts per 15 minutes)

#### 3.1.3 User Model Changes
Extend the existing `User` model:

```
User {
  id            String    (existing)
  email         String    (existing)
  passwordHash  String?   (make nullable — Google OAuth users won't have one)
  displayName   String?   (existing)
  superAdmin    Boolean   (existing — true = admin)
  role          String    (new — 'admin' | 'user', default 'user')
  googleId      String?   (new — Google OAuth subject ID)
  avatarUrl     String?   (new — from Google profile or uploaded)
  emailVerified Boolean   (new — default false)
  otpCode       String?   (new — hashed OTP for verification/reset)
  otpExpiresAt  DateTime? (new — OTP expiry)
  newsletterOptIn Boolean (new — Beehiiv subscription status)
  preferences   Json?     (new — default filters, interests)
  createdAt     DateTime  (existing)
  updatedAt     DateTime  (existing)
}
```

Notes:
- `role` replaces `superAdmin` as the primary authorization check, but `superAdmin` is kept for backward compatibility during migration
- `passwordHash` becomes nullable to support Google-only users
- Admin routes check `role === 'admin'` (or `superAdmin === true` as fallback)
- Regular user routes check `authenticateToken` only (no admin check)

#### 3.1.4 Auth Middleware Changes
- Existing `authenticateToken` — works as-is for all authenticated users
- Existing `requireSuperAdmin` — continues to protect admin routes
- New `optionalAuth` middleware — attaches `req.user` if token present, continues if not (for calculator pages that show save button conditionally)

### 3.2 User Profile

Accessible at `/profile` for authenticated users.

#### 3.2.1 Profile Settings
- Display name (editable)
- Email (read-only, shows verified badge)
- Avatar (from Google, or placeholder)
- Change password (email/password users only)
- Newsletter subscription toggle (updates Beehiiv)

#### 3.2.2 Default Filters & Interests
- **Default location**: dropdown matching existing locations from FilterBar
- **Default categories**: multi-select from existing categories
- **Default date range**: all / today / week / month
- When set, the homepage feed auto-applies these filters on load (user can still override per-session)
- Stored in `User.preferences` JSON field:
  ```json
  {
    "defaultLocation": "Sydney",
    "defaultCategories": ["Market Updates", "Investment"],
    "defaultDateRange": "week"
  }
  ```
- Acceptance criteria:
  - Preferences persist across sessions
  - Homepage applies saved filters on load for logged-in users
  - Users without preferences see the default unfiltered feed
  - Filter overrides during a session don't permanently change saved preferences

#### 3.2.3 Account Deletion
- "Delete my account" button with confirmation modal
- Typed confirmation: "DELETE" to proceed
- Deletes: user record, all saved scenarios, preferences
- Unsubscribes from Beehiiv newsletter
- Invalidates all tokens
- Shows confirmation page, redirects to homepage
- Acceptance criteria:
  - All user data is permanently removed
  - Beehiiv subscription is cancelled
  - User cannot log in after deletion
  - Process is irreversible and clearly communicated

### 3.3 Calculators

All 5 calculators share common UX patterns:

**Shared behaviour:**
- Live-updating results with ~300ms debounce
- Currency fields auto-format with commas ($1,250,000)
- Sensible Australian defaults
- Sliders with manual override for ranges
- Expandable "Advanced" sections for optional inputs
- Headline number displayed prominently
- Interactive charts (hover for values)
- Reset button (clears to defaults)
- Share button (encodes inputs as URL query params)
- Save Scenario button (authenticated users) / CTA (anonymous)
- Proper meta tags, H1, JSON-LD (Calculator type schema)
- Responsive — inputs stack vertically on mobile
- WCAG 2.1 AA compliant (labels, keyboard nav, screen reader)

**URLs:**
- `/tools/mortgage-calculator`
- `/tools/stamp-duty-calculator`
- `/tools/rental-yield-calculator`
- `/tools/borrowing-power-calculator`
- `/tools/rent-vs-buy-calculator`

#### 3.3.1 Mortgage Repayment Calculator

**Inputs:**
| Field | Type | Default | Notes |
|---|---|---|---|
| Property price | currency | $750,000 | |
| Deposit | currency / % toggle | $150,000 / 20% | Toggle between AUD and % |
| Loan term | slider + input | 30 years | Range: 1–30 |
| Interest rate | input | 6.5% | Step: 0.01 |
| Repayment type | toggle | P&I | P&I / Interest Only |
| Frequency | select | Monthly | Weekly / Fortnightly / Monthly |

**Outputs:**
- Repayment amount (per selected frequency) — headline
- Total interest paid over term
- Total amount repaid (principal + interest)
- Loan-to-value ratio (LVR)
- Amortisation chart (stacked area: principal vs interest over time)
- Yearly breakdown table (expandable)

**Logic:**
- If LVR > 80%: show info note "Lenders Mortgage Insurance (LMI) may apply"
- P&I uses standard amortisation formula
- Interest Only: monthly = (principal × rate) / 12
- Weekly = monthly × 12 / 52; Fortnightly = monthly × 12 / 26

#### 3.3.2 Stamp Duty Calculator

**Inputs:**
| Field | Type | Default | Notes |
|---|---|---|---|
| Property price | currency | $750,000 | |
| State/Territory | select | NSW | All 8 states/territories |
| Buyer type | select | Standard | Standard / First Home Buyer / Foreign Buyer |
| Property type | select | Established | Established / New / Vacant Land / Investment |
| Primary residence | toggle | Yes | Yes / No |

**Outputs:**
- Stamp duty amount — headline
- Applicable concessions/exemptions (with explanation)
- Total upfront cost (stamp duty + indicative legal ~$2,000 + indicative inspection ~$500)
- Effective stamp duty rate (% of purchase price)

**Logic:**
- Stamp duty brackets stored as **configuration data** (JSON object per state), not in conditional logic
- Config structure per state:
  ```json
  {
    "brackets": [
      { "min": 0, "max": 14000, "base": 0, "rate": 0.0125 },
      { "min": 14001, "max": 32000, "base": 175, "rate": 0.015 }
    ],
    "firstHomeBuyer": {
      "exemptionThreshold": 800000,
      "concessionThreshold": 1000000
    },
    "foreignSurcharge": 0.08
  }
  ```
- Show note when first home buyer qualifies for full exemption vs partial concession
- VIC: include off-the-plan concession option (additional checkbox when VIC + New selected)

#### 3.3.3 Rental Yield Calculator

**Inputs:**
| Field | Type | Default | Notes |
|---|---|---|---|
| Purchase price | currency | $750,000 | |
| Weekly rent | currency | $550 | |
| **Advanced (expandable):** | | | |
| Management fees | % | 7% | Of annual rent |
| Council rates | currency/yr | $2,000 | |
| Strata fees | currency/yr | $3,000 | |
| Insurance | currency/yr | $1,500 | |
| Maintenance | currency/yr | $2,000 | |
| Land tax | currency/yr | $0 | |
| Other expenses | currency/yr | $0 | |

**Outputs:**
- Gross rental yield (%) — headline
- Net rental yield (%)
- Annual rental income
- Total annual expenses
- Net annual income
- Bar chart: gross vs net yield
- Benchmark note: "Typical gross yields range from 3–5% in capital cities"

**Logic:**
- Gross yield = (weekly rent × 52) / purchase price × 100
- Net yield = ((weekly rent × 52) − total expenses) / purchase price × 100

#### 3.3.4 Borrowing Power Calculator

**Inputs:**
| Field | Type | Default | Notes |
|---|---|---|---|
| Applicants | toggle | 1 | 1 or 2 |
| Gross income (Applicant 1) | currency/yr | $100,000 | |
| Gross income (Applicant 2) | currency/yr | $80,000 | Shown when 2 applicants |
| Other income | currency/yr | $0 | Rental, dividends, etc. |
| Monthly living expenses | currency/mo | $2,500 | |
| **Liabilities (expandable):** | | | |
| Credit card limits | currency | $0 | Total across all cards |
| Existing loan repayments | currency/mo | $0 | |
| HECS/HELP debt | currency | $0 | Total balance |
| Dependants | select | 0 | 0–6+ |
| Assessment rate | % | 9.5% | Default: ~6.5% + 3% buffer |

**Outputs:**
- Estimated max borrowing — headline
- Estimated monthly repayment at max borrowing
- Deposit needed for 80% LVR
- Deposit needed for 90% LVR
- Visual bar/gauge showing borrowing range
- Disclaimer: "This is an estimate only. Lenders use their own criteria."

**Logic:**
- Apply HEM floor: if declared expenses < HEM for applicant's situation, use HEM
- HEM table stored as config data (indexed by income bracket, dependants, single/couple)
- Apply APRA serviceability buffer (+3% above entered rate)
- Credit card impact: 3% of total limit as monthly commitment (standard lender assumption)
- HECS repayment: use ATO repayment thresholds on gross income
- Max borrowing = max loan where monthly repayment ≤ (net monthly income − expenses − commitments)

#### 3.3.5 Rent vs Buy Calculator

**Inputs:**
| Field | Type | Default | Notes |
|---|---|---|---|
| Purchase price | currency | $750,000 | |
| Weekly rent | currency | $550 | |
| Available deposit | currency | $150,000 | |
| Mortgage rate | % | 6.5% | |
| Loan term | years | 30 | |
| Property growth rate | %/yr | 5% | |
| Rent increase rate | %/yr | 3% | |
| Investment return rate | %/yr | 7% | If renting + investing difference |

**Outputs:**
- Net position comparison at 5, 10, 15, 20, 25, 30 years
- Two-line chart: net wealth (buying vs renting+investing) over time
- Breakeven year (if applicable)
- Summary statement: "Based on these inputs, buying becomes more advantageous after X years" or "Renting and investing the difference is more advantageous over the full term"
- Year-by-year breakdown table (expandable)

**Logic:**
- Buying wealth = property value − remaining loan balance − stamp duty − buying costs
- Renting wealth = deposit invested + monthly savings (mortgage payment − rent) invested
- Property value compounds at growth rate annually
- Rent compounds at rent increase rate annually
- Investment returns compound at investment return rate
- Stamp duty calculated using the stamp duty calculator logic (default to NSW Standard buyer)

### 3.4 Saved Scenarios

#### 3.4.1 Save Flow
- Authenticated users see "Save Scenario" button after results are displayed
- Clicking opens a modal: scenario name (required, free text), auto-tagged with calculator type
- All inputs AND computed outputs saved as JSON
- Timestamp auto-saved
- Max 100 scenarios per user (return 429 if exceeded)
- Anonymous users see: "Sign in to save and compare your scenarios" with link to `/login`

#### 3.4.2 Scenario Dashboard
- Route: `/profile/scenarios`
- Also accessible from profile page
- Single page showing all saved scenarios across all calculator types

**Dashboard features:**
- Card/list view of scenarios, sorted by most recent
- Each card shows:
  - Scenario name
  - Calculator type badge (colour-coded)
  - Headline result (e.g. "$2,847/month", "4.2% gross yield")
  - Date saved
- Filter by calculator type (clickable tags)
- Search by scenario name
- Actions per scenario:
  - **Open** — navigates to calculator with all saved inputs pre-filled, results displayed
  - **Rename** — inline edit
  - **Duplicate** — creates copy with "(copy)" suffix
  - **Delete** — confirmation modal

#### 3.4.3 Data Model

```prisma
enum CalculatorType {
  MORTGAGE
  STAMP_DUTY
  RENTAL_YIELD
  BORROWING_POWER
  RENT_VS_BUY
}

model SavedScenario {
  id              String         @id @default(cuid())
  userId          String         @map("user_id")
  name            String
  calculatorType  CalculatorType @map("calculator_type")
  inputs          Json
  outputs         Json
  headlineLabel   String         @map("headline_label")
  headlineValue   String         @map("headline_value")
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([calculatorType])
  @@map("saved_scenarios")
}
```

`headlineLabel` and `headlineValue` are denormalized for dashboard display without parsing the full outputs JSON (e.g. label: "Monthly repayment", value: "$2,847").

#### 3.4.4 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/scenarios` | Required | List user's scenarios. Query: `?type=mortgage` |
| POST | `/api/scenarios` | Required | Create scenario |
| GET | `/api/scenarios/:id` | Required | Get single scenario (must be owner) |
| PUT | `/api/scenarios/:id` | Required | Update (rename) |
| DELETE | `/api/scenarios/:id` | Required | Delete (must be owner) |

Rate limit: 100 saved scenarios per user (checked on POST).

### 3.5 SEO & Navigation

- Add "Tools" to main navigation with dropdown showing all 5 calculators
- Each calculator page has:
  - Unique meta title/description
  - JSON-LD `SoftwareApplication` or `WebApplication` schema
  - H1 heading
  - Breadcrumb (Home > Tools > [Calculator Name])
- Add calculator pages to sitemap
- Share URLs use query params: `/tools/mortgage-calculator?price=750000&deposit=150000&rate=6.5`

## 4. Technical Decisions

### 4.1 Server-Side Calculation Engine
All calculator logic runs server-side. The frontend sends inputs, receives computed outputs.

**API pattern:**
```
POST /api/calculators/mortgage/calculate      { inputs } → { outputs }
POST /api/calculators/stamp-duty/calculate    { inputs } → { outputs }
POST /api/calculators/rental-yield/calculate  { inputs } → { outputs }
POST /api/calculators/borrowing-power/calculate { inputs } → { outputs }
POST /api/calculators/rent-vs-buy/calculate   { inputs } → { outputs }
```

- No auth required (anyone can calculate)
- Rate-limited: 60 requests/minute per IP
- Frontend debounces input changes at ~300ms before calling API
- Response times will be <50ms (simple math, no DB)
- Server response includes all outputs + chart data points

**Why server-side:**
- Stamp duty brackets, HEM tables, and config data stay private and are easy to update without frontend redeploy
- Saved scenarios use the exact same calculation engine that produced the results
- Keeps the frontend bundle thin
- Future-proof for rate feeds or complex logic additions

### 4.2 Arithmetic Precision
All monetary calculations use integer cents internally (multiply by 100, calculate, divide for display). This avoids floating-point rounding errors without adding a dependency.

### 4.3 Chart Library
Use **Recharts** — React-native, lightweight, supports area/line/bar charts needed. Already compatible with the React 19 + TypeScript stack. The server returns pre-computed chart data points; Recharts just renders them.

### 4.4 Configuration Data
Stamp duty brackets, HEM tables, and HECS repayment thresholds stored as JSON config files in `server/config/calculators/`:
- `stampDutyBrackets.json` — per-state bracket data, concessions, surcharges
- `hemTable.json` — Household Expenditure Measure indexed by income/dependants/couple
- `hecsThresholds.json` — ATO repayment rate thresholds

Updated by editing the JSON files and restarting the server (or hot-reloading in future).

### 4.5 Google OAuth
Use `passport-google-oauth20` strategy. Callback URL: `/api/auth/google/callback`. On success, create or find user by `googleId`, issue JWT tokens same as email login.

### 4.6 Resend Integration
- Transactional emails only (not newsletter)
- Templates: welcome, email verification (OTP), password reset (OTP)
- OTP: 6-digit code, hashed with bcrypt before storage, 10-minute expiry
- Requires `RESEND_API_KEY` env var

### 4.7 Beehiiv Integration
- API call on signup (if newsletter checkbox checked)
- API call on profile toggle
- API call on account deletion (unsubscribe)
- Requires `BEEHIIV_API_KEY` and `BEEHIIV_PUBLICATION_ID` env vars

## 5. Out of Scope (Deferred)
- Compare mode (side-by-side scenarios)
- Real-time rate feeds from lenders
- PDF export of results
- Email results
- CRM / lead capture
- Multi-currency (AUD only)
- Lender product comparison
- Social login beyond Google (Apple, Facebook)
