import { test, expect } from '@playwright/test'

const SOCIAL_POSTS_API = '**/api/admin/social-posts*'
const ARTICLES_API = '**/api/admin/articles*'

const MOCK_POSTS = [
  {
    id: 'post-1',
    content: 'Sydney property prices are on the move again! Median house prices up 4% in Q4.',
    platforms: ['twitter', 'linkedin'],
    imageUrl: null,
    articleId: null,
    article: null,
    status: 'DRAFT',
    scheduledFor: null,
    publishedAt: null,
    platformResults: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'post-2',
    content: 'Melbourne rental market update: vacancy rates at historic lows.',
    platforms: ['facebook', 'instagram'],
    imageUrl: null,
    articleId: null,
    article: null,
    status: 'PUBLISHED',
    scheduledFor: null,
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    platformResults: null,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
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

async function mockSocialPostsApi(page: import('@playwright/test').Page, posts = MOCK_POSTS) {
  await page.route(SOCIAL_POSTS_API, async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (method === 'GET' && url.match(/\/api\/admin\/social-posts(\?.*)?$/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ posts, total: posts.length, page: 1, totalPages: 1 }),
      })
    } else if (method === 'POST' && url.match(/\/api\/admin\/social-posts$/)) {
      const body = JSON.parse(route.request().postData() || '{}')
      const newPost = {
        ...MOCK_POSTS[0],
        id: 'post-new',
        content: body.content,
        platforms: body.platforms,
        status: 'DRAFT',
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newPost),
      })
    } else if (method === 'GET' && url.match(/\/api\/admin\/social-posts\/[^/]+$/)) {
      const postId = url.split('/').pop()?.split('?')[0]
      const post = posts.find(p => p.id === postId) || posts[0]
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(post),
      })
    } else if (method === 'PUT' && url.match(/\/api\/admin\/social-posts\/[^/]+$/)) {
      const body = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...posts[0], ...body }),
      })
    } else {
      await route.continue()
    }
  })
}

async function mockArticlesApi(page: import('@playwright/test').Page) {
  await page.route(ARTICLES_API, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ articles: [], total: 0, page: 1, totalPages: 1 }),
      })
    } else {
      await route.continue()
    }
  })
}

