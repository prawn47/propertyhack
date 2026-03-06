const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'PropertyHack/1.0 News Aggregator'
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
    ]
  }
});

async function fetch(sourceConfig) {
  const { feedUrl, maxItems = 50 } = sourceConfig;

  if (!feedUrl) throw new Error('RSS source config missing feedUrl');

  let feed;
  try {
    feed = await parser.parseURL(feedUrl);
  } catch (err) {
    if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
      throw new Error(`RSS fetch timed out for ${feedUrl}: ${err.message}`);
    }
    if (err.message?.includes('Non-whitespace before first tag') || err.message?.includes('Invalid character')) {
      throw new Error(`RSS feed returned invalid XML for ${feedUrl}: ${err.message}`);
    }
    throw new Error(`RSS fetch failed for ${feedUrl}: ${err.message}`);
  }

  if (!feed.items || feed.items.length === 0) {
    return [];
  }

  const articles = feed.items.slice(0, maxItems).map(item => ({
    title: item.title || 'Untitled',
    content: item.contentEncoded || item.content || item.contentSnippet || item.summary || '',
    url: item.link || item.guid || '',
    imageUrl: extractImage(item),
    date: item.isoDate || item.pubDate || null,
    author: item.creator || item.author || null,
    sourceName: feed.title || 'RSS Feed'
  })).filter(a => a.url);

  return articles;
}

function extractImage(item) {
  if (item.mediaContent?.$.url) return item.mediaContent.$.url;
  if (item.mediaThumbnail?.$.url) return item.mediaThumbnail.$.url;
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) return item.enclosure.url;
  const imgMatch = (item.content || item.contentEncoded || '').match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgMatch) return imgMatch[1];
  return null;
}

module.exports = { fetch };
