# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Development
```bash
# Frontend (React + Vite, runs on port 3004)
npm install
npm run dev

# Backend (Express + Prisma, runs on port 3001)
cd server
npm install
npm run dev

# Start both: run frontend and backend in separate terminals
```

### Database Management
```bash
cd server

# Generate Prisma client after schema changes
npm run db:generate

# Create and apply migrations
npm run db:migrate

# View database in browser
npm run db:studio
```

### Production Build
```bash
# Frontend
npm run build    # outputs to dist/

# Backend
cd server
npm start
```

## Architecture Overview

### Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express + Node.js (JavaScript)
- **Database**: SQLite (dev) via Prisma ORM, PostgreSQL-ready for production
- **Job Queue**: BullMQ with Redis (for scheduled posts and background jobs)
- **Auth**: JWT tokens (access + refresh) stored in localStorage
- **AI**: Google Gemini API (client-side generation), OpenAI (server-side)
- **OAuth**: LinkedIn OAuth2 (via `passport-linkedin-oauth2`)

### Directory Structure
```
quord_g0/
├── components/         # React UI components
│   ├── DashboardSection.tsx      # Main posts management view
│   ├── PostCreationWizard.tsx    # Multi-step post creation
│   ├── DraftEditor.tsx           # Edit drafts
│   ├── NewsCarousel.tsx          # Curated news articles carousel
│   ├── SettingsPage.tsx          # User settings management
│   ├── LoginPage.tsx / RegisterPage.tsx
│   └── OAuthCallback.tsx         # LinkedIn OAuth handler
├── services/           # Frontend service layer
│   ├── authService.ts       # JWT token management, auto-refresh
│   ├── dbService.ts         # API calls for posts/settings
│   ├── linkedInService.ts   # LinkedIn posting logic
│   ├── geminiService.ts     # AI content generation
│   ├── schedulingService.ts # Scheduled posts API
│   └── statsService.ts
├── server/
│   ├── routes/
│   │   ├── auth.js          # Registration, login, JWT refresh
│   │   ├── api.js           # User settings, posts CRUD
│   │   ├── linkedin.js      # LinkedIn OAuth flow + posting
│   │   ├── news.js          # News curation API
│   │   └── test.js
│   ├── services/
│   │   └── perplexityService.js # Perplexity AI news fetching
│   ├── queues/              # BullMQ queue definitions
│   │   ├── connection.js    # Redis connection config
│   │   ├── scheduledPostsQueue.js
│   │   └── newsCurationQueue.js
│   ├── workers/             # BullMQ job processors
│   │   ├── scheduledPostsWorker.js
│   │   └── newsCurationWorker.js
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/
│   ├── middleware/          # Auth middleware
│   └── index.js             # Express server + job queue schedulers
├── App.tsx              # Root component, routing, auth state
├── types.ts             # Shared TypeScript types
└── vite.config.ts       # Dev server (port 3004) + API proxy
```

### Key Architectural Patterns

#### Authentication Flow
1. User logs in → backend returns JWT `accessToken` (15m) + `refreshToken` (7d)
2. Frontend stores tokens in localStorage via `authService`
3. All API calls use `authService.makeAuthenticatedRequest()` which:
   - Attaches `Authorization: Bearer <token>` header
   - Auto-refreshes expired tokens using the refresh token
   - Logs user out if refresh fails

#### LinkedIn OAuth Flow
1. User clicks "Connect LinkedIn" → frontend redirects to `/api/linkedin`
2. Backend initiates OAuth → LinkedIn redirects to `/api/linkedin/callback`
3. Backend stores `linkedin_access_token` + expiry in User table
4. Redirect to frontend with success message
5. Cookie-based token used for scheduled posts

#### Post Management Flow
- **Drafts**: Create → Edit → Publish OR Schedule
- **Publishing**: Draft → `POST /api/posts/publish` → moves to PublishedPost table → calls LinkedIn API
- **Scheduling**: Draft → `POST /api/scheduled-posts` → stored with `scheduledFor` timestamp → background worker publishes when due

#### Background Job Queue (BullMQ + Redis)
**Architecture:**
- Uses BullMQ for reliable job processing with Redis as the backing store
- Queues: `scheduled-posts`, `news-curation`
- Workers process jobs with automatic retry, failure tracking, and rate limiting

**Scheduled Posts Worker** (`workers/scheduledPostsWorker.js`):
- Processes jobs from `scheduled-posts` queue
- Publishes posts to LinkedIn via API
- Concurrency: 5 jobs, rate limit: 10 jobs/second
- Automatic retry on failure (3 attempts with exponential backoff)
- Updates database: moves to `PublishedPost` or marks as `failed`

