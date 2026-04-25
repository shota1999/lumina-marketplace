import { test, expect, type Page } from '@playwright/test';

async function gotoSearch(page: Page, qs = '') {
  const apiResponse = page
    .waitForResponse((res) => res.url().includes('/api/search'), { timeout: 25_000 })
    .catch(() => null);
  await page.goto(`/search${qs}`);
  await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible();
  await apiResponse;
}

async function clickCategory(page: Page, label: string) {
  await page.getByRole('button', { name: new RegExp(`^${label}\\d*$`) }).click();
}

async function expandSection(page: Page, title: string) {
  const sectionToggle = page.getByRole('button', { name: title, exact: true });
  await sectionToggle.click();
}

test.describe('Search Filters', () => {
  test.beforeEach(async ({ page }) => {
    await gotoSearch(page);
  });

  test('sort by price ascending updates URL', async ({ page }) => {
    await page.getByRole('button', { name: /^Price: Low/ }).click();
    await expect(page).toHaveURL(/[?&]sort=price_asc/);
  });

  test('sort by top rated updates URL', async ({ page }) => {
    await page.getByRole('button', { name: 'Top Rated' }).click();
    await expect(page).toHaveURL(/[?&]sort=rating_desc/);
  });

  test('selecting property type adds category param', async ({ page }) => {
    await clickCategory(page, 'Villa');
    await expect(page).toHaveURL(/[?&]category=villa/);
  });

  test('toggling a property type adds, then removes the param on second click', async ({ page }) => {
    await clickCategory(page, 'Villa');
    await expect(page).toHaveURL(/[?&]category=villa/);
    await clickCategory(page, 'Villa');
    await expect(page).not.toHaveURL(/category=villa/);
  });

  test('clicking "All" clears category selection', async ({ page }) => {
    await gotoSearch(page, '?category=villa');
    await expect(page).toHaveURL(/category=villa/);
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(page).not.toHaveURL(/category=/);
  });

  test('guests stepper increments and adds guests param', async ({ page }) => {
    await page.getByRole('button', { name: 'Increase guests' }).click();
    await expect(page).toHaveURL(/[?&]guests=1/);
    await page.getByRole('button', { name: 'Increase guests' }).click();
    await expect(page).toHaveURL(/[?&]guests=2/);
  });

  test('guests stepper decrement disabled at zero', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Decrease guests' })).toBeDisabled();
  });

  test('guests stepper decrements down to zero and removes param', async ({ page }) => {
    await gotoSearch(page, '?guests=2');
    await page.getByRole('button', { name: 'Decrease guests' }).click();
    await expect(page).toHaveURL(/[?&]guests=1/);
    await page.getByRole('button', { name: 'Decrease guests' }).click();
    await expect(page).not.toHaveURL(/guests=/);
  });

  test('bedrooms stepper increments and adds bedrooms param', async ({ page }) => {
    await page.getByRole('button', { name: 'Increase bedrooms' }).click();
    await expect(page).toHaveURL(/[?&]bedrooms=1/);
  });

  test('bedrooms decrement disabled at zero', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Decrease bedrooms' })).toBeDisabled();
  });

  test('amenity checkbox toggles amenity param', async ({ page }) => {
    await expandSection(page, 'Amenities');
    const wifiLabel = page.locator('label').filter({ hasText: /wifi/i }).first();
    await expect(wifiLabel).toBeVisible({ timeout: 10_000 });
    await wifiLabel.click();
    await expect(page).toHaveURL(/[?&]amenity=wifi/);
    await wifiLabel.click();
    await expect(page).not.toHaveURL(/amenity=wifi/);
  });

  test('"Show all" amenities button reveals more options', async ({ page }) => {
    await expandSection(page, 'Amenities');
    const showAll = page.getByRole('button', { name: /Show all \(\d+\)/ });
    if (await showAll.isVisible().catch(() => false)) {
      const before = await page.locator('label').count();
      await showAll.click();
      await expect(page.getByRole('button', { name: /Show less/ })).toBeVisible();
      const after = await page.locator('label').count();
      expect(after).toBeGreaterThan(before);
    }
  });

  test('Clear filters clears every filter param', async ({ page }) => {
    await gotoSearch(page, '?category=villa&guests=2&bedrooms=1&amenity=wifi&sort=price_asc');
    const reset = page.getByRole('button', { name: /Clear filters/i }).first();
    await expect(reset).toBeVisible();
    await reset.click();
    await expect(page).not.toHaveURL(/category=/);
    await expect(page).not.toHaveURL(/guests=/);
    await expect(page).not.toHaveURL(/bedrooms=/);
    await expect(page).not.toHaveURL(/amenity=/);
  });

  test('FilterSection accordion toggles its body open and closed', async ({ page }) => {
    const sortBody = page.getByRole('button', { name: 'Top Rated' });
    await expect(sortBody).toBeVisible();
    await page.getByRole('button', { name: 'Sort by', exact: true }).click();
    await expect(sortBody).toBeHidden();
    await page.getByRole('button', { name: 'Sort by', exact: true }).click();
    await expect(sortBody).toBeVisible();
  });

  test('initial URL filters are reflected in UI state', async ({ page }) => {
    await gotoSearch(page, '?guests=3&bedrooms=2&category=villa');
    await expect(page.getByLabel('guests value')).toHaveText('3');
    await expect(page.getByLabel('bedrooms value')).toHaveText('2');
    await expect(page.getByRole('button', { name: /Clear filters/i }).first()).toBeVisible();
  });

  test('price slider keyboard interaction commits priceMin to URL', async ({ page }) => {
    const minSlider = page.getByRole('slider', { name: /Minimum/i });
    await minSlider.focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Tab');
    await expect(page).toHaveURL(/[?&]priceMin=\d+/);
  });

  test('price slider keyboard interaction commits priceMax to URL', async ({ page }) => {
    const maxSlider = page.getByRole('slider', { name: /Maximum/i });
    await maxSlider.focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Tab');
    await expect(page).toHaveURL(/[?&]priceMax=\d+/);
  });

  test('selecting a property type fires a /api/search request with that filter', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/search') && res.url().includes('category=villa'),
      { timeout: 20_000 },
    );
    await clickCategory(page, 'Villa');
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    const json = await response.json();
    expect(json.success).toBe(true);
  });
});
