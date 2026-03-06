const CHAR_LIMIT = 63206;

async function publish(post, credentials) {
  // Facebook Graph API - create page post
  // post: { content, imageUrl, platforms }
  // credentials: { pageAccessToken, pageId }
  console.log('Facebook publish stub:', post.content.substring(0, 50));
  return {
    platformPostId: `fb_${Date.now()}`,
    url: `https://www.facebook.com/stub_${Date.now()}`,
  };
}

function preview(post) {
  return {
    characterCount: post.content.length,
    characterLimit: CHAR_LIMIT,
    isValid: post.content.length <= CHAR_LIMIT,
    mediaSupport: true,
    formattedContent: post.content.substring(0, CHAR_LIMIT),
  };
}

module.exports = { publish, preview };
