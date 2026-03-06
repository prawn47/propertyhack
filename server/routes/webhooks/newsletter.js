const express = require('express')
const { body, validationResult } = require('express-validator')
const { sourceFetchQueue } = require('../../queues/sourceFetchQueue')

const router = express.Router()

function validateWebhookSecret(req, res, next) {
  const secret = req.headers['x-webhook-secret']
  const expected = process.env.WEBHOOK_SECRET
  if (!expected) {
    console.warn('[newsletter-webhook] WEBHOOK_SECRET env var not set — skipping validation')
    return next()
  }
  if (!secret || secret !== expected) {
    return res.status(401).json({ error: 'Invalid webhook secret' })
  }
  next()
}

router.post(
  '/',
  validateWebhookSecret,
  [
    body('from').notEmpty().withMessage('from is required'),
    body('html').notEmpty().withMessage('html body is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation error', details: errors.array() })
    }

    const { from, html, subject } = req.body
    const prisma = req.prisma

    // Find a NEWSLETTER source whose allowedSenders includes this sender
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
