# Newsletter Inbound Email — Proposal

## Problem
The newsletter ingestion pipeline is fully built (webhook endpoint, fetcher, BullMQ processing) but emails can't actually reach it. There's no inbound email routing configured — the last-mile connection between "forward a newsletter" and "article appears in feed" is missing.

## Solution
Set up Resend Inbound on a subdomain (e.g. `ingest.propertyhack.com`) so that emails forwarded to a single catch-all address are POSTed to the existing `/api/webhooks/newsletter` endpoint. Minimal code changes — mostly infrastructure wiring.

## Scope

### In scope
- Resend Inbound configuration (DNS MX/SPF records, Resend dashboard setup)
- Adapt the existing webhook endpoint to handle Resend's inbound payload format
- Single catch-all address (e.g. `news@ingest.propertyhack.com`)
- Dan forwards newsletters to this address; they flow through the existing pipeline
- Webhook signature verification using Resend's `svix` signing (already in node_modules)

### Out of scope
- Per-source unique email addresses
- Auto-creating Newsletter sources from unknown senders
- Bounce handling or delivery receipts
- Any changes to the newsletter fetcher logic itself

## Acceptance Criteria
1. Dan can forward a property newsletter email to `news@ingest.propertyhack.com`
2. The email arrives at the webhook, matches an allowed sender, and enqueues processing
3. Articles extracted from the newsletter appear in the public feed after pipeline completes
4. Emails from non-allowed senders are silently ignored (no error, no processing)
5. Webhook validates Resend's signature to prevent spoofed POSTs
