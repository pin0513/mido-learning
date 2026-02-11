import { test, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 14'],
  baseURL: 'http://localhost:3000'
});

test('mobile material viewer screenshot', async ({ page }) => {
  // 直接去首頁找教材
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // 找所有可點擊的教材卡片
  const cards = page.locator('[href*="/materials/"]');
  const count = await cards.count();
  console.log('Found material links:', count);
  
  if (count > 0) {
    await cards.first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/mobile-material.png', fullPage: true });
    console.log('Material screenshot saved');
  } else {
    // 嘗試找其他連結
    const allLinks = await page.locator('a').all();
    for (const link of allLinks.slice(0, 5)) {
      const href = await link.getAttribute('href');
      console.log('Link found:', href);
    }
    await page.screenshot({ path: 'test-results/mobile-home-debug.png', fullPage: true });
  }
});
