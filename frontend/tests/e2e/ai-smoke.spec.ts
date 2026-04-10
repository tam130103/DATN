import { test, expect } from '@playwright/test';

const expectAIMeta = (meta: any) => {
  expect(meta).toBeTruthy();
  expect(['dify', 'fallback']).toContain(meta.source);
  expect(typeof meta.degraded).toBe('boolean');
};

test.describe('DATN Social AI smoke flows', () => {
  test('caption endpoint returns text and meta through composer', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/feed');
    await page.getByTestId('create-post-caption').fill(`Da Lat cuoi tuan ${Date.now()}`);

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/posts/ai/generate-caption') &&
        response.request().method() === 'POST',
    );

    await page.getByRole('button', { name: /viết bằng ai|viet bang ai/i }).click();

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(typeof body.text).toBe('string');
    expect(body.text.trim().length).toBeGreaterThan(0);
    expectAIMeta(body.meta);

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('hashtag endpoint returns hashtags and meta through composer', async ({ page }) => {
    await page.goto('/feed');
    await page
      .getByTestId('create-post-caption')
      .fill('Chuyen di Da Lat cuoi tuan cung hoi ban than va nhieu khoanh khac dang nho');

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/posts/ai/suggest-hashtags') &&
        response.request().method() === 'POST',
    );

    await page.getByRole('button', { name: /gợi ý hashtag|goi y hashtag/i }).click();

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(Array.isArray(body.hashtags)).toBe(true);
    expectAIMeta(body.meta);

    if (!body.meta?.degraded) {
      expect(body.hashtags.length).toBeGreaterThan(0);
    }
  });
});
