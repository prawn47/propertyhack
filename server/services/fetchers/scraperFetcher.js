const axios = require('axios')
const cheerio = require('cheerio')

const HEADERS = {
  'User-Agent': 'PropertyHack/1.0 News Aggregator',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-AU,en;q=0.9',
}

async function checkRobots(baseUrl) {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).href
    const response = await axios.get(robotsUrl, {
      timeout: 10000,
      headers: HEADERS,
      validateStatus: s => s < 500
    })
    if (response.status !== 200) return true
    const lines = response.data.split('\n')
    let applies = false
    for (const line of lines) {
      const trimmed = line.trim()
      if (/^user-agent:\s*\*/i.test(trimmed) || /^user-agent:\s*propertyhack/i.test(trimmed)) {
        applies = true
      } else if (/^user-agent:/i.test(trimmed)) {
        applies = false
      } else if (applies && /^disallow:\s*\//i.test(trimmed)) {
        const path = trimmed.replace(/^disallow:\s*/i, '').trim()
        if (path === '/' || path === '') return false
      }
    }
    return true
  } catch {
    return true
  }
}

function resolveUrl(href, baseUrl) {
  if (!href) return null
  try {
    return new URL(href, baseUrl).href
  } catch {
    return null
  }
}

function extractText($el) {
  return $el.text().trim() || null
}

async function fetch(sourceConfig) {
  const {
    url,
    selectors = {},
    baseUrl,
    maxArticles = 20,
    sourceName: configSourceName
  } = sourceConfig

  if (!url) throw new Error('Scraper source config missing url')
  if (!selectors.articleList) throw new Error('Scraper source config missing selectors.articleList')

  const effectiveBase = baseUrl || new URL(url).origin

  const allowed = await checkRobots(effectiveBase)
  if (!allowed) {
    console.warn(`[scraperFetcher] robots.txt disallows scraping ${effectiveBase}, skipping`)
    return []
  }

  let response
  try {
    response = await axios.get(url, {
      timeout: 30000,
      headers: HEADERS,
      maxRedirects: 5
    })
  } catch (err) {
    console.error(`[scraperFetcher] Failed to fetch ${url}:`, err.message)
    return []
  }

  const $ = cheerio.load(response.data)
  const siteName = configSourceName
    || $('meta[property="og:site_name"]').attr('content')
    || new URL(url).hostname

  const articleEls = $(selectors.articleList)
  if (!articleEls.length) {
    console.warn(`[scraperFetcher] No elements matched selector "${selectors.articleList}" on ${url}`)
    return []
  }

  const articles = []

  articleEls.each((i, el) => {
    if (articles.length >= maxArticles) return false

    const $el = $(el)

    const titleEl = selectors.title ? $el.find(selectors.title) : null
    const title = titleEl?.length ? extractText(titleEl) : extractText($el.find('h1,h2,h3').first())

    const urlEl = selectors.url ? $el.find(selectors.url) : (selectors.title ? $el.find(selectors.title) : null)
    const rawHref = urlEl?.length
      ? (urlEl.attr('href') || urlEl.find('a').first().attr('href'))
      : $el.find('a').first().attr('href')
    const articleUrl = resolveUrl(rawHref, effectiveBase)

    if (!articleUrl) return

    const contentEl = selectors.content ? $el.find(selectors.content) : null
    const content = contentEl?.length ? extractText(contentEl) : ''

    const imageEl = selectors.image ? $el.find(selectors.image) : null
    const rawImageSrc = imageEl?.length
      ? (imageEl.attr('src') || imageEl.attr('data-src'))
      : null
    const imageUrl = rawImageSrc ? resolveUrl(rawImageSrc, effectiveBase) : null

    const dateEl = selectors.date ? $el.find(selectors.date) : null
    const rawDate = dateEl?.length
      ? (dateEl.attr('datetime') || extractText(dateEl))
      : null
    const date = rawDate ? new Date(rawDate).toISOString() : null

    const authorEl = selectors.author ? $el.find(selectors.author) : null
    const author = authorEl?.length ? extractText(authorEl) : null

    articles.push({
      title: title || 'Untitled',
      content,
      url: articleUrl,
      imageUrl,
      date,
      author,
      sourceName: siteName
    })
  })

  return articles
}

module.exports = { fetch }