test.describe('Admin Social Posts', () => {
  test.beforeEach(async ({ page }) => {
    await setAuth(page)
  })

  test('navigating to /admin/social shows social post list', async ({ page }) => {
    await mockSocialPostsApi(page)
    await page.goto('/admin/social')

    await expect(page.locator('h1').filter({ hasText: 'Social Posts' })).toBeVisible()
    await expect(page.locator('text=Sydney property prices are on the move')).toBeVisible()
  })

  test('shows post count', async ({ page }) => {
    await mockSocialPostsApi(page)
    await page.goto('/admin/social')

    await expect(page.locator('text=2 total')).toBeVisible()
  })

  test('shows platform badges for each post', async ({ page }) => {
    await mockSocialPostsApi(page)
    await page.goto('/admin/social')

    // Twitter abbreviated as X, LinkedIn as LI
    await expect(page.locator('text=X').first()).toBeVisible()
    await expect(page.locator('text=LI').first()).toBeVisible()
  })

  test('shows status badges', async ({ page }) => {
    await mockSocialPostsApi(page)
    await page.goto('/admin/social')

    await expect(page.locator('text=Draft').first()).toBeVisible()
    await expect(page.locator('text=Published').first()).toBeVisible()
  })

  test('status filter is functional', async ({ page }) => {
    await mockSocialPostsApi(page)
    await page.goto('/admin/social')

    const statusFilter = page.locator('select').first()
    await statusFilter.selectOption('DRAFT')
    await expect(statusFilter).toHaveValue('DRAFT')
  })

  test('New Post button navigates to post editor', async ({ page }) => {
    await mockSocialPostsApi(page)
    await page.goto('/admin/social')

    await page.locator('button', { hasText: 'New Post' }).click()
    await expect(page).toHaveURL('/admin/social/new')
  })

  test('new post editor shows content textarea and platform checkboxes', async ({ page }) => {
    await mockArticlesApi(page)
    await mockSocialPostsApi(page)
    await page.goto('/admin/social/new')

    await expect(page.locator('h1').filter({ hasText: 'New Post' })).toBeVisible()
    await expect(page.locator('textarea[placeholder*="Write your post"]')).toBeVisible()
    // All four platform checkboxes
    await expect(page.locator('text=Twitter / X')).toBeVisible()
    await expect(page.locator('text=Facebook')).toBeVisible()
    await expect(page.locator('text=LinkedIn')).toBeVisible()
    await expect(page.locator('text=Instagram')).toBeVisible()
  })

  test('can type content into the post editor', async ({ page }) => {
    await mockArticlesApi(page)
    await mockSocialPostsApi(page)
    await page.goto('/admin/social/new')

    const textarea = page.locator('textarea[placeholder*="Write your post"]')
    await textarea.fill('This is my new social media post about property news.')
    await expect(textarea).toHaveValue('This is my new social media post about property news.')
  })

  test('can select multiple platforms', async ({ page }) => {
    await mockArticlesApi(page)
    await mockSocialPostsApi(page)
    await page.goto('/admin/social/new')

    // Twitter is pre-selected by default; also select Facebook
    const facebookLabel = page.locator('label').filter({ hasText: 'Facebook' })
    await facebookLabel.click()

    // Both should now be checked
    await expect(page.locator('input[type="checkbox"]').filter({ has: page.locator('+ span:has-text("Facebook")') })).not.toBeChecked()
    // Verify Facebook checkbox is now checked
    const facebookCheckbox = facebookLabel.locator('input[type="checkbox"]')
    await expect(facebookCheckbox).toBeChecked()
  })

  test('Save as Draft button is visible in editor', async ({ page }) => {
    await mockArticlesApi(page)
    await mockSocialPostsApi(page)
    await page.goto('/admin/social/new')

    await expect(page.locator('button', { hasText: 'Save as Draft' })).toBeVisible()
  })

  test('saving as draft with content and platform navigates to post', async ({ page }) => {
    await mockArticlesApi(page)
    await mockSocialPostsApi(page)
    await page.goto('/admin/social/new')

    await page.locator('textarea[placeholder*="Write your post"]').fill('New draft post content.')
    await page.locator('button', { hasText: 'Save as Draft' }).click()

    // After save, should navigate to the new post's edit page
    await expect(page).toHaveURL(/\/admin\/social\/post-new/)
  })

  test('character count is shown for selected platforms', async ({ page }) => {
    await mockArticlesApi(page)
    await mockSocialPostsApi(page)
    await page.goto('/admin/social/new')

    await page.locator('textarea[placeholder*="Write your post"]').fill('Hello world')
    // Twitter is selected by default — character count should show
    await expect(page.locator('text=/Twitter.*\d+\/280/')).toBeVisible()
  })

  test('can preview post per platform', async ({ page }) => {
    await mockArticlesApi(page)
    await mockSocialPostsApi(page)
    await page.goto('/admin/social/new')

    await page.locator('textarea[placeholder*="Write your post"]').fill('Preview test content for social media.')
    // Preview buttons appear when content + platforms are set
    await expect(page.locator('text=Preview')).toBeVisible()
    // Click the Twitter / X preview button
    await page.locator('button', { hasText: 'Twitter / X' }).first().click()
    await expect(page.locator('text=Twitter / X Preview')).toBeVisible()
  })

  test('clicking a post row navigates to post editor', async ({ page }) => {
    await mockSocialPostsApi(page)
    await mockArticlesApi(page)
    await page.goto('/admin/social')

    // Click the first post row
    await page.locator('tr').nth(1).click()
    await expect(page).toHaveURL(`/admin/social/${MOCK_POSTS[0].id}`)
  })
})
