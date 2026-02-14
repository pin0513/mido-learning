import { test, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 14'],
  baseURL: 'https://mido-learning-frontend-24mwb46hra-de.a.run.app'
});

test('production mobile zoom test', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const materialLink = page.locator('a[href*="/materials/"]').first();
  if (await materialLink.count() > 0) {
    await materialLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 找縮放百分比
    const zoomText = await page.locator('text=/\\d+%/').first().textContent();
    console.log('Zoom level:', zoomText);

    await page.screenshot({ path: 'test-results/prod-mobile-new.png', fullPage: true });
    console.log('Screenshot saved');
  }
});
