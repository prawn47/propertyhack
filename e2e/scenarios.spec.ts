import { test, expect } from '@playwright/test'

const CALC_API = '**/api/calculators/**'

function mockMortgageApi(page: import('@playwright/test').Page) {
  return page.route(CALC_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        repaymentAmount: 379266,
        totalInterest: 76534760,
        totalRepaid: 136534760,
        lvr: 80.0,
        lmiWarning: false,
        chartData: Array.from({ length: 30 }, (_, i) => ({
          year: i + 1,
          principalPaid: 50000 + i * 1000,
          interestPaid: 400000 - i * 1000,
          balance: 60000000 - (i + 1) * 100000,
        })),
        yearlyBreakdown: [],
      }),
    })
  })
}

test.describe('Save Scenario Flow', () => {
  test('"Save Scenario" button is visible on mortgage calculator', async ({ page }) => {
    await mockMortgageApi(page)
    await page.goto('/tools/mortgage-calculator')
    await expect(page.getByRole('button', { name: /save scenario|save/i }).first()).toBeVisible()
  })

  test('clicking "Save Scenario" without auth shows sign-in CTA', async ({ page }) => {
    await mockMortgageApi(page)
    await page.goto('/tools/mortgage-calculator')
    const saveBtn = page.getByRole('button', { name: /save scenario|save/i }).first()
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()
    // Should show a sign-in prompt / CTA
    await expect(page.getByText(/sign in|log in|create an account|register/i).first()).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Scenarios Dashboard', () => {
  test('navigating to /profile/scenarios without auth redirects to login', async ({ page }) => {
    await page.goto('/profile/scenarios')
    // Should be redirected to /login (or show login page)
    await expect(page).toHaveURL(/login/)
  })

  test('navigating to /profile without auth redirects to login', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/login/)
  })
})
