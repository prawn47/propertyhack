import { test, expect } from '@playwright/test'

const ARTICLES_API = '**/api/articles**'
const CATEGORIES_API = '**/api/categories**'
const LOCATIONS_API = '**/api/locations**'
const MARKETS_API = '**/api/markets**'

const AU_MARKETS = [
  { id: 'm-au', code: 'AU', name: 'Australia', flagEmoji: '🇦🇺', isActive: true },
  { id: 'm-us', code: 'US', name: 'United States', flagEmoji: '🇺🇸', isActive: true },
  { id: 'm-uk', code: 'UK', name: 'United Kingdom', flagEmoji: '🇬🇧', isActive: true },
  { id: 'm-ca', code: 'CA', name: 'Canada', flagEmoji: '🇨🇦', isActive: true },
]

function makeArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'art-1',
    sourceId: 'src-1',
    sourceUrl: 'https://example.com/article-1',
    title: 'Property Market Update',
    shortBlurb: 'The latest property market news.',
    longSummary: null,
    imageUrl: null,
    imageAltText: null,
    slug: 'property-market-update',
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

async function mockBaseApis(
  page: import('@playwright/test').Page,
  options: {
    articles?: unknown[]
    locations?: string[]
    market?: string
  } = {}
) {
  const {
    articles = [makeArticle()],
    locations = ['Sydney', 'Melbourne', 'Brisbane'],
  } = options

  await page.route(MARKETS_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(AU_MARKETS),
    })
  })
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
      body: JSON.stringify({ locations }),
    })
  })
  await page.route(ARTICLES_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ articles, total: articles.length, page: 1, totalPages: 1 }),
    })
  })
}

// ---------------------------------------------------------------------------
// Root redirect
// ---------------------------------------------------------------------------
test.describe('Root redirect', () => {
  test('visiting / redirects to a country-prefixed URL', async ({ page }) => {
    // Pre-set a country in localStorage so detection is deterministic
    await page.addInitScript(() => {
      localStorage.setItem('ph_country', 'AU')
    })
    await mockBaseApis(page)
    await page.goto('/')
    // Should end up at /au (or /au/ depending on trailing-slash config)
    await expect(page).toHaveURL(/\/au(\/.*)?$/)
  })

  test('root redirect uses stored country preference', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ph_country', 'US')
    })
    await mockBaseApis(page, {
      articles: [makeArticle({ market: 'US', location: 'New York' })],
      locations: ['New York', 'Los Angeles', 'Chicago'],
    })
    await page.goto('/')
    await expect(page).toHaveURL(/\/us(\/.*)?$/)
  })
})

