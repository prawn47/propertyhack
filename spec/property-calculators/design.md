# Property Calculators — Design

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend                              │
│  React 19 + TypeScript + Tailwind + Recharts                 │
│                                                               │
│  /login, /register         → AuthPages (new)                 │
│  /profile                  → ProfilePage (new)               │
│  /profile/scenarios        → ScenarioDashboard (new)         │
│  /tools/:calculator        → CalculatorPage (new)            │
│  /                         → HomePage (modified: user prefs) │
│  Header (modified: Tools nav + user menu)                    │
│  Footer (modified: Tools links)                              │
├──────────────────────────────────────────────────────────────┤
│                         Backend                               │
│  Express 5 + Node.js (JavaScript)                            │
│                                                               │
│  /api/auth/*               → Auth routes (extended)          │
│  /api/auth/google/*        → Google OAuth (new)              │
│  /api/user/profile         → Profile routes (new)            │
│  /api/calculators/:type    → Calculator routes (new)         │
│  /api/scenarios            → Scenario CRUD routes (new)      │
│                                                               │
│  server/services/          → emailService, beehiivService    │
│  server/calculators/       → 5 calculator engines            │
│  server/config/calculators → stamp duty, HEM, HECS data     │
├──────────────────────────────────────────────────────────────┤
│                       External Services                       │
│  Resend (transactional email)                                │
│  Google OAuth (authentication)                               │
│  Beehiiv (newsletter subscription)                           │
└──────────────────────────────────────────────────────────────┘
```

## 2. Database Schema Changes

### 2.1 User Model (Extended)

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String?   @map("password_hash")    // nullable for Google OAuth users
  displayName     String?   @map("display_name")
  superAdmin      Boolean   @default(false) @map("super_admin")
  role            String    @default("user")         // 'admin' | 'user'
  googleId        String?   @unique @map("google_id")
  avatarUrl       String?   @map("avatar_url")
  emailVerified   Boolean   @default(false) @map("email_verified")
  otpCode         String?   @map("otp_code")         // bcrypt-hashed 6-digit OTP
  otpExpiresAt    DateTime? @map("otp_expires_at")
  otpPurpose      String?   @map("otp_purpose")      // 'verification' | 'reset'
  newsletterOptIn Boolean   @default(false) @map("newsletter_opt_in")
  preferences     Json?                               // { defaultLocation, defaultCategories, defaultDateRange }
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  savedScenarios SavedScenario[]

  @@map("users")
}
```

Migration notes:
- `passwordHash` changes from required to optional — existing admin users already have passwords, no data loss
- `role` defaults to `'user'` — existing admin users need a data migration to set `role = 'admin'`
- `superAdmin` kept for backward compatibility; admin route checks: `role === 'admin' || superAdmin === true`
- `googleId` has unique constraint for fast OAuth lookups
- `otpPurpose` added to distinguish between verification and password reset OTPs

### 2.2 SavedScenario Model (New)

```prisma
enum CalculatorType {
  MORTGAGE
  STAMP_DUTY
  RENTAL_YIELD
  BORROWING_POWER
  RENT_VS_BUY
}

model SavedScenario {
  id             String         @id @default(cuid())
  userId         String         @map("user_id")
  name           String
  calculatorType CalculatorType @map("calculator_type")
  inputs         Json
  outputs        Json
  headlineLabel  String         @map("headline_label")
  headlineValue  String         @map("headline_value")
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([calculatorType])
  @@map("saved_scenarios")
}
```

### 2.3 Migration Strategy
- Single Prisma migration covering both User extensions and SavedScenario creation
- Data migration script to set `role = 'admin'` for existing users where `superAdmin = true`
- Use `npx prisma db push` first to validate schema, then `npx prisma migrate dev` for the migration file

## 3. Backend Design

### 3.1 File Structure (New Files)

```
server/
├── routes/
│   ├── auth.js                    (modified — add register, Google OAuth, OTP flows)
│   ├── user/
│   │   └── profile.js             (new — profile CRUD, preferences, account deletion)
│   ├── public/
│   │   ├── calculators.js         (new — calculator endpoints)
│   │   └── scenarios.js           (new — saved scenario CRUD)
├── middleware/
│   └── auth.js                    (modified — add optionalAuth)
├── services/
│   ├── emailService.js            (new — Resend integration)
│   └── beehiivService.js          (new — Beehiiv API integration)
├── calculators/
│   ├── mortgageCalculator.js      (new)
│   ├── stampDutyCalculator.js     (new)
│   ├── rentalYieldCalculator.js   (new)
│   ├── borrowingPowerCalculator.js (new)
│   └── rentVsBuyCalculator.js     (new)
├── config/
│   └── calculators/
│       ├── stampDutyBrackets.json  (new)
│       ├── hemTable.json          (new)
│       └── hecsThresholds.json    (new)
└── passport.js                    (new — Google OAuth strategy setup)
```

### 3.2 Auth Routes (Extended `server/routes/auth.js`)

Current state: login (admin-only), refresh, logout.

New endpoints:

| Method | Path | Rate Limit | Description |
|---|---|---|---|
| POST | `/api/auth/register` | 5/15min | Email/password registration |
| POST | `/api/auth/login` | 5/15min | Login (remove superAdmin check — any user can log in) |
| POST | `/api/auth/verify-email` | 5/15min | Submit OTP to verify email |
| POST | `/api/auth/resend-otp` | 3/15min | Resend verification OTP |
| POST | `/api/auth/forgot-password` | 3/15min | Request password reset OTP |
| POST | `/api/auth/reset-password` | 5/15min | Submit OTP + new password |
| GET | `/api/auth/google` | — | Initiate Google OAuth flow |
| GET | `/api/auth/google/callback` | — | Google OAuth callback |
| POST | `/api/auth/refresh` | existing | Refresh JWT tokens |
| POST | `/api/auth/logout` | existing | Logout |

**Login change:** The existing login route rejects non-admin users (`if (!user.superAdmin)`). This must change to allow all users to log in. The admin panel is protected by `requireSuperAdmin` middleware on admin routes, not at login time.

**Registration flow:**
1. Validate email (unique, format) + password (min 8 chars)
2. Hash password with bcrypt
3. Create user with `role: 'user'`, `emailVerified: false`
4. Generate 6-digit OTP, hash with bcrypt, store with 10-min expiry
5. Send welcome email + OTP via Resend
6. If newsletter opted in, subscribe to Beehiiv
7. Return JWT tokens (user can use the app, but save actions require verified email)

**Google OAuth flow:**
1. `GET /api/auth/google` → redirects to Google consent screen
2. Google callback → receive profile (email, name, avatar, googleId)
3. Find user by `googleId` or `email`
4. If new: create user with `role: 'user'`, `emailVerified: true` (Google verified), `googleId`
5. If existing by email (registered with password): link `googleId` to existing account
6. Issue JWT tokens, redirect to frontend with tokens in URL hash

### 3.3 Profile Routes (`server/routes/user/profile.js`)

All require `authenticateToken`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/user/profile` | Get current user profile |
| PUT | `/api/user/profile` | Update display name, preferences |
| PUT | `/api/user/profile/password` | Change password (requires current password) |
| PUT | `/api/user/profile/newsletter` | Toggle newsletter subscription |
| DELETE | `/api/user/profile` | Delete account (requires typed "DELETE" confirmation) |

**Account deletion sequence:**
1. Verify confirmation string === "DELETE"
2. Delete all SavedScenarios for user (cascade handles this via Prisma)
3. If `newsletterOptIn`, call Beehiiv unsubscribe API
4. Delete User record
5. Return 200 (frontend clears tokens and redirects)

### 3.4 Calculator Routes (`server/routes/public/calculators.js`)

No auth required. Rate-limited: 60 requests/minute per IP.

| Method | Path | Description |
|---|---|---|
| POST | `/api/calculators/mortgage/calculate` | Mortgage repayment calculation |
| POST | `/api/calculators/stamp-duty/calculate` | Stamp duty calculation |
| POST | `/api/calculators/rental-yield/calculate` | Rental yield calculation |
| POST | `/api/calculators/borrowing-power/calculate` | Borrowing power calculation |
| POST | `/api/calculators/rent-vs-buy/calculate` | Rent vs buy comparison |

Each endpoint:
1. Validates inputs with express-validator
2. Calls the corresponding calculator engine
3. Returns structured output including chart data points

**Example request/response — Mortgage:**
```json
// POST /api/calculators/mortgage/calculate
// Request:
{
  "propertyPrice": 75000000,    // cents
  "deposit": 15000000,          // cents
  "loanTermYears": 30,
  "interestRate": 6.5,          // percentage
  "repaymentType": "PI",        // "PI" | "IO"
  "frequency": "monthly"        // "weekly" | "fortnightly" | "monthly"
}

// Response:
{
  "repaymentAmount": 379266,    // cents per frequency
  "totalInterest": 76534760,    // cents
  "totalRepaid": 136534760,     // cents
  "lvr": 80.0,                  // percentage
  "lmiWarning": false,
  "chartData": [
    { "year": 1, "principalPaid": 523400, "interestPaid": 3927792, "balance": 59476600 },
    { "year": 2, "principalPaid": 558200, "interestPaid": 3892992, "balance": 58918400 }
    // ... 30 entries
  ],
  "yearlyBreakdown": [
    { "year": 1, "payment": 4551192, "principal": 523400, "interest": 3927792, "balance": 59476600 }
    // ... 30 entries
  ]
}
```

All monetary values in **cents** (integers) throughout the API. Frontend formats for display.

### 3.5 Scenario Routes (`server/routes/public/scenarios.js`)

All require `authenticateToken`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/scenarios` | List scenarios. Query: `?type=MORTGAGE&search=term` |
| POST | `/api/scenarios` | Create scenario |
| GET | `/api/scenarios/:id` | Get single scenario |
| PUT | `/api/scenarios/:id` | Update (rename only) |
| POST | `/api/scenarios/:id/duplicate` | Duplicate scenario |
| DELETE | `/api/scenarios/:id` | Delete scenario |

**Authorization:** All scenario endpoints verify `scenario.userId === req.user.id`. Return 404 (not 403) for scenarios belonging to other users to avoid enumeration.

**Scenario count limit:** On POST, count existing scenarios for user. If >= 100, return `429 Too Many Scenarios`.

### 3.6 Calculator Engines (`server/calculators/`)

Each calculator is a pure function module: `calculate(inputs) → outputs`.

**Mortgage (`mortgageCalculator.js`):**
- Standard amortisation formula: `M = P[r(1+r)^n] / [(1+r)^n – 1]`
- P = loan amount (cents), r = monthly rate, n = total months
- Interest Only: `M = P × r` (monthly)
- Frequency conversion: weekly = monthly × 12/52, fortnightly = monthly × 12/26
- Generate year-by-year amortisation data for chart

**Stamp Duty (`stampDutyCalculator.js`):**
- Loads `stampDutyBrackets.json` at module init
- Walks bracket array: `duty = base + (price - min) × rate` for matching bracket
- Applies first home buyer exemption/concession per state config
- Applies foreign buyer surcharge if applicable
- VIC off-the-plan: reduces dutiable value by construction component

**Rental Yield (`rentalYieldCalculator.js`):**
- Gross: `(weeklyRent × 52) / price × 100`
- Net: `((weeklyRent × 52) − expenses) / price × 100`
- Management fees calculated as % of annual rent

**Borrowing Power (`borrowingPowerCalculator.js`):**
- Loads `hemTable.json` and `hecsThresholds.json` at module init
- Net income = gross income × (1 − estimated tax rate from ATO brackets)
- HEM floor: if declared expenses < HEM for profile, use HEM
- HECS monthly repayment from ATO threshold table
- Credit card: 3% of total limits as monthly commitment
- Available monthly surplus = net income − expenses − commitments
- Max loan = iterative solve (or formula inversion) for loan where repayment = surplus at assessment rate
- Generate deposit needed at 80% and 90% LVR

**Rent vs Buy (`rentVsBuyCalculator.js`):**
- Uses mortgage calculator internally for loan repayment
- Uses stamp duty calculator internally (NSW defaults) for buying costs
- Year-by-year simulation:
  - Buy: property value × (1 + growth)^year − remaining loan − stamp duty − buying costs
  - Rent: deposit invested × (1 + return)^year + cumulative invested savings × compounded returns
  - Savings = mortgage payment − current rent (if positive, renter invests; if negative, buyer saves)
- Breakeven = first year where buy net position > rent net position
- Chart data: 30 yearly points with both net positions

### 3.7 Services

**Email Service (`server/services/emailService.js`):**
```javascript
// Uses Resend SDK
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = {
  sendWelcomeEmail(to, displayName),
  sendVerificationOtp(to, otpCode),
  sendPasswordResetOtp(to, otpCode),
};
```
- FROM address: `noreply@propertyhack.com` (or configured domain)
- Simple HTML templates — no template engine dependency needed

**Beehiiv Service (`server/services/beehiivService.js`):**
```javascript
module.exports = {
  subscribe(email),
  unsubscribe(email),
};
```
- Uses Beehiiv REST API v2
- Requires `BEEHIIV_API_KEY` and `BEEHIIV_PUBLICATION_ID`

### 3.8 Middleware Changes

**`optionalAuth` middleware** (added to `server/middleware/auth.js`):
```javascript
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next(); // no token = anonymous, continue

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, emailVerified: true }
    });
    req.user = user || null;
  } catch {
    req.user = null; // invalid token = treat as anonymous
  }
  next();
};
```

### 3.9 Route Registration (`server/index.js` Changes)

```javascript
// New imports
const passport = require('./passport');
const profileRoutes = require('./routes/user/profile');
const calculatorRoutes = require('./routes/public/calculators');
const scenarioRoutes = require('./routes/public/scenarios');

// Passport initialization (after cookie-parser)
app.use(passport.initialize());

// Calculator rate limiter (separate from general)
const calculatorLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 60,
  message: { error: 'Too many calculation requests.' }
});

// New routes
app.use('/api/user', authenticateToken, profileRoutes);
app.use('/api/calculators', isProduction ? calculatorLimiter : noop, calculatorRoutes);
app.use('/api/scenarios', authenticateToken, scenarioRoutes);
```

## 4. Frontend Design

### 4.1 File Structure (New Files)

```
components/
├── auth/
│   ├── RegisterPage.tsx           (new — email/password + Google OAuth)
│   ├── VerifyEmailPage.tsx        (new — OTP entry)
│   ├── ForgotPasswordPage.tsx     (new — enter email)
│   ├── ResetPasswordPage.tsx      (new — OTP + new password)
│   └── GoogleAuthCallback.tsx     (new — handles OAuth redirect)
├── user/
│   ├── ProfilePage.tsx            (new — settings, preferences, deletion)
│   └── ScenarioDashboard.tsx      (new — saved scenarios list)
├── calculators/
│   ├── CalculatorLayout.tsx       (new — shared layout: inputs left, outputs right)
│   ├── MortgageCalculator.tsx     (new)
│   ├── StampDutyCalculator.tsx    (new)
│   ├── RentalYieldCalculator.tsx  (new)
│   ├── BorrowingPowerCalculator.tsx (new)
│   ├── RentVsBuyCalculator.tsx    (new)
│   ├── ToolsIndex.tsx             (new — /tools landing page listing all calculators)
│   └── shared/
│       ├── CurrencyInput.tsx      (new — auto-formatting currency field)
│       ├── SliderInput.tsx        (new — slider with manual override)
│       ├── PercentageInput.tsx    (new — percentage field)
│       ├── ResultCard.tsx         (new — headline number display)
│       ├── SaveScenarioButton.tsx (new — save/CTA based on auth)
│       ├── ShareButton.tsx        (new — copy URL with query params)
│       └── ExpandableSection.tsx  (new — advanced inputs wrapper)
├── layout/
│   ├── Header.tsx                 (modified — add Tools dropdown + user menu)
│   ├── Footer.tsx                 (modified — add Tools links)
│   └── PublicLayout.tsx           (new — wraps Header + content + Footer)
services/
├── authService.ts                 (modified — add register, Google, OTP methods)
├── calculatorService.ts           (new — API calls to calculator endpoints)
├── scenarioService.ts             (new — CRUD for saved scenarios)
└── userService.ts                 (new — profile, preferences)
contexts/
└── AuthContext.tsx                 (new — user state, login/logout/register)
hooks/
├── useCalculator.ts               (new — debounced calculation + state management)
└── useUserPreferences.ts          (new — load/apply user preferences)
```

### 4.2 Routing Changes (`App.tsx`)

New routes to add:

```typescript
// Auth routes (public)
<Route path="/register" element={<RegisterPage />} />
<Route path="/verify-email" element={<VerifyEmailPage />} />
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
<Route path="/auth/google/callback" element={<GoogleAuthCallback />} />

// Login route — modified to support both admin and regular users
<Route path="/login" element={<LoginPage />} />  // existing, needs modification

// User routes (require auth, any role)
<Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
<Route path="/profile/scenarios" element={<RequireAuth><ScenarioDashboard /></RequireAuth>} />

// Calculator routes (public)
<Route path="/tools" element={<ToolsIndex />} />
<Route path="/tools/mortgage-calculator" element={<MortgageCalculator />} />
<Route path="/tools/stamp-duty-calculator" element={<StampDutyCalculator />} />
<Route path="/tools/rental-yield-calculator" element={<RentalYieldCalculator />} />
<Route path="/tools/borrowing-power-calculator" element={<BorrowingPowerCalculator />} />
<Route path="/tools/rent-vs-buy-calculator" element={<RentVsBuyCalculator />} />
```

**RequireAuth change:** Currently redirects unauthenticated users to `/login` and assumes admin. Needs to be split:
- `RequireAuth` — any authenticated user (for profile, scenarios)
- `RequireAdmin` — admin users only (for `/admin/*` routes)

The existing `RequireAuth` component wrapping admin routes becomes `RequireAdmin`.

### 4.3 AuthContext (New)

Replace the inline auth state in `App.tsx` with a proper context:

```typescript
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
}
```

User object shape (returned from API, stored in context):
```typescript
interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'user';
  avatarUrl: string | null;
  emailVerified: boolean;
  newsletterOptIn: boolean;
  preferences: UserPreferences | null;
}
```

### 4.4 Header Changes

Current header: logo + search bar + mobile search toggle.

Add:
1. **"Tools" dropdown** between search bar and right-side controls:
   - Desktop: hover-reveal dropdown listing all 5 calculators
   - Mobile: collapsible section in mobile menu
2. **User menu** (right side):
   - Anonymous: "Sign In" link
   - Authenticated: avatar/initial circle → dropdown with "Profile", "Saved Scenarios", "Sign Out"
   - Admin: same + "Admin Panel" link

### 4.5 Calculator Layout Component

Shared layout for all 5 calculators:

```
┌─────────────────────────────────────────────────────┐
│ Header                                               │
├─────────────────────────────────────────────────────┤
│ Breadcrumb: Home > Tools > Mortgage Calculator       │
├─────────────────────────────────────────────────────┤
│ H1: Mortgage Repayment Calculator                    │
│ Subtitle: Calculate your monthly repayments...       │
├────────────────────────┬────────────────────────────┤
│                        │                             │
│   INPUT FORM           │   RESULTS                   │
│                        │                             │
│   [Property Price]     │   ┌──────────────────────┐ │
│   [Deposit]            │   │ $2,847 /month        │ │
│   [Loan Term ━━━━━]    │   │ headline result      │ │
│   [Interest Rate]      │   └──────────────────────┘ │
│   [Repayment Type]     │                             │
│   [Frequency]          │   Total interest: $424,920  │
│                        │   Total repaid: $1,024,920  │
│   ▶ Advanced           │   LVR: 80%                  │
│                        │                             │
│   [Reset] [Share]      │   ┌──────────────────────┐ │
│                        │   │  📊 Chart             │ │
│                        │   │                       │ │
│                        │   └──────────────────────┘ │
│                        │                             │
│                        │   [Save Scenario]           │
├────────────────────────┴────────────────────────────┤
│ ▶ Yearly Breakdown (expandable table)                │
├─────────────────────────────────────────────────────┤
│ Footer                                               │
└─────────────────────────────────────────────────────┘

Mobile: inputs stack above results (single column).
```

### 4.6 `useCalculator` Hook

Core hook shared by all calculators:

```typescript
function useCalculator<TInputs, TOutputs>(
  calculatorType: string,
  defaultInputs: TInputs
) {
  const [inputs, setInputs] = useState<TInputs>(defaultInputs);
  const [outputs, setOutputs] = useState<TOutputs | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Initialize from URL query params (for share links / saved scenarios)
  useEffect(() => { parseQueryParams() }, []);

  // Debounced API call on input change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCalculation(calculatorType, inputs).then(setOutputs);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputs]);

  // Update URL query params on input change (for sharing)
  useEffect(() => { updateQueryParams(inputs) }, [inputs]);

  return { inputs, setInputs, outputs, isCalculating, reset: () => setInputs(defaultInputs) };
}
```

### 4.7 Shared Input Components

**CurrencyInput:**
- Formats display value with commas ($1,250,000)
- Strips formatting for internal value (integer cents)
- Shows $ prefix
- Debounced onChange

**SliderInput:**
- Range slider + numeric input side by side
- Slider updates input, input updates slider
- Configurable min/max/step
- Labels for current value

**PercentageInput:**
- Numeric input with % suffix
- Step: 0.01 by default
- Min: 0, Max: configurable

**ExpandableSection:**
- Collapsible wrapper with "Advanced" / "Show more" label
- Smooth expand/collapse animation
- Remembers state per session

### 4.8 Homepage Preference Integration

When a logged-in user with preferences visits `/`:

1. `useUserPreferences` hook checks `AuthContext` for `user.preferences`
2. If preferences exist, passes them as initial values to `FilterBar`
3. FilterBar receives `initialFilters` prop (new) in addition to existing `filters` prop
4. User can override filters during session — overrides are not persisted
5. On next visit, preferences are re-applied fresh

Implementation: modify `HomePage.tsx` to read from context and pass to FilterBar. Minimal change.

### 4.9 Login/Register Page Design

**Login page** (`/login`):
- Existing login page redesigned to support both admin and regular users
- Email + password fields (existing)
- "Sign in with Google" button (new)
- "Forgot password?" link (new)
- "Don't have an account? Sign up" link (new)
- After login, redirect: admin users → `/admin`, regular users → previous page or `/`

**Register page** (`/register`):
- Display name
- Email
- Password + confirm password
- "Sign up with Google" button
- Newsletter checkbox: "Subscribe to our newsletter to stay up to date" (default checked)
- Terms acceptance checkbox
- After registration → redirect to `/verify-email`

**Verify email page** (`/verify-email`):
- 6-digit OTP input
- "Resend code" button (with cooldown timer)
- After verification → redirect to `/` or previous page

### 4.10 Profile Page Design

```
┌─────────────────────────────────────────┐
│ Profile                                  │
├─────────────────────────────────────────┤
│                                          │
│  [Avatar]  Dan                           │
│            dan@email.com  ✓ Verified     │
│                                          │
│  ── Account ──────────────────────────  │
│  Display Name    [____________]          │
│  Password        [Change Password]       │
│                                          │
│  ── News Preferences ────────────────  │
│  Default Location   [Sydney      ▼]     │
│  Categories         [■ Market Updates]   │
│                      [■ Investment    ]   │
│                      [□ First Home    ]   │
│  Date Range         [Week ▼]             │
│                                          │
│  ── Newsletter ──────────────────────  │
│  [✓] Subscribed to newsletter            │
│                                          │
│  ── Saved Scenarios ─────────────────  │
│  [View All Scenarios →]                  │
│  12 scenarios saved                      │
│                                          │
│  ── Danger Zone ─────────────────────  │
│  [Delete My Account]                     │
│                                          │
└─────────────────────────────────────────┘
```

## 5. Data Flow Diagrams

### 5.1 Registration Flow
```
User fills form → POST /api/auth/register
  → validate inputs
  → check email uniqueness
  → hash password
  → create User (emailVerified: false)
  → generate OTP, hash, store with 10min expiry
  → send welcome email + OTP via Resend
  → if newsletter checked → subscribe via Beehiiv
  → return JWT tokens + user object
  → frontend stores tokens, redirects to /verify-email

User enters OTP → POST /api/auth/verify-email
  → validate OTP against stored hash
  → check expiry
  → set emailVerified: true, clear OTP fields
  → return success
  → frontend redirects to /
```

### 5.2 Google OAuth Flow
```
User clicks "Sign in with Google"
  → frontend opens /api/auth/google
  → Passport redirects to Google consent screen
  → user approves
  → Google redirects to /api/auth/google/callback
  → Passport extracts profile (email, name, avatar, googleId)
  → find user by googleId OR email
  → if new: create User (emailVerified: true, googleId set)
  → if existing: link googleId if not set
  → generate JWT tokens
  → redirect to frontend /auth/google/callback#token=xxx&refresh=yyy
  → GoogleAuthCallback component extracts tokens, stores, redirects to /
```

### 5.3 Calculator Flow
```
User opens /tools/mortgage-calculator
  → useCalculator initialises with defaults (or URL query params)
  → on any input change (debounced 300ms):
      → POST /api/calculators/mortgage/calculate { inputs }
      → server validates, calculates, returns { outputs + chartData }
      → frontend renders results + chart

User clicks "Share"
  → URL updates with query params encoding all inputs
  → copy to clipboard

User clicks "Save Scenario" (authenticated)
  → modal: enter scenario name
  → POST /api/scenarios { name, calculatorType, inputs, outputs, headlineLabel, headlineValue }
  → toast: "Scenario saved"

User clicks "Save Scenario" (anonymous)
  → show CTA: "Sign in to save and compare your scenarios"
```

### 5.4 Scenario Restore Flow
```
User opens /profile/scenarios
  → GET /api/scenarios → list of scenarios with headline data

User clicks "Open" on a scenario
  → navigate to /tools/:calculator?scenario=:id
  → useCalculator detects scenario param
  → GET /api/scenarios/:id → full inputs + outputs
  → populate inputs from saved data
  → display saved outputs immediately (no recalculation needed)
  → user can modify inputs → triggers fresh calculation
```

## 6. Environment Variables (New)

```
# Resend (transactional email)
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=noreply@propertyhack.com

# Google OAuth
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Beehiiv (newsletter)
BEEHIIV_API_KEY=xxxx
BEEHIIV_PUBLICATION_ID=pub_xxxx
```

Add to `server/.env` (local) and production environment.

## 7. New Dependencies

### Backend
| Package | Purpose |
|---|---|
| `passport` | Auth framework |
| `passport-google-oauth20` | Google OAuth strategy |
| `resend` | Transactional email SDK |

### Frontend
| Package | Purpose |
|---|---|
| `recharts` | Charts (area, line, bar) |

Note: `bcrypt`, `jsonwebtoken`, `express-validator`, `express-rate-limit` are already installed.

## 8. SEO Implementation

### Calculator Pages
- Each page gets a `<Helmet>` with unique title/description
- JSON-LD schema: `WebApplication` type with calculator name, description, URL
- Breadcrumb JSON-LD: `Home > Tools > [Calculator Name]`
- Add all calculator URLs to `server/routes/sitemap.js`
- Crawler SSR middleware already handles meta injection for bots — extend it for `/tools/*` routes

### Tools Index Page (`/tools`)
- Landing page listing all 5 calculators with descriptions
- SEO target: "property calculators australia"
- Card layout with links to each calculator

### Navigation
- Header: "Tools" text link with dropdown on hover (desktop) / tap (mobile)
- Footer: add "Tools" section with links to all 5 calculators

## 9. Testing Strategy

### Backend Tests
- **Calculator engines**: Unit tests for each calculator with known input/output pairs
  - Mortgage: verify against known amortisation tables
  - Stamp duty: verify against official state calculator results
  - Edge cases: zero deposit, max LVR, boundary brackets
- **Auth routes**: Integration tests for register, login, OTP, Google OAuth mock
- **Scenario routes**: Integration tests for CRUD + authorization checks
- **Services**: Unit tests for email and Beehiiv service (mocked HTTP)

### Frontend Tests
- **Calculator components**: Render tests, input interaction, output display
- **Auth flow**: Login/register form validation, redirect behaviour
- **Scenario dashboard**: List rendering, filter, search, actions

### E2E Tests (Playwright)
- Full registration → verify → login flow
- Calculator: enter inputs → see results → share link → restore from link
- Save scenario → view dashboard → open scenario → verify restored
- Account deletion flow
