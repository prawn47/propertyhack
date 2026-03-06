import { test, expect } from '@playwright/test'

const SOURCES_API = '**/api/admin/sources*'

const MOCK_SOURCES = [
  {
    id: 'source-1',
    name: 'Domain.com.au RSS',
    type: 'RSS',
    config: { feedUrl: 'https://www.domain.com.au/rss.xml' },
    market: 'AU',
    category: 'Market News',
    schedule: '*/30 * * * *',
    isActive: true,
    lastFetchAt: new Date(Date.now() - 1800000).toISOString(),
    lastError: null,
    errorCount: 0,
    articleCount: 142,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logs: [],
  },
  {
    id: 'source-2',
    name: 'Herald Sun Property',
    type: 'RSS',
    config: { feedUrl: 'https://www.heraldsun.com.au/rss.xml' },
    market: 'AU',
    category: 'Market News',
    schedule: '0 * * * *',
    isActive: false,
    lastFetchAt: new Date(Date.now() - 86400000).toISOString(),
    lastError: 'Connection timeout',
    errorCount: 5,
    articleCount: 89,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logs: [],
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

async function mockSourcesList(page: import('@playwright/test').Page, sources = MOCK_SOURCES) {
  await page.route(SOURCES_API, async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (method === 'GET' && url.match(/\/api\/admin\/sources(\?.*)?$/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sources),
      })
    } else if (method === 'POST' && url.match(/\/api\/admin\/sources$/)) {
      const body = JSON.parse(route.request().postData() || '{}')
      const newSource = {
        ...MOCK_SOURCES[0],
        id: 'source-new',
        name: body.name,
        type: body.type,
        config: body.config,
        isActive: true,
        errorCount: 0,
        articleCount: 0,
        lastFetchAt: null,
        lastError: null,
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newSource),
      })
    } else if (method === 'PUT' && url.match(/\/api\/admin\/sources\/[^/]+$/)) {
      const body = JSON.parse(route.request().postData() || '{}')
      const sourceId = url.split('/').pop()
      const existing = sources.find(s => s.id === sourceId) || sources[0]
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...existing, ...body }),
      })
    } else if (method === 'POST' && url.match(/\/api\/admin\/sources\/[^/]+\/fetch$/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Fetch queued' }),
      })
    } else {
      await route.continue()
    }
  })
}

async function mockSourceGet(page: import('@playwright/test').Page, source = MOCK_SOURCES[0]) {
  await page.route(`**/api/admin/sources/${source.id}`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(source),
      })
    } else {
      await route.continue()
    }
  })
}

test.describe('Admin Sources', () => {
  test.beforeEach(async ({ page }) => {
    await setAuth(page)
  })

  test('navigating to /admin/sources shows source list', async ({ page }) => {
    await mockSourcesList(page)
    await page.goto('/admin/sources')

    await expect(page.locator('h1').filter({ hasText: 'Sources' })).toBeVisible()
    await expect(page.locator('text=Domain.com.au RSS')).toBeVisible()
    await expect(page.locator('text=Herald Sun Property')).toBeVisible()
  })

  test('shows source types as badges', async ({ page }) => {
    await mockSourcesList(page)
    await page.goto('/admin/sources')

    await expect(page.locator('text=RSS').first()).toBeVisible()
  })

  test('shows active/paused status indicators', async ({ page }) => {
    await mockSourcesList(page)
    await page.goto('/admin/sources')

    await expect(page.locator('text=Healthy').first()).toBeVisible()
    // Paused source is visible
    await expect(page.locator('text=Paused').first()).toBeVisible()
  })

  test('Add Source button links to new source form', async ({ page }) => {
    await mockSourcesList(page)
    await page.goto('/admin/sources')

    await page.locator('a', { hasText: 'Add Source' }).click()
    await expect(page).toHaveURL('/admin/sources/new')
  })

  test('new source form shows source type selector', async ({ page }) => {
    await mockSourcesList(page)
    await page.goto('/admin/sources/new')

    await expect(page.locator('h1').filter({ hasText: 'Add Source' })).toBeVisible()
    await expect(page.locator('select').first()).toBeVisible()
    // RSS should be available
    await expect(page.locator('option[value="RSS"]')).toHaveCount(1)
  })

  test('filling in RSS source form and submitting creates source', async ({ page }) => {
    await mockSourcesList(page)
    await page.goto('/admin/sources/new')

    // Select RSS type (it's the default)
    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('RSS')

    // Fill name
    await page.locator('input[placeholder*="Domain"]').fill('Test RSS Feed')

    // Fill feed URL
    await page.locator('input[type="url"]').fill('https://example.com/feed.xml')

    // Submit
    await page.locator('button[type="submit"]').click()

    // Should navigate back to sources list after creation
    await expect(page).toHaveURL('/admin/sources')
  })

  test('name field is required — shows error if empty', async ({ page }) => {
    await mockSourcesList(page)
    await page.goto('/admin/sources/new')

    // Try submitting without a name
    await page.locator('button[type="submit"]').click()

    await expect(page.locator('text=Name is required')).toBeVisible()
  })

  test('RSS type requires feed URL — shows error if empty', async ({ page }) => {
    await mockSourcesList(page)
    await page.goto('/admin/sources/new')

    await page.locator('input[placeholder*="Domain"]').fill('My Feed')
    // Leave feed URL empty
    await page.locator('button[type="submit"]').click()

    await expect(page.locator('text=Feed URL is required')).toBeVisible()
  })

  test('Pause button toggles source to inactive', async ({ page }) => {
    await mockSourcesList(page)
    await page.goto('/admin/sources')

    // Domain.com.au RSS is active — should have a Pause button
    const pauseBtn = page.locator('button', { hasText: 'Pause' }).first()
    await expect(pauseBtn).toBeVisible()
    await pauseBtn.click()

    // Toast should appear
    await expect(page.locator('text=Source paused')).toBeVisible()
  })

  test('Activate button appears for paused sources', async ({ page }) => {
    await mockSourcesList(page)
    await page.goto('/admin/sources')

    // Herald Sun Property is paused — Activate button
    await expect(page.locator('button', { hasText: 'Activate' }).first()).toBeVisible()
  })

  test('Edit link navigates to source editor', async ({ page }) => {
    await mockSourcesList(page)
    await mockSourceGet(page, MOCK_SOURCES[0])
    await page.goto('/admin/sources')

    await page.locator('a', { hasText: 'Edit' }).first().click()
    await expect(page).toHaveURL(`/admin/sources/${MOCK_SOURCES[0].id}`)
  })

  test('type filter dropdown is present and functional', async ({ page }) => {
    await mockSourcesList(page)
    await page.goto('/admin/sources')

    const typeFilter = page.locator('select').first()
    await typeFilter.selectOption('RSS')
    await expect(typeFilter).toHaveValue('RSS')
  })
})
