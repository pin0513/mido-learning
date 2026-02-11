import { test, devices, expect } from '@playwright/test';

test.use({ 
  ...devices['iPhone 14'],
  baseURL: 'https://mido-learning-frontend-24mwb46hra-de.a.run.app'
});

test('test zoom to 25%', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const materialLink = page.locator('a[href*="/materials/"]').first();
  await materialLink.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // 找到縮放百分比顯示
  const zoomDisplay = page.locator('text=/\\d+%/').first();
  console.log('Initial zoom:', await zoomDisplay.textContent());
  
  // 點擊縮小按鈕多次
  const zoomOutBtn = page.locator('button[title="縮小"]');
  
  for (let i = 0; i < 5; i++) {
    if (await zoomOutBtn.isEnabled()) {
      await zoomOutBtn.click();
      await page.waitForTimeout(300);
      console.log('After click', i + 1, ':', await zoomDisplay.textContent());
    } else {
      console.log('Button disabled at click', i + 1);
      break;
    }
  }
  
  await page.screenshot({ path: 'test-results/prod-zoom-25.png', fullPage: true });
});
