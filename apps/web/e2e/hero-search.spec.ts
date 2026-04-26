import { test, expect, type Page } from '@playwright/test';

async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(page.getByPlaceholder('Search destinations', { exact: true })).toBeVisible();
}

test.describe('Hero search bar — destination', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHome(page);
  });

  test('typing an exact city name and submitting goes to /search?location=City', async ({
    page,
  }) => {
    const input = page.getByPlaceholder('Search destinations', { exact: true });
    await input.click();
    await input.fill('Malibu');
    await page
      .waitForResponse((r) => r.url().includes('/api/listings/destinations'), { timeout: 10_000 })
      .catch(() => {});
    await Promise.all([
      page.waitForURL(/\/search\?[^#]*location=Malibu/),
      page.getByRole('button', { name: /^Search$/ }).click(),
    ]);
    await expect(page).toHaveURL(/[?&]location=Malibu/);
  });

  test('search results page filters strictly to picked city', async ({ page }) => {
    const apiResponse = page.waitForResponse(
      (r) => r.url().includes('/api/search') && r.url().includes('location=Malibu'),
      { timeout: 20_000 },
    );
    await page.goto('/search?location=Malibu');
    await apiResponse;
    const cards = page.locator('a[href^="/listings/"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    const titles = await cards.allTextContents();
    for (const t of titles) {
      expect(t.toLowerCase()).toContain('malibu');
    }
  });

  test('selecting a city from the dropdown fills the input but does not navigate (user picks dates/guests next)', async ({
    page,
  }) => {
    const input = page.getByPlaceholder('Search destinations', { exact: true });
    await input.click();
    const malibuOption = page.getByRole('option', { name: /Malibu/i }).first();
    await expect(malibuOption).toBeVisible({ timeout: 10_000 });
    await malibuOption.click();
    await expect(input).toHaveValue('Malibu');
    await expect(page).toHaveURL(/\/$/);
  });

  test('full flow: pick destination then click Search submits with location param', async ({
    page,
  }) => {
    const input = page.getByPlaceholder('Search destinations', { exact: true });
    await input.click();
    const malibuOption = page.getByRole('option', { name: /Malibu/i }).first();
    await expect(malibuOption).toBeVisible({ timeout: 10_000 });
    await malibuOption.click();
    await Promise.all([
      page.waitForURL(/\/search\?[^#]*location=Malibu/),
      page.getByRole('button', { name: /^Search$/ }).click(),
    ]);
    await expect(page).toHaveURL(/[?&]location=Malibu/);
  });

  test('typing free text that is NOT a known city falls through to ?q=', async ({ page }) => {
    const input = page.getByPlaceholder('Search destinations', { exact: true });
    await input.click();
    await input.fill('not-a-real-city-xyz');
    await Promise.all([
      page.waitForURL(/\/search\?/),
      page.getByRole('button', { name: /^Search$/ }).click(),
    ]);
    await expect(page).toHaveURL(/[?&]q=not-a-real-city-xyz/);
    await expect(page).not.toHaveURL(/[?&]location=/);
  });

  test('submitting with empty fields produces a clean /search URL (no empty params)', async ({
    page,
  }) => {
    await Promise.all([
      page.waitForURL(/\/search(\?|$)/),
      page.getByRole('button', { name: /^Search$/ }).click(),
    ]);
    const url = new URL(page.url());
    for (const [, value] of url.searchParams) {
      expect(value).not.toBe('');
    }
  });
});

test.describe('Hero search API — location filter', () => {
  test('GET /api/search?location=Malibu returns only Malibu listings', async ({ request }) => {
    const res = await request.get('/api/search?location=Malibu');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalHits).toBeGreaterThan(0);
    for (const hit of body.data.hits) {
      expect(String(hit.city).toLowerCase()).toBe('malibu');
    }
  });

  test('GET /api/search?location=Aspen returns only Aspen listings', async ({ request }) => {
    const res = await request.get('/api/search?location=Aspen');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalHits).toBeGreaterThan(0);
    for (const hit of body.data.hits) {
      expect(String(hit.city).toLowerCase()).toBe('aspen');
    }
  });

  test('GET /api/search?q=Malibu auto-promotes to location filter (only Malibu hits)', async ({
    request,
  }) => {
    const res = await request.get('/api/search?q=Malibu');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalHits).toBeGreaterThan(0);
    for (const hit of body.data.hits) {
      expect(String(hit.city).toLowerCase()).toBe('malibu');
    }
  });

  test('GET /api/search?q=malibu (lowercase) also auto-promotes', async ({ request }) => {
    const res = await request.get('/api/search?q=malibu');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalHits).toBeGreaterThan(0);
    for (const hit of body.data.hits) {
      expect(String(hit.city).toLowerCase()).toBe('malibu');
    }
  });

  test('GET /api/search?q=NoSuchCityZZZ does NOT auto-promote (falls through to fuzzy)', async ({
    request,
  }) => {
    const res = await request.get('/api/search?q=NoSuchCityZZZ');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('combined filter (location + checkIn + checkOut + guests) returns matching listing', async ({
    request,
  }) => {
    const res = await request.get(
      '/api/search?location=Malibu&checkIn=2026-05-01&checkOut=2026-05-05&guests=2',
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalHits).toBeGreaterThan(0);
    for (const hit of body.data.hits) {
      expect(String(hit.city).toLowerCase()).toBe('malibu');
      expect(hit.maxGuests).toBeGreaterThanOrEqual(2);
    }
  });

  test('combined filter with impossible guest count returns zero hits', async ({ request }) => {
    const res = await request.get('/api/search?location=Malibu&guests=20');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalHits).toBe(0);
  });

  test('GET /api/search?location=NoSuchCityZZZ returns zero hits', async ({ request }) => {
    const res = await request.get('/api/search?location=NoSuchCityZZZ');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalHits).toBe(0);
  });

  test('search results page shows a removable pill for location, dates and guests passed via URL', async ({
    page,
  }) => {
    await page.goto('/search?location=Malibu&checkIn=2026-05-01&checkOut=2026-05-05&guests=2');
    await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible();
    await expect(page.getByText('Malibu', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/May 1.*May 5/i).first()).toBeVisible();
    await expect(page.getByText(/2\+ guests/).first()).toBeVisible();

    await page.getByRole('button', { name: /Remove May 1/i }).click();
    await expect(page).not.toHaveURL(/checkIn=/);
    await expect(page).not.toHaveURL(/checkOut=/);
  });

  test('GET /api/listings/destinations returns the seeded city/country pairs', async ({
    request,
  }) => {
    const res = await request.get('/api/listings/destinations');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.destinations)).toBe(true);
    expect(body.destinations.length).toBeGreaterThan(0);
    const cities = body.destinations.map((d: { city: string }) => d.city.toLowerCase());
    expect(cities).toContain('malibu');
    expect(cities).toContain('aspen');
  });
});
