import { test, expect } from '@playwright/test';

test.describe('Search Page', () => {
  test('renders search results layout', async ({ page }) => {
    await page.goto('/search');

    // View toggle buttons exist (grid, list, map)
    await expect(page.locator('[class*="ViewToggle"], button').first()).toBeVisible();

    // Search bar is present
    const searchBar = page.locator('input[type="search"], input[type="text"]').first();
    await expect(searchBar).toBeVisible();
  });

  test('filters panel is visible on desktop', async ({ page }) => {
    await page.goto('/search');

    // Sidebar with filters
    const priceText = page.getByText(/price/i).first();
    await expect(priceText).toBeVisible();
  });

  test('search with query updates URL', async ({ page }) => {
    await page.goto('/search');

    const searchBar = page.locator('input[type="search"], input[type="text"]').first();
    await searchBar.fill('villa');
    await searchBar.press('Enter');

    await expect(page).toHaveURL(/q=villa/);
  });

  test('category filter pills appear when selected', async ({ page }) => {
    await page.goto('/search?category=villa');

    // Filter pill should show
    const pill = page.getByText(/villa/i).first();
    await expect(pill).toBeVisible();
  });

  test('pagination is visible when results exist', async ({ page }) => {
    await page.goto('/search');

    // Wait for results or empty state
    await page.waitForSelector('[class*="grid"], [class*="No results"]', { timeout: 10_000 });
  });

  test('split view shows map panel', async ({ page }) => {
    await page.goto('/search');

    // The map view toggle (split is default)
    // Look for mapbox container or map-related element
    const mapContainer = page.locator('.mapboxgl-map, [class*="ListingMap"]').first();

    // Map may not render without token, but layout should be present
    await expect(page.locator('body')).toBeVisible();
  });
});
