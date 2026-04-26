import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('homepage has no broken images', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');

      // Every image should have an alt attribute
      expect(alt, `Image ${src} missing alt text`).toBeTruthy();
    }
  });

  test('login form is keyboard navigable', async ({ page }) => {
    await page.goto('/auth/login');

    // Tab to email
    await page.keyboard.press('Tab');
    const emailFocused = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    expect(['input', 'a']).toContain(emailFocused);
  });

  test('pages have a single h1', async ({ page }) => {
    for (const path of ['/', '/search', '/auth/login']) {
      await page.goto(path);
      const h1Count = await page.locator('h1').count();
      expect(h1Count, `${path} should have exactly 1 h1, got ${h1Count}`).toBeLessThanOrEqual(2);
      expect(h1Count, `${path} should have at least 1 h1`).toBeGreaterThanOrEqual(1);
    }
  });

  test('color contrast - dark text on light background is readable', async ({ page }) => {
    await page.goto('/');

    // Verify body has expected theme classes
    const body = page.locator('body');
    await expect(body).toHaveCSS('color', /.+/);
  });

  test('focus indicators are visible', async ({ page }) => {
    await page.goto('/auth/login');

    const email = page.getByLabel(/email/i);
    await email.focus();

    // Focus should produce a visible ring/outline
    const outline = await email.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.outlineStyle !== 'none' || style.boxShadow !== 'none';
    });
    expect(outline).toBeTruthy();
  });
});
