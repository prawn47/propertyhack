# Newsletter Inbound Email — Setup Guide

## 1. DNS Records

Add these records for `ingest.propertyhack.com` in your domain registrar:

| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | ingest | `inbound.resend.com` | 10 |
| TXT | ingest | `v=spf1 include:resend.dev ~all` | — |

## 2. Resend Dashboard

1. Go to [Resend Dashboard](https://resend.com) → **Domains**
2. Add `ingest.propertyhack.com` as an inbound domain
3. Wait for DNS verification to complete
4. Go to **Webhooks** → create a new webhook:
   - **Endpoint URL:** `https://propertyhack.com/api/webhooks/newsletter`
   - **Events:** select `email.received`
5. Copy the **Signing Secret** — you'll need it next

## 3. Environment Variable

Add to your server `.env`:
```
RESEND_WEBHOOK_SIGNING_SECRET=whsec_xxxxxxxxxxxxx
```

## 4. Create a Newsletter Source

1. Go to PropertyHack admin → **Sources** → **Add Source**
2. Type: **Newsletter**
3. Name: something descriptive (e.g. "Domain Property Newsletter")
4. **Allowed Senders**: add the sender email domain (e.g. `domain.com.au`) — the webhook matches against this
5. Save

## 5. Test It

1. Forward a newsletter email to `news@ingest.propertyhack.com`
2. Check server logs for `[newsletter-webhook] Enqueued fetch for source...`
3. The article should appear in the feed after pipeline processing (summarise → embed)

## Troubleshooting

- **401 Invalid signature**: Check `RESEND_WEBHOOK_SIGNING_SECRET` matches Resend dashboard
- **200 ignored / no matching source**: The sender email doesn't match any NEWSLETTER source's `allowedSenders` — add the domain
- **No webhook received**: Check DNS MX record is propagated (`dig MX ingest.propertyhack.com`)
