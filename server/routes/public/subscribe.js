const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { VALID_COUNTRIES, isValidRegion } = require('../../utils/regionData');
const { subscribe: beehiivSubscribe, unsubscribe: beehiivUnsubscribe } = require('../../services/beehiivService');

const router = express.Router();

// CF Workers-compatible rate limiter configuration
const isCloudflareWorker = typeof globalThis.__cf_env !== 'undefined';

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator for CF Workers
  keyGenerator: (req) => {
    if (isCloudflareWorker) {
      // In CF Workers, use the CF-Connecting-IP header
      return req.headers['cf-connecting-ip'] || req.ip || 'anonymous';
    }
    // Default behavior for traditional Node.js environments
    return req.ip;
  },
});

router.use(limiter);

router.post(
  '/',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 50 }).withMessage('First name must be 50 characters or fewer'),
    body('country').notEmpty().withMessage('Country is required').isIn(VALID_COUNTRIES).withMessage('Invalid country'),
    body('region')
      .notEmpty()
      .withMessage('Region is required')
      .custom((value, { req }) => {
        if (!isValidRegion(req.body.country, value)) throw new Error('Invalid region');
        return true;
      }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { email, firstName, country, region } = req.body;

    try {
      const subscriber = await req.prisma.subscriber.upsert({
        where: { email },
        create: { email, firstName, country, region },
        update: { firstName, country, region, unsubscribedAt: null },
      });

      beehiivSubscribe(email, { firstName, country, region })
        .then(() => req.prisma.subscriber.update({ where: { id: subscriber.id }, data: { beehiivSynced: true } }))
        .catch((err) => console.error('[subscribe] beehiiv sync error:', err.message));

      return res.status(201).json({ message: 'Subscribed successfully' });
    } catch (error) {
      console.error('[subscribe] Error:', error);
      return res.status(500).json({ error: 'Failed to subscribe' });
    }
  }
);

router.post(
  '/unsubscribe',
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      const subscriber = await req.prisma.subscriber.findUnique({ where: { email } });
      if (!subscriber) {
        return res.status(404).json({ error: 'Subscriber not found' });
      }

      await req.prisma.subscriber.update({
        where: { email },
        data: { unsubscribedAt: new Date() },
      });

      beehiivUnsubscribe(email).catch((err) =>
        console.error('[unsubscribe] beehiiv sync error:', err.message)
      );

      return res.status(200).json({ message: 'Unsubscribed successfully' });
    } catch (error) {
      console.error('[unsubscribe] Error:', error);
      return res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  }
);

module.exports = router;
