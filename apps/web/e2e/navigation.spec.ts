import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('main nav links are visible and functional', async ({ page }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();

    // Collect all nav links and verify they have valid hrefs
    const navLinks = nav.getByRole('link');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const href = await navLinks.nth(i).getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('clicking a nav link navigates to the correct page', async ({ page }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation');

    // Find a link that points to an internal page
    const internalLink = nav.getByRole('link').filter({ hasNotText: /lumina/i }).first();
    const href = await internalLink.getAttribute('href');
    expect(href).toBeTruthy();

    await internalLink.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  test('footer links work', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const footerLinks = footer.getByRole('link');
    const count = await footerLinks.count();
    expect(count).toBeGreaterThan(0);

    // Verify privacy link navigates correctly
    const privacyLink = footer.getByRole('link', { name: /privacy/i });
    await expect(privacyLink).toBeVisible();
    await privacyLink.click();

    await expect(page).toHaveURL(/privacy/);
  });

  test('footer terms link navigates correctly', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    const termsLink = footer.getByRole('link', { name: /terms/i });
    await expect(termsLink).toBeVisible();
    await termsLink.click();

    await expect(page).toHaveURL(/terms/);
  });

  test('mobile menu opens and closes', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');

    await page.goto('/');

    // Menu toggle button should be visible on mobile
    const menuButton = page.getByRole('button', { name: /menu|toggle|hamburger/i }).or(
      page.getByLabel(/menu/i),
    );
    await expect(menuButton).toBeVisible();

    // Open menu
    await menuButton.click();

    // Navigation links should become visible
    const mobileNav = page.getByRole('navigation');
    await expect(mobileNav.getByRole('link').first()).toBeVisible();

    // Close menu
    const closeButton = page.getByRole('button', { name: /close|menu|toggle/i }).or(
      page.getByLabel(/close|menu/i),
    );
    await closeButton.click();

    // Menu content should be hidden again
    await expect(
      mobileNav.getByRole('link').first(),
    ).toBeHidden({ timeout: 5_000 });
  });

  test('skip-to-content link exists', async ({ page }) => {
    await page.goto('/');

    // Skip link is typically the first focusable element
    const skipLink = page.getByRole('link', { name: /skip to (main )?content/i }).or(
      page.locator('a[href="#main-content"]'),
    );

    // It may be visually hidden until focused
    await expect(skipLink).toBeAttached();

    const href = await skipLink.getAttribute('href');
    expect(href).toBe('#main-content');
  });

  test('search bar is functional', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/search|where/i);
    await expect(searchInput).toBeVisible();

    await searchInput.fill('mountain');

    // Either suggestions appear or Enter navigates to search results
    const hasSuggestions = await page.getByRole('listbox').or(
      page.getByRole('option'),
    ).isVisible().catch(() => false);

    if (!hasSuggestions) {
      await searchInput.press('Enter');
      await expect(page).toHaveURL(/\/search\?q=mountain/);
    }
  });

  test('search bar navigates on enter', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/search|where/i);
    await searchInput.fill('city');
    await searchInput.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=city/);
  });
});
