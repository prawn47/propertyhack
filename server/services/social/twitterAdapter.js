const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');

const isCloudflareWorker = typeof globalThis.__cf_env !== 'undefined';

const DRY_RUN = process.env.SOCIAL_DRY_RUN === 'true';

async function publish(post, credentials) {
  if (DRY_RUN) {
    console.log('[twitter] DRY RUN — would publish:', post.content?.substring(0, 50));
    return {
      platformPostId: `tw_dry_${Date.now()}`,
      url: `https://x.com/i/status/dry_${Date.now()}`,
    };
  }

  const { apiKey, apiSecret, accessToken, accessSecret } = credentials;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error('Twitter credentials incomplete — check API key, secret, access token, and access secret');
  }

  const client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken: accessToken,
    accessSecret: accessSecret,
  });

  let mediaId;
  if (post.processedImage) {
    // Resolve to absolute path if relative
    const imagePath = post.processedImage.startsWith('/')
      ? (isCloudflareWorker ? post.processedImage : path.join(__dirname, '../../public', post.processedImage))
      : post.processedImage;

    if (fs.existsSync(imagePath)) {
      try {
        mediaId = await client.v1.uploadMedia(imagePath);
      } catch (err) {
        console.error('[twitter] Media upload failed, posting without image:', err.message);
      }
    }
  }

  const tweetData = {
    text: post.content,
  };
  if (mediaId) {
    tweetData.media = { media_ids: [mediaId] };
  }

  const tweet = await client.v2.tweet(tweetData);

  return {
    platformPostId: tweet.data.id,
    url: `https://x.com/i/status/${tweet.data.id}`,
  };
}

function preview(post) {
  const content = post.content || '';
  return {
    characterCount: content.length,
    characterLimit: 280,
    isValid: content.length <= 280,
    mediaSupport: true,
    formattedContent: content.substring(0, 280),
  };
}

module.exports = { publish, preview };
