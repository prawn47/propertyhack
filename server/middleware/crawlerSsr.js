const fs = require('fs');
const path = require('path');

const CRAWLER_USER_AGENTS = [
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
  'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
  'whatsapp', 'telegrambot', 'slackbot', 'discordbot',
  'chatgpt-user', 'gptbot', 'perplexitybot', 'applebot',
  'google-extended', 'amazonbot', 'claudebot',
];

const SITE_URL = 'https://propertyhack.com';
const SITE_NAME = 'PropertyHack';
const DEFAULT_DESCRIPTION = 'Stay informed with agenda-free Australian property news, market updates, and analysis across Sydney, Melbourne, Brisbane, Perth, Adelaide and more.';
const DEFAULT_IMAGE = `${SITE_URL}/ph-logo.jpg`;

const SUPPORTED_COUNTRIES = ['au', 'us', 'uk', 'ca'];
const HREFLANG_MAP = { au: 'en-AU', us: 'en-US', uk: 'en-GB', ca: 'en-CA' };

function parseCountryAndPath(urlPath) {
  const match = urlPath.match(/^\/([a-z]{2})(\/.*)?$/);
  if (match && SUPPORTED_COUNTRIES.includes(match[1])) {
    return { country: match[1], path: match[2] || '/' };
  }
  return { country: null, path: urlPath };
}