// ---------------------------------------------------------------------------
// Country feed pages
// ---------------------------------------------------------------------------
test.describe('Country feed pages', () => {
  test('/au shows article feed', async ({ page }) => {
    await mockBaseApis(page)
    await page.goto('/au')
    // Feed should render at least one article card
    await expect(page.locator('a[href*="/article"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('/us shows article feed', async ({ page }) => {
    await mockBaseApis(page, {
      articles: [makeArticle({ market: 'US', location: 'New York', title: 'US Housing Market Rises' })],
      locations: ['New York', 'Los Angeles'],
    })
    await page.goto('/us')
    await expect(page.locator('a[href*="/article"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('/uk shows article feed', async ({ page }) => {
    await mockBaseApis(page, {
      articles: [makeArticle({ market: 'UK', location: 'London', title: 'London Property Boom' })],
      locations: ['London', 'Manchester'],
    })
    await page.goto('/uk')
    await expect(page.locator('a[href*="/article"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('/xx (invalid country) shows 404 page', async ({ page }) => {
    await mockBaseApis(page)
    await page.goto('/xx')
    // The app renders NotFoundPage for unknown country codes
    await expect(
      page.getByText(/not found|404|page.*not.*exist|couldn.*t find/i).first()
    ).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// Legacy URL redirects (handled by server middleware)
// These test that the server issues 301 redirects before the SPA catches the URL
// ---------------------------------------------------------------------------
test.describe('Legacy URL redirects', () => {
  test('/property-news/sydney redirects 301 to /au/property-news/sydney', async ({ page }) => {
    const responses: { url: string; status: number }[] = []
    page.on('response', (response) => {
      responses.push({ url: response.url(), status: response.status() })
    })

    await mockBaseApis(page)

    // Navigate and allow redirects to complete
    await page.goto('/property-news/sydney', { waitUntil: 'commit' })

    // After redirect, the final URL should be the country-prefixed version
    await expect(page).toHaveURL(/\/au\/property-news\/sydney/)

    // Confirm a 301 was issued in the redirect chain
    const redirect = responses.find(
      (r) => r.status === 301 && r.url.includes('/property-news/sydney')
    )
    expect(redirect).toBeDefined()
  })

  test('/article/some-slug redirects 301 to /au/article/some-slug', async ({ page }) => {
    const responses: { url: string; status: number }[] = []
    page.on('response', (response) => {
      responses.push({ url: response.url(), status: response.status() })
    })

    // Mock article detail for the destination
    await page.route('**/api/articles/some-slug', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeArticle({ slug: 'some-slug', title: 'Some Article' })),
      })
    })
    await page.route('**/api/articles/some-slug/related', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ articles: [] }),
      })
    })
    await mockBaseApis(page)

    await page.goto('/article/some-slug', { waitUntil: 'commit' })

    // Final URL should be country-prefixed
    await expect(page).toHaveURL(/\/au\/article\/some-slug/)

    const redirect = responses.find(
      (r) => r.status === 301 && r.url.includes('/article/some-slug')
    )
    expect(redirect).toBeDefined()
  })

  test('/category/investment redirects 301 to /au/category/investment', async ({ page }) => {
    const responses: { url: string; status: number }[] = []
    page.on('response', (response) => {
      responses.push({ url: response.url(), status: response.status() })
    })

    await mockBaseApis(page)
    await page.goto('/category/investment', { waitUntil: 'commit' })

    await expect(page).toHaveURL(/\/au\/category\/investment/)

    const redirect = responses.find(
      (r) => r.status === 301 && r.url.includes('/category/investment')
    )
    expect(redirect).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Country selector in FilterBar
// ---------------------------------------------------------------------------
test.describe('Country selector', () => {
  test('country selector is visible on the feed page', async ({ page }) => {
    await mockBaseApis(page)
    await page.goto('/au')
    // The country selector renders as a <select> with country options
    const countrySelect = page.locator('select').filter({ hasText: /AU|Australia/i }).first()
    await expect(countrySelect).toBeVisible({ timeout: 5000 })
  })

  test('country selector shows all active markets', async ({ page }) => {
    await mockBaseApis(page)
    await page.goto('/au')
    const countrySelect = page.locator('select').filter({ hasText: /AU|Australia/i }).first()
    await expect(countrySelect).toBeVisible({ timeout: 5000 })
    // All 4 markets should appear as options
    for (const market of ['AU', 'US', 'UK', 'CA']) {
      await expect(countrySelect.locator(`option[value="${market}"]`)).toHaveCount(1)
    }
  })

  test('switching country via selector updates the URL', async ({ page }) => {
    await mockBaseApis(page)
    await page.goto('/au')

    const countrySelect = page.locator('select').filter({ hasText: /AU|Australia/i }).first()
    await expect(countrySelect).toBeVisible({ timeout: 5000 })

    // Switch to US
    await countrySelect.selectOption('US')

    // URL should update to /us (country switch navigates)
    await expect(page).toHaveURL(/\/us(\/.*)?$/, { timeout: 5000 })
  })

  test('switching country persists to localStorage', async ({ page }) => {
    await mockBaseApis(page, {
      articles: [makeArticle({ market: 'US', title: 'US Market News' })],
      locations: ['New York', 'Los Angeles'],
    })
    await page.goto('/au')

    const countrySelect = page.locator('select').filter({ hasText: /AU|Australia/i }).first()
    await expect(countrySelect).toBeVisible({ timeout: 5000 })
    await countrySelect.selectOption('US')

    // Wait for navigation
    await expect(page).toHaveURL(/\/us/, { timeout: 5000 })

    // localStorage should be updated
    const stored = await page.evaluate(() => localStorage.getItem('ph_country'))
    expect(stored).toBe('US')
  })

  test('switching country clears location filter and refetches locations', async ({ page }) => {
    const locationRequests: URL[] = []

    await page.route(LOCATIONS_API, async (route) => {
      locationRequests.push(new URL(route.request().url()))
      const url = new URL(route.request().url())
      const country = url.searchParams.get('country')
      const locations = country === 'US'
        ? ['New York', 'Los Angeles', 'Chicago']
        : ['Sydney', 'Melbourne', 'Brisbane']
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ locations }),
      })
    })
    await page.route(MARKETS_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AU_MARKETS),
      })
    })
    await page.route(CATEGORIES_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: [] }),
      })
    })
    await page.route(ARTICLES_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ articles: [makeArticle()], total: 1, page: 1, totalPages: 1 }),
      })
    })

    await page.goto('/au')
    const countrySelect = page.locator('select').filter({ hasText: /AU|Australia/i }).first()
    await expect(countrySelect).toBeVisible({ timeout: 5000 })

    await countrySelect.selectOption('US')
    await expect(page).toHaveURL(/\/us/, { timeout: 5000 })

    // Locations should have been re-fetched scoped to the new country
    const usLocationRequest = locationRequests.find(
      (u) => u.searchParams.get('country') === 'US'
    )
    expect(usLocationRequest).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Location pages (country-scoped)
