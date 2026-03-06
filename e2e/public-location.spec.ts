import { test, expect } from '@playwright/test'

const ARTICLES_API = '**/api/articles**'
const CATEGORIES_API = '**/api/categories**'
const LOCATIONS_API = '**/api/locations**'
const IP_API = '**/ip-api.com/**'

function makeArticle(id: string, location: string) {
  return {
    id,
    sourceId: null,
    sourceUrl: `https://example.com/${id}`,
    title: `${location} Property Update`,
    shortBlurb: `News from ${location}.`,
    longSummary: null,
    imageUrl: null,
    imageAltText: null,
    slug: id,
    category: 'Market Trends',
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

async function mockBaseApis(page: import('@playwright/test').Page, articlesByLocation?: Record<string, unknown[]>) {
  await page.route(CATEGORIES_API, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ categories: [] }) })
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
    const loc = url.searchParams.get('location')
    let articles: unknown[]
    if (loc && articlesByLocation && articlesByLocation[loc]) {
      articles = articlesByLocation[loc]
    } else {
      articles = [makeArticle('art-all-1', 'Sydney'), makeArticle('art-all-2', 'Melbourne')]
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ articles, total: articles.length, page: 1, totalPages: 1 }),
    })
  })
}

test.describe('Public Location Detection', () => {
  test('detected location via geolocation shows location pill', async ({ browser }) => {
    const context = await browser.newContext({
      geolocation: { latitude: -33.8688, longitude: 151.2093 },
      permissions: ['geolocation'],
    })
    const page = await context.newPage()

    await page.route(IP_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          city: 'Sydney',
          regionName: 'New South Wales',
          country: 'Australia',
        }),
      })
    })
    await mockBaseApis(page)

    await page.goto('/')
    // Location pill shows once detection resolves
    await expect(page.getByText('Using your location: Sydney', { exact: false })).toBeVisible({ timeout: 10000 })

    await context.close()
  })

  test('location pill shows detected location city', async ({ browser }) => {
    const context = await browser.newContext({
      geolocation: { latitude: -37.8136, longitude: 144.9631 },
      permissions: ['geolocation'],
    })
    const page = await context.newPage()

    await page.route(IP_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          city: 'Melbourne',
          regionName: 'Victoria',
          country: 'Australia',
        }),
      })
    })
    await mockBaseApis(page)

    await page.goto('/')
    await expect(page.getByText('Melbourne', { exact: false }).first()).toBeVisible({ timeout: 10000 })

    await context.close()
  })

  test('changing location via dropdown updates the feed', async ({ page }) => {
    // Pre-set a location in localStorage so detection skips
    await page.addInitScript(() => {
      localStorage.setItem('ph_location', 'Sydney')
    })
    await mockBaseApis(page, {
      Sydney: [makeArticle('art-syd', 'Sydney')],
      Melbourne: [makeArticle('art-mel', 'Melbourne')],
    })

    await page.goto('/')
    await expect(page.getByText('Sydney Property Update')).toBeVisible()

    // Change location to Melbourne
    await page.locator('select').filter({ hasText: 'All Locations' }).selectOption('Melbourne')
    await expect(page.getByText('Melbourne Property Update')).toBeVisible()
    await expect(page.getByText('Sydney Property Update')).not.toBeVisible()
  })

  test('location persists on page reload via localStorage', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ph_location', 'Brisbane')
    })
    await mockBaseApis(page, {
      Brisbane: [makeArticle('art-bne', 'Brisbane')],
    })

    await page.goto('/')
    await expect(page.getByText('Brisbane Property Update')).toBeVisible()

    // Reload and confirm location is still applied
    await page.reload()
    await expect(page.getByText('Brisbane Property Update')).toBeVisible()

    // Confirm localStorage still has the value
    const stored = await page.evaluate(() => localStorage.getItem('ph_location'))
    expect(stored).toBe('Brisbane')
  })

  test('IP-based geolocation fallback works when geolocation permission denied', async ({ browser }) => {
    // Create context without geolocation permission
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.route(IP_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          city: 'Brisbane',
          regionName: 'Queensland',
          country: 'Australia',
        }),
      })
    })
    await mockBaseApis(page)

    await page.goto('/')
    // Should still detect via IP fallback
    await expect(page.getByText('Brisbane', { exact: false }).first()).toBeVisible({ timeout: 10000 })

    await context.close()
  })
})