function buildHreflangTags(urlPath, articleData) {
  const { country, path } = parseCountryAndPath(urlPath);
  const tags = [];

  const isArticlePage = urlPath.match(/\/article\/[^/?#]+/);

  if (isArticlePage && articleData) {
    if (!articleData.isEvergreen && articleData.market) {
      const marketLower = articleData.market.toLowerCase();
      const hreflang = HREFLANG_MAP[marketLower];
      if (hreflang) {
        tags.push(`<link rel="alternate" hreflang="${hreflang}" href="${SITE_URL}/${marketLower}${path}" />`);
      }
    } else {
      for (const [code, lang] of Object.entries(HREFLANG_MAP)) {
        tags.push(`<link rel="alternate" hreflang="${lang}" href="${SITE_URL}/${code}${path}" />`);
      }
    }
  } else {
    for (const [code, lang] of Object.entries(HREFLANG_MAP)) {
      tags.push(`<link rel="alternate" hreflang="${lang}" href="${SITE_URL}/${code}${path}" />`);
    }
  }

  tags.push(`<link rel="alternate" hreflang="x-default" href="${SITE_URL}${path}" />`);
  return tags.join('\n    ');
}

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

function buildMetaTags({ title, description, url, image, imageAlt, type, jsonLd, article, hreflang }) {
  const tags = [];
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Agenda-free Australian Property News`;
  const desc = description || DEFAULT_DESCRIPTION;
  const img = image || DEFAULT_IMAGE;

  tags.push(`<title>${escapeHtml(fullTitle)}</title>`);
  tags.push(`<meta name="description" content="${escapeHtml(desc)}" />`);
  tags.push(`<link rel="canonical" href="${SITE_URL}${url}" />`);

  if (hreflang) {
    tags.push(hreflang);
  }

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
  const { path: canonicalPath } = parseCountryAndPath(url);

  // Homepage (/ or /:country)
  if (url === '/' || (url.match(/^\/[a-z]{2}$/) && SUPPORTED_COUNTRIES.includes(url.slice(1)))) {
    return buildMetaTags({
      title: null,
      description: DEFAULT_DESCRIPTION,
      url: canonicalPath,
      type: 'website',
      jsonLd: buildWebsiteJsonLd(),
      hreflang: buildHreflangTags(url),
    });
  }

  // Article detail: /articles/:slug or /:country/article/:slug
  const articleMatch = canonicalPath.match(/^\/(?:articles|article)\/([^/?#]+)/);
  if (articleMatch) {
    const slug = articleMatch[1];
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        title: true, shortBlurb: true, longSummary: true,
        imageUrl: true, imageAltText: true, slug: true,
        category: true, location: true, sourceUrl: true, metadata: true,
        publishedAt: true, updatedAt: true, market: true, isEvergreen: true,
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
        url: canonicalPath,
        image: imgUrl,
        imageAlt: article.imageAltText || article.title,
        type: 'article',
        article: {
          publishedTime: article.publishedAt?.toISOString(),
          modifiedTime: article.updatedAt?.toISOString(),
          section: article.category,
        },
        jsonLd: buildArticleJsonLd(article),
        hreflang: buildHreflangTags(url, article),
      });
    }
    // Article not found — still inject hreflang with safe fallback (all 4 markets)
    return buildMetaTags({
      title: null,
      description: DEFAULT_DESCRIPTION,
      url: canonicalPath,
      type: 'article',
      hreflang: buildHreflangTags(url),
    });
  }

  // Location page: /property-news/:location or /:country/property-news/:location
  const locationMatch = canonicalPath.match(/^\/property-news\/([^/?#]+)/);
  if (locationMatch) {
    const slug = locationMatch[1];
    const locationSeo = await prisma.locationSeo.findUnique({ where: { slug } });
    if (locationSeo) {
      return buildMetaTags({
        title: locationSeo.metaTitle,
        description: locationSeo.metaDescription,
        url: canonicalPath,
        type: 'website',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: locationSeo.h1Title,
          description: locationSeo.metaDescription,
          url: `${SITE_URL}${canonicalPath}`,
        },
        hreflang: buildHreflangTags(url),
      });
    }
    // Fallback for locations without SEO config
    const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return buildMetaTags({
      title: `${displayName} Property News`,
      description: `Latest property news, market updates and analysis for ${displayName}, Australia.`,
      url: canonicalPath,
      type: 'website',
      hreflang: buildHreflangTags(url),
    });
  }

  // Category page: /category/:slug or /:country/category/:slug
  const categoryMatch = canonicalPath.match(/^\/category\/([^/?#]+)/);
  if (categoryMatch) {
    const slug = categoryMatch[1];
    const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return buildMetaTags({
      title: `${displayName} - Australian Property News`,
      description: `Latest ${displayName.toLowerCase()} news and analysis from the Australian property market.`,
      url: canonicalPath,
      type: 'website',
      hreflang: buildHreflangTags(url),
    });
  }

  // Tools index and calculator pages
  const CALCULATOR_META = {
    '/tools': {
      title: 'Property Calculators Australia',
      description: 'Free property calculators — mortgage repayments, stamp duty, rental yield, borrowing power, rent vs buy.',
      appName: 'Property Calculators Australia',
      breadcrumb: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
      ],
    },
    '/tools/mortgage-calculator': {
      title: 'Mortgage Calculator',
      description: 'Calculate your mortgage repayments across different loan terms, interest rates, and payment frequencies.',
      appName: 'Mortgage Calculator',
      breadcrumb: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
        { '@type': 'ListItem', position: 3, name: 'Mortgage Calculator', item: `${SITE_URL}/tools/mortgage-calculator` },
      ],
    },
    '/tools/stamp-duty-calculator': {
      title: 'Stamp Duty Calculator',
      description: 'Estimate stamp duty costs for every Australian state and territory, including first home buyer concessions.',
      appName: 'Stamp Duty Calculator',
      breadcrumb: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
        { '@type': 'ListItem', position: 3, name: 'Stamp Duty Calculator', item: `${SITE_URL}/tools/stamp-duty-calculator` },
      ],
    },
    '/tools/rental-yield-calculator': {
      title: 'Rental Yield Calculator',
      description: 'Analyse your investment property\'s gross and net rental yield with detailed expense tracking.',
      appName: 'Rental Yield Calculator',
      breadcrumb: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
        { '@type': 'ListItem', position: 3, name: 'Rental Yield Calculator', item: `${SITE_URL}/tools/rental-yield-calculator` },
      ],
    },
    '/tools/borrowing-power-calculator': {
      title: 'Borrowing Power Calculator',
      description: 'Find out how much you could borrow based on your income, expenses, and existing debts.',
      appName: 'Borrowing Power Calculator',
      breadcrumb: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
        { '@type': 'ListItem', position: 3, name: 'Borrowing Power Calculator', item: `${SITE_URL}/tools/borrowing-power-calculator` },
      ],
    },
    '/tools/rent-vs-buy-calculator': {
      title: 'Rent vs Buy Calculator',
      description: 'Compare the long-term financial outcome of renting and investing versus buying a home.',
      appName: 'Rent vs Buy Calculator',
      breadcrumb: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
        { '@type': 'ListItem', position: 3, name: 'Rent vs Buy Calculator', item: `${SITE_URL}/tools/rent-vs-buy-calculator` },
      ],
    },
  };

  if (canonicalPath === '/tools' || canonicalPath.startsWith('/tools/')) {
    const meta = CALCULATOR_META[canonicalPath];
    if (meta) {
      const webAppJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: meta.appName,
        url: `${SITE_URL}${canonicalPath}`,
        description: meta.description,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'All',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' },
      };
      const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: meta.breadcrumb,
      };
      const tags = [];
      const fullTitle = `${meta.title} | ${SITE_NAME}`;
      tags.push(`<title>${escapeHtml(fullTitle)}</title>`);
      tags.push(`<meta name="description" content="${escapeHtml(meta.description)}" />`);
      tags.push(`<link rel="canonical" href="${SITE_URL}${canonicalPath}" />`);
      tags.push(buildHreflangTags(url));
      tags.push(`<meta property="og:title" content="${escapeHtml(fullTitle)}" />`);
      tags.push(`<meta property="og:description" content="${escapeHtml(meta.description)}" />`);
      tags.push(`<meta property="og:type" content="website" />`);
      tags.push(`<meta property="og:url" content="${SITE_URL}${canonicalPath}" />`);
      tags.push(`<meta property="og:site_name" content="${SITE_NAME}" />`);
      tags.push(`<meta property="og:image" content="${DEFAULT_IMAGE}" />`);
      tags.push(`<meta name="twitter:card" content="summary_large_image" />`);
      tags.push(`<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`);
      tags.push(`<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`);
      tags.push(`<meta name="twitter:image" content="${DEFAULT_IMAGE}" />`);
      tags.push(`<script type="application/ld+json">${JSON.stringify(webAppJsonLd)}</script>`);
      tags.push(`<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>`);
      return tags.join('\n    ');
    }
  }

  // About page
  if (canonicalPath === '/about') {
    return buildMetaTags({
      title: 'About PropertyHack',
      description: 'PropertyHack delivers agenda-free Australian property news. Learn about our editorial approach and how we curate property market coverage.',
      url: '/about',
      hreflang: buildHreflangTags(url),
    });
  }

  // Contact page
  if (canonicalPath === '/contact') {
    return buildMetaTags({
      title: 'Contact PropertyHack',
      description: 'Get in touch with PropertyHack for questions about our property news coverage.',
      url: '/contact',
      hreflang: buildHreflangTags(url),
    });
  }

  // Terms page
  if (canonicalPath === '/terms') {
    return buildMetaTags({
      title: 'Terms of Use — PropertyHack',
      description: 'Terms and conditions for using PropertyHack, an Australian property news aggregation platform.',
      url: '/terms',
      hreflang: buildHreflangTags(url),
    });
  }

  // Privacy page
  if (canonicalPath === '/privacy') {
    return buildMetaTags({
      title: 'Privacy Policy — PropertyHack',
      description: 'Privacy policy for PropertyHack. Learn how we collect, use, and protect your personal information.',
      url: '/privacy',
      hreflang: buildHreflangTags(url),
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
