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
const DEFAULT_DESCRIPTION = 'Stay informed with agenda-free property news, market updates, and analysis from around the world.';

function getMarketDescription(country) {
  const descriptions = {
    AU: 'Stay informed with agenda-free Australian property news, market updates, and analysis across Sydney, Melbourne, Brisbane, Perth, Adelaide and more.',
    US: 'Stay informed with property news, market updates, and analysis across New York, Los Angeles, Chicago, Houston, and more US cities.',
    UK: 'Stay informed with property news, market updates, and analysis across London, Manchester, Birmingham, Edinburgh, and more UK cities.',
    CA: 'Stay informed with property news, market updates, and analysis across Toronto, Vancouver, Montreal, Calgary, and more Canadian cities.',
    NZ: 'Stay informed with property news, market updates, and analysis across Auckland, Wellington, Christchurch, Hamilton, and more New Zealand cities.',
  };
  return descriptions[country?.toUpperCase()] || DEFAULT_DESCRIPTION;
}

const COUNTRY_NAMES = {
  AU: 'Australia',
  US: 'United States',
  UK: 'United Kingdom',
  CA: 'Canada',
  NZ: 'New Zealand',
};
const DEFAULT_IMAGE = `${SITE_URL}/ph-logo.jpg`;

const SUPPORTED_COUNTRIES = ['au', 'us', 'uk', 'ca', 'nz'];
const HREFLANG_MAP = { au: 'en-AU', us: 'en-US', uk: 'en-GB', ca: 'en-CA', nz: 'en-NZ' };

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
    if (!articleData.isEvergreen && !articleData.isGlobal && articleData.market) {
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

function buildMetaTags({ title, description, url, image, imageAlt, type, jsonLd, article, hreflang, keywords }) {
  const tags = [];
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Agenda-free Property News`;
  const desc = description || DEFAULT_DESCRIPTION;
  const img = image || DEFAULT_IMAGE;

  tags.push(`<title>${escapeHtml(fullTitle)}</title>`);
  tags.push(`<meta name="description" content="${escapeHtml(desc)}" />`);
  if (keywords && keywords.length > 0) {
    tags.push(`<meta name="keywords" content="${escapeHtml(keywords.join(', '))}" />`);
  }
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
    const countryCode = url.length === 3 ? url.slice(1).toUpperCase() : null;
    const countryName = countryCode ? COUNTRY_NAMES[countryCode] : null;
    const homeTitle = countryName ? `Property News ${countryName}` : null;
    const homeMarket = countryCode || 'AU';

    let homeKeywords = [];
    try {
      const matched = await prisma.seoKeyword.findMany({
        where: { market: homeMarket, location: null },
        orderBy: { priority: 'desc' },
        take: 10,
        select: { keyword: true },
      });
      homeKeywords = matched.map(k => k.keyword);
    } catch (kwErr) {
      console.warn('crawlerSsr: failed to load home page SeoKeywords', kwErr.message);
    }

    return buildMetaTags({
      title: homeTitle,
      description: getMarketDescription(countryCode),
      url: url,
      type: 'website',
      jsonLd: buildWebsiteJsonLd(),
      hreflang: buildHreflangTags(url),
      keywords: homeKeywords,
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
        publishedAt: true, updatedAt: true, market: true, isEvergreen: true, isGlobal: true,
      },
    });
    if (article) {
      const imgUrl = article.imageUrl?.startsWith('http')
        ? article.imageUrl
        : article.imageUrl
          ? `${SITE_URL}${article.imageUrl}`
          : DEFAULT_IMAGE;

      // Query matching SEO keywords for this article
      let articleKeywords = [];
      let articleDescription = article.shortBlurb || article.longSummary?.substring(0, 160);
      try {
        const matchedKeywords = await prisma.seoKeyword.findMany({
          where: {
            market: article.market,
            AND: [
              { OR: [{ location: article.location }, { location: null }] },
              { OR: [{ category: article.category }, { category: null }] },
            ],
          },
          orderBy: { priority: 'desc' },
          take: 8,
          select: { keyword: true, priority: true },
        });
        articleKeywords = matchedKeywords.map(k => k.keyword).slice(0, 8);

        // Append 1-2 high-priority keywords to description if they naturally extend it
        if (articleDescription && matchedKeywords.length > 0) {
          const topKeywords = matchedKeywords.slice(0, 2).map(k => k.keyword);
          const descLower = articleDescription.toLowerCase();
          const newKeywords = topKeywords.filter(kw => !descLower.includes(kw.toLowerCase()));
          if (newKeywords.length > 0 && !articleDescription.endsWith('.')) {
            articleDescription = `${articleDescription}. ${newKeywords.join(', ')}.`;
          } else if (newKeywords.length > 0) {
            articleDescription = `${articleDescription} ${newKeywords.join(', ')}.`;
          }
        }
      } catch (kwErr) {
        console.warn('crawlerSsr: failed to load SeoKeywords for article', slug, kwErr.message);
      }

      return buildMetaTags({
        title: article.title,
        description: articleDescription,
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
        keywords: articleKeywords,
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

  // Location page: /:country/property-news/:location or legacy /property-news/:location
  const countryLocationMatch = url.match(/^\/([a-z]{2})\/property-news\/([^/?#]+)/);
  const legacyLocationMatch = !countryLocationMatch && url.match(/^\/property-news\/([^/?#]+)/);
  if (countryLocationMatch || legacyLocationMatch) {
    const countryCode = countryLocationMatch
      ? countryLocationMatch[1].toUpperCase()
      : 'AU';
    const slug = countryLocationMatch ? countryLocationMatch[2] : legacyLocationMatch[1];
    const canonicalPath = countryLocationMatch
      ? `/${countryLocationMatch[1]}/property-news/${slug}`
      : `/property-news/${slug}`;

    const locationSeo = await prisma.locationSeo.findFirst({
      where: { slug, country: countryCode },
    });
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
    const countryName = COUNTRY_NAMES[countryCode] || countryCode;
    const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return buildMetaTags({
      title: `Property News ${displayName}, ${countryName}`,
      description: `Latest property news, market updates and analysis for ${displayName}, ${countryName}.`,
      url: canonicalPath,
      type: 'website',
      hreflang: buildHreflangTags(url),
    });
  }

  // Category page: /category/:slug or /:country/category/:slug
  const categoryMatch = canonicalPath.match(/^\/category\/([^/?#]+)/);
  if (categoryMatch) {
    const { country: catCountry } = parseCountryAndPath(url);
    const catCountryCode = catCountry ? catCountry.toUpperCase() : 'AU';
    const catCountryName = COUNTRY_NAMES[catCountryCode] || catCountryCode;
    const slug = categoryMatch[1];
    const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    // Convert slug to likely category value (e.g. "market-news" → "Market News")
    const categoryValue = displayName;

    let categoryKeywords = [];
    try {
      const matched = await prisma.seoKeyword.findMany({
        where: { category: { equals: categoryValue, mode: 'insensitive' } },
        orderBy: { priority: 'desc' },
        take: 10,
        select: { keyword: true },
      });
      categoryKeywords = matched.map(k => k.keyword);
    } catch (kwErr) {
      console.warn('crawlerSsr: failed to load category SeoKeywords for', slug, kwErr.message);
    }

    return buildMetaTags({
      title: `${displayName} - ${catCountryName} Property News`,
      description: `Latest ${displayName.toLowerCase()} news and analysis from the ${catCountryName} property market.`,
      url: canonicalPath,
      type: 'website',
      hreflang: buildHreflangTags(url),
      keywords: categoryKeywords,
    });
  }

  // Tools index and calculator pages
  const CURRENCY_BY_MARKET = { au: 'AUD', us: 'USD', uk: 'GBP', ca: 'CAD', nz: 'NZD' };

  // Market-specific tools index pages: /:market/tools
  const toolsMarketMatch = url.match(/^\/([a-z]{2})\/tools$/);
  if (toolsMarketMatch && SUPPORTED_COUNTRIES.includes(toolsMarketMatch[1])) {
    const mkt = toolsMarketMatch[1];
    const countryName = COUNTRY_NAMES[mkt.toUpperCase()];
    const title = `Free Property Calculators ${countryName} 2026`;
    const description = `Free property calculators for ${countryName} — mortgage repayments, rental yield, borrowing power, rent vs buy, and more. Updated for 2026.`;
    const webAppJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: `${SITE_URL}/${mkt}/tools`,
      description,
    };
    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/${mkt}/tools` },
        { '@type': 'ListItem', position: 3, name: `${countryName} Calculators`, item: `${SITE_URL}/${mkt}/tools` },
      ],
    };
    const tags = [];
    const fullTitle = `${title} | ${SITE_NAME}`;
    tags.push(`<title>${escapeHtml(fullTitle)}</title>`);
    tags.push(`<meta name="description" content="${escapeHtml(description)}" />`);
    tags.push(`<link rel="canonical" href="${SITE_URL}/${mkt}/tools" />`);
    tags.push(buildHreflangTags(url));
    tags.push(`<meta property="og:title" content="${escapeHtml(fullTitle)}" />`);
    tags.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
    tags.push(`<meta property="og:type" content="website" />`);
    tags.push(`<meta property="og:url" content="${SITE_URL}/${mkt}/tools" />`);
    tags.push(`<meta property="og:site_name" content="${SITE_NAME}" />`);
    tags.push(`<meta property="og:image" content="${DEFAULT_IMAGE}" />`);
    tags.push(`<meta name="twitter:card" content="summary_large_image" />`);
    tags.push(`<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`);
    tags.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
    tags.push(`<meta name="twitter:image" content="${DEFAULT_IMAGE}" />`);
    tags.push(`<script type="application/ld+json">${JSON.stringify(webAppJsonLd)}</script>`);
    tags.push(`<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>`);
    return tags.join('\n    ');
  }

  // Market-specific calculator pages: /:market/tools/:calculator-slug
  const toolsMarketCalcMatch = url.match(/^\/([a-z]{2})\/tools\/([^/?#]+)$/);
  if (toolsMarketCalcMatch && SUPPORTED_COUNTRIES.includes(toolsMarketCalcMatch[1])) {
    const mkt = toolsMarketCalcMatch[1];
    const calcSlug = toolsMarketCalcMatch[2];
    const countryName = COUNTRY_NAMES[mkt.toUpperCase()];
    const currency = CURRENCY_BY_MARKET[mkt];

    const MARKET_CALC_META = {
      'mortgage-calculator': {
        au: { title: 'Mortgage Repayment Calculator Australia 2026', description: 'Calculate Australian mortgage repayments across different loan terms and rates. Includes LMI indicator, fortnightly/weekly payments, and amortisation schedule.' },
        us: { title: 'Mortgage Calculator USA 2026', description: 'Calculate US mortgage payments with PMI estimates, amortization schedule, and monthly/bi-weekly payment options.' },
        uk: { title: 'Mortgage Calculator UK 2026', description: 'Calculate UK mortgage repayments including stress test rates, monthly payments, and total interest over the mortgage term.' },
        ca: { title: 'Mortgage Calculator Canada 2026', description: 'Calculate Canadian mortgage payments including CMHC insurance, amortization period options, and OSFI stress test rate.' },
        nz: { title: 'Mortgage Calculator NZ 2026', description: 'Calculate New Zealand mortgage repayments with low equity premium notes, weekly/fortnightly payment options, and amortisation schedule.' },
      },
      'rental-yield-calculator': {
        au: { title: 'Rental Yield Calculator Australia 2026', description: 'Calculate gross and net rental yield for Australian investment properties including council rates, strata fees, and management costs.' },
        us: { title: 'Rental Yield Calculator USA 2026', description: 'Calculate gross and net rental yield for US investment properties including property tax, HOA fees, and management costs.' },
        uk: { title: 'Rental Yield Calculator UK 2026', description: 'Calculate gross and net rental yield for UK investment properties including council tax, service charges, and management costs.' },
        ca: { title: 'Rental Yield Calculator Canada 2026', description: 'Calculate gross and net rental yield for Canadian investment properties including property tax, condo fees, and management costs.' },
        nz: { title: 'Rental Yield Calculator NZ 2026', description: 'Calculate gross and net rental yield for New Zealand investment properties with interest deductibility toggle and council rates.' },
      },
      'borrowing-power-calculator': {
        au: { title: 'Borrowing Power Calculator Australia 2026', description: 'Find out how much you can borrow from Australian lenders based on income, expenses, and the APRA 3% serviceability buffer.' },
        us: { title: 'Borrowing Power Calculator USA 2026', description: 'Estimate your US mortgage borrowing capacity based on income, debts, and lender debt-to-income ratio guidelines.' },
        uk: { title: 'Borrowing Power Calculator UK 2026', description: 'Estimate UK mortgage affordability based on income, expenses, and the PRA 3% stress test requirement.' },
        ca: { title: 'Borrowing Power Calculator Canada 2026', description: 'Calculate Canadian mortgage borrowing capacity with the OSFI B-20 stress test at the higher of 5.25% or contract rate plus 2%.' },
        nz: { title: 'Borrowing Power Calculator NZ 2026', description: 'Find out how much you can borrow from New Zealand lenders based on income, expenses, and the standard 2.5% serviceability buffer.' },
      },
      'rent-vs-buy-calculator': {
        au: { title: 'Rent vs Buy Calculator Australia 2026', description: 'Compare renting vs buying in Australia over the long term, including stamp duty, council rates, and capital growth assumptions.' },
        us: { title: 'Rent vs Buy Calculator USA 2026', description: 'Compare renting vs buying in the US including property tax, HOA fees, PMI, and optional mortgage interest tax deduction.' },
        uk: { title: 'Rent vs Buy Calculator UK 2026', description: 'Compare renting vs buying in the UK including SDLT, council tax, and long-term capital growth assumptions.' },
        ca: { title: 'Rent vs Buy Calculator Canada 2026', description: 'Compare renting vs buying in Canada including land transfer tax, property tax, and long-term capital growth assumptions.' },
        nz: { title: 'Rent vs Buy Calculator NZ 2026', description: 'Compare renting vs buying in New Zealand including council rates, insurance costs, and long-term capital growth assumptions.' },
      },
      'stamp-duty-calculator': {
        au: { title: 'Stamp Duty Calculator Australia 2026 — Calculate by State', description: 'Calculate stamp duty for every Australian state and territory. Includes first home buyer concessions, foreign buyer surcharges, and investment property rates.' },
      },
      'sdlt-calculator': {
        uk: { title: 'Stamp Duty Calculator UK 2026 — SDLT, LBTT & LTT Rates', description: 'Calculate UK property stamp duty for England & Northern Ireland (SDLT), Scotland (LBTT), and Wales (LTT). Includes first-time buyer relief and additional property surcharges.' },
      },
      'land-transfer-tax-calculator': {
        ca: { title: 'Land Transfer Tax Calculator Canada 2026 — All Provinces', description: 'Calculate Canadian land transfer tax for all 13 provinces and territories including Ontario, BC, Quebec, and Toronto/Montreal municipal taxes.' },
      },
      'transfer-tax-calculator': {
        us: { title: 'Transfer Tax Calculator USA 2026 — All 50 States', description: 'Calculate US property transfer tax and estimated closing costs for all 50 states, including title insurance and mortgage recording tax.' },
      },
      'buying-costs-calculator': {
        nz: { title: 'Buying Costs Calculator NZ 2026 — No Stamp Duty', description: 'Estimate total property buying costs in New Zealand. NZ has no stamp duty or transfer tax — this calculator covers legal fees, inspections, LIM reports, and low equity premiums.' },
      },
    };

    const calcMeta = MARKET_CALC_META[calcSlug]?.[mkt];
    if (calcMeta) {
      const calcDisplayName = calcSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const webAppJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: calcMeta.title,
        url: `${SITE_URL}/${mkt}/tools/${calcSlug}`,
        description: calcMeta.description,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'All',
        offers: { '@type': 'Offer', price: '0', priceCurrency: currency },
      };
      const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
          { '@type': 'ListItem', position: 3, name: `${countryName} Calculators`, item: `${SITE_URL}/${mkt}/tools` },
          { '@type': 'ListItem', position: 4, name: calcDisplayName, item: `${SITE_URL}/${mkt}/tools/${calcSlug}` },
        ],
      };
      const tags = [];
      const fullTitle = `${calcMeta.title} | ${SITE_NAME}`;
      tags.push(`<title>${escapeHtml(fullTitle)}</title>`);
      tags.push(`<meta name="description" content="${escapeHtml(calcMeta.description)}" />`);
      tags.push(`<link rel="canonical" href="${SITE_URL}/tools/${mkt}/${calcSlug}" />`);
      tags.push(buildHreflangTags(url));
      tags.push(`<meta property="og:title" content="${escapeHtml(fullTitle)}" />`);
      tags.push(`<meta property="og:description" content="${escapeHtml(calcMeta.description)}" />`);
      tags.push(`<meta property="og:type" content="website" />`);
      tags.push(`<meta property="og:url" content="${SITE_URL}/tools/${mkt}/${calcSlug}" />`);
      tags.push(`<meta property="og:site_name" content="${SITE_NAME}" />`);
      tags.push(`<meta property="og:image" content="${DEFAULT_IMAGE}" />`);
      tags.push(`<meta name="twitter:card" content="summary_large_image" />`);
      tags.push(`<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`);
      tags.push(`<meta name="twitter:description" content="${escapeHtml(calcMeta.description)}" />`);
      tags.push(`<meta name="twitter:image" content="${DEFAULT_IMAGE}" />`);
      tags.push(`<script type="application/ld+json">${JSON.stringify(webAppJsonLd)}</script>`);
      tags.push(`<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>`);
      return tags.join('\n    ');
    }
  }

  const CALCULATOR_META = {
    '/tools': {
      title: 'Property Calculators',
      description: 'Free property calculators — mortgage repayments, stamp duty, rental yield, borrowing power, rent vs buy.',
      appName: 'Property Calculators',
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
      description: 'PropertyHack delivers agenda-free property news. Learn about our editorial approach and how we curate property market coverage.',
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
      description: 'Terms and conditions for using PropertyHack, a property news aggregation platform.',
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
      html = html.replace(/<link rel="canonical"[^>]*\/>/, '');
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