**Scheduled Posts Checker** (runs every 60s in `server/index.js`):
- Queries database for due posts (`status=scheduled` and `scheduledFor <= now`)
- Adds jobs to `scheduled-posts` queue for processing

**News Curation Worker** (`workers/newsCurationWorker.js`):
- Processes jobs from `news-curation` queue
- Fetches curated articles via Perplexity AI
- Concurrency: 3 jobs, rate limit: 5 jobs/60 seconds
- Stores up to 50 most recent articles per user
- Prevents duplicate fetches (23-hour cooldown)

**News Curation Checker** (runs every 10m in `server/index.js`):
- Checks all users for 6 AM local time
- Adds jobs to `news-curation` queue for eligible users

### Database Models (Prisma)
- **User**: Authentication + LinkedIn OAuth fields
- **UserSettings**: User preferences (tone, industry, timezone, etc.)
- **DraftPost**: Unpublished content
- **PublishedPost**: Posts that have been published to LinkedIn
- **ScheduledPost**: Posts scheduled for future publishing (includes status tracking)
- **NewsArticle**: Curated news articles for each user (title, summary, url, source, etc.)

### Environment Variables
**Frontend** (`.env` or `.env.local`):
- `GEMINI_API_KEY`
- `LINKEDIN_ACCESS_TOKEN` (optional, for direct API testing)

**Backend** (`server/.env`):
- `DATABASE_URL` - SQLite path or PostgreSQL connection string
- `REDIS_URL` - Redis connection string for BullMQ (default: `redis://localhost:6379`)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `GEMINI_API_KEY`, `OPENAI_API_KEY`
- `PERPLEXITY_API_KEY` - For news curation (get from https://www.perplexity.ai/settings/api)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` - Email service
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `LINKEDIN_CLIENT_ID`, `QUORD_LINKEDIN_CLIENT_SECRET`, `QUORD_LINKEDIN_REDIRECT_URI`
- `PORT` (default: 3001), `NODE_ENV`, `CORS_ORIGIN`

### Important Implementation Notes

#### LinkedIn Posting Requirements
- **Always use `credentials: 'include'`** in frontend fetch calls to LinkedIn endpoints (critical for cookie-based auth)
- LinkedIn tokens expire after 60 days; user must reconnect via Settings
- Scheduled posts rely on token stored in database (synced from cookie on schedule creation)

#### Prisma Best Practices
- Run `npm run db:generate` after any `schema.prisma` changes
- Use `npx prisma studio` to inspect database visually
- For production, change `provider = "sqlite"` to `"postgresql"` in schema.prisma and run `npx prisma migrate deploy`

#### Testing Scheduled Posts
See `TEST_STATUS.md` for detailed testing procedures. Key points:
- **Requires Redis running**: `brew install redis && brew services start redis` (macOS)
- Backend logs show: `[scheduler] Found X due posts`, `[scheduler] Queued post X for publishing`
- Worker logs show: `[scheduled-posts-worker] Processing post X`, `[scheduled-posts-worker] Successfully published post X`
- Schedule posts 2 minutes in future to test worker quickly
- Check user has valid LinkedIn token: `linkedinConnected = true`, token not expired
- View queue status: Use BullMQ dashboard or Redis CLI (`redis-cli` → `KEYS *`)

### Common Tasks

#### Add a New API Endpoint
1. Define route in `server/routes/api.js` (or create new route file)
2. Add authentication middleware if needed: `const { authenticateJWT } = require('../middleware/auth')`
3. Access Prisma via `req.prisma`
4. Return JSON responses: `res.json({ data })`

#### Add a New React Component
1. Create in `components/` directory
2. Import types from `types.ts`
3. Use services (`authService`, `dbService`, etc.) for API calls
4. Handle loading states and errors

#### Modify Database Schema
1. Edit `server/prisma/schema.prisma`
2. Run `cd server && npm run db:migrate` (creates migration)
3. Run `npm run db:generate` (updates Prisma client)
4. Update TypeScript types in `types.ts` if needed

#### Debug OAuth Issues
1. Check callback URLs match in LinkedIn Developer Console
2. Verify environment variables: `LINKEDIN_CLIENT_ID`, `QUORD_LINKEDIN_CLIENT_SECRET`
3. Check backend logs for OAuth errors
4. Test redirect: `http://localhost:3001/api/linkedin` should redirect to LinkedIn

### Migration Notes
- **SQLite → PostgreSQL**: Follow guide in `DEPLOYMENT.md`
- Backend uses Prisma, so migration is straightforward (change `provider` in schema, update `DATABASE_URL`, run `npx prisma migrate deploy`)
