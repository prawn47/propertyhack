import { test, expect } from '@playwright/test'

const LOGIN_API = '**/api/auth/login'

function mockSuccessfulLogin(page: import('@playwright/test').Page) {
  return page.route(LOGIN_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Login successful',
        user: { id: 'user-1', email: 'admin@propertyhack.com', superAdmin: true, createdAt: new Date().toISOString() },
        accessToken: 'fake-access-token',
        refreshToken: 'fake-refresh-token',
      }),
    })
  })
}

function mockFailedLogin(page: import('@playwright/test').Page) {
  return page.route(LOGIN_API, async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Invalid email or password' }),
    })
  })
}

async function setAuthInLocalStorage(page: import('@playwright/test').Page) {
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

async function mockDashboardApi(page: import('@playwright/test').Page) {
  await page.route('**/api/admin/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        articles: { total: 10, last24h: 2, last7d: 5, last30d: 10, byStatus: { PUBLISHED: 8, DRAFT: 1, ARCHIVED: 1 }, byCategory: [] },
        sources: { total: 3, active: 2, paused: 1 },
        ingestionHealth: { perSource: [], recentLogs: [] },
        health: { sourcesWithErrors: 0, staleSources: [] },
      }),
    })
  })
}

test.describe('Admin Auth', () => {
  test('unauthenticated user trying to reach /admin is shown login flow', async ({ page }) => {
    await page.goto('/admin')
    // The app renders the public homepage when not authenticated
    // Admin routes are only rendered when authenticated
    await expect(page).toHaveURL('/')
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await mockFailedLogin(page)
    await page.goto('/')
    // Trigger the admin login flow by clicking the admin link in the header
    const adminTrigger = page.locator('button, a').filter({ hasText: /admin|sign in|log in/i }).first()
    await adminTrigger.click()
    // Should now see a login form
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await page.locator('input[type="email"], input[name="email"]').fill('wrong@example.com')
    await page.locator('input[type="password"], input[name="password"]').fill('wrongpassword')
    await page.locator('button[type="submit"], button').filter({ hasText: /log in|sign in|login/i }).click()
    await expect(page.locator('text=/invalid|incorrect|wrong|failed/i')).toBeVisible()
  })

  test('login with valid credentials redirects to /admin dashboard', async ({ page }) => {
    await mockSuccessfulLogin(page)
    await mockDashboardApi(page)
    // Mock all admin API calls that fire on dashboard load
    await page.route('**/api/admin/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          articles: { total: 0, last24h: 0, last7d: 0, last30d: 0, byStatus: { PUBLISHED: 0, DRAFT: 0, ARCHIVED: 0 }, byCategory: [] },
          sources: { total: 0, active: 0, paused: 0 },
          ingestionHealth: { perSource: [], recentLogs: [] },
          health: { sourcesWithErrors: 0, staleSources: [] },
        }),
      })
    })

    await page.goto('/')
    const adminTrigger = page.locator('button, a').filter({ hasText: /admin|sign in|log in/i }).first()
    await adminTrigger.click()
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await page.locator('input[type="email"], input[name="email"]').fill('admin@propertyhack.com')
    await page.locator('input[type="password"], input[name="password"]').fill('correctpassword')
    await page.locator('button[type="submit"], button').filter({ hasText: /log in|sign in|login/i }).click()
    await expect(page).toHaveURL('/admin')
  })

  test('authenticated user can access /admin directly', async ({ page }) => {
    await setAuthInLocalStorage(page)
    await mockDashboardApi(page)
    await page.goto('/admin')
    await expect(page.locator('text=Ingestion Monitor')).toBeVisible()
  })
})
