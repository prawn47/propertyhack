const express = require('express')
const { Webhook } = require('svix')
const { sourceFetchQueue } = require('../../queues/sourceFetchQueue')

const router = express.Router()

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

router.post(
  '/',
  verifyResendSignature,
  async (req, res) => {
    const { type, data } = req.body

    if (type !== 'email.received') {
      return res.status(200).json({ status: 'ignored', reason: 'not an inbound email event' })
    }

    const { from, html, subject } = data
    if (!from || !html) {
      return res.status(400).json({ error: 'Missing from or html in email data' })
    }

    const prisma = req.prisma

    let matchedSource = null
    try {
      const sources = await prisma.ingestionSource.findMany({
        where: { type: 'NEWSLETTER', isActive: true }
      })

      for (const source of sources) {
        const config = source.config || {}
        const allowed = config.allowedSenders || []
        const fromLower = from.toLowerCase()
        const isAllowed = allowed.some(s => fromLower.includes(s.toLowerCase()))
        if (isAllowed) {
          matchedSource = source
          break
        }
      }
    } catch (err) {
      console.error('[newsletter-webhook] DB lookup failed:', err.message)
      return res.status(500).json({ error: 'Internal error looking up sources' })
    }

    if (!matchedSource) {
      console.warn(`[newsletter-webhook] No active NEWSLETTER source matched sender: ${from}`)
      return res.status(200).json({ status: 'ignored', reason: 'no matching source for sender' })
    }

    const jobConfig = {
      ...matchedSource.config,
      emailHtml: html,
      emailSubject: subject || null,
      emailFrom: from,
    }

    await sourceFetchQueue.add('source-fetch', {
      sourceId: matchedSource.id,
      sourceType: 'NEWSLETTER',
      config: jobConfig,
    })

    console.log(`[newsletter-webhook] Enqueued fetch for source ${matchedSource.id} (${matchedSource.name}) from ${from}`)
    res.json({ status: 'queued', sourceId: matchedSource.id })
  }
)

module.exports = router
