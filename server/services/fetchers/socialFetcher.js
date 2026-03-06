const axios = require('axios')
const cheerio = require('cheerio')

const USER_AGENT = 'PropertyHack/1.0 News Aggregator'
const FETCH_TIMEOUT = 20000

async function fetch(sourceConfig) {
  const { platform } = sourceConfig

  if (!platform) throw new Error('Social source config missing platform')

  if (platform === 'reddit') {
    return fetchReddit(sourceConfig)
  }

  if (platform === 'twitter') {
    return fetchTwitter(sourceConfig)
  }

  throw new Error(`Unsupported social platform: ${platform}`)
}

async function fetchReddit(sourceConfig) {
  const {
    subreddits = [],
    minScore = 10,
    maxResults = 20,
    sourceName = 'Reddit'
  } = sourceConfig

  if (!subreddits.length) throw new Error('Reddit config missing subreddits array')

  const articles = []

  for (const subreddit of subreddits) {
    const posts = await fetchSubreddit(subreddit, maxResults, minScore)
    for (const post of posts) {
      const article = await buildArticleFromPost(post, sourceName)
      if (article) articles.push(article)
    }
  }

  return articles.slice(0, maxResults)
}

async function fetchSubreddit(subreddit, limit, minScore) {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${Math.min(limit * 2, 50)}`

  let response
  try {
    response = await axios.get(url, {
      timeout: FETCH_TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      }
    })
  } catch (err) {
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      throw new Error(`Reddit fetch timed out for r/${subreddit}`)
    }
    throw new Error(`Reddit fetch failed for r/${subreddit}: ${err.message}`)
  }

  const children = response.data?.data?.children
  if (!Array.isArray(children)) return []

  return children
    .map(c => c.data)
    .filter(post => post && post.score >= minScore && !post.stickied)
}

async function buildArticleFromPost(post, sourceName) {
  const isLinkPost = !post.is_self && post.url && !post.url.includes('reddit.com')

  if (isLinkPost) {
    const article = await fetchLinkedArticle(post.url)
    if (article) {
      return {
        title: article.title || post.title,
        content: article.content || post.title,
        url: post.url,
        imageUrl: article.imageUrl || (post.thumbnail && post.thumbnail.startsWith('http') ? post.thumbnail : null),
        date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : new Date().toISOString(),
        author: post.author || null,
        sourceName
      }
    }
    return {
      title: post.title,
      content: post.title,
      url: post.url,
      imageUrl: post.thumbnail && post.thumbnail.startsWith('http') ? post.thumbnail : null,
      date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : new Date().toISOString(),
      author: post.author || null,
      sourceName
    }
  }

  if (post.is_self && post.selftext && post.selftext.length > 50) {
    const redditUrl = `https://www.reddit.com${post.permalink}`
    return {
      title: post.title,
      content: post.selftext.substring(0, 5000),
      url: redditUrl,
      imageUrl: null,
      date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : new Date().toISOString(),
      author: post.author || null,
      sourceName
    }
  }

  return null
}

async function fetchLinkedArticle(url) {
  try {
    const response = await axios.get(url, {
      timeout: FETCH_TIMEOUT,
      headers: { 'User-Agent': USER_AGENT },
      maxRedirects: 5
    })

    const $ = cheerio.load(response.data)

    const title = $('meta[property="og:title"]').attr('content')
      || $('meta[name="twitter:title"]').attr('content')
      || $('title').text()
      || null

    const imageUrl = $('meta[property="og:image"]').attr('content')
      || $('meta[name="twitter:image"]').attr('content')
      || null

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

    return { title: title?.trim() || null, content: bodyContent, imageUrl }
  } catch {
    return null
  }
}

async function fetchTwitter(sourceConfig) {
  const { bearerToken, listId, maxResults = 20, sourceName = 'Twitter' } = sourceConfig

  if (!bearerToken) {
    console.warn('[socialFetcher] Twitter bearer token not configured — skipping Twitter fetch')
    return []
  }

  if (!listId) throw new Error('Twitter config missing listId')

  let response
  try {
    response = await axios.get(`https://api.twitter.com/2/lists/${listId}/tweets`, {
      timeout: FETCH_TIMEOUT,
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'User-Agent': USER_AGENT
      },
      params: {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': 'created_at,author_id,entities',
        expansions: 'author_id',
        'user.fields': 'name,username'
      }
    })
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      throw new Error('Twitter API authentication failed — check bearer token')
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      throw new Error('Twitter API request timed out')
    }
    throw new Error(`Twitter API request failed: ${err.message}`)
  }

  const tweets = response.data?.data
  const users = response.data?.includes?.users || []
  if (!Array.isArray(tweets)) return []

  const userMap = {}
  for (const u of users) userMap[u.id] = u.name || u.username

  const articles = []

  for (const tweet of tweets) {
    const urls = tweet.entities?.urls?.filter(u => u.expanded_url && !u.expanded_url.includes('twitter.com') && !u.expanded_url.includes('t.co'))
    if (!urls?.length) continue

    for (const urlEntity of urls) {
      const article = await fetchLinkedArticle(urlEntity.expanded_url)
      articles.push({
        title: article?.title || tweet.text.substring(0, 100),
        content: article?.content || tweet.text,
        url: urlEntity.expanded_url,
        imageUrl: article?.imageUrl || null,
        date: tweet.created_at || new Date().toISOString(),
        author: userMap[tweet.author_id] || null,
        sourceName
      })
    }
  }

  return articles.slice(0, maxResults)
}

module.exports = { fetch }
