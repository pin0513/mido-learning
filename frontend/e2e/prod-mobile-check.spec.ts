import { test, devices } from '@playwright/test';

test.use({ 
  ...devices['iPhone 14'],
  baseURL: 'https://mido-learning-frontend-24mwb46hra-de.a.run.app'
});

test('production mobile material viewer', async ({ page }) => {
  // 去首頁
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // 找教材連結
  const materialLink = page.locator('a[href*="/materials/"]').first();
  if (await materialLink.count() > 0) {
    await materialLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/prod-mobile-material.png', fullPage: true });
    console.log('Production screenshot saved');
  }
});
