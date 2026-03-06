import { test, expect } from '@playwright/test'

const ARTICLES_API = '**/api/admin/articles*'

const MOCK_ARTICLES = [
  {
    id: 'article-1',
    title: 'Sydney Property Market Surges in Q4',
    shortBlurb: 'Property prices in Sydney have risen significantly.',
    longSummary: 'Detailed analysis of the Sydney property market...',
    category: 'Market News',
    location: 'Sydney, NSW',
    market: 'AU',
    status: 'PUBLISHED',
    isFeatured: true,
    viewCount: 120,
    sourceUrl: 'https://example.com/article-1',
    imageUrl: null,
    imageAltText: '',
    originalContent: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    source: { name: 'Domain.com.au' },
  },
  {
    id: 'article-2',
    title: 'Melbourne Rental Crisis Deepens',
    shortBlurb: 'Vacancy rates continue to drop across Melbourne suburbs.',
    longSummary: 'The rental market in Melbourne is under pressure...',
    category: 'Rental Market',
    location: 'Melbourne, VIC',
    market: 'AU',
    status: 'DRAFT',
    isFeatured: false,
    viewCount: 0,
    sourceUrl: 'https://example.com/article-2',
    imageUrl: null,
    imageAltText: '',
    originalContent: null,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
    source: { name: 'Herald Sun' },
  },
]

async function setAuth(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'fake-access-token')
    localStorage.setItem('refreshToken', 'fake-refresh-token')
    localStorage.setItem('user', JSON.stringify({
      id: 'user-1',
      email: 'admin@propertyhack.com',
      superAdmin: true,
      createdAt: new Date().toISOString(),
    }))
  })
}

async function mockArticlesList(page: import('@playwright/test').Page, articles = MOCK_ARTICLES) {
  await page.route(ARTICLES_API, async (route) => {
    const url = route.request().url()
    if (route.request().method() === 'GET' && !url.match(/\/articles\/[^?/]+/)) {
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
    } else {
      await route.continue()
    }
  })
}

async function mockSingleArticle(page: import('@playwright/test').Page, article = MOCK_ARTICLES[0]) {
  await page.route(`**/api/admin/articles/${article.id}`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(article),
      })
    } else if (route.request().method() === 'PUT') {
      const body = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...article, ...body, needsReembedding: false }),
      })
    } else {
      await route.continue()
    }
  })
}

test.describe('Admin Articles', () => {
  test.beforeEach(async ({ page }) => {
    await setAuth(page)
  })

  test('navigating to /admin/articles shows article list', async ({ page }) => {
    await mockArticlesList(page)
    await page.goto('/admin/articles')

    await expect(page.locator('h1').filter({ hasText: 'Articles' })).toBeVisible()
    await expect(page.locator('text=Sydney Property Market Surges in Q4')).toBeVisible()
    await expect(page.locator('text=Melbourne Rental Crisis Deepens')).toBeVisible()
  })

  test('shows article count in header', async ({ page }) => {
    await mockArticlesList(page)
    await page.goto('/admin/articles')

    await expect(page.locator('text=2 total')).toBeVisible()
  })

  test('search input is present and can be typed into', async ({ page }) => {
    await mockArticlesList(page)
    await page.goto('/admin/articles')

    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('Sydney')
    await expect(searchInput).toHaveValue('Sydney')
  })

  test('status filter dropdown is present', async ({ page }) => {
    await mockArticlesList(page)
    await page.goto('/admin/articles')

    const statusSelect = page.locator('select').first()
    await expect(statusSelect).toBeVisible()
    await statusSelect.selectOption('PUBLISHED')
    await expect(statusSelect).toHaveValue('PUBLISHED')
  })

  test('category filter can be changed', async ({ page }) => {
    await mockArticlesList(page)
    await page.goto('/admin/articles')

    const selects = page.locator('select')
    const categorySelect = selects.nth(1)
    await expect(categorySelect).toBeVisible()
    await categorySelect.selectOption('Market News')
    await expect(categorySelect).toHaveValue('Market News')
  })

  test('clear filters button appears when filters are active', async ({ page }) => {
    await mockArticlesList(page)
    await page.goto('/admin/articles')

    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('test')
    await expect(page.locator('button', { hasText: 'Clear filters' })).toBeVisible()
  })

  test('clicking Edit navigates to article editor', async ({ page }) => {
    await mockArticlesList(page)
    await mockSingleArticle(page, MOCK_ARTICLES[0])
    await page.goto('/admin/articles')

    await page.locator('button', { hasText: 'Edit' }).first().click()
    await expect(page).toHaveURL(`/admin/articles/${MOCK_ARTICLES[0].id}/edit`)
  })

  test('article editor loads with article data', async ({ page }) => {
    await mockSingleArticle(page, MOCK_ARTICLES[0])
    await page.goto(`/admin/articles/${MOCK_ARTICLES[0].id}/edit`)

    await expect(page.locator('input[type="text"]').first()).toHaveValue('Sydney Property Market Surges in Q4')
    await expect(page.locator('textarea').first()).toContainText('Property prices in Sydney have risen significantly.')
  })

  test('article editor has Back to articles link', async ({ page }) => {
    await mockSingleArticle(page, MOCK_ARTICLES[0])
    await page.goto(`/admin/articles/${MOCK_ARTICLES[0].id}/edit`)

    await expect(page.locator('a', { hasText: 'Back to articles' })).toBeVisible()
  })

  test('can edit article title and save', async ({ page }) => {
    await mockSingleArticle(page, MOCK_ARTICLES[0])
    await page.goto(`/admin/articles/${MOCK_ARTICLES[0].id}/edit`)

    const titleInput = page.locator('input[type="text"]').first()
    await titleInput.fill('Updated Article Title')
    await page.locator('button', { hasText: 'Save' }).click()

    await expect(page.locator('text=Saved')).toBeVisible()
  })

  test('status select shows current article status', async ({ page }) => {
    await mockSingleArticle(page, MOCK_ARTICLES[0])
    await page.goto(`/admin/articles/${MOCK_ARTICLES[0].id}/edit`)

    // The status select should reflect PUBLISHED
    const statusSelect = page.locator('select').filter({ hasText: /Draft|Published|Archived/ })
    await expect(statusSelect).toHaveValue('PUBLISHED')
  })

  test('can toggle status to archived', async ({ page }) => {
    await mockSingleArticle(page, MOCK_ARTICLES[0])
    await page.goto(`/admin/articles/${MOCK_ARTICLES[0].id}/edit`)

    const statusSelect = page.locator('select').filter({ hasText: /Draft|Published|Archived/ })
    await statusSelect.selectOption('ARCHIVED')
    await expect(statusSelect).toHaveValue('ARCHIVED')
  })

  test('shows PUBLISHED badge in article list for published articles', async ({ page }) => {
    await mockArticlesList(page)
    await page.goto('/admin/articles')

    await expect(page.locator('text=PUBLISHED').first()).toBeVisible()
  })

  test('shows DRAFT badge in article list for draft articles', async ({ page }) => {
    await mockArticlesList(page)
    await page.goto('/admin/articles')

    await expect(page.locator('text=DRAFT').first()).toBeVisible()
  })
})
