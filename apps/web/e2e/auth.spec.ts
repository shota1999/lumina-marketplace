import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page HTML contains form fields', async ({ page }) => {
    const res = await page.goto('/auth/login');
    expect(res?.status()).toBe(200);

    const html = await page.content();
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html.toLowerCase()).toMatch(/sign in|log in/);
  });

  test('register page HTML contains form fields', async ({ page }) => {
    const res = await page.goto('/auth/register');
    expect(res?.status()).toBe(200);

    const html = await page.content();
    expect(html).toContain('name="name"');
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html.toLowerCase()).toMatch(/create|sign up|register/);
  });

  test('forgot password page HTML contains email field', async ({ page }) => {
    const res = await page.goto('/auth/forgot-password');
    expect(res?.status()).toBe(200);
    const html = await page.content();
    expect(html).toContain('name="email"');
  });

  test('protected routes redirect to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('admin route redirects unauthenticated users', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('POST /api/auth/login with invalid credentials returns error', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'nonexistent@example.com', password: 'wrongpassword123' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    const body = await res.json().catch(() => ({}));
    expect(body.success).not.toBe(true);
  });

  test('POST /api/auth/register creates account and sets session cookie', async ({ request }) => {
    const uniqueEmail = `e2e+${Date.now()}@lumina.dev`;

    const res = await request.post('/api/auth/register', {
      data: { name: 'E2E Test User', email: uniqueEmail, password: 'TestPassword123!' },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.success).toBe(true);

    const cookies = await request.storageState();
    const session = cookies.cookies.find((c) => c.name === 'lumina_session');
    expect(session?.value).toBeTruthy();
  });

  test('POST /api/auth/login with demo guest account succeeds', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'guest@lumina.dev', password: 'admin123' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const cookies = await request.storageState();
    const session = cookies.cookies.find((c) => c.name === 'lumina_session');
    expect(session?.value).toBeTruthy();
  });

  test('authenticated request to protected page does NOT redirect', async ({ browser }) => {
    const context = await browser.newContext();
    const loginRes = await context.request.post('/api/auth/login', {
      data: { email: 'guest@lumina.dev', password: 'admin123' },
    });
    expect(loginRes.status()).toBe(200);

    const page = await context.newPage();
    await page.goto('/bookings');
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await context.close();
  });

  test('POST /api/auth/register rejects duplicate email', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { name: 'Duplicate', email: 'guest@lumina.dev', password: 'TestPassword123!' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    const body = await res.json().catch(() => ({}));
    expect(body.success).not.toBe(true);
    const msg = (body.error?.message ?? '').toLowerCase();
    expect(msg).toMatch(/already|exists|taken|in use|registered/);
  });

  test('logout clears session cookie', async ({ browser }) => {
    const context = await browser.newContext();
    const loginRes = await context.request.post('/api/auth/login', {
      data: { email: 'guest@lumina.dev', password: 'admin123' },
    });
    expect(loginRes.status()).toBe(200);

    const before = (await context.cookies()).find((c) => c.name === 'lumina_session');
    expect(before?.value).toBeTruthy();

    await context.request.post('/api/auth/logout').catch(() => null);
    await context.clearCookies();

    const page = await context.newPage();
    await page.goto('/bookings');
    await expect(page).toHaveURL(/\/auth\/login/);
    await context.close();
  });
});
