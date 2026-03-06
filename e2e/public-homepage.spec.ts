import { test, expect } from '@playwright/test'

const ARTICLES_API = '**/api/articles**'
const CATEGORIES_API = '**/api/categories**'
const LOCATIONS_API = '**/api/locations**'

function makeArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'art-1',
    sourceId: 'src-1',
    sourceUrl: 'https://example.com/article-1',
    title: 'Sydney Property Market Surges in Q1',
    shortBlurb: 'Sydney home prices rose 3% in the first quarter according to new data.',
    longSummary: null,
    imageUrl: null,
    imageAltText: null,
    slug: 'sydney-property-market-surges-q1',
    category: 'Market Trends',
    location: 'Sydney',
    market: 'AU',
    status: 'PUBLISHED',
    isFeatured: false,
    viewCount: 10,
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: { id: 'src-1', name: 'Domain', type: 'RSS' },
    ...overrides,
  }
}

function mockApis(page: import('@playwright/test').Page, articles: unknown[] = [makeArticle()]) {
  page.route(CATEGORIES_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ categories: ['Market Trends', 'Investment', 'Regulations'] }),
    })
  })
  page.route(LOCATIONS_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ locations: ['Sydney', 'Melbourne', 'Brisbane'] }),
    })
  })
  page.route(ARTICLES_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        articles,
        total: articles.length,
        page: 1,
        totalPages: 1,
      }),
    })
  })
}

test.describe('Public Homepage', () => {
  test('homepage loads within 2 seconds', async ({ page }) => {
    await mockApis(page)
    const start = Date.now()
    await page.goto('/')
    await expect(page.locator('h2').first()).toBeVisible()
    expect(Date.now() - start).toBeLessThan(2000)
  })

  test('article cards display title, blurb, source name, and date', async ({ page }) => {
    await mockApis(page)
    await page.goto('/')
    const card = page.locator('a[href*="/articles/"]').first()
    await expect(card).toBeVisible()
    await expect(card.getByText('Sydney Property Market Surges in Q1')).toBeVisible()
    await expect(card.getByText('Sydney home prices rose 3%', { exact: false })).toBeVisible()
    await expect(card.getByText('Domain')).toBeVisible()
    // Date renders as relative time — any time element is present
    await expect(card.locator('time')).toBeVisible()
  })

  test('featured articles have gold left border styling', async ({ page }) => {
    const featured = makeArticle({ id: 'art-f', isFeatured: true, slug: 'featured-article', title: 'Featured Property News' })
    await mockApis(page, [featured])
    await page.goto('/')
    const card = page.locator('a[href*="/articles/featured-article"]')
    await expect(card).toBeVisible()
    // The featured card gets border-l-4 border-brand-gold class
    await expect(card).toHaveClass(/border-l-4/)
    await expect(card).toHaveClass(/border-brand-gold/)
  })

  test('cards reflow to single column on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await mockApis(page, [makeArticle(), makeArticle({ id: 'art-2', slug: 'second-article', title: 'Second Article' })])
    await page.goto('/')
    const grid = page.locator('.grid').first()
    await expect(grid).toBeVisible()
    // On mobile the grid should use grid-cols-1 (single column)
    await expect(grid).toHaveClass(/grid-cols-1/)
  })

  test('empty state shown when no articles returned', async ({ page }) => {
    await mockApis(page, [])
    await page.goto('/')
    await expect(page.getByText('No articles found')).toBeVisible()
  })
})
