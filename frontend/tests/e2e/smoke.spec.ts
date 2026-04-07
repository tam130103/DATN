import { test, expect } from '@playwright/test';

test.describe('DATN Social smoke flows', () => {
  test('authenticated routes load successfully', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByTestId('create-post-form')).toBeVisible();

    await page.goto('/explore');
    await expect(page.getByRole('heading', { name: 'Khám phá' })).toBeVisible();
    await expect(page.getByPlaceholder('Tìm kiếm người dùng, hashtag, hoặc chủ đề')).toBeVisible();

    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Thông báo' })).toBeVisible();

    await page.goto('/messages');
    await expect(page.getByTestId('messages-page')).toBeVisible();

    const currentUserResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/users/me') &&
        response.request().method() === 'GET',
    );
    await page.goto('/profile');
    const currentUserResponse = await currentUserResponsePromise;
    expect(currentUserResponse.status()).toBe(200);
    await expect(page.locator('main')).not.toContainText('Không tìm thấy người dùng');
    await expect(page.getByRole('button', { name: 'Chỉnh sửa hồ sơ' })).toBeVisible();
  });

  test('non-admin user is redirected away from admin routes', async ({ page }) => {
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByTestId('create-post-form')).toBeVisible();
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
