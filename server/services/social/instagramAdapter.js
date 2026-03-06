const CHAR_LIMIT = 2200;

async function publish(post, credentials) {
  // Instagram Graph API (via Facebook) - create media post
  // post: { content, imageUrl, platforms }
  // credentials: { pageAccessToken, instagramAccountId }
  // NOTE: Instagram requires an image — imageUrl must be set
  if (!post.imageUrl) {
    throw new Error('Instagram requires an image (imageUrl must be set)');
  }
  console.log('Instagram publish stub:', post.content.substring(0, 50));
  return {
    platformPostId: `ig_${Date.now()}`,
    url: `https://www.instagram.com/p/stub_${Date.now()}`,
  };
}

function preview(post) {
  return {
    characterCount: post.content.length,
    characterLimit: CHAR_LIMIT,
    isValid: post.content.length <= CHAR_LIMIT,
    mediaSupport: true,
    imageRequired: true,
    hasImage: !!post.imageUrl,
    formattedContent: post.content.substring(0, CHAR_LIMIT),
  };
}

module.exports = { publish, preview };
