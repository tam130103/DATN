import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.resolve(currentDir, '../../playwright/.auth');
const authFile = path.join(authDir, 'user.json');
const userMetaFile = path.join(authDir, 'user-meta.json');

setup('register authenticated smoke user', async ({ page }) => {
  const timestamp = Date.now();
  const user = {
    email: `smoke-${timestamp}@example.com`,
    password: 'SmokeTest123!',
    name: `Smoke User ${timestamp}`,
  };

  await page.goto('/register');
  await page.getByTestId('register-email').fill(user.email);
  await page.getByTestId('register-name').fill(user.name);
  await page.getByTestId('register-password').fill(user.password);
  await page.getByTestId('register-confirm-password').fill(user.password);
  await page.getByTestId('register-submit').click();

  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByTestId('create-post-form')).toBeVisible();

  await fs.mkdir(authDir, { recursive: true });
  await page.context().storageState({ path: authFile });
  await fs.writeFile(userMetaFile, JSON.stringify(user, null, 2), 'utf8');
});
