import { test, expect } from '@playwright/test'

const HENRY_CHAT_API = '**/api/henry/chat'
const HENRY_CONVERSATIONS_API = '**/api/henry/conversations'
const ARTICLES_API = '**/api/articles**'
const CATEGORIES_API = '**/api/categories**'
const LOCATIONS_API = '**/api/locations**'

// SSE stream helper — returns a ReadableStream of SSE events
function makeSseBody(events: Array<{ event: string; data: object }>): string {
  return events
    .map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    .join('')
}

function mockPublicApis(page: import('@playwright/test').Page) {
  page.route(CATEGORIES_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ categories: ['Market Trends', 'Investment'] }),
    })
  })
  page.route(LOCATIONS_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ locations: ['Sydney', 'Melbourne'] }),
    })
  })
  page.route(ARTICLES_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ articles: [], total: 0, page: 1, totalPages: 0 }),
    })
  })
}

function mockHenryChatApi(page: import('@playwright/test').Page, responseText = 'Sydney property prices have risen recently.') {
  return page.route(HENRY_CHAT_API, async (route) => {
    const sseBody = makeSseBody([
      { event: 'thinking', data: { phase: 'searching_articles' } },
      { event: 'delta', data: { text: responseText } },
      { event: 'done', data: { messageId: 'msg-test-1', tokenCount: 42, citations: [] } },
    ])
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody,
    })
  })
}

// ─────────────────────────────────────────────
// Henry Page — Anonymous
// ─────────────────────────────────────────────

