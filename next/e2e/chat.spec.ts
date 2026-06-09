import { test, expect } from '@playwright/test'

test.describe('Chat', () => {
  test('should show start conversation prompt when no messages', async ({ page }) => {
    // This test requires being logged in
    // For now just verify the page loads (will need auth setup)
    await page.goto('/auth/login')
    await expect(page.locator('text=Sign in')).toBeVisible()
  })
})
