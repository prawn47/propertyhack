const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { connection } = require('../queues/connection');
const { getAdapter } = require('../services/social');
const { decrypt } = require('../utils/encryption');

const prisma = new PrismaClient();

const socialPublishWorker = new Worker('social-publish', async (job) => {
  const { postId } = job.data;
  console.log(`[social-publish] Job ${job.id} — postId: ${postId}`);

  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    include: { article: true },
  });
  if (!post) throw new Error(`SocialPost not found: ${postId}`);

  // Use single platform field, fall back to first in platforms array
  const platform = post.platform || (post.platforms && post.platforms[0]);
  if (!platform) throw new Error(`No platform set for post: ${postId}`);

  try {
    const adapter = getAdapter(platform);
    const credentials = await getPlatformCredentials(platform);

    // Add article URL to post data for adapters that need it
    const postData = {
      ...post,
      articleUrl: post.article ? `${process.env.SITE_URL || 'https://propertyhack.com.au'}/article/${post.article.slug}` : null,
      processedImageUrl: post.processedImage ? `${process.env.SITE_URL || 'https://propertyhack.com.au'}${post.processedImage}` : null,
    };

    const result = await adapter.publish(postData, credentials);

    await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        platformResults: { [platform]: { success: true, ...result } },
        errorReason: null,
      },
    });

    console.log(`[social-publish] Published to ${platform}: ${result.url}`);
    return { postId, status: 'PUBLISHED', platform, url: result.url };
  } catch (err) {
    const errorReason = err.message || 'Unknown error';
    console.error(`[social-publish] Failed to publish to ${platform}:`, errorReason);

    // Check if auth expired — mark account as disconnected
    if (errorReason.includes('auth expired') || errorReason.includes('credentials incomplete')) {
      await prisma.socialAccount.updateMany({
        where: { platform },
        data: { isConnected: false, lastError: errorReason },
      });
      console.error(`[social-publish] Marked ${platform} account as disconnected`);
    }

    await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: 'FAILED',
        platformResults: { [platform]: { success: false, error: errorReason } },
        errorReason,
      },
    });

    throw err; // Re-throw for BullMQ retry logic
  }
}, {
  connection,
  concurrency: 1,
});

async function getPlatformCredentials(platform) {
  // Try to read from SocialAccount model first
  const account = await prisma.socialAccount.findUnique({ where: { platform } });

  if (account?.accessToken) {
    try {
      if (platform === 'twitter') {
        const decrypted = decrypt(account.accessToken);
        return JSON.parse(decrypted);
      } else if (platform === 'facebook') {
        return {
          pageAccessToken: decrypt(account.accessToken),
          pageId: account.accountId || process.env.FACEBOOK_PAGE_ID,
        };
      } else if (platform === 'instagram') {
        return {
          pageAccessToken: decrypt(account.accessToken),
          instagramAccountId: account.accountId || process.env.INSTAGRAM_ACCOUNT_ID,
        };
      }
    } catch (err) {
      console.error(`[social-publish] Failed to decrypt ${platform} credentials, falling back to env vars:`, err.message);
    }
  }

  // Fall back to env vars
  const env = process.env;
  switch (platform) {
    case 'twitter':
      return {
        apiKey: env.TWITTER_API_KEY,
        apiSecret: env.TWITTER_API_SECRET,
        accessToken: env.TWITTER_ACCESS_TOKEN,
        accessSecret: env.TWITTER_ACCESS_TOKEN_SECRET,
      };
    case 'facebook':
      return {
        pageAccessToken: env.FACEBOOK_PAGE_ACCESS_TOKEN || env.META_PAGE_ACCESS_TOKEN,
        pageId: env.FACEBOOK_PAGE_ID || env.META_PAGE_ID,
      };
    case 'instagram':
      return {
        pageAccessToken: env.INSTAGRAM_PAGE_ACCESS_TOKEN || env.META_PAGE_ACCESS_TOKEN,
        instagramAccountId: env.INSTAGRAM_ACCOUNT_ID || env.META_INSTAGRAM_ACCOUNT_ID,
      };
    default:
      return {};
  }
}

socialPublishWorker.on('completed', (job, result) => {
  console.log(`[social-publish] Job ${job.id} completed — ${result?.platform}: ${result?.status}`);
});

socialPublishWorker.on('failed', (job, err) => {
  console.error(`[social-publish] Job ${job.id} failed:`, err.message);
});

module.exports = { socialPublishWorker };
