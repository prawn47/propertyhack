const CHAR_LIMIT = 3000;

async function publish(post, credentials) {
  // LinkedIn Share API v2 - create share
  // post: { content, imageUrl, platforms }
  // credentials: { accessToken, organizationId }
  console.log('LinkedIn publish stub:', post.content.substring(0, 50));
  return {
    platformPostId: `li_${Date.now()}`,
    url: `https://www.linkedin.com/feed/update/stub_${Date.now()}`,
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
