# Newsletter Inbound Email — Design

## Changes

### 1. Webhook Endpoint (`server/routes/webhooks/newsletter.js`)

Replace the entire validation and extraction logic:

```js
// BEFORE
function validateWebhookSecret(req, res, next) {
  const secret = req.headers['x-webhook-secret']
  // ... shared secret check
}
router.post('/', validateWebhookSecret, [...], async (req, res) => {
  const { from, html, subject } = req.body
  // ...
})

// AFTER
const { Webhook } = require('svix')

function verifyResendSignature(req, res, next) {
  const secret = process.env.RESEND_WEBHOOK_SIGNING_SECRET
  if (!secret) {
    console.warn('[newsletter-webhook] RESEND_WEBHOOK_SIGNING_SECRET not set — skipping verification')
    return next()
  }
  const wh = new Webhook(secret)
  try {
    wh.verify(req.rawBody, {
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    })
    next()
  } catch (err) {
    console.error('[newsletter-webhook] Signature verification failed:', err.message)
    return res.status(401).json({ error: 'Invalid signature' })
  }
}

router.post('/', verifyResendSignature, async (req, res) => {
  const { type, data } = req.body
  if (type !== 'email.received') {
    return res.status(200).json({ status: 'ignored', reason: 'not an inbound email event' })
  }
  const { from, html, subject } = data
  // ... rest unchanged
})
```

### 2. Raw Body Capture (`server/index.js`)

Svix needs the raw body string for signature verification. Add a `verify` callback to the JSON parser for the webhook route:

```js
// Before the general express.json() middleware, add:
app.use('/api/webhooks/newsletter', express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString()
  }
}))
```

This must be mounted **before** the general `express.json()` middleware so it captures the raw body only for the webhook route.

### 3. Environment Variable

Add to `server/.env.example`:
```
RESEND_WEBHOOK_SIGNING_SECRET=   # From Resend dashboard → Webhooks → Signing Secret
```

### 4. Setup Documentation (`spec/newsletter-inbound/setup-guide.md`)

Create a short guide for Dan covering:
1. Add DNS records for `ingest.propertyhack.com` (MX + SPF)
2. Configure inbound domain in Resend dashboard
3. Create webhook route pointing to `https://propertyhack.com/api/webhooks/newsletter`
4. Copy signing secret to server env
5. Create a NEWSLETTER source in admin with allowed sender domains
6. Test by forwarding an email

## Files Modified

| File | Change |
|---|---|
| `server/routes/webhooks/newsletter.js` | Replace auth + extract Resend payload format |
| `server/index.js` | Add raw body capture for webhook route |
| `server/.env.example` | Add `RESEND_WEBHOOK_SIGNING_SECRET` |

## Files Created

| File | Purpose |
|---|---|
| `spec/newsletter-inbound/setup-guide.md` | DNS + Resend dashboard setup steps for Dan |

## Dependencies
- `svix` — already in node_modules, just needs `require`

## Risk Assessment
- **Low risk** — no DB changes, no new models, no pipeline changes
- **Rollback** — revert the webhook file to restore old behavior
- Only concern: if Express body parsing order matters, test that the raw body capture doesn't interfere with other routes
