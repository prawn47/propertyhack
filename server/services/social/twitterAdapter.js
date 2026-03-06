async function publish(post, credentials) {
  // Twitter API v2 - create tweet
  // post: { content, imageUrl, platforms }
  // credentials: { apiKey, apiSecret, accessToken, accessSecret }
  console.log('Twitter publish stub:', post.content.substring(0, 50));
  return {
    platformPostId: `tw_${Date.now()}`,
    url: `https://twitter.com/i/status/stub_${Date.now()}`,
  };
}

function preview(post) {
  return {
    characterCount: post.content.length,
    characterLimit: 280,
    isValid: post.content.length <= 280,
    mediaSupport: true,
    formattedContent: post.content.substring(0, 280),
  };
}

module.exports = { publish, preview };
