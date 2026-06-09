import { test, expect } from '@playwright/test'

test.describe('Auth', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('should show login form', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('input[id="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show register form', async ({ page }) => {
    await page.goto('/auth/register')
    await expect(page.locator('input[id="name"]')).toBeVisible()
    await expect(page.locator('input[id="email"]')).toBeVisible()
    await expect(page.locator('input[id="password"]')).toBeVisible()
  })
})
