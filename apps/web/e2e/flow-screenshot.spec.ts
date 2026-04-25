import { test, expect } from '@playwright/test';

test('user flow: pick destination on landing → Search → see filter pill', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByPlaceholder('Search destinations', { exact: true })).toBeVisible();

  await page.getByPlaceholder('Search destinations', { exact: true }).click();
  const malibuOption = page.getByRole('option', { name: /Malibu/i }).first();
  await expect(malibuOption).toBeVisible({ timeout: 10_000 });
  await malibuOption.click();
  await expect(page.getByPlaceholder('Search destinations', { exact: true })).toHaveValue('Malibu');

  await Promise.all([
    page.waitForURL(/\/search\?[^#]*location=Malibu/),
    page.getByRole('button', { name: /^Search$/ }).click(),
  ]);

  await page.waitForResponse(
    (r) => r.url().includes('/api/search') && r.url().includes('location=Malibu'),
    { timeout: 20_000 },
  );

  const malibuPill = page.getByText('Malibu', { exact: true }).first();
  await expect(malibuPill).toBeVisible({ timeout: 5_000 });

  await page.waitForTimeout(2_000);
  await expect(malibuPill).toBeVisible();

  await page.screenshot({ path: 'flow-pills.png', fullPage: false });
});
