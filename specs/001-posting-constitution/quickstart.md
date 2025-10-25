# Quickstart: Posting App

Created: 2025-10-24  
Branch: 001-posting-constitution

## Prerequisites
- Node.js 18+
- Environment variables per `DEPLOYMENT.md`

## Run Backend
```bash
cd server
npm install
npm run dev
```

## Run Frontend
```bash
npm install
npm run dev
```

## Core Flows
- Authenticate via Google/LinkedIn → redirected back with tokens
- Generate ideas from a topic → select one → generate draft
- Edit draft → Publish now to LinkedIn
- Schedule draft → pick date/time → view/edit/cancel in upcoming list
- Prepare for X → apply character guidance → complete posting manually

## Notes
- If content generation fails, retry or write manually in the editor.
- Ensure LinkedIn access token/config is valid for publishing.
