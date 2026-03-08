const CHAR_LIMIT = 2200;
const DRY_RUN = process.env.SOCIAL_DRY_RUN === 'true';
const GRAPH_API_VERSION = 'v19.0';

async function publish(post, credentials) {
  if (DRY_RUN) {
    console.log('[instagram] DRY RUN — would publish:', post.content?.substring(0, 50));
    return {
      platformPostId: `ig_dry_${Date.now()}`,
      url: `https://www.instagram.com/p/dry_${Date.now()}`,
    };
  }

  const { pageAccessToken, instagramAccountId } = credentials;
  if (!pageAccessToken || !instagramAccountId) {
    throw new Error('Instagram credentials incomplete — check Page Access Token and Instagram Account ID');
  }

  // Instagram requires a publicly accessible image URL
  // The processedImage path needs to be converted to a full public URL
  const imageUrl = post.imageUrl || post.processedImageUrl;
  if (!imageUrl) {
    throw new Error('Instagram requires an image — no image URL available');
  }

  // Ensure the image URL is a full public URL (not a relative path)
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    throw new Error('Instagram requires a publicly accessible image URL. Local paths are not supported — use a tunnel (ngrok) for local dev.');
  }

  const baseUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}`;

  // Step 1: Create media container
  const containerRes = await fetch(`${baseUrl}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: post.content || '',
      access_token: pageAccessToken,
    }),
  });
  const container = await containerRes.json();

  if (container.error) {
    const errMsg = container.error.message || JSON.stringify(container.error);
    if (container.error.code === 190) {
      throw new Error(`Instagram auth expired: ${errMsg}`);
    }
    throw new Error(`Instagram container creation failed: ${errMsg}`);
  }

  // Step 2: Wait for container to be ready (Instagram processes the image)
  await waitForContainerReady(container.id, pageAccessToken);

  // Step 3: Publish the container
  const publishRes = await fetch(`${baseUrl}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: container.id,
      access_token: pageAccessToken,
    }),
  });
  const published = await publishRes.json();

  if (published.error) {
    throw new Error(`Instagram publish failed: ${published.error.message || JSON.stringify(published.error)}`);
  }

  // Step 4: Get permalink
  let permalink = 'https://www.instagram.com/';
  try {
    const mediaRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${published.id}?fields=permalink&access_token=${pageAccessToken}`
    );
    const media = await mediaRes.json();
    if (media.permalink) {
      permalink = media.permalink;
    }
  } catch (err) {
    console.error('[instagram] Failed to fetch permalink:', err.message);
  }

  return {
    platformPostId: published.id,
    url: permalink,
  };
}

async function waitForContainerReady(containerId, accessToken, maxWaitMs = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const data = await res.json();

    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') {
      throw new Error('Instagram media container processing failed');
    }

    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Instagram media container processing timed out');
}

function preview(post) {
  const content = post.content || '';
  return {
    characterCount: content.length,
    characterLimit: CHAR_LIMIT,
    isValid: content.length <= CHAR_LIMIT,
    mediaSupport: true,
    imageRequired: true,
    hasImage: !!(post.imageUrl || post.processedImageUrl),
    formattedContent: content.substring(0, CHAR_LIMIT),
  };
}

module.exports = { publish, preview };
