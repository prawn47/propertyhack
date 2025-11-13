# PropertyHack

AI-powered property insights and article curation platform.

## Overview

PropertyHack provides curated property news, AI-generated summaries, and professional insights for property professionals, investors, and enthusiasts.

## Quick Start

**Prerequisites:** Node.js, Redis

### Development

1. **Install dependencies:**
   ```bash
   npm install
   cd server && npm install
   ```

2. **Configure environment:**
   - Copy `server/.env.example` to `server/.env`
   - Add required API keys (see Environment Variables below)

3. **Start services:**
   ```bash
   ./start.sh
   ```
   
   This starts both backend (port 3001) and frontend (port 3004)

4. **Access application:**
   - Frontend: http://localhost:3004
   - Backend API: http://localhost:3001

### Environment Variables

#### Backend (`server/.env`)
```bash
# Database
DATABASE_URL=file:./dev.db

# Redis (required for background jobs)
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=<generate-random-string>
JWT_REFRESH_SECRET=<generate-random-string>

# AI Services
GEMINI_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>

# News API
NEWSAPI_API_KEY=<your-key>

# Email
RESEND_API_KEY=<your-key>
RESEND_FROM_EMAIL=noreply@propertyhack.com
```

#### Frontend (`.env.local`)
```bash
GEMINI_API_KEY=<your-key>
```

## Features

- 📰 Curated property news articles
- 🤖 AI-powered article summaries
- 👤 User authentication and profiles
- 📊 Admin dashboard for content management
- 🔍 Category and source filtering
- 📅 Scheduled news fetching
- 🖼️ Image processing and storage

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **Queue:** BullMQ + Redis
- **AI:** Google Gemini, OpenAI
- **Email:** Resend

## Documentation

See `WARP.md` for detailed architecture and development guide.
