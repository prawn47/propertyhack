# Newsletter Inbound Email — Spec

## Overview
Wire up Resend Inbound to deliver forwarded newsletter emails to the existing webhook endpoint, with proper payload adaptation and signature verification.

## How Resend Inbound Works
1. Configure a subdomain (`ingest.propertyhack.com`) with MX records pointing to Resend
2. Set up an inbound route in Resend dashboard: catch-all `*@ingest.propertyhack.com` → webhook URL
3. When an email arrives, Resend POSTs a JSON payload to the webhook URL
4. Resend signs the payload using Svix — verify with the `svix` npm package

## Resend Inbound Payload Format
Resend POSTs this structure (relevant fields):
```json
{
  "type": "email.received",
  "data": {
    "from": "sender@example.com",
    "to": ["news@ingest.propertyhack.com"],
    "subject": "Weekly Property Update",
    "html": "<html>...</html>",
    "text": "plain text fallback",
    "headers": [{ "name": "...", "value": "..." }]
  }
}
```

Signature headers sent by Resend:
- `svix-id`
- `svix-timestamp`
- `svix-signature`

## Changes Required

### 1. Webhook Endpoint Adaptation (`server/routes/webhooks/newsletter.js`)

**Current state:** Expects flat `{ from, html, subject }` body + `x-webhook-secret` header.

**New state:** Accept Resend's nested `{ type, data: { from, html, subject } }` payload + Svix signature verification.

- Replace `x-webhook-secret` validation with Svix signature verification
- Extract `from`, `html`, `subject` from `data` object instead of top-level body
- Keep all downstream logic identical (source matching, BullMQ enqueue)
- Add `RESEND_WEBHOOK_SIGNING_SECRET` env var (obtained from Resend dashboard)

### 2. DNS Configuration (manual — documented)
Add to `ingest.propertyhack.com`:
- MX record: `10 inbound.resend.com`
- SPF TXT: `v=spf1 include:resend.dev ~all`

### 3. Resend Dashboard Configuration (manual — documented)
- Add inbound domain `ingest.propertyhack.com`
- Create webhook route: `*@ingest.propertyhack.com` → `https://propertyhack.com/api/webhooks/newsletter`
- Copy the signing secret to `RESEND_WEBHOOK_SIGNING_SECRET` env var

### 4. Raw Body for Signature Verification
Svix verification requires the raw request body. Add raw body capture middleware for the webhook route (Express `express.raw()` or `verify` callback on `express.json()`).

## Environment Variables
| Variable | Purpose |
|---|---|
| `RESEND_WEBHOOK_SIGNING_SECRET` | Svix signing secret from Resend inbound webhook config |

## Data Flow
```
Dan forwards newsletter to news@ingest.propertyhack.com
  → Resend receives email (MX record)
  → Resend POSTs to /api/webhooks/newsletter (signed payload)
  → Webhook verifies Svix signature
  → Extracts from/html/subject from data object
  → Matches sender against NEWSLETTER sources' allowedSenders
  → Enqueues BullMQ source-fetch job with emailHtml
  → newsletterFetcher processes HTML, extracts articles
  → Articles enter summarise → embed pipeline
  → Articles appear in public feed
```

## No Changes Required
- Newsletter fetcher (`server/services/fetchers/newsletterFetcher.js`) — works as-is
- IngestionSource model — no schema changes
- Admin UI SourceEditor — newsletter config fields already exist
- BullMQ pipeline — no changes
