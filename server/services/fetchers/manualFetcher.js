const axios = require('axios')
const cheerio = require('cheerio')

async function fetch(sourceConfig) {
  const { url, title, content } = sourceConfig

  if (title && content) {
    return [{
      title,
      content,
      url: url || '',
      imageUrl: null,
      date: new Date().toISOString(),
      author: null,
      sourceName: 'Manual Entry'
    }]
  }

  if (!url) throw new Error('Manual source config requires url or title+content')

  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('Invalid URL provided')
  }

  let response
  try {
    response = await axios.get(url, {
      timeout: 30000,
      headers: { 'User-Agent': 'PropertyHack/1.0 News Aggregator' },
      maxRedirects: 5
    })
  } catch (err) {
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      throw new Error(`Request timed out for URL: ${url}`)
    }
    throw new Error(`Failed to fetch URL: ${url}`)
  }

  const $ = cheerio.load(response.data)

  const extractedTitle = $('meta[property="og:title"]').attr('content')
    || $('meta[name="twitter:title"]').attr('content')
    || $('title').text()
    || 'Untitled'

  const description = $('meta[property="og:description"]').attr('content')
    || $('meta[name="description"]').attr('content')
    || ''

  const imageUrl = $('meta[property="og:image"]').attr('content')
    || $('meta[name="twitter:image"]').attr('content')
    || null

  const siteName = $('meta[property="og:site_name"]').attr('content')
    || parsedUrl.hostname

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

  return [{
    title: extractedTitle.trim(),
    content: bodyContent || description,
    url,
    imageUrl,
    date: new Date().toISOString(),
    author: $('meta[name="author"]').attr('content') || null,
    sourceName: siteName
  }]
}

module.exports = { fetch }
