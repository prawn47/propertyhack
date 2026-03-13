import { test, expect } from '@playwright/test'

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

function mockAdminApi(page: import('@playwright/test').Page) {
  return page.route('**/api/admin/**', async (route) => {
    const url = route.request().url()

    // Newsletter list
    if (url.includes('/newsletters') && route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ drafts: [], total: 0, page: 1, totalPages: 1 }),
      })
    }

    // Agent keys list
    if (url.includes('/agent-keys') && route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ keys: [], total: 0 }),
      })
    }

    // Agent audit log
    if (url.includes('/agent-audit') && route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ entries: [], total: 0, page: 1, totalPages: 1 }),
      })
    }

    // Fallback for any other admin API calls
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
}

test.describe('Newsletter V2 Features', () => {

  test.describe('Admin Pages', () => {
    test.beforeEach(async ({ page }) => {
      await setAuth(page)
      await mockAdminApi(page)
    })

    test('newsletter list shows jurisdiction filter tabs', async ({ page }) => {
      await page.goto('/admin/newsletters')

      // Verify the jurisdiction filter tabs exist (All, AU, NZ, UK, US, CA)
      await expect(page.locator('button', { hasText: 'All' })).toBeVisible()
      await expect(page.locator('button', { hasText: 'AU' })).toBeVisible()
      await expect(page.locator('button', { hasText: 'NZ' })).toBeVisible()
      await expect(page.locator('button', { hasText: 'UK' })).toBeVisible()
      await expect(page.locator('button', { hasText: 'US' })).toBeVisible()
      await expect(page.locator('button', { hasText: 'CA' })).toBeVisible()

      // Verify heading
      await expect(page.locator('h1', { hasText: 'Newsletters' })).toBeVisible()
    })

    test('generate buttons are present for each jurisdiction', async ({ page }) => {
      await page.goto('/admin/newsletters')

      // On the "All" tab, generate buttons appear for each jurisdiction
      const generateButtons = page.locator('button').filter({ hasText: /^Generate\s/ })
      await expect(generateButtons.first()).toBeVisible()

      // Should see Generate AU, Generate NZ, etc.
      await expect(page.locator('button', { hasText: 'Generate AU' })).toBeVisible()
      await expect(page.locator('button', { hasText: 'Generate NZ' })).toBeVisible()
    })

    test('agent API keys page loads with create button and table', async ({ page }) => {
      await page.goto('/admin/agent-keys')

      // Should have a "Create API Key" or similar button
      const createButton = page.locator('button').filter({ hasText: /create|new|add/i }).first()
      await expect(createButton).toBeVisible()

      // Page should render without errors (check for heading or key content)
      await expect(page.locator('text=/API Key|Agent Key/i').first()).toBeVisible()
    })

    test('audit log page loads with filter controls and table', async ({ page }) => {
      await page.goto('/admin/agent-audit')

      // Should have filter controls (date inputs or key name filter)
      const filterInputs = page.locator('input[type="date"], input[type="text"], select')
      await expect(filterInputs.first()).toBeVisible()

      // Should have a table structure
      const table = page.locator('table')
      await expect(table).toBeVisible()
    })
  })

  test.describe('Public Pages', () => {

    test('subscribe form shows newsletter schedule text', async ({ page }) => {
      // Mock the public articles API so the feed loads
      await page.route('**/api/articles*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ articles: [], total: 0, page: 1, totalPages: 1 }),
        })
      })

      await page.goto('/')

      // The footer subscribe form contains schedule text
      // Check for the schedule description mentioning Mon-Fri and Saturday/Sunday
      const scheduleText = page.locator('text=/Mon.*Fri/i').first()
      await expect(scheduleText).toBeVisible()

      // Also check for Saturday/Sunday mentions
      const weekendText = page.locator('text=/Saturday|Sunday|roundup/i').first()
      await expect(weekendText).toBeVisible()
    })

    test('swagger docs load at /api/docs', async ({ page }) => {
      await page.goto('/api/docs')

      // Swagger UI renders with a known element
      // The custom title is "PropertyHack Agent API Documentation"
      // Swagger UI typically has an element with class "swagger-ui"
      await expect(page.locator('.swagger-ui')).toBeVisible({ timeout: 10000 })
    })
  })
})
