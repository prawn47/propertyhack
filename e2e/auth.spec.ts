import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test('login form renders with email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /log in|sign in|login/i }).first()).toBeVisible()
  })

  test('"Sign in with Google" button exists on login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /google/i }).first().or(
      page.getByText(/sign in with google|continue with google/i).first()
    )).toBeVisible()
  })

  test('"Forgot password?" link exists on login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('link', { name: /forgot password/i }).first().or(
      page.getByText(/forgot password/i).first()
    )).toBeVisible()
  })

  test('"Sign up" link exists on login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('link', { name: /sign up|register|create account/i }).first().or(
      page.getByText(/sign up|register|don.t have an account/i).first()
    )).toBeVisible()
  })
})

test.describe('Register Page', () => {
  test('registration form renders with all required fields', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign up|register|create account/i }).first()).toBeVisible()
  })

  test('"Sign up with Google" button exists on register page', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('button', { name: /google/i }).first().or(
      page.getByText(/sign up with google|continue with google/i).first()
    )).toBeVisible()
  })

  test('newsletter checkbox exists on register page', async ({ page }) => {
    await page.goto('/register')
    // Newsletter opt-in checkbox
    const newsletterCheckbox = page.getByLabel(/newsletter/i).first().or(
      page.locator('input[type="checkbox"][name*="newsletter"]').first()
    ).or(
      page.locator('input[type="checkbox"]').first()
    )
    await expect(newsletterCheckbox).toBeVisible()
  })

  test('"Sign in" link exists on register page', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('link', { name: /sign in|log in|already have an account/i }).first().or(
      page.getByText(/sign in|log in|already have an account/i).first()
    )).toBeVisible()
  })
})
