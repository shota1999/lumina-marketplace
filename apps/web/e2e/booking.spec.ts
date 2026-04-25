import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('listing detail page shows title, price, and images', async ({ page }) => {
    // Navigate to a listing – use the first listing found from search
    await page.goto('/search?q=');

    const firstListing = page.getByRole('link').filter({ hasText: /.+/ }).first();
    await firstListing.click();

    // Should land on a listing detail page
    await expect(page).toHaveURL(/\/listings?\//);

    // Verify core listing details are visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/\$[\d,.]+/)).toBeVisible();
    await expect(page.locator('img').first()).toBeVisible();
  });

  test('listing detail page has booking form elements', async ({ page }) => {
    await page.goto('/search?q=');

    const firstListing = page.getByRole('link').filter({ hasText: /.+/ }).first();
    await firstListing.click();

    await expect(page).toHaveURL(/\/listings?\//);

    // Date picker and guest count should be present
    await expect(
      page.getByRole('button', { name: /date|check.?in|select date/i }).or(
        page.getByLabel(/date|check.?in/i),
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('spinbutton', { name: /guest/i }).or(
        page.getByLabel(/guest/i),
      ),
    ).toBeVisible();
  });

  test('booking without auth redirects to login', async ({ page }) => {
    await page.goto('/search?q=');

    const firstListing = page.getByRole('link').filter({ hasText: /.+/ }).first();
    await firstListing.click();

    await expect(page).toHaveURL(/\/listings?\//);

    // Attempt to book
    const bookButton = page.getByRole('button', { name: /book|reserve/i });
    await expect(bookButton).toBeVisible();
    await bookButton.click();

    // Should redirect unauthenticated user to login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });

  test('bookings page requires authentication', async ({ page }) => {
    await page.goto('/bookings');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('bookings page structure when accessed directly', async ({ page }) => {
    // Even though it redirects, the login page should load properly
    await page.goto('/bookings');
    await expect(page).toHaveURL(/\/auth\/login/);

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /sign in|log in/i }),
    ).toBeVisible();
  });
});
