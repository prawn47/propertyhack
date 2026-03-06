import { test, expect } from '@playwright/test'

const ARTICLES_API = '**/api/articles**'
const CATEGORIES_API = '**/api/categories**'
const LOCATIONS_API = '**/api/locations**'

const ARTICLE_DETAIL = {
  id: 'art-1',
  sourceId: 'src-1',
  sourceUrl: 'https://domain.com.au/original-article',
  title: 'Sydney Property Market Surges in Q1',
  shortBlurb: 'Sydney home prices rose 3% in the first quarter.',
  longSummary: 'Sydney property prices surged in Q1 driven by strong demand.\n\nExperts predict continued growth through the year.',
  imageUrl: 'https://example.com/image.jpg',
  imageAltText: 'Sydney skyline',
  slug: 'sydney-property-market-surges-q1',
  category: 'Market Trends',
  location: 'Sydney',
  market: 'AU',
  status: 'PUBLISHED',
  isFeatured: false,
  viewCount: 42,
  publishedAt: new Date(Date.now() - 86400000).toISOString(),
  metadata: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  source: { id: 'src-1', name: 'Domain', type: 'RSS' },
}

const RELATED_ARTICLE = {
  id: 'art-2',
  sourceId: 'src-1',
  sourceUrl: 'https://domain.com.au/related-article',
  title: 'Melbourne Prices Also Rising',
  shortBlurb: 'Melbourne sees similar trend.',
  longSummary: null,
  imageUrl: null,
  imageAltText: null,
  slug: 'melbourne-prices-also-rising',
  category: 'Market Trends',
  location: 'Melbourne',
  market: 'AU',
  status: 'PUBLISHED',
  isFeatured: false,
  viewCount: 0,
  publishedAt: new Date(Date.now() - 7200000).toISOString(),
  metadata: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  source: { id: 'src-1', name: 'Domain', type: 'RSS' },
}

async function mockAllApis(page: import('@playwright/test').Page) {
  await page.route(CATEGORIES_API, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ categories: [] }) })
  })
  await page.route(LOCATIONS_API, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ locations: [] }) })
  })
  await page.route(ARTICLES_API, async (route) => {
    const url = route.request().url()
    if (url.includes('/related')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ articles: [RELATED_ARTICLE] }),
      })
    } else if (url.includes('/sydney-property-market-surges-q1')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ARTICLE_DETAIL),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          articles: [ARTICLE_DETAIL],
          total: 1,
          page: 1,
          totalPages: 1,
        }),
      })
    }
  })
}

test.describe('Public Article Detail', () => {
  test('clicking an article card navigates to /articles/:slug', async ({ page }) => {
    await mockAllApis(page)
    await page.goto('/')
    await page.locator('a[href*="/articles/sydney-property-market-surges-q1"]').first().click()
    await expect(page).toHaveURL('/articles/sydney-property-market-surges-q1')
  })

  test('detail page shows title, long summary, source link, and image', async ({ page }) => {
    await mockAllApis(page)
    await page.goto('/articles/sydney-property-market-surges-q1')
    await expect(page.getByRole('heading', { name: 'Sydney Property Market Surges in Q1' })).toBeVisible()
    await expect(page.getByText('Sydney property prices surged in Q1', { exact: false })).toBeVisible()
    await expect(page.getByText('Experts predict continued growth', { exact: false })).toBeVisible()
    await expect(page.locator('img[alt="Sydney skyline"]')).toBeVisible()
  })

  test('"Read Original Article" link points to source URL', async ({ page }) => {
    await mockAllApis(page)
    await page.goto('/articles/sydney-property-market-surges-q1')
    const cta = page.getByRole('link', { name: 'Read Original Article' })
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', 'https://domain.com.au/original-article')
    await expect(cta).toHaveAttribute('target', '_blank')
  })

  test('related articles section is shown', async ({ page }) => {
    await mockAllApis(page)
    await page.goto('/articles/sydney-property-market-surges-q1')
    await expect(page.getByRole('heading', { name: 'Related Articles' })).toBeVisible()
    await expect(page.getByText('Melbourne Prices Also Rising')).toBeVisible()
  })

  test('clicking a related article navigates to that article detail', async ({ page }) => {
    await mockAllApis(page)
    // Also mock the second article detail page
    await page.route('**/api/articles/melbourne-prices-also-rising', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...RELATED_ARTICLE, longSummary: 'Melbourne full detail.' }),
      })
    })
    await page.route('**/api/articles/melbourne-prices-also-rising/related', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ articles: [] }) })
    })

    await page.goto('/articles/sydney-property-market-surges-q1')
    await expect(page.getByText('Melbourne Prices Also Rising')).toBeVisible()
    await page.getByText('Melbourne Prices Also Rising').click()
    await expect(page).toHaveURL('/articles/melbourne-prices-also-rising')
  })
})
