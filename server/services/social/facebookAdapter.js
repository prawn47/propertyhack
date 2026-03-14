const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const isCloudflareWorker = typeof globalThis.__cf_env !== 'undefined';

const CHAR_LIMIT = 63206;
const DRY_RUN = process.env.SOCIAL_DRY_RUN === 'true';
const GRAPH_API_VERSION = 'v19.0';

async function publish(post, credentials) {
  if (DRY_RUN) {
    console.log('[facebook] DRY RUN — would publish:', post.content?.substring(0, 50));
    return {
      platformPostId: `fb_dry_${Date.now()}`,
      url: `https://www.facebook.com/dry_${Date.now()}`,
    };
  }

  const { pageAccessToken, pageId } = credentials;
  if (!pageAccessToken || !pageId) {
    throw new Error('Facebook credentials incomplete — check Page Access Token and Page ID');
  }

  const baseUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}`;

  let result;

  if (post.processedImage) {
    const imagePath = post.processedImage.startsWith('/')
      ? (isCloudflareWorker ? post.processedImage : path.join(__dirname, '../../public', post.processedImage))
      : post.processedImage;

    if (fs.existsSync(imagePath)) {
      const formData = new FormData();
      formData.append('source', fs.createReadStream(imagePath));
      formData.append('message', post.content || '');
      formData.append('access_token', pageAccessToken);

      const response = await fetch(`${baseUrl}/photos`, {
        method: 'POST',
        body: formData,
      });
      result = await response.json();
    } else {
      result = await postLinkPost(baseUrl, post, pageAccessToken);
    }
  } else {
    result = await postLinkPost(baseUrl, post, pageAccessToken);
  }

  if (result.error) {
    const errMsg = result.error.message || JSON.stringify(result.error);
    if (result.error.code === 190) {
      throw new Error(`Facebook auth expired: ${errMsg}`);
    }
    throw new Error(`Facebook API error: ${errMsg}`);
  }

  const postId = result.id || result.post_id;
  return {
    platformPostId: postId,
    url: `https://www.facebook.com/${postId}`,
  };
}

async function postLinkPost(baseUrl, post, pageAccessToken) {
  const body = {
    message: post.content || '',
    access_token: pageAccessToken,
  };

  if (post.articleUrl) {
    body.link = post.articleUrl;
  }

  const response = await fetch(`${baseUrl}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return response.json();
}

function preview(post) {
  const content = post.content || '';
  return {
    characterCount: content.length,
    characterLimit: CHAR_LIMIT,
    isValid: content.length <= CHAR_LIMIT,
    mediaSupport: true,
    formattedContent: content.substring(0, CHAR_LIMIT),
  };
}

module.exports = { publish, preview };
