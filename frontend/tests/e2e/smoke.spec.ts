import { expect, test } from '@playwright/test';
import { getAdminCredentials } from './test-credentials';

test.describe('DATN Social smoke flows', () => {
  test('authenticated routes load successfully', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByTestId('create-post-form')).toBeVisible();

    await page.goto('/explore');
    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.getByTestId('explore-page')).toBeVisible();

    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/notifications$/);
    await expect(page.getByTestId('notifications-page')).toBeVisible();

    await page.goto('/messages');
    await expect(page.getByTestId('messages-page')).toBeVisible();

    const currentUserResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/auth/me') &&
        response.request().method() === 'GET',
    );
    await page.goto('/profile');
    const currentUserResponse = await currentUserResponsePromise;
    expect(currentUserResponse.status()).toBe(200);
    await expect(page.getByTestId('profile-page')).toBeVisible();
  });

  test('non-admin user is redirected away from admin routes', async ({ page }) => {
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByTestId('create-post-form')).toBeVisible();
  });

  test('admin user can access admin routes', async ({ browser, baseURL }) => {
    test.setTimeout(60000);

    const { email, password } = getAdminCredentials();
    const context = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    const adminPages = [
      { path: '/admin', readySelector: '.admin-stats-grid' },
      { path: '/admin/users', readySelector: '.admin-table-container' },
      { path: '/admin/posts', readySelector: '.admin-table-container' },
      { path: '/admin/comments', readySelector: '.admin-table-container' },
      { path: '/admin/reports', readySelector: '.admin-table-container' },
    ];

    await page.goto('/login');
    await expect(page.getByTestId('login-form')).toBeVisible();
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/feed$/);

    for (const adminPage of adminPages) {
      await page.goto(adminPage.path);
      expect(new URL(page.url()).pathname).toBe(adminPage.path);
      await expect(page.locator('.admin-page-title')).toBeVisible();
      await expect(page.locator(adminPage.readySelector).first()).toBeVisible({ timeout: 15000 });
    }

    await context.close();
  });

  test('user can create a text post from feed', async ({ page }) => {
    const caption = `playwright smoke post ${Math.random().toString(36).slice(2, 10)}`;

    await page.goto('/feed');
    await page.getByTestId('create-post-caption').fill(caption);
    const createPostResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/posts') &&
        response.request().method() === 'POST',
    );
    await page.getByTestId('create-post-submit').click();

    const createPostResponse = await createPostResponsePromise;
    expect(createPostResponse.status()).toBe(201);

    const createdPost = page.locator('article').filter({ hasText: caption }).first();
    await expect(createdPost).toBeVisible({ timeout: 15000 });

    await page.reload();
    await expect(page.locator('article').filter({ hasText: caption }).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
