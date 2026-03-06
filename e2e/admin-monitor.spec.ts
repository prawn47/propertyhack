import { test, expect } from '@playwright/test'

const DASHBOARD_API = '**/api/admin/dashboard'

const MOCK_DASHBOARD = {
  articles: {
    total: 352,
    last24h: 14,
    last7d: 87,
    last30d: 280,
    byStatus: {
      PUBLISHED: 290,
      DRAFT: 45,
      ARCHIVED: 17,
    },
    byCategory: [
      { category: 'Market News', count: 120 },
      { category: 'Investment', count: 85 },
      { category: 'Rental Market', count: 62 },
      { category: 'Finance & Rates', count: 40 },
    ],
  },
  sources: {
    total: 6,
    active: 4,
    paused: 2,
  },
  ingestionHealth: {
    perSource: [
      {
        id: 'source-1',
        name: 'Domain.com.au RSS',
        type: 'RSS',
        isActive: true,
        lastFetchAt: new Date(Date.now() - 1800000).toISOString(),
        consecutiveFailures: 0,
        articleCount: 142,
        lastError: null,
      },
      {
        id: 'source-2',
        name: 'Herald Sun Property',
        type: 'RSS',
        isActive: false,
        lastFetchAt: new Date(Date.now() - 86400000).toISOString(),
        consecutiveFailures: 5,
        articleCount: 89,
        lastError: 'Connection timeout after 30000ms',
      },
      {
        id: 'source-3',
        name: 'NewsAPI.org',
        type: 'NEWSAPI_ORG',
        isActive: true,
        lastFetchAt: new Date(Date.now() - 900000).toISOString(),
        consecutiveFailures: 1,
        articleCount: 67,
        lastError: 'Rate limit reached',
      },
    ],
    recentLogs: [
      {
        id: 'log-1',
        sourceName: 'Domain.com.au RSS',
        status: 'SUCCESS',
        articlesFound: 8,
        articlesNew: 3,
        duration: 1240,
        errorMessage: null,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: 'log-2',
        sourceName: 'NewsAPI.org',
        status: 'PARTIAL',
        articlesFound: 12,
        articlesNew: 5,
        duration: 2100,
        errorMessage: 'Rate limit reached on second page',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'log-3',
        sourceName: 'Herald Sun Property',
        status: 'FAILED',
        articlesFound: 0,
        articlesNew: 0,
        duration: 30050,
        errorMessage: 'Connection timeout after 30000ms',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
  },
  health: {
    sourcesWithErrors: 1,
    staleSources: ['source-2'],
  },
}

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

async function mockDashboardApi(page: import('@playwright/test').Page, data = MOCK_DASHBOARD) {
  await page.route(DASHBOARD_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    })
  })
}

test.describe('Admin Monitor / Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setAuth(page)
  })

  test('navigating to /admin shows Ingestion Monitor dashboard', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('h1').filter({ hasText: 'Ingestion Monitor' })).toBeVisible()
  })

  test('navigating to /admin/monitor shows Ingestion Monitor dashboard', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin/monitor')

    await expect(page.locator('h1').filter({ hasText: 'Ingestion Monitor' })).toBeVisible()
  })

  test('dashboard shows Total Articles summary card', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=Total Articles')).toBeVisible()
    await expect(page.locator('text=352')).toBeVisible()
  })

  test('dashboard shows Active Sources summary card', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=Active Sources')).toBeVisible()
    await expect(page.locator('text=4')).toBeVisible()
  })

  test('dashboard shows Sources with Errors summary card', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=Sources with Errors')).toBeVisible()
    // 1 source with errors
    await expect(page.locator('text=Needs attention')).toBeVisible()
  })

  test('dashboard shows Stale Sources summary card', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=Stale Sources')).toBeVisible()
  })

  test('dashboard shows article counts for today, week, and month', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=14')).toBeVisible() // last24h
    await expect(page.locator('text=87')).toBeVisible() // last7d
    await expect(page.locator('text=280')).toBeVisible() // last30d
  })

  test('Articles by Status section is visible', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=Articles by Status')).toBeVisible()
    await expect(page.locator('text=PUBLISHED')).toBeVisible()
    await expect(page.locator('text=DRAFT')).toBeVisible()
    await expect(page.locator('text=ARCHIVED')).toBeVisible()
  })

  test('Top Categories section shows category breakdown', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=Top Categories')).toBeVisible()
    await expect(page.locator('text=Market News')).toBeVisible()
    await expect(page.locator('text=Investment')).toBeVisible()
  })

  test('Source Health table shows per-source health', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=Source Health')).toBeVisible()
    await expect(page.locator('text=Domain.com.au RSS')).toBeVisible()
    await expect(page.locator('text=Herald Sun Property')).toBeVisible()
    await expect(page.locator('text=NewsAPI.org')).toBeVisible()
  })

  test('Source Health shows Healthy status for active sources with no errors', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=Healthy').first()).toBeVisible()
  })

  test('Source Health shows Paused status for inactive sources', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=Paused').first()).toBeVisible()
  })

  test('Source Health shows Degraded status for sources with failures', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=Degraded').first()).toBeVisible()
  })

  test('Recent Ingestion Logs table is visible', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=Recent Ingestion Logs')).toBeVisible()
  })

  test('Recent Ingestion Logs shows SUCCESS status', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=SUCCESS').first()).toBeVisible()
  })

  test('Recent Ingestion Logs shows PARTIAL status', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=PARTIAL').first()).toBeVisible()
  })

  test('Recent Ingestion Logs shows FAILED status', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('text=FAILED').first()).toBeVisible()
  })

  test('Recent Ingestion Logs shows log source names', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    // Source names from logs
    await expect(page.locator('text=Domain.com.au RSS').first()).toBeVisible()
  })

  test('Refresh now button is visible', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    await expect(page.locator('button', { hasText: 'Refresh now' })).toBeVisible()
  })

  test('clicking Refresh now refetches dashboard data', async ({ page }) => {
    let callCount = 0
    await page.route(DASHBOARD_API, async (route) => {
      callCount++
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DASHBOARD),
      })
    })

    await page.goto('/admin')
    const initialCount = callCount

    await page.locator('button', { hasText: 'Refresh now' }).click()
    // Should have made another API call
    await expect(async () => {
      expect(callCount).toBeGreaterThan(initialCount)
    }).toPass({ timeout: 3000 })
  })

  test('admin sidebar navigation is visible', async ({ page }) => {
    await mockDashboardApi(page)
    await page.goto('/admin')

    // Sidebar nav items
    await expect(page.locator('text=Dashboard').first()).toBeVisible()
    await expect(page.locator('a[href="/admin/sources"]')).toBeVisible()
    await expect(page.locator('a[href="/admin/articles"]')).toBeVisible()
    await expect(page.locator('a[href="/admin/social"]')).toBeVisible()
    await expect(page.locator('a[href="/admin/monitor"]')).toBeVisible()
  })
})
