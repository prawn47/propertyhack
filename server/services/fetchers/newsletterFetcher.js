const axios = require('axios')
const cheerio = require('cheerio')

const SKIP_LINK_PATTERNS = [
  /unsubscribe/i,
  /optout/i,
  /opt-out/i,
  /manage.*preference/i,
  /privacy.*policy/i,
  /terms.*service/i,
  /facebook\.com/i,
  /twitter\.com/i,
  /linkedin\.com/i,
  /instagram\.com/i,
  /youtube\.com/i,
  /mailto:/i,
]

function shouldSkipUrl(url) {
  return SKIP_LINK_PATTERNS.some(pattern => pattern.test(url))
}

function extractLinksFromEmail(html, sourceConfig) {
  const $ = cheerio.load(html)
  const links = []
  const seen = new Set()

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return

    let normalized
    try {
      normalized = new URL(href).href
    } catch {
      return
    }

    if (seen.has(normalized)) return
    if (shouldSkipUrl(normalized)) return
    if (!normalized.startsWith('http')) return

    seen.add(normalized)
    links.push({
      url: normalized,
      linkText: $(el).text().trim()
    })
  })

  return links
}

function extractInlineArticles(html, sourceName) {
  const $ = cheerio.load(html)
  const articles = []

  // Look for common newsletter article block patterns
  const blockSelectors = [
    'table[class*="article"]',
    'table[class*="story"]',
    'div[class*="article"]',
    'div[class*="story"]',
    'div[class*="item"]',
  ]

  for (const sel of blockSelectors) {
    $(sel).each((_, el) => {
      const $el = $(el)
      const title = $el.find('h1, h2, h3, h4, strong').first().text().trim()
      const summary = $el.find('p').first().text().trim()
      const link = $el.find('a[href]').first().attr('href')
      const img = $el.find('img[src]').first().attr('src')

      if (title && title.length > 10 && link) {
        articles.push({
          title,
          content: summary || title,
          url: link,
          imageUrl: img || null,
          date: new Date().toISOString(),
          author: null,
          sourceName,
        })
      }
    })
    if (articles.length > 0) break
  }

  return articles
}

async function fetchArticleFromUrl(url, sourceName) {
  let response
  try {
    response = await axios.get(url, {
      timeout: 20000,
      headers: { 'User-Agent': 'PropertyHack/1.0 News Aggregator' },
      maxRedirects: 5
    })
  } catch {
    return null
  }

  const $ = cheerio.load(response.data)

  const title = $('meta[property="og:title"]').attr('content')
    || $('meta[name="twitter:title"]').attr('content')
    || $('title').text()
    || 'Untitled'

  const imageUrl = $('meta[property="og:image"]').attr('content')
    || $('meta[name="twitter:image"]').attr('content')
    || null

  const siteName = $('meta[property="og:site_name"]').attr('content')
    || new URL(url).hostname

  const articleSelectors = ['article', '[role="main"]', '.article-body', '.post-content', '.entry-content', 'main']
  let bodyContent = ''
  for (const sel of articleSelectors) {
    const el = $(sel)
    if (el.length) {
      el.find('script, style, nav, aside, .ad, .advertisement, .social-share').remove()
      bodyContent = el.text().trim()
      if (bodyContent.length > 100) break
    }
  }

  if (!bodyContent || bodyContent.length < 100) {
    $('script, style, nav, header, footer, aside').remove()
    bodyContent = $('body').text().trim().substring(0, 5000)
  }

  const description = $('meta[property="og:description"]').attr('content')
    || $('meta[name="description"]').attr('content')
    || ''

  return {
    title: title.trim(),
    content: bodyContent || description,
    url,
    imageUrl,
    date: new Date().toISOString(),
    author: $('meta[name="author"]').attr('content') || null,
    sourceName: sourceName || siteName,
  }
}

async function fetch(sourceConfig) {
  const { emailHtml, sourceName = 'Newsletter', extractLinks = true, maxLinks = 10 } = sourceConfig

  if (!emailHtml) {
    throw new Error('Newsletter fetcher requires emailHtml in sourceConfig')
  }

  const articles = []

  // First pass: extract inline article blocks from the email itself
  const inlineArticles = extractInlineArticles(emailHtml, sourceName)
  articles.push(...inlineArticles)

  if (!extractLinks) {
    return articles
  }

  // Second pass: follow links from the email body
  const links = extractLinksFromEmail(emailHtml, sourceConfig)
  const linksToFetch = links.slice(0, maxLinks)

  const fetched = await Promise.allSettled(
    linksToFetch.map(({ url }) => fetchArticleFromUrl(url, sourceName))
  )

  for (const result of fetched) {
    if (result.status === 'fulfilled' && result.value) {
      // Skip if we already have an article with the same URL from inline extraction
      const isDuplicate = articles.some(a => a.url === result.value.url)
      if (!isDuplicate) {
        articles.push(result.value)
      }
    }
  }

  return articles
}

module.exports = { fetch }
