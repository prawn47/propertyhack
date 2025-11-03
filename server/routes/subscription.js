const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const stripeService = require('../services/stripeService');

const router = express.Router();

// Get current subscription status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        monthlyPostCount: true,
        lastPostCountReset: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const remainingPosts = stripeService.getRemainingPosts(user);
    const hasExceededLimit = stripeService.hasExceededFreeLimit(user);

    res.json({
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
      subscriptionEndsAt: user.subscriptionEndsAt,
      monthlyPostCount: user.monthlyPostCount,
      remainingPosts,
      hasExceededLimit,
      hasStripeCustomer: !!user.stripeCustomerId,
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Create checkout session for upgrading to Pro
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.subscriptionTier === 'pro' || user.subscriptionTier === 'enterprise') {
      return res.status(400).json({ error: 'Already subscribed to a paid plan' });
    }

    const successUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3004'}?subscription=success`;
    const cancelUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3004'}?subscription=cancelled`;

    const session = await stripeService.createCheckoutSession(
      user.id,
      user.email,
      'pro',
      successUrl,
      cancelUrl
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

// Create customer portal session
router.post('/portal', authenticateToken, async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        stripeCustomerId: true,
      },
    });

    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const returnUrl = process.env.CORS_ORIGIN || 'http://localhost:3004';
    const session = await stripeService.createPortalSession(user.stripeCustomerId, returnUrl);

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Get pricing information
router.get('/pricing', (req, res) => {
  res.json({
    tiers: stripeService.PRICING,
    limits: stripeService.FREE_TIER_LIMITS,
  });
});

// Stripe webhook endpoint (no authentication required)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    await stripeService.handleWebhook(req.body, signature, req.prisma);
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