// ---------------------------------------------------------------------------
test.describe('Location pages', () => {
  test('/au/property-news/sydney renders article feed', async ({ page }) => {
    await mockBaseApis(page, {
      articles: [makeArticle({ location: 'Sydney', title: 'Sydney Market Report' })],
    })
    await page.goto('/au/property-news/sydney')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 })
    await expect(
      page.getByText(/Sydney/i, { exact: false }).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('/uk/property-news/london renders article feed', async ({ page }) => {
    await mockBaseApis(page, {
      articles: [makeArticle({ market: 'UK', location: 'London', title: 'London Property Update' })],
      locations: ['London', 'Manchester', 'Birmingham'],
    })
    await page.goto('/uk/property-news/london')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 })
    await expect(
      page.getByText(/London/i, { exact: false }).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('/us/property-news/new-york renders article feed', async ({ page }) => {
    await mockBaseApis(page, {
      articles: [makeArticle({ market: 'US', location: 'New York', title: 'New York Housing Market' })],
      locations: ['New York', 'Los Angeles', 'Chicago'],
    })
    await page.goto('/us/property-news/new-york')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 })
    await expect(
      page.getByText(/New York/i, { exact: false }).first()
    ).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// Article links use country-prefixed paths
// ---------------------------------------------------------------------------
test.describe('Country-prefixed article links', () => {
  test('article cards on /au link to /au/article/:slug', async ({ page }) => {
    await mockBaseApis(page, {
      articles: [makeArticle({ slug: 'sydney-market-update', market: 'AU' })],
    })
    await page.goto('/au')
    const link = page.locator('a[href*="/au/article/sydney-market-update"]').first()
    await expect(link).toBeVisible({ timeout: 5000 })
  })

  test('article cards on /us link to /us/article/:slug', async ({ page }) => {
    await mockBaseApis(page, {
      articles: [makeArticle({ slug: 'us-housing-report', market: 'US', location: 'New York' })],
      locations: ['New York'],
    })
    await page.goto('/us')
    const link = page.locator('a[href*="/us/article/us-housing-report"]').first()
    await expect(link).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// Country context persists across page loads
// ---------------------------------------------------------------------------
test.describe('Country persistence', () => {
  test('stored country is applied on page reload', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ph_country', 'UK')
    })
    await mockBaseApis(page, {
      articles: [makeArticle({ market: 'UK', location: 'London' })],
      locations: ['London', 'Manchester'],
    })

    await page.goto('/uk')
    await expect(page).toHaveURL(/\/uk(\/.*)?$/)

    // Reload and confirm we stay on UK
    await page.reload()
    await expect(page).toHaveURL(/\/uk(\/.*)?$/)
  })
})
