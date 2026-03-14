/**
 * Social Health Check — verifies social media account connections
 * Dual-mode: CF Cron Trigger (via runSocialHealthCheck) or node-cron (local dev)
 * Ref: Beads workspace-8i6
 */
const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('../utils/encryption');

const prisma = new PrismaClient();

async function runSocialHealthCheck() {
    console.log('[social-health] Running connection health check...');

    const accounts = await prisma.socialAccount.findMany({
      where: { isConnected: true },
    });

    if (accounts.length === 0) {
      console.log('[social-health] No connected accounts to check');
      return;
    }

    for (const account of accounts) {
      try {
        await checkAccountHealth(account);
      } catch (err) {
        console.error(`[social-health] Error checking ${account.platform}:`, err.message);
      }
    }

    console.log('[social-health] Health check complete');
}

function startSocialHealthCheck() {
  const { isCFWorkers } = require('../queues/connection');
  if (isCFWorkers) {
    console.log('[social-health] CF Workers mode — cron triggers configured in wrangler.toml');
    return;
  }
  const cron = require('node-cron');
  cron.schedule('0 */6 * * *', runSocialHealthCheck, { timezone: 'Australia/Sydney' });
  console.log('[social-health] Scheduled health check (every 6 hours)');
}

async function checkAccountHealth(account) {
  const { platform } = account;
  let healthy = false;
  let error = null;

  try {
    if (!account.accessToken) {
      throw new Error('No access token stored');
    }

    if (platform === 'twitter') {
      const creds = JSON.parse(decrypt(account.accessToken));
      const { TwitterApi } = require('twitter-api-v2');
      const client = new TwitterApi({
        appKey: creds.apiKey,
        appSecret: creds.apiSecret,
        accessToken: creds.accessToken,
        accessSecret: creds.accessSecret,
      });
      await client.v2.me();
      healthy = true;
    } else if (platform === 'facebook') {
      const token = decrypt(account.accessToken);
      const pageId = account.accountId || process.env.FACEBOOK_PAGE_ID || process.env.META_PAGE_ID;
      const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=name&access_token=${token}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      healthy = true;
    } else if (platform === 'instagram') {
      const token = decrypt(account.accessToken);
      const igId = account.accountId || process.env.INSTAGRAM_ACCOUNT_ID || process.env.META_INSTAGRAM_ACCOUNT_ID;
      const res = await fetch(`https://graph.facebook.com/v19.0/${igId}?fields=username&access_token=${token}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      healthy = true;
    }
  } catch (err) {
    error = err.message;
    healthy = false;
  }

  await prisma.socialAccount.update({
    where: { platform },
    data: {
      isConnected: healthy,
      lastCheckedAt: new Date(),
      lastError: healthy ? null : error,
    },
  });

  const status = healthy ? 'healthy' : `unhealthy (${error})`;
  console.log(`[social-health] ${platform}: ${status}`);
}

module.exports = { startSocialHealthCheck, runSocialHealthCheck };
