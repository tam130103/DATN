import { test, expect } from '@playwright/test';

test.describe('DATN Social smoke flows', () => {
  test('authenticated routes load successfully', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByTestId('create-post-form')).toBeVisible();

    await page.goto('/explore');
    await expect(page.getByPlaceholder('Search')).toBeVisible();

    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();

    await page.goto('/messages');
    await expect(page.getByTestId('messages-page')).toBeVisible();

    await page.goto('/profile');
    await expect(page.getByRole('button', { name: 'Edit profile' })).toBeVisible();
  });

  test('user can create a text post from feed', async ({ page }) => {
    const caption = `playwright smoke post ${Date.now()}`;

    await page.goto('/feed');
    await page.getByTestId('create-post-caption').fill(caption);
    await page.getByTestId('create-post-submit').click();

    await expect(page.getByText(caption).first()).toBeVisible({ timeout: 15000 });

    await page.reload();
    await expect(page.getByText(caption).first()).toBeVisible({ timeout: 15000 });
  });
});
