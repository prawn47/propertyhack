# Stripe Payment Integration Setup Guide

This guide walks you through setting up Stripe for subscription payments in QUORD.

## Prerequisites

- A Stripe account (sign up at https://stripe.com)
- Access to the Stripe Dashboard

## Step 1: Get Your Stripe API Keys

1. Log in to your Stripe Dashboard at https://dashboard.stripe.com
2. Navigate to **Developers** → **API keys**
3. Copy both keys:
   - **Publishable key** (starts with `pk_test_` for test mode or `pk_live_` for production)
   - **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for production)

4. Add to your environment files:

**Backend** (`server/.env`):
```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

**Frontend** (`.env` or `.env.local` in project root):
```bash
VITE_STRIPE_PUBLIC_KEY=pk_test_your_publishable_key_here
```

## Step 2: Create a Product and Price

1. In the Stripe Dashboard, go to **Products** → **Add product**
2. Create a product with these details:
   - **Name**: QUORD Pro
   - **Description**: Professional LinkedIn content assistant with unlimited posts
   - **Pricing model**: Recurring
   - **Price**: $49.00 USD
   - **Billing period**: Monthly
3. After creating, copy the **Price ID** (starts with `price_`)
4. Add to your `server/.env` file:

```bash
STRIPE_PRO_PRICE_ID=price_your_price_id_here
```

## Step 3: Set Up Webhooks

Webhooks allow Stripe to notify your server about important events (successful payments, cancellations, etc.).

### Local Development (using Stripe CLI)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run the following command to forward webhooks to your local server:

```bash
stripe listen --forward-to http://localhost:3001/api/subscription/webhook
```

3. Copy the **webhook signing secret** (starts with `whsec_`)
4. Add to your `server/.env` file:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Production

1. In the Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set the endpoint URL to: `https://your-domain.com/api/subscription/webhook`
4. Select the following events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret**
6. Add to your production environment variables:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_production_secret_here
```

## Step 4: Configure Customer Portal

The Customer Portal allows users to manage their subscriptions, update payment methods, and view billing history.

1. In the Stripe Dashboard, go to **Settings** → **Customer portal**
2. Enable the portal and configure:
   - **Cancel subscriptions**: Allow (with retention options if desired)
   - **Update payment methods**: Allow
   - **View billing history**: Allow
3. Save your settings

## Step 5: Test the Integration

### Test Mode

Use Stripe's test card numbers to test the payment flow:

- **Successful payment**: 4242 4242 4242 4242
- **Declined payment**: 4000 0000 0000 0002
- **Requires authentication**: 4000 0025 0000 3155

Use any future expiration date and any 3-digit CVC.

### Testing Webhooks

1. With `stripe listen` running, trigger test events:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
```

2. Check your server logs to confirm events are being received and processed

## Environment Variables Summary

**Backend** (`server/.env`):
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PRO_PRICE_ID=price_your_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Already existing (ensure these are set)
CORS_ORIGIN=http://localhost:3004
```

**Frontend** (`.env` or `.env.local` in project root):
```bash
# Stripe Public Key (safe to expose in browser)
VITE_STRIPE_PUBLIC_KEY=pk_test_your_publishable_key_here
```

## Free Tier Limits

The app enforces these limits for free tier users:

- **Monthly posts**: 10 posts per 30 days
- **Trial period**: 30 days from signup

After exceeding the limit, users will be prompted to upgrade to Pro.

## Subscription Tiers

### Free
- 10 posts per month
- 30-day trial
- All basic features

### Pro ($49/month)
- Unlimited posts
- AI image generation
- Voice personalization
- Priority support
- Advanced analytics

### Enterprise (Custom)
- Everything in Pro
- Team collaboration
- Custom branding
- SSO integration
- Dedicated support
- Contact sales for pricing

## API Endpoints

### Frontend Integration

#### Get subscription status
```typescript
GET /api/subscription/status
Authorization: Bearer <token>

Response:
{
  "tier": "free",
  "status": "trial",
  "trialEndsAt": "2025-12-02T...",
  "monthlyPostCount": 3,
  "remainingPosts": 7,
  "hasExceededLimit": false
}
```

#### Create checkout session
```typescript
POST /api/subscription/checkout
Authorization: Bearer <token>

Response:
{
  "url": "https://checkout.stripe.com/..."
}
```

#### Open customer portal
```typescript
POST /api/subscription/portal
Authorization: Bearer <token>

Response:
{
  "url": "https://billing.stripe.com/..."
}
```

## Database Schema

The following fields were added to the User model:

```prisma
subscriptionTier      String    @default("free")
stripeCustomerId      String?
stripeSubscriptionId  String?
subscriptionStatus    String    @default("trial")
trialEndsAt           DateTime?
subscriptionEndsAt    DateTime?
monthlyPostCount      Int       @default(0)
lastPostCountReset    DateTime  @default(now())
```

## Testing Checklist

- [ ] User can upgrade to Pro from free tier
- [ ] Payment succeeds and subscription becomes active
- [ ] Free tier limits are enforced (10 posts/month)
- [ ] Users can access customer portal to manage subscription
- [ ] Users can cancel subscription
- [ ] Webhook events update database correctly
- [ ] Trial expiration is enforced
- [ ] Post counter resets after 30 days

## Troubleshooting

### Webhook not receiving events
- Ensure `stripe listen` is running for local development
- Check that webhook URL is correct in Stripe Dashboard
- Verify `STRIPE_WEBHOOK_SECRET` matches

### Payment fails
- Check Stripe logs in Dashboard → **Developers** → **Logs**
- Verify API keys are correct
- Ensure price ID matches the one in Stripe

### Rate limiting not working
- Check user's `subscriptionTier` in database
- Verify `monthlyPostCount` is incrementing
- Check server logs for rate limit errors

## Going to Production

1. Switch from test mode to live mode in Stripe Dashboard
2. Update `STRIPE_SECRET_KEY` with live key (`sk_live_...`)
3. Create new live mode product and price, update `STRIPE_PRO_PRICE_ID`
4. Set up production webhook endpoint
5. Update `STRIPE_WEBHOOK_SECRET` with production secret
6. Enable Stripe Radar for fraud prevention
7. Set up email receipts in Stripe settings

## Support

For Stripe-specific issues, consult:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

For integration issues, check server logs and ensure all environment variables are properly set.
