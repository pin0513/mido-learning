import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || '';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';
const API_URL = process.env.E2E_API_URL || 'https://mido-learning-api-24mwb46hra-de.a.run.app';

// Helper: Create a minimal valid ZIP file with index.html
async function createTestZip(version: number = 1): Promise<string> {
  const AdmZip = (await import('adm-zip')).default;
  const zip = new AdmZip();

  const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Test Material v${version}</title></head>
<body>
  <h1>Test Material Version ${version}</h1>
  <p>This is a test material for E2E testing.</p>
</body>
</html>`;

  zip.addFile('index.html', Buffer.from(htmlContent, 'utf8'));

  const zipPath = path.join('/tmp', `test-material-v${version}-${Date.now()}.zip`);
  zip.writeZip(zipPath);

  return zipPath;
}

// Helper: Login
async function login(page: Page) {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error('E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set');
  }

  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

// Helper: Create component via UI
async function createComponent(page: Page, title: string): Promise<string> {
  await page.goto('/teacher/components/upload');

  // Fill form
  await page.fill('#title', title);
  await page.fill('#subject', 'E2E Test Subject');

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to edit page and extract component ID
  await page.waitForURL('**/teacher/components/*/edit', { timeout: 15000 });
  const url = page.url();
  const match = url.match(/\/teacher\/components\/([^/]+)\/edit/);
  if (!match) throw new Error('Could not extract component ID from URL');

  return match[1];
}

test.describe('Material Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create component and upload material', async ({ page }) => {
    // Create test ZIP
    const zipPath = await createTestZip(1);

    try {
      // Go to upload page
      await page.goto('/teacher/components/upload');

      // Fill form
      const title = `E2E Test ${Date.now()}`;
      await page.fill('#title', title);
      await page.fill('#subject', 'E2E Test Subject');

      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(zipPath);

      // Wait for file to be selected
      await expect(page.locator('text=test-material')).toBeVisible({ timeout: 5000 });

      // Submit
      await page.click('button[type="submit"]');

      // Wait for redirect to edit page
      await page.waitForURL('**/teacher/components/*/edit', { timeout: 30000 });

      // Verify material is shown
      await expect(page.locator('text=v1')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=latest')).toBeVisible();
    } finally {
      // Cleanup
      fs.unlinkSync(zipPath);
    }
  });

  test('should view material in iframe', async ({ page }) => {
    // Create component first
    const componentId = await createComponent(page, `View Test ${Date.now()}`);

    // Upload material
    const zipPath = await createTestZip(1);
    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(zipPath);
      await expect(page.locator('text=v1')).toBeVisible({ timeout: 30000 });

      // Click view button
      await page.click('text=檢視');

      // Wait for material viewer page
      await page.waitForURL(`**/components/${componentId}/materials/*`, { timeout: 10000 });

      // Verify iframe exists
      await expect(page.locator('iframe')).toBeVisible({ timeout: 10000 });
    } finally {
      fs.unlinkSync(zipPath);
    }
  });

  test('should upload v2 and show version increment', async ({ page }) => {
    // Create component
    const componentId = await createComponent(page, `Version Test ${Date.now()}`);

    // Upload v1
    const zipPath1 = await createTestZip(1);
    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(zipPath1);
      await expect(page.locator('text=v1')).toBeVisible({ timeout: 30000 });
    } finally {
      fs.unlinkSync(zipPath1);
    }

    // Upload v2
    const zipPath2 = await createTestZip(2);
    try {
      // Click upload button again
      await page.click('text=上傳新版本');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(zipPath2);

      // Wait for v2 to appear
      await expect(page.locator('text=v2')).toBeVisible({ timeout: 30000 });

      // v2 should be latest
      const v2Row = page.locator('text=v2').first().locator('..');
      await expect(v2Row.locator('text=latest')).toBeVisible();
    } finally {
      fs.unlinkSync(zipPath2);
    }
  });

  test('should delete material version', async ({ page }) => {
    // Create component with 2 versions
    const componentId = await createComponent(page, `Delete Test ${Date.now()}`);

    // Upload v1
    const zipPath1 = await createTestZip(1);
    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(zipPath1);
      await expect(page.locator('text=v1')).toBeVisible({ timeout: 30000 });
    } finally {
      fs.unlinkSync(zipPath1);
    }

    // Upload v2
    const zipPath2 = await createTestZip(2);
    try {
      await page.click('text=上傳新版本');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(zipPath2);
      await expect(page.locator('text=v2')).toBeVisible({ timeout: 30000 });
    } finally {
      fs.unlinkSync(zipPath2);
    }

    // Delete v2 (latest can be deleted since we have v1)
    page.on('dialog', dialog => dialog.accept());
    await page.click('text=刪除');

    // v2 should disappear
    await expect(page.locator('text=v2')).not.toBeVisible({ timeout: 10000 });

    // v1 should still exist
    await expect(page.locator('text=v1')).toBeVisible();
  });
});
