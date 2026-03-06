import { test, expect } from '@playwright/test'

const ARTICLES_API = '**/api/articles**'
const CATEGORIES_API = '**/api/categories**'
const LOCATIONS_API = '**/api/locations**'

function makeArticle(id: string, title: string, category: string, location: string) {
  return {
    id,
    sourceId: null,
    sourceUrl: `https://example.com/${id}`,
    title,
    shortBlurb: `Blurb for ${title}`,
    longSummary: null,
    imageUrl: null,
    imageAltText: null,
    slug: id,
    category,
    location,
    market: 'AU',
    status: 'PUBLISHED',
    isFeatured: false,
    viewCount: 0,
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: { id: 'src-1', name: 'Domain', type: 'RSS' },
  }
}

const ALL_ARTICLES = [
  makeArticle('art-1', 'Sydney Apartment Boom', 'Market Trends', 'Sydney'),
  makeArticle('art-2', 'Melbourne Investment Guide', 'Investment', 'Melbourne'),
  makeArticle('art-3', 'Brisbane Regulations Update', 'Regulations', 'Brisbane'),
]

async function setupMocks(
  page: import('@playwright/test').Page,
  responseFactory: (url: URL) => unknown[]
) {
  await page.route(CATEGORIES_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ categories: ['Market Trends', 'Investment', 'Regulations'] }),
    })
  })
  await page.route(LOCATIONS_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ locations: ['Sydney', 'Melbourne', 'Brisbane'] }),
    })
  })
  await page.route(ARTICLES_API, async (route) => {
    const url = new URL(route.request().url())
    const articles = responseFactory(url)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ articles, total: articles.length, page: 1, totalPages: 1 }),
    })
  })
}

test.describe('Public Search & Filters', () => {
  test('typing in search box updates results', async ({ page }) => {
    await setupMocks(page, (url) => {
      const search = url.searchParams.get('search')
      if (search === 'Sydney') return [ALL_ARTICLES[0]]
      return ALL_ARTICLES
    })
    await page.goto('/')
    // Wait for initial load
    await expect(page.locator('a[href*="/articles/"]').first()).toBeVisible()

    // Type in the search input
    await page.locator('input[type="search"]').fill('Sydney')
    // Debounce is 300ms — wait for the API call to trigger
    await page.waitForTimeout(400)
    // Only Sydney article should be shown
    await expect(page.getByText('Sydney Apartment Boom')).toBeVisible()
    await expect(page.getByText('Melbourne Investment Guide')).not.toBeVisible()
  })

  test('selecting a category filter updates results', async ({ page }) => {
    await setupMocks(page, (url) => {
      const cat = url.searchParams.get('category')
      if (cat === 'Investment') return [ALL_ARTICLES[1]]
      return ALL_ARTICLES
    })
    await page.goto('/')
    await expect(page.locator('a[href*="/articles/"]').first()).toBeVisible()

    await page.locator('select').filter({ hasText: 'All Categories' }).selectOption('Investment')
    await expect(page.getByText('Melbourne Investment Guide')).toBeVisible()
    await expect(page.getByText('Sydney Apartment Boom')).not.toBeVisible()
  })

  test('selecting a location filter updates results', async ({ page }) => {
    await setupMocks(page, (url) => {
      const loc = url.searchParams.get('location')
      if (loc === 'Brisbane') return [ALL_ARTICLES[2]]
      return ALL_ARTICLES
    })
    await page.goto('/')
    await expect(page.locator('a[href*="/articles/"]').first()).toBeVisible()

    await page.locator('select').filter({ hasText: 'All Locations' }).selectOption('Brisbane')
    await expect(page.getByText('Brisbane Regulations Update')).toBeVisible()
    await expect(page.getByText('Sydney Apartment Boom')).not.toBeVisible()
  })

  test('selecting date range filter updates results', async ({ page }) => {
    const recentArticle = makeArticle('art-recent', 'Recent Property News', 'Market Trends', 'Sydney')
    await setupMocks(page, (url) => {
      const dateFrom = url.searchParams.get('dateFrom')
      if (dateFrom) return [recentArticle]
      return ALL_ARTICLES
    })
    await page.goto('/')
    await expect(page.locator('a[href*="/articles/"]').first()).toBeVisible()

    await page.getByRole('button', { name: 'Today' }).click()
    await expect(page.getByText('Recent Property News')).toBeVisible()
    await expect(page.getByText('Melbourne Investment Guide')).not.toBeVisible()
  })

  test('clear filters button restores all articles', async ({ page }) => {
    await setupMocks(page, (url) => {
      const cat = url.searchParams.get('category')
      if (cat === 'Investment') return [ALL_ARTICLES[1]]
      return ALL_ARTICLES
    })
    await page.goto('/')
    await expect(page.locator('a[href*="/articles/"]').first()).toBeVisible()

    // Apply category filter
    await page.locator('select').filter({ hasText: 'All Categories' }).selectOption('Investment')
    await expect(page.getByText('Melbourne Investment Guide')).toBeVisible()

    // Clear filters
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(page.getByText('Sydney Apartment Boom')).toBeVisible()
    await expect(page.getByText('Melbourne Investment Guide')).toBeVisible()
    await expect(page.getByText('Brisbane Regulations Update')).toBeVisible()
  })

  test('combined filters work together', async ({ page }) => {
    const combined = makeArticle('art-combo', 'Sydney Investment Hotspot', 'Investment', 'Sydney')
    await setupMocks(page, (url) => {
      const loc = url.searchParams.get('location')
      const cat = url.searchParams.get('category')
      if (loc === 'Sydney' && cat === 'Investment') return [combined]
      if (loc === 'Sydney') return [ALL_ARTICLES[0], combined]
      return ALL_ARTICLES
    })
    await page.goto('/')
    await expect(page.locator('a[href*="/articles/"]').first()).toBeVisible()

    await page.locator('select').filter({ hasText: 'All Locations' }).selectOption('Sydney')
    await page.locator('select').filter({ hasText: 'All Categories' }).selectOption('Investment')

    await expect(page.getByText('Sydney Investment Hotspot')).toBeVisible()
    await expect(page.getByText('Brisbane Regulations Update')).not.toBeVisible()
  })
})
