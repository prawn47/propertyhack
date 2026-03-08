const { PrismaClient } = require('@prisma/client');
const { generateHeadlinesWithConfig } = require('./socialHeadlineService');
const { processImageForPlatform } = require('./socialImageService');
const { socialPublishQueue } = require('../queues/socialPublishQueue');

const prisma = new PrismaClient();

const PLATFORMS = ['facebook', 'twitter', 'instagram'];

async function generateSocialPosts(articleId) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { source: true },
  });

  if (!article || article.status !== 'PUBLISHED') {
    console.log(`[socialGeneration] Article ${articleId} not found or not published, skipping`);
    return [];
  }

  // Check which platforms have connected accounts
  const accounts = await prisma.socialAccount.findMany({
    where: { isConnected: true, platform: { in: PLATFORMS } },
  });

  if (accounts.length === 0) {
    console.log('[socialGeneration] No connected social accounts, skipping');
    return [];
  }

  const connectedPlatforms = accounts.map(a => a.platform);
  console.log(`[socialGeneration] Generating posts for: ${connectedPlatforms.join(', ')}`);

  // Load config
  const config = await prisma.socialConfig.findFirst() || {
    minPostGapMins: 5,
    maxDelayMins: 60,
    defaultHashtags: [],
  };

  // Generate headlines + hashtags via Gemini (one call for all platforms)
  const headlines = await generateHeadlinesWithConfig(article);

  // Calculate schedule times with anti-bunching
  const scheduleTimes = await calculateScheduleTimes(connectedPlatforms, config);

  // Build article URL
  const articleUrl = `${process.env.SITE_URL || 'https://propertyhack.com.au'}/article/${article.slug}`;

  const createdPosts = [];

  for (const platform of connectedPlatforms) {
    const account = accounts.find(a => a.platform === platform);
    const platformData = headlines[platform] || headlines.facebook; // fallback

    // Process image for this platform
    const sourceImage = article.imageUrl;
    let processedImage = null;
    try {
      processedImage = await processImageForPlatform(sourceImage, platform, article.id);
    } catch (err) {
      console.error(`[socialGeneration] Image processing failed for ${platform}:`, err.message);
    }

    // Build post content with headline + hashtags + link
    const content = buildPostContent(platform, platformData, articleUrl);

    // Determine status based on auto-publish setting
    const status = account.autoPublish ? 'SCHEDULED' : 'PENDING_APPROVAL';

    const post = await prisma.socialPost.create({
      data: {
        content,
        headline: platformData.headline,
        hashtags: platformData.hashtags || [],
        platform,
        platforms: [platform],
        imageUrl: article.imageUrl,
        processedImage,
        articleId: article.id,
        status,
        scheduledFor: scheduleTimes[platform],
      },
    });

    console.log(`[socialGeneration] Created ${platform} post ${post.id} — ${status} for ${scheduleTimes[platform].toISOString()}`);

    // If auto-publish, enqueue delayed job
    if (status === 'SCHEDULED') {
      const delay = Math.max(0, scheduleTimes[platform].getTime() - Date.now());
      await socialPublishQueue.add('social-publish', { postId: post.id }, { delay });
      console.log(`[socialGeneration] Enqueued ${platform} publish job with ${Math.round(delay / 1000)}s delay`);
    }

    createdPosts.push(post);
  }

  return createdPosts;
}

function buildPostContent(platform, platformData, articleUrl) {
  const headline = platformData.headline || '';
  const hashtags = (platformData.hashtags || []).join(' ');

  switch (platform) {
    case 'facebook':
      return [headline, articleUrl, hashtags].filter(Boolean).join('\n\n');
    case 'twitter': {
      const tweetParts = [headline, articleUrl];
      const tweetBase = tweetParts.join(' ');
      if (tweetBase.length + hashtags.length + 1 <= 280) {
        return `${tweetBase}\n${hashtags}`;
      }
      return tweetBase.substring(0, 280);
    }
    case 'instagram':
      return [headline, '', hashtags].filter(Boolean).join('\n\n');
    default:
      return [headline, articleUrl].filter(Boolean).join('\n\n');
  }
}

async function calculateScheduleTimes(platforms, config) {
  const now = new Date();
  const { minPostGapMins, maxDelayMins } = config;
  const schedules = {};

  for (const platform of platforms) {
    const minDelay = 5;
    const delayMins = Math.floor(Math.random() * (maxDelayMins - minDelay)) + minDelay;
    let scheduledFor = new Date(now.getTime() + delayMins * 60 * 1000);

    // Anti-bunching: check last scheduled/published post for this platform
    const lastPost = await prisma.socialPost.findFirst({
      where: {
        platform,
        status: { in: ['SCHEDULED', 'PUBLISHED'] },
        scheduledFor: { gte: new Date(now.getTime() - maxDelayMins * 60 * 1000) },
      },
      orderBy: { scheduledFor: 'desc' },
    });

    if (lastPost?.scheduledFor) {
      const gap = scheduledFor.getTime() - lastPost.scheduledFor.getTime();
      if (Math.abs(gap) < minPostGapMins * 60 * 1000) {
        scheduledFor = new Date(lastPost.scheduledFor.getTime() + minPostGapMins * 60 * 1000);
      }
    }

    schedules[platform] = scheduledFor;
  }

  return schedules;
}

module.exports = { generateSocialPosts };
