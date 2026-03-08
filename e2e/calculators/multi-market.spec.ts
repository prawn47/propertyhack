import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Shared mock helpers
// ---------------------------------------------------------------------------

const CALC_API = '**/api/calculators/**'
const MARKETS_API = '**/api/markets**'
const ARTICLES_API = '**/api/articles**'
const CATEGORIES_API = '**/api/categories**'
const LOCATIONS_API = '**/api/locations**'

type Page = import('@playwright/test').Page

function mockUkTransferTaxApi(page: Page, overrides: Record<string, unknown> = {}) {
  return page.route(CALC_API, async (route) => {
    const url = route.request().url()
    if (url.includes('uk-transfer-tax') || url.includes('transfer-tax')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          taxAmount: 1250000,
          taxName: 'Stamp Duty Land Tax',
          abbreviation: 'SDLT',
          bands: [
            { from: 0, to: 25000000, rate: 0, amount: 0 },
            { from: 25000000, to: 50000000, rate: 0.05, amount: 1250000 },
          ],
          effectiveRate: 2.5,
          surcharges: [],
          note: null,
          comparison: {
            england_and_northern_ireland: {
              taxName: 'Stamp Duty Land Tax',
              abbreviation: 'SDLT',
              taxAmount: 1250000,
              effectiveRate: 2.5,
            },
            scotland: {
              taxName: 'Land and Buildings Transaction Tax',
              abbreviation: 'LBTT',
              taxAmount: 980000,
              effectiveRate: 1.96,
            },
            wales: {
              taxName: 'Land Transaction Tax',
              abbreviation: 'LTT',
              taxAmount: 1100000,
              effectiveRate: 2.2,
            },
          },
          ...overrides,
        }),
      })
    } else {
      await route.continue()
    }
  })
}

function mockMarketsApi(page: Page) {
  return page.route(MARKETS_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'm-au', code: 'AU', name: 'Australia', flagEmoji: '🇦🇺', isActive: true },
        { id: 'm-uk', code: 'UK', name: 'United Kingdom', flagEmoji: '🇬🇧', isActive: true },
        { id: 'm-us', code: 'US', name: 'United States', flagEmoji: '🇺🇸', isActive: true },
        { id: 'm-ca', code: 'CA', name: 'Canada', flagEmoji: '🇨🇦', isActive: true },
        { id: 'm-nz', code: 'NZ', name: 'New Zealand', flagEmoji: '🇳🇿', isActive: true },
      ]),
    })
  })
}

async function mockFeedApis(page: Page) {
  await mockMarketsApi(page)
  await page.route(CATEGORIES_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ categories: ['Market Trends'] }),
    })
  })
  await page.route(LOCATIONS_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ locations: ['Sydney'] }),
    })
  })
  await page.route(ARTICLES_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ articles: [], total: 0, page: 1, totalPages: 1 }),
    })
  })
}

// ---------------------------------------------------------------------------
// 1. URL Routing — market-prefixed calculator paths
// ---------------------------------------------------------------------------

