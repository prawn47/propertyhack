const fs = require('fs');
const path = require('path');

const CRAWLER_USER_AGENTS = [
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
  'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
  'whatsapp', 'telegrambot', 'slackbot', 'discordbot',
  'chatgpt-user', 'gptbot', 'perplexitybot', 'applebot',
  'google-extended', 'amazonbot', 'claudebot',
];

const SITE_URL = 'https://propertyhack.com.au';
const SITE_NAME = 'PropertyHack';
const DEFAULT_DESCRIPTION = 'Stay informed with agenda-free Australian property news, market updates, and analysis across Sydney, Melbourne, Brisbane, Perth, Adelaide and more.';
const DEFAULT_IMAGE = `${SITE_URL}/ph-logo.jpg`;

function isCrawler(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some(bot => ua.includes(bot));
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildMetaTags({ title, description, url, image, imageAlt, type, jsonLd, article }) {
  const tags = [];
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Agenda-free Australian Property News`;
  const desc = description || DEFAULT_DESCRIPTION;
  const img = image || DEFAULT_IMAGE;

  tags.push(`<title>${escapeHtml(fullTitle)}</title>`);
  tags.push(`<meta name="description" content="${escapeHtml(desc)}" />`);
  tags.push(`<link rel="canonical" href="${SITE_URL}${url}" />`);

  // Open Graph
  tags.push(`<meta property="og:title" content="${escapeHtml(fullTitle)}" />`);
  tags.push(`<meta property="og:description" content="${escapeHtml(desc)}" />`);
  tags.push(`<meta property="og:type" content="${type || 'website'}" />`);
  tags.push(`<meta property="og:url" content="${SITE_URL}${url}" />`);
  tags.push(`<meta property="og:site_name" content="${SITE_NAME}" />`);
  tags.push(`<meta property="og:image" content="${img}" />`);
  if (imageAlt) tags.push(`<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`);

  // Twitter Card
  tags.push(`<meta name="twitter:card" content="summary_large_image" />`);
  tags.push(`<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`);
  tags.push(`<meta name="twitter:description" content="${escapeHtml(desc)}" />`);
  tags.push(`<meta name="twitter:image" content="${img}" />`);

  // Article meta
  if (article) {
    if (article.publishedTime) tags.push(`<meta property="article:published_time" content="${article.publishedTime}" />`);
    if (article.modifiedTime) tags.push(`<meta property="article:modified_time" content="${article.modifiedTime}" />`);
    if (article.section) tags.push(`<meta property="article:section" content="${escapeHtml(article.section)}" />`);
  }

  // JSON-LD
  if (jsonLd) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`);
  }

  return tags.join('\n    ');
}

function buildArticleJsonLd(article) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.shortBlurb,
    image: article.imageUrl || DEFAULT_IMAGE,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt?.toISOString(),
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/articles/${article.slug}`,
    },
  };
  // Reference original source for proper attribution
  const sourceUrl = article.sourceUrl || article.metadata?.originalUrl;
  if (sourceUrl) {
    jsonLd.isBasedOn = {
      '@type': 'NewsArticle',
      url: sourceUrl,
    };
  }
  return jsonLd;
}

function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?search={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

async function getMetaForUrl(url, prisma) {
  // Homepage
  if (url === '/') {
    return buildMetaTags({
      title: null,
      description: DEFAULT_DESCRIPTION,
      url: '/',
      type: 'website',
      jsonLd: buildWebsiteJsonLd(),
    });
  }

  // Article detail: /articles/:slug
  const articleMatch = url.match(/^\/articles\/([^/?#]+)/);
  if (articleMatch) {
    const slug = articleMatch[1];
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        title: true, shortBlurb: true, longSummary: true,
        imageUrl: true, imageAltText: true, slug: true,
        category: true, location: true, sourceUrl: true, metadata: true,
        publishedAt: true, updatedAt: true,
      },
    });
    if (article) {
      const imgUrl = article.imageUrl?.startsWith('http')
        ? article.imageUrl
        : article.imageUrl
          ? `${SITE_URL}${article.imageUrl}`
          : DEFAULT_IMAGE;
      return buildMetaTags({
        title: article.title,
        description: article.shortBlurb || article.longSummary?.substring(0, 160),
        url: `/articles/${article.slug}`,
        image: imgUrl,
        imageAlt: article.imageAltText || article.title,
        type: 'article',
        article: {
          publishedTime: article.publishedAt?.toISOString(),
          modifiedTime: article.updatedAt?.toISOString(),
          section: article.category,
        },
        jsonLd: buildArticleJsonLd(article),
      });
    }
  }

  // Location page: /property-news/:location
  const locationMatch = url.match(/^\/property-news\/([^/?#]+)/);
  if (locationMatch) {
    const slug = locationMatch[1];
    const locationSeo = await prisma.locationSeo.findUnique({ where: { slug } });
    if (locationSeo) {
      return buildMetaTags({
        title: locationSeo.metaTitle,
        description: locationSeo.metaDescription,
        url: `/property-news/${slug}`,
        type: 'website',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: locationSeo.h1Title,
          description: locationSeo.metaDescription,
          url: `${SITE_URL}/property-news/${slug}`,
        },
      });
    }
    // Fallback for locations without SEO config
    const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return buildMetaTags({
      title: `${displayName} Property News`,
      description: `Latest property news, market updates and analysis for ${displayName}, Australia.`,
      url: `/property-news/${slug}`,
      type: 'website',
    });
  }

  // Category page: /category/:slug
  const categoryMatch = url.match(/^\/category\/([^/?#]+)/);
  if (categoryMatch) {
    const slug = categoryMatch[1];
    const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return buildMetaTags({
      title: `${displayName} - Australian Property News`,
      description: `Latest ${displayName.toLowerCase()} news and analysis from the Australian property market.`,
      url: `/category/${slug}`,
      type: 'website',
    });
  }

  // About page
  if (url === '/about') {
    return buildMetaTags({
      title: 'About PropertyHack',
      description: 'PropertyHack delivers agenda-free Australian property news. Learn about our editorial approach and how we curate property market coverage.',
      url: '/about',
    });
  }

  // Contact page
  if (url === '/contact') {
    return buildMetaTags({
      title: 'Contact PropertyHack',
      description: 'Get in touch with PropertyHack for questions about our property news coverage.',
      url: '/contact',
    });
  }

  return null;
}

function createCrawlerSsrMiddleware(indexHtmlPath) {
  let indexHtml;
  try {
    indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  } catch {
    console.warn('crawlerSsr: Could not read index.html at', indexHtmlPath);
    return (req, res, next) => next();
  }

  return async (req, res, next) => {
    // Only intercept GET requests for HTML pages (not API, not static assets)
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api/') || req.path.startsWith('/images/')) return next();
    if (req.path.match(/\.\w+$/) && !req.path.endsWith('.html')) return next();

    if (!isCrawler(req.headers['user-agent'])) return next();

    try {
      const metaTags = await getMetaForUrl(req.path, req.prisma);
      if (!metaTags) return next();

      // Replace the static <title> and <meta description> with dynamic ones
      let html = indexHtml;
      html = html.replace(/<title>.*?<\/title>/, '');
      html = html.replace(/<meta name="description"[^>]*\/>/, '');
      html = html.replace('</head>', `    ${metaTags}\n</head>`);

      res.set('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      console.error('crawlerSsr error:', err);
      next();
    }
  };
}

module.exports = { createCrawlerSsrMiddleware };