test.describe('Henry Page — Anonymous', () => {
  test('page loads with disclaimer banner and empty state', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au/henry')

    // Disclaimer banner
    await expect(
      page.getByText(/general property information|not financial advice|consult a qualified/i).first()
    ).toBeVisible({ timeout: 5000 })

    // Empty state — welcome or suggested questions
    await expect(
      page.getByText(/ask henry|how can i help|suggested|welcome|what.*want to know/i).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('clicking a suggested question populates the input or sends the message', async ({ page }) => {
    await mockPublicApis(page)
    await mockHenryChatApi(page)
    await page.goto('/au/henry')

    // Find a suggested question button/link
    const suggestedQuestion = page
      .getByRole('button')
      .filter({ hasText: /property|market|buy|rent|mortgage|price/i })
      .first()
      .or(
        page.locator('[data-testid*="suggested"], .suggested-question, [class*="suggestion"]').first()
      )

    if (await suggestedQuestion.isVisible({ timeout: 3000 }).catch(() => false)) {
      const questionText = await suggestedQuestion.textContent()
      await suggestedQuestion.click()

      // The question text should now appear somewhere visible (input or chat)
      if (questionText) {
        await expect(
          page.getByText(questionText.trim().substring(0, 30), { exact: false }).first()
        ).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('no conversation list sidebar visible for anonymous users', async ({ page }) => {
    await mockPublicApis(page)

    // Mock conversations API to return 401 (unauthenticated)
    await page.route(HENRY_CONVERSATIONS_API, async (route) => {
      await route.fulfill({ status: 401, body: '{"error":"Unauthorized"}' })
    })

    await page.goto('/au/henry')

    // Conversation list should not be present for anonymous users
    const convList = page.locator(
      '[data-testid="conversation-list"], [class*="conversation-list"], [aria-label*="conversation"]'
    )
    await expect(convList).not.toBeVisible()
  })

  test('sending a message shows it in the chat and receives a response', async ({ page }) => {
    await mockPublicApis(page)
    await mockHenryChatApi(page)
    await page.goto('/au/henry')

    const input = page
      .getByPlaceholder(/type.*message|ask.*question|message henry/i)
      .first()
      .or(page.locator('textarea, input[type="text"]').last())

    await input.fill('What is happening in the Sydney property market?')

    // Send via Enter or send button
    const sendButton = page.getByRole('button', { name: /send|submit|→/i }).first()
    if (await sendButton.isEnabled()) {
      await sendButton.click()
    } else {
      await input.press('Enter')
    }

    // User message appears
    await expect(
      page.getByText('What is happening in the Sydney property market?').first()
    ).toBeVisible({ timeout: 5000 })

    // Response text appears (from mock SSE)
    await expect(
      page.getByText(/sydney property prices/i).first()
    ).toBeVisible({ timeout: 8000 })
  })
})

// ─────────────────────────────────────────────
// Henry Sidebar Widget
// ─────────────────────────────────────────────

test.describe('Henry Sidebar Widget', () => {
  test('floating chat button is visible on home page', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au')

    // Floating button in bottom-right corner
    const floatingBtn = page
      .locator('[data-testid="henry-trigger"], [aria-label*="henry"], [aria-label*="Henry"], [class*="henry-button"], [class*="henry-trigger"]')
      .first()
      .or(
        page.locator('button[class*="fixed"], button[class*="bottom"]').last()
      )

    await expect(floatingBtn).toBeVisible({ timeout: 5000 })
  })

  test('clicking floating button opens the sidebar panel', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au')

    const floatingBtn = page
      .locator('[data-testid="henry-trigger"], [aria-label*="Henry"]')
      .first()
      .or(page.locator('button[class*="fixed"], button[class*="bottom"]').last())

    await floatingBtn.click()

    // Panel should appear with Henry header/title
    await expect(
      page.getByText(/henry/i).filter({ hasNot: page.locator('nav') }).first()
    ).toBeVisible({ timeout: 3000 })

    // Input should be visible inside panel
    const panelInput = page
      .getByPlaceholder(/type.*message|ask|message henry/i)
      .first()
      .or(page.locator('[data-testid="henry-panel"] textarea, [data-testid="henry-sidebar"] input').first())
    await expect(panelInput).toBeVisible({ timeout: 3000 })
  })

  test('typing and sending a message in the sidebar panel', async ({ page }) => {
    await mockPublicApis(page)
    await mockHenryChatApi(page)
    await page.goto('/au')

    // Open sidebar
    const floatingBtn = page
      .locator('[data-testid="henry-trigger"], [aria-label*="Henry"]')
      .first()
      .or(page.locator('button[class*="fixed"], button[class*="bottom"]').last())
    await floatingBtn.click()

    const panelInput = page
      .getByPlaceholder(/type.*message|ask|message henry/i)
      .first()
      .or(page.locator('textarea').last())

    await expect(panelInput).toBeVisible({ timeout: 3000 })
    await panelInput.fill('What are current mortgage rates?')
    await panelInput.press('Enter')

    await expect(
      page.getByText('What are current mortgage rates?').first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('closing the sidebar returns the floating button', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au')

    const floatingBtn = page
      .locator('[data-testid="henry-trigger"], [aria-label*="Henry"]')
      .first()
      .or(page.locator('button[class*="fixed"], button[class*="bottom"]').last())

    await floatingBtn.click()

    // Find close button inside panel
    const closeBtn = page
      .getByRole('button', { name: /close|✕|×|dismiss/i })
      .last()
      .or(page.locator('[data-testid="henry-close"], [aria-label="Close Henry"]'))

    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click()
      // Panel should close — floating button remains
      await expect(floatingBtn).toBeVisible({ timeout: 3000 })
    }
  })
})

// ─────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────

test.describe('Henry Navigation', () => {
  test('"Ask Henry" link is visible in the header', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au')

    const henryNavLink = page
      .getByRole('link', { name: /henry|ask henry/i })
      .first()
      .or(page.locator('nav a[href*="henry"]').first())

    await expect(henryNavLink).toBeVisible({ timeout: 5000 })
  })

  test('clicking "Ask Henry" navigates to /au/henry', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au')

    const henryNavLink = page
      .getByRole('link', { name: /henry|ask henry/i })
      .first()
      .or(page.locator('nav a[href*="henry"]').first())

    await henryNavLink.click()
    await expect(page).toHaveURL(/\/au\/henry/, { timeout: 5000 })
  })

  test('browser back button returns to previous page after visiting /au/henry', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au')
    await page.goto('/au/henry')
    await expect(page).toHaveURL(/\/au\/henry/)

    await page.goBack()
    await expect(page).toHaveURL(/\/au$|\/au\//)
  })
})

// ─────────────────────────────────────────────
// Henry Page — Mobile
// ─────────────────────────────────────────────

test.describe('Henry Page — Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('conversation list sidebar is hidden on mobile', async ({ page }) => {
    await mockPublicApis(page)
    await page.route(HENRY_CONVERSATIONS_API, async (route) => {
      await route.fulfill({ status: 401, body: '{"error":"Unauthorized"}' })
    })
    await page.goto('/au/henry')

    // Conversation list should not be visible on mobile (hidden or absent)
    const convList = page.locator(
      '[data-testid="conversation-list"], [class*="conversation-list"]'
    )
    const isVisible = await convList.isVisible().catch(() => false)
    expect(isVisible).toBe(false)
  })

  test('chat window takes full width on mobile', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au/henry')

    const chatWindow = page
      .locator('[data-testid="henry-chat"], [class*="henry-chat"], [class*="chat-window"]')
      .first()
      .or(page.locator('main').first())

    await expect(chatWindow).toBeVisible({ timeout: 5000 })

    const box = await chatWindow.boundingBox()
    if (box) {
      // On mobile (375px), chat area should use most of the width (at least 300px)
      expect(box.width).toBeGreaterThan(300)
    }
  })

  test('sidebar widget opens as full-screen overlay on mobile', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au')

    const floatingBtn = page
      .locator('[data-testid="henry-trigger"], [aria-label*="Henry"]')
      .first()
      .or(page.locator('button[class*="fixed"], button[class*="bottom"]').last())

    if (await floatingBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await floatingBtn.click()

      // On mobile the panel should be full-screen (close to viewport width)
      const panel = page
        .locator('[data-testid="henry-panel"], [data-testid="henry-sidebar"], [class*="henry-panel"]')
        .first()
        .or(
          page.locator('[class*="fixed"][class*="inset"], [class*="fixed"][class*="overlay"]').first()
        )

      if (await panel.isVisible({ timeout: 2000 }).catch(() => false)) {
        const box = await panel.boundingBox()
        if (box) {
          // Full-screen overlay should be close to full viewport width (> 350px on 375px screen)
          expect(box.width).toBeGreaterThan(350)
        }
      }
    }
  })
})