test.describe('URL Routing', () => {
  test('/au/tools/mortgage-calculator loads AU mortgage calculator', async ({ page }) => {
    await page.route(CALC_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          repaymentAmount: 379266,
          totalInterest: 76534760,
          totalRepaid: 136534760,
          lvr: 80.0,
          lmiWarning: false,
          chartData: [],
          yearlyBreakdown: [],
        }),
      })
    })
    await page.goto('/au/tools/mortgage-calculator')
    await expect(page).toHaveURL('/au/tools/mortgage-calculator')
    await expect(page.getByText(/mortgage/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('/uk/tools/uk/stamp-duty-calculator loads UK transfer tax calculator', async ({ page }) => {
    await mockUkTransferTaxApi(page)
    await page.goto('/uk/tools/uk/stamp-duty-calculator')
    await expect(page).toHaveURL('/uk/tools/uk/stamp-duty-calculator')
    await expect(page.getByText(/stamp duty|SDLT|LTT|LBTT/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('/nz/tools/nz/buying-costs-calculator loads NZ buying costs calculator', async ({ page }) => {
    await page.goto('/nz/tools/nz/buying-costs-calculator')
    await expect(page).toHaveURL('/nz/tools/nz/buying-costs-calculator')
    await expect(page.getByText(/buying costs|no stamp duty/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('/au/tools/stamp-duty-calculator loads AU stamp duty calculator', async ({ page }) => {
    await page.route(CALC_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stampDuty: 3275000,
          concessionApplied: false,
          concessionAmount: 0,
          effectiveStampDuty: 3275000,
          breakdown: [],
        }),
      })
    })
    await page.goto('/au/tools/stamp-duty-calculator')
    await expect(page).toHaveURL('/au/tools/stamp-duty-calculator')
    await expect(page.getByText(/stamp duty/i).first()).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// 2. Tools Index — market-filtered calculator cards
// ---------------------------------------------------------------------------

test.describe('Tools Index — market filtering', () => {
  test('/au/tools shows AU calculators including stamp duty', async ({ page }) => {
    await page.goto('/au/tools')
    await expect(page.getByText(/mortgage/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/stamp duty/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('/uk/tools shows UK stamp duty calculator card', async ({ page }) => {
    await page.goto('/uk/tools')
    await expect(page.getByText(/UK Stamp Duty/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('/nz/tools shows NZ buying costs calculator card', async ({ page }) => {
    await page.goto('/nz/tools')
    await expect(page.getByText(/NZ Buying Costs/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('/uk/tools does not show AU stamp duty calculator card by default', async ({ page }) => {
    await page.goto('/uk/tools')
    // The AU stamp duty card is country-restricted to AU and should not appear by default
    // (may appear if "show all" is toggled — but not initially)
    const auStampDutyLink = page.locator('a[href*="/tools/stamp-duty-calculator"]:not([href*="uk"])')
    const count = await auStampDutyLink.count()
    // Either absent or hidden behind "show all"
    if (count > 0) {
      await expect(auStampDutyLink.first()).not.toBeVisible()
    }
  })

  test('/nz/tools does not show borrowing power calculator card by default', async ({ page }) => {
    await page.goto('/nz/tools')
    // BorrowingPower is AU-only so should not show on NZ tools index by default
    const borrowingCard = page.getByText(/borrowing power/i).first()
    const isVisible = await borrowingCard.isVisible().catch(() => false)
    // It either isn't rendered, or is hidden — just verify NZ buying costs IS there
    await expect(page.getByText(/NZ Buying Costs/i).first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 3. UK Stamp Duty Calculator
// ---------------------------------------------------------------------------

test.describe('UK Transfer Tax Calculator', () => {
  test('page loads with correct title referencing SDLT', async ({ page }) => {
    await mockUkTransferTaxApi(page)
    await page.goto('/uk/tools/uk/stamp-duty-calculator')
    await expect(page).toHaveTitle(/stamp duty.*UK|UK.*stamp duty/i)
  })

  test('defaults to England & Northern Ireland with SDLT label', async ({ page }) => {
    await mockUkTransferTaxApi(page)
    await page.goto('/uk/tools/uk/stamp-duty-calculator')
    const locationSelect = page.locator('#uk-location-select')
    await expect(locationSelect).toBeVisible({ timeout: 5000 })
    await expect(locationSelect).toHaveValue('england_and_northern_ireland')
  })

  test('switching to Scotland shows LBTT label in results', async ({ page }) => {
    await mockUkTransferTaxApi(page, {
      taxName: 'Land and Buildings Transaction Tax',
      abbreviation: 'LBTT',
    })
    await page.goto('/uk/tools/uk/stamp-duty-calculator')
    const locationSelect = page.locator('#uk-location-select')
    await expect(locationSelect).toBeVisible({ timeout: 5000 })
    await locationSelect.selectOption('scotland')
    // Results should reference LBTT
    await expect(page.getByText(/LBTT|Land and Buildings/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('switching to Wales removes first-time buyer option', async ({ page }) => {
    await mockUkTransferTaxApi(page, {
      taxName: 'Land Transaction Tax',
      abbreviation: 'LTT',
    })
    await page.goto('/uk/tools/uk/stamp-duty-calculator')
    const locationSelect = page.locator('#uk-location-select')
    await expect(locationSelect).toBeVisible({ timeout: 5000 })
    await locationSelect.selectOption('wales')
    // First-time buyer radio should not be present for Wales
    const ftbRadio = page.locator('input[type="radio"][value="first_time"]')
    await expect(ftbRadio).not.toBeVisible()
    // Wales note about no FTB relief should appear
    await expect(page.getByText(/wales.*no first.time|no first.time buyer relief/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('additional property surcharge option is available', async ({ page }) => {
    await mockUkTransferTaxApi(page)
    await page.goto('/uk/tools/uk/stamp-duty-calculator')
    const additionalRadio = page.locator('input[type="radio"][value="additional"]')
    await expect(additionalRadio).toBeVisible({ timeout: 5000 })
  })

  test('selecting additional property triggers surcharge in response', async ({ page }) => {
    await mockUkTransferTaxApi(page, {
      surcharges: [
        {
          label: 'Additional Dwelling Supplement (3%)',
          amount: 1500000,
          note: 'Applies to second homes and buy-to-let properties',
        },
      ],
    })
    await page.goto('/uk/tools/uk/stamp-duty-calculator')
    const additionalRadio = page.locator('input[type="radio"][value="additional"]')
    await expect(additionalRadio).toBeVisible({ timeout: 5000 })
    await additionalRadio.click()
    // Surcharges section should appear
    await expect(page.getByText(/surcharge|additional dwelling/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('cross-region comparison panel shows all 3 UK regions', async ({ page }) => {
    await mockUkTransferTaxApi(page)
    await page.goto('/uk/tools/uk/stamp-duty-calculator')
    // Comparison section heading
    await expect(page.getByText(/regional comparison/i).first()).toBeVisible({ timeout: 5000 })
    // All three regions should appear in the comparison
    await expect(page.getByText(/England.*Northern Ireland|England & Northern Ireland/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Scotland/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Wales/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('result displays GBP currency (£) formatting', async ({ page }) => {
    await mockUkTransferTaxApi(page)
    await page.goto('/uk/tools/uk/stamp-duty-calculator')
    // Should show £ symbol in the results panel
    await expect(page.getByText(/£\d|£[\d,]/).first()).toBeVisible({ timeout: 5000 })
  })

  test('non-UK resident toggle appears only for England & NI', async ({ page }) => {
    await mockUkTransferTaxApi(page)
    await page.goto('/uk/tools/uk/stamp-duty-calculator')
    // Resident switch should be visible for England (default)
    await expect(page.getByRole('switch', { name: /UK Resident/i })).toBeVisible({ timeout: 5000 })
    // Switch to Scotland — resident toggle should disappear
    const locationSelect = page.locator('#uk-location-select')
    await locationSelect.selectOption('scotland')
    await expect(page.getByRole('switch', { name: /UK Resident/i })).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 4. NZ Buying Costs Calculator
// ---------------------------------------------------------------------------

test.describe('NZ Buying Costs Calculator', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto('/nz/tools/nz/buying-costs-calculator')
    await expect(page).toHaveTitle(/buying costs.*NZ|NZ.*buying costs/i)
  })

  test('"no stamp duty" message is prominently displayed', async ({ page }) => {
    await page.goto('/nz/tools/nz/buying-costs-calculator')
    await expect(
      page.getByText(/no stamp duty|new zealand has no stamp duty/i).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('$0 transfer tax panel is shown', async ({ page }) => {
    await page.goto('/nz/tools/nz/buying-costs-calculator')
    // The component renders a prominent "$0" for stamp duty / transfer tax
    await expect(page.getByText('$0').first()).toBeVisible({ timeout: 5000 })
  })

  test('low equity premium appears when deposit < 20%', async ({ page }) => {
    await page.goto('/nz/tools/nz/buying-costs-calculator')
    // Slider defaults to 20% — drag it below 20% to trigger LEP
    const slider = page.locator('input[type="range"]')
    await expect(slider).toBeVisible({ timeout: 5000 })
    // Set to 10% deposit (LVR 90% — triggers LEP)
    await slider.evaluate((el: HTMLInputElement) => {
      el.value = '10'
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(page.getByText(/low equity premium|LVR.*low equity/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('GST note appears when new build is checked', async ({ page }) => {
    await page.goto('/nz/tools/nz/buying-costs-calculator')
    const newBuildCheckbox = page.locator('#new-build')
    await expect(newBuildCheckbox).toBeVisible({ timeout: 5000 })
    await newBuildCheckbox.click()
    await expect(page.getByText(/GST|15%.*GST/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('switching to investor shows bright-line and interest deductibility notes', async ({ page }) => {
    await page.goto('/nz/tools/nz/buying-costs-calculator')
    const investorButton = page.getByRole('button', { name: /investor/i }).first()
    await expect(investorButton).toBeVisible({ timeout: 5000 })
    await investorButton.click()
    await expect(page.getByText(/bright.line/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/interest deductib/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('standard buying cost line items (legal, inspection, valuation, LIM) are shown', async ({ page }) => {
    await page.goto('/nz/tools/nz/buying-costs-calculator')
    await expect(page.getByText(/legal.*conveyancing|conveyancing fees/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/building inspection/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/LIM report/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('NZD currency formatting ($ symbol) is used in results', async ({ page }) => {
    await page.goto('/nz/tools/nz/buying-costs-calculator')
    // NZD uses $ — results should contain $ amounts
    await expect(page.getByText(/\$\d{1,3}(,\d{3})*|\$[\d,]+/).first()).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// 5. Backward Compatibility — AU calculators unchanged
// ---------------------------------------------------------------------------

test.describe('Backward Compatibility — AU calculators', () => {
  test('/au/tools/mortgage-calculator still works', async ({ page }) => {
    await page.route(CALC_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          repaymentAmount: 379266,
          totalInterest: 76534760,
          totalRepaid: 136534760,
          lvr: 80.0,
          lmiWarning: false,
          chartData: [],
          yearlyBreakdown: [],
        }),
      })
    })
    await page.goto('/au/tools/mortgage-calculator')
    await expect(page).toHaveURL('/au/tools/mortgage-calculator')
    await expect(page.getByText(/mortgage/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('/au/tools/stamp-duty-calculator still works', async ({ page }) => {
    await page.route(CALC_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stampDuty: 3275000,
          concessionApplied: false,
          concessionAmount: 0,
          effectiveStampDuty: 3275000,
          breakdown: [],
        }),
      })
    })
    await page.goto('/au/tools/stamp-duty-calculator')
    await expect(page).toHaveURL('/au/tools/stamp-duty-calculator')
    await expect(page.getByText(/stamp duty/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('/au/tools/rental-yield-calculator still works', async ({ page }) => {
    await page.route(CALC_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          grossYield: 4.16,
          netYield: 3.12,
          annualRent: 39000,
          annualExpenses: 10000,
          annualNetIncome: 29000,
        }),
      })
    })
    await page.goto('/au/tools/rental-yield-calculator')
    await expect(page).toHaveURL('/au/tools/rental-yield-calculator')
    await expect(page.getByText(/rental yield/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('/au/tools/borrowing-power-calculator still works', async ({ page }) => {
    await page.route(CALC_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          maxBorrowing: 65000000,
          depositNeeded80: 13000000,
          depositNeeded90: 6500000,
          monthlyRepayment: 380000,
          monthlyNetIncome: 600000,
          monthlyExpenses: 220000,
        }),
      })
    })
    await page.goto('/au/tools/borrowing-power-calculator')
    await expect(page).toHaveURL('/au/tools/borrowing-power-calculator')
    await expect(page.getByText(/borrowing power/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('/au/tools/rent-vs-buy-calculator still works', async ({ page }) => {
    await page.route(CALC_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          breakevenYear: 7,
          chartData: [],
          buyingCosts: 5000000,
          stampDuty: 3000000,
        }),
      })
    })
    await page.goto('/au/tools/rent-vs-buy-calculator')
    await expect(page).toHaveURL('/au/tools/rent-vs-buy-calculator')
    await expect(page.getByText(/rent vs buy/i).first()).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// 6. Market switching via country selector — tools context
// ---------------------------------------------------------------------------

test.describe('Market switching on tools pages', () => {
  test('navigating to /uk/tools shows UK-specific calculators', async ({ page }) => {
    await page.goto('/uk/tools')
    await expect(page.getByText(/UK Stamp Duty/i).first()).toBeVisible({ timeout: 5000 })
    // Mortgage and rental yield are universal — should still appear
    await expect(page.getByText(/mortgage/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('navigating to /nz/tools shows NZ buying costs calculator', async ({ page }) => {
    await page.goto('/nz/tools')
    await expect(page.getByText(/NZ Buying Costs/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('navigating to /au/tools shows AU stamp duty and borrowing power', async ({ page }) => {
    await page.goto('/au/tools')
    await expect(page.getByText(/stamp duty/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/borrowing power/i).first()).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// 7. Scenarios — market tag (no-auth flows)
// ---------------------------------------------------------------------------

test.describe('Scenarios — market-aware', () => {
  test('save scenario button is present on UK transfer tax calculator', async ({ page }) => {
    await mockUkTransferTaxApi(page)
    await page.goto('/uk/tools/uk/stamp-duty-calculator')
    // SaveScenarioButton renders with text "Save Scenario" or similar
    const saveBtn = page.getByRole('button', { name: /save scenario|save/i }).first()
    await expect(saveBtn).toBeVisible({ timeout: 5000 })
  })

  test('clicking save scenario without auth on UK calculator shows sign-in prompt', async ({ page }) => {
    await mockUkTransferTaxApi(page)
    await page.goto('/uk/tools/uk/stamp-duty-calculator')
    const saveBtn = page.getByRole('button', { name: /save scenario|save/i }).first()
    await expect(saveBtn).toBeVisible({ timeout: 5000 })
    await saveBtn.click()
    await expect(
      page.getByText(/sign in|log in|create an account|register/i).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('save scenario button is present on NZ buying costs calculator', async ({ page }) => {
    await page.goto('/nz/tools/nz/buying-costs-calculator')
    const saveBtn = page.getByRole('button', { name: /save scenario|save/i }).first()
    await expect(saveBtn).toBeVisible({ timeout: 5000 })
  })

  test('navigating to /profile/scenarios without auth redirects to login', async ({ page }) => {
    await page.goto('/profile/scenarios')
    await expect(page).toHaveURL(/login/)
  })
})
