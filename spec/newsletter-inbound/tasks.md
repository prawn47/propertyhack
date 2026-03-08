# Newsletter Inbound Email — Tasks

## Phase 1: Implementation (single phase — small feature)

### T1: Add raw body capture middleware
- **File:** `server/index.js`
- **Work:** Mount `express.json({ verify })` for `/api/webhooks/newsletter` before the general JSON parser
- **Deps:** none

### T2: Update webhook endpoint for Resend payload
- **File:** `server/routes/webhooks/newsletter.js`
- **Work:**
  - Replace `validateWebhookSecret` with `verifyResendSignature` using `svix` package
  - Extract `from`, `html`, `subject` from `req.body.data` instead of `req.body`
  - Ignore events where `type !== 'email.received'`
  - Remove `express-validator` checks (Resend controls the payload shape)
- **Deps:** T1

### T3: Update env example
- **File:** `server/.env.example`
- **Work:** Add `RESEND_WEBHOOK_SIGNING_SECRET` with comment
- **Deps:** none

### T4: Write setup guide
- **File:** `spec/newsletter-inbound/setup-guide.md`
- **Work:** Step-by-step instructions for DNS records, Resend dashboard config, env var, creating a NEWSLETTER source, and testing
- **Deps:** none
