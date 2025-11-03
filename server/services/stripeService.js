const Stripe = require('stripe');

// Initialize Stripe with API key from environment
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Pricing configuration
const PRICING = {
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID, // Monthly price ID from Stripe dashboard
    amount: 4900, // $49.00 in cents
    interval: 'month',
    name: 'Professional',
    features: [
      'Unlimited posts',
      'AI image generation',
      'Voice personalization',
      'Priority support',
      'Advanced analytics'
    ]
  }
};

// Free tier limits
const FREE_TIER_LIMITS = {
  monthlyPosts: 10,
  trialDays: 30
};

/**
 * Create a Stripe checkout session for subscription
 */
async function createCheckoutSession(userId, userEmail, tier = 'pro', successUrl, cancelUrl) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
  }

  const priceConfig = PRICING[tier];
  if (!priceConfig || !priceConfig.priceId) {
    throw new Error(`Invalid tier or price not configured: ${tier}`);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      client_reference_id: userId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceConfig.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        tier,
      },
      subscription_data: {
        metadata: {
          userId,
          tier,
        },
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create a Stripe customer portal session for managing subscription
 */
async function createPortalSession(customerId, returnUrl) {
  if (!stripe) {
    throw new Error('Stripe is not configured.');
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}

/**
 * Get subscription details from Stripe
 */
async function getSubscription(subscriptionId) {
  if (!stripe) {
    throw new Error('Stripe is not configured.');
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
async function cancelSubscription(subscriptionId) {
  if (!stripe) {
    throw new Error('Stripe is not configured.');
  }

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Handle webhook events from Stripe
 */
async function handleWebhook(rawBody, signature, prisma) {
  if (!stripe) {
    throw new Error('Stripe is not configured.');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
  }

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    console.log(`[stripe] Webhook event received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutComplete(session, prisma);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription, prisma);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription, prisma);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice, prisma);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice, prisma);
        break;
      }

      default:
        console.log(`[stripe] Unhandled event type: ${event.type}`);
    }

    return { received: true };
  } catch (error) {
    console.error('[stripe] Webhook error:', error);
    throw error;
  }
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutComplete(session, prisma) {
  const userId = session.metadata.userId || session.client_reference_id;
  const tier = session.metadata.tier || 'pro';

  console.log(`[stripe] Checkout complete for user ${userId}, tier ${tier}`);

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      subscriptionTier: tier,
      subscriptionStatus: 'active',
      trialEndsAt: null, // Clear trial when paid subscription starts
    },
  });
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(subscription, prisma) {
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.warn('[stripe] No userId in subscription metadata');
    return;
  }

  console.log(`[stripe] Subscription updated for user ${userId}, status: ${subscription.status}`);

  const subscriptionEndsAt = subscription.cancel_at 
    ? new Date(subscription.cancel_at * 1000) 
    : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: subscription.status === 'active' ? 'active' : subscription.status,
      subscriptionEndsAt,
    },
  });
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription, prisma) {
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.warn('[stripe] No userId in subscription metadata');
    return;
  }

  console.log(`[stripe] Subscription deleted for user ${userId}`);

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: 'free',
      subscriptionStatus: 'cancelled',
      subscriptionEndsAt: new Date(),
    },
  });
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice, prisma) {
  console.log(`[stripe] Payment succeeded for customer ${invoice.customer}`);
  
  // Optionally update payment history or send confirmation emails
  // For now, subscription updates are handled by subscription.updated events
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice, prisma) {
  console.log(`[stripe] Payment failed for customer ${invoice.customer}`);
  
  // Optionally send notification to user about failed payment
  // Stripe will automatically retry and eventually cancel the subscription
}

/**
 * Check if user has exceeded free tier limits
 */
function hasExceededFreeLimit(user) {
  if (user.subscriptionTier !== 'free') {
    return false; // Paid users have no limits
  }

  // Check if trial has expired
  if (user.trialEndsAt && new Date() > new Date(user.trialEndsAt)) {
    return true;
  }

  // Check monthly post limit
  const now = new Date();
  const lastReset = new Date(user.lastPostCountReset);
  const daysSinceReset = (now - lastReset) / (1000 * 60 * 60 * 24);

  // Reset counter if it's been over 30 days
  if (daysSinceReset >= 30) {
    return false; // Will be reset on next post
  }

  return user.monthlyPostCount >= FREE_TIER_LIMITS.monthlyPosts;
}

/**
 * Increment post count for user (and reset if needed)
 */
async function incrementPostCount(userId, prisma) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user) {
    throw new Error('User not found');
  }

  // Don't track for paid users
  if (user.subscriptionTier !== 'free') {
    return user;
  }

  const now = new Date();
  const lastReset = new Date(user.lastPostCountReset);
  const daysSinceReset = (now - lastReset) / (1000 * 60 * 60 * 24);

  // Reset counter if it's been over 30 days
  if (daysSinceReset >= 30) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyPostCount: 1,
        lastPostCountReset: now,
      },
    });
  }

  // Increment counter
  return await prisma.user.update({
    where: { id: userId },
    data: {
      monthlyPostCount: user.monthlyPostCount + 1,
    },
  });
}

/**
 * Get remaining posts for free tier user
 */
function getRemainingPosts(user) {
  if (user.subscriptionTier !== 'free') {
    return null; // Unlimited for paid users
  }

  const remaining = FREE_TIER_LIMITS.monthlyPosts - user.monthlyPostCount;
  return Math.max(0, remaining);
}

module.exports = {
  stripe,
  PRICING,
  FREE_TIER_LIMITS,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  cancelSubscription,
  handleWebhook,
  hasExceededFreeLimit,
  incrementPostCount,
  getRemainingPosts,
};