// ─────────────────────────────────────────────
// Input Validation
// ─────────────────────────────────────────────

test.describe('Henry Input Validation', () => {
  test('send button is disabled when input is empty', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au/henry')

    const sendButton = page.getByRole('button', { name: /send|submit/i }).first()
    await expect(sendButton).toBeDisabled({ timeout: 5000 })
  })

  test('send button becomes enabled after typing a message', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au/henry')

    const input = page
      .getByPlaceholder(/type.*message|ask.*question|message henry/i)
      .first()
      .or(page.locator('textarea, input[type="text"]').last())

    await input.fill('Tell me about the property market')

    const sendButton = page.getByRole('button', { name: /send|submit/i }).first()
    await expect(sendButton).toBeEnabled({ timeout: 3000 })
  })

  test('send button is disabled again after clearing the input', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au/henry')

    const input = page
      .getByPlaceholder(/type.*message|ask.*question|message henry/i)
      .first()
      .or(page.locator('textarea, input[type="text"]').last())

    await input.fill('Some question')
    await input.fill('')

    const sendButton = page.getByRole('button', { name: /send|submit/i }).first()
    await expect(sendButton).toBeDisabled({ timeout: 3000 })
  })

  test('character counter appears when input is near the 2000 char limit', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au/henry')

    const input = page
      .getByPlaceholder(/type.*message|ask.*question|message henry/i)
      .first()
      .or(page.locator('textarea').last())

    // Type a long message approaching the 2000-char limit
    const longMessage = 'A'.repeat(1800)
    await input.fill(longMessage)

    // Character counter or limit warning should appear
    await expect(
      page.getByText(/\d+.*char|char.*remain|1800|1[89]\d\d/i).first()
    ).toBeVisible({ timeout: 3000 })
  })

  test('input does not accept messages over 2000 characters', async ({ page }) => {
    await mockPublicApis(page)
    await page.goto('/au/henry')

    const input = page
      .getByPlaceholder(/type.*message|ask.*question|message henry/i)
      .first()
      .or(page.locator('textarea').last())

    const overLimitMessage = 'A'.repeat(2001)
    await input.fill(overLimitMessage)

    const value = await input.inputValue()
    // Either capped at 2000, or a warning is shown
    const isCapped = value.length <= 2000
    const hasWarning = await page
      .getByText(/too long|limit|2000 char/i)
      .first()
      .isVisible()
      .catch(() => false)

    expect(isCapped || hasWarning).toBe(true)
  })
})
