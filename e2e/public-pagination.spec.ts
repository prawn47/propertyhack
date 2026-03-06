import { test, expect } from '@playwright/test'

const ARTICLES_API = '**/api/articles**'
const CATEGORIES_API = '**/api/categories**'
const LOCATIONS_API = '**/api/locations**'

function makeArticle(id: string, title: string) {
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
    category: 'Market Trends',
    location: 'Sydney',
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

const PAGE_1_ARTICLES = Array.from({ length: 6 }, (_, i) =>
  makeArticle(`art-p1-${i}`, `Page 1 Article ${i + 1}`)
)

const PAGE_2_ARTICLES = Array.from({ length: 3 }, (_, i) =>
  makeArticle(`art-p2-${i}`, `Page 2 Article ${i + 1}`)
)

async function mockPaginatedApis(page: import('@playwright/test').Page) {
  await page.route(CATEGORIES_API, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ categories: [] }) })
  })
  await page.route(LOCATIONS_API, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ locations: [] }) })
  })
  await page.route(ARTICLES_API, async (route) => {
    const url = new URL(route.request().url())
    const pageNum = parseInt(url.searchParams.get('page') || '1', 10)

    if (pageNum === 2) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          articles: PAGE_2_ARTICLES,
          total: PAGE_1_ARTICLES.length + PAGE_2_ARTICLES.length,
          page: 2,
          totalPages: 2,
        }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          articles: PAGE_1_ARTICLES,
          total: PAGE_1_ARTICLES.length + PAGE_2_ARTICLES.length,
          page: 1,
          totalPages: 2,
        }),
      })
    }
  })
}

test.describe('Public Pagination', () => {
  test('"Load more articles" button is visible when more pages exist', async ({ page }) => {
    await mockPaginatedApis(page)
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Load more articles' })).toBeVisible()
  })

  test('clicking "Load more articles" appends additional articles', async ({ page }) => {
    await mockPaginatedApis(page)
    await page.goto('/')

    // Confirm page 1 articles are present
    await expect(page.getByText('Page 1 Article 1')).toBeVisible()
    await expect(page.getByText('Page 2 Article 1')).not.toBeVisible()

    // Click load more
    await page.getByRole('button', { name: 'Load more articles' }).click()

    // Page 2 articles should now appear alongside page 1
    await expect(page.getByText('Page 2 Article 1')).toBeVisible()
    await expect(page.getByText('Page 2 Article 3')).toBeVisible()

    // Page 1 articles still present (appended, not replaced)
    await expect(page.getByText('Page 1 Article 1')).toBeVisible()
  })

  test('"Load more" button disappears after loading last page', async ({ page }) => {
    await mockPaginatedApis(page)
    await page.goto('/')

    await page.getByRole('button', { name: 'Load more articles' }).click()

    // After loading all pages the button should disappear
    await expect(page.getByRole('button', { name: 'Load more articles' })).not.toBeVisible()
  })

  test('"Load more" button is not shown when only one page of results', async ({ page }) => {
    await page.route(CATEGORIES_API, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ categories: [] }) })
    })
    await page.route(LOCATIONS_API, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ locations: [] }) })
    })
    await page.route(ARTICLES_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          articles: PAGE_1_ARTICLES,
          total: PAGE_1_ARTICLES.length,
          page: 1,
          totalPages: 1,
        }),
      })
    })

    await page.goto('/')
    await expect(page.getByText('Page 1 Article 1')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Load more articles' })).not.toBeVisible()
  })
})
