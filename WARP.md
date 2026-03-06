# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Quick Start
```bash
# Start both frontend and backend services (recommended)
./start.sh

# Stop all services
./stop.sh

# View logs
tail -f backend.log
tail -f frontend.log
```

### Development
```bash
# Frontend (React + Vite, runs on port 3004)
npm install
npm run dev

# Backend (Express + Prisma, runs on port 3001)
cd server
npm install
npm run dev

# Manual start (two terminals required)
# Terminal 1: cd server && npm run dev
# Terminal 2: npm run dev
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

### Testing & Development
```bash
# No formal test suite currently exists
# Manual testing workflow:
# 1. Run ./start.sh to spin up both services
# 2. Navigate to http://localhost:3004
# 3. Check logs in backend.log and frontend.log for issues

# Redis (required for background jobs)
brew install redis          # macOS
brew services start redis   # Start Redis
brew services stop redis    # Stop Redis

# Check Redis is running
redis-cli ping  # Should return "PONG"
```

## Architecture Overview

### Stack
- **Frontend**: React 19 + TypeScript + Vite (port 3004)
- **Backend**: Express + Node.js (JavaScript, port 3001)
- **Database**: PostgreSQL (production) / SQLite (dev support) via Prisma ORM
- **Job Queue**: BullMQ with Redis
- **Auth**: JWT tokens (access + refresh) stored in localStorage (No Sessions)
- **Payments**: Stripe (subscription management)
- **AI**: OpenAI (server-side), Google Gemini (client-side generation)
- **Property Hack**: Market-specific real estate content engine (Articles, Sources, Categories)

### Directory Structure
```
propertyhack/
├── components/         # React UI components
│   ├── DashboardSection.tsx      # Main posts management view
│   ├── PostCreationWizard.tsx    # Multi-step post creation
│   ├── DraftEditor.tsx           # Edit drafts
│   ├── PropertyHackHome.tsx      # Property Hack public home
│   ├── ArticleDetail.tsx         # Article view
│   ├── admin/                    # Admin components for Property Hack
│   └── ...
├── server/
│   ├── routes/
│   │   ├── api.js           # User settings, posts CRUD
│   │   ├── auth.js          # Auth (JWT)
│   │   ├── admin/           # Property Hack Admin API (articles, meta, news)
│   │   ├── public/          # Public API (articles)
│   │   └── ...
│   ├── services/
│   │   └── openaiService.js # OpenAI content generation
│   ├── queues/              # BullMQ queue definitions
│   │   ├── scheduledPostsQueue.js
│   │   └── ...
│   ├── workers/             # BullMQ job processors
│   │   ├── scheduledPostsWorker.js
│   │   └── articleProcessingWorker.js
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── index.js             # Express server entry point
├── start.sh            # Start both frontend and backend
├── stop.sh             # Stop all services
├── App.tsx             # Root component, routing
└── vite.config.ts      # Dev server (port 3004)
```

### Key Architectural Patterns

#### Authentication Flow
1. User logs in → backend returns JWT `accessToken` (15m) + `refreshToken` (7d)
2. Frontend stores tokens in localStorage via `authService`
3. API calls use `Authorization: Bearer <token>`
4. `authService` auto-refreshes expired tokens using the refresh token

#### Property Hack Content Engine
- **Sources**: RSS feeds or APIs (managed via `ArticleSource`)
- **Ingestion**: `dailyNewsFetch` job fetches content -> `articleProcessingWorker` processes/summarizes -> stores as `Article`
- **Markets**: Content is segmented by Market (AU, US, UK, CA)
- **Public Access**: Articles are served via `/api/public/articles` (no auth required)

#### Background Job Queue (BullMQ + Redis)
- **Scheduled Posts**: `scheduled-posts` queue processed by `scheduledPostsWorker` (publishes to LinkedIn)
- **Article Processing**: `article-processing` queue processed by `articleProcessingWorker` (fetches/summarizes news)
- **Scheduler**: `server/index.js` runs intervals to check for due posts or trigger fetches

### Database Models (Prisma)
- **User / UserSettings**: Auth, profile, and preferences
- **Post Models**: `DraftPost`, `ScheduledPost`, `PublishedPost` (LinkedIn content)
- **Property Hack Models**:
    - **Market**: Supported regions (AU, US, etc.)
    - **ArticleCategory**: Content categories (Investment, Policy, etc.)
    - **ArticleSource**: Feed configurations (RSS/API)
    - **Article**: The content itself (with SEO fields, status, market)

### Environment Variables
**Backend** (`server/.env`):
- `DATABASE_URL`: DB connection
- `REDIS_URL`: Redis connection (default: `redis://localhost:6379`)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: Auth secrets
- `OPENAI_API_KEY`: For content generation/summarization
- `STRIPE_SECRET_KEY`: Payments
- `PORT` (default: 3001)

### Important Implementation Notes
- **Prisma**: Run `npm run db:generate` after schema changes.
- **LinkedIn**: Tokens expire after 60 days. Scheduled posts rely on stored tokens.
- **Testing**: Ensure Redis is running for any job queue functionality.
- **Deployment**: Production uses PostgreSQL. See `DEPLOYMENT.md`.
