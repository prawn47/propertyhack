const SITE_URL = 'https://propertyhack.com.au';
const INDEX_NOW_KEY = process.env.INDEXNOW_KEY || 'propertyhack-indexnow-key';

async function pingIndexNow(articleSlug) {
  const url = `${SITE_URL}/articles/${articleSlug}`;
  try {
    const response = await fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${INDEX_NOW_KEY}`);
    console.log(`[indexnow] Pinged for ${articleSlug}: ${response.status}`);
  } catch (err) {
    console.log(`[indexnow] Failed to ping for ${articleSlug}: ${err.message}`);
  }
}

module.exports = { pingIndexNow };
