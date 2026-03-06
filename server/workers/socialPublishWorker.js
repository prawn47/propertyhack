const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { connection } = require('../queues/connection');
const { getAdapter } = require('../services/social');

const prisma = new PrismaClient();

const socialPublishWorker = new Worker('social-publish', async (job) => {
  const { postId } = job.data;
  console.log(`[social-publish] Job ${job.id} — postId: ${postId}`);

  const post = await prisma.socialPost.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error(`SocialPost not found: ${postId}`);
  }

  const results = {};
  let anySuccess = false;
  let anyFailure = false;

  for (const platform of post.platforms) {
    try {
      const adapter = getAdapter(platform);
      const credentials = getPlatformCredentials(platform);
      const result = await adapter.publish(post, credentials);
      results[platform] = { success: true, ...result };
      anySuccess = true;
      console.log(`[social-publish] Published to ${platform}: ${result.url}`);
    } catch (err) {
      results[platform] = { success: false, error: err.message };
      anyFailure = true;
      console.error(`[social-publish] Failed to publish to ${platform}:`, err.message);
    }
  }

  const newStatus = anyFailure ? 'FAILED' : 'PUBLISHED';
  const publishedAt = anySuccess ? new Date() : null;

  await prisma.socialPost.update({
    where: { id: postId },
    data: {
      status: newStatus,
      publishedAt,
      platformResults: results,
    },
  });

  console.log(`[social-publish] Post ${postId} status set to ${newStatus}`);
  return { postId, status: newStatus, results };
}, {
  connection,
  concurrency: 1,
});

function getPlatformCredentials(platform) {
  const env = process.env;
  switch (platform) {
    case 'twitter':
      return {
        apiKey: env.TWITTER_API_KEY,
        apiSecret: env.TWITTER_API_SECRET,
        accessToken: env.TWITTER_ACCESS_TOKEN,
        accessSecret: env.TWITTER_ACCESS_SECRET,
      };
    case 'facebook':
      return {
        pageAccessToken: env.FACEBOOK_PAGE_ACCESS_TOKEN,
        pageId: env.FACEBOOK_PAGE_ID,
      };
    case 'linkedin':
      return {
        accessToken: env.LINKEDIN_ACCESS_TOKEN,
        organizationId: env.LINKEDIN_ORGANIZATION_ID,
      };
    case 'instagram':
      return {
        pageAccessToken: env.INSTAGRAM_PAGE_ACCESS_TOKEN,
        instagramAccountId: env.INSTAGRAM_ACCOUNT_ID,
      };
    default:
      return {};
  }
}

socialPublishWorker.on('completed', (job, result) => {
  console.log(`[social-publish] Job ${job.id} completed — status: ${result.status}`);
});

socialPublishWorker.on('failed', (job, err) => {
  console.error(`[social-publish] Job ${job.id} failed:`, err.message);
});

module.exports = { socialPublishWorker };
