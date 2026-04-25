import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('renders hero section and navigation', async ({ page }) => {
    await page.goto('/');

    // Brand is visible
    await expect(page.locator('text=Lumina')).toBeVisible();

    // Hero search bar exists
    const searchInput = page.getByPlaceholder(/search|where/i);
    await expect(searchInput).toBeVisible();
  });

  test('navigates to search page', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/search|where/i);
    await searchInput.fill('beach');
    await searchInput.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=beach/);
  });

  test('has correct meta title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Lumina/);
  });

  test('footer links are accessible', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Privacy and terms links exist
    await expect(footer.getByRole('link', { name: /privacy/i })).toBeVisible();
    await expect(footer.getByRole('link', { name: /terms/i })).toBeVisible();
  });
});
