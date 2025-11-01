## Scheduled Posting and LinkedIn Token Sync

When you click "Schedule" in the New Post Generator, the app now:

1. Calls `POST /api/user/linkedin-sync` to copy the `linkedin_access_token` cookie into your user record with a 30-day expiry.
2. Creates a `ScheduledPost` at the selected time.
3. A background worker (running in `server/index.js`) checks every 60s and auto-publishes due posts using the stored LinkedIn token.

Notes:
- Scheduling is intended for within 30 days to guarantee the cookie-backed token is still valid when the worker runs.
- If the LinkedIn connection expires, re-connect in Settings; clicking Schedule will re-sync the fresh cookie to the database.
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1XHMKFPYN3LsUzVRMJ9qZi2xPRIvaJD9G

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
