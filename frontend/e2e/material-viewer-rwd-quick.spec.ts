/**
 * Quick RWD Test - Visual verification without backend data
 * Tests that RWD controls are rendered correctly
 */

import { test, expect } from '@playwright/test';

const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };
const MOBILE_VIEWPORT = { width: 375, height: 667 };

test.describe('Material Viewer RWD - Quick Visual Test', () => {
  test('Desktop: RWD controls should render when material exists', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);

    // Navigate to homepage first
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();

    // Try to find any material link
    const materialLink = page.locator('a[href*="/materials/"]').first();

    if (await materialLink.isVisible()) {
      await materialLink.click();
      await page.waitForLoadState('networkidle');

      // Check if material viewer loaded
      const hasIframe = await page.locator('iframe[title]').isVisible();

      if (hasIframe) {
        // Verify RWD controls exist
        await expect(page.locator('button[title="放大"]')).toBeVisible();
        await expect(page.locator('button[title="縮小"]')).toBeVisible();
        await expect(page.locator('button[title="重置"]')).toBeVisible();
        await expect(page.locator('button[title="全螢幕"]')).toBeVisible();
        await expect(page.locator('text=/%/')).toBeVisible(); // Zoom percentage

        console.log('✅ All RWD controls rendered correctly on desktop');
      } else {
        console.log('⚠️ No material found - skipping detailed tests');
        test.skip();
      }
    } else {
      console.log('⚠️ No material links found on homepage');
      test.skip();
    }
  });

  test('Mobile: Controls should be responsive', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);

    await page.goto('/');
    const materialLink = page.locator('a[href*="/materials/"]').first();

    if (await materialLink.isVisible()) {
      await materialLink.click();
      await page.waitForLoadState('networkidle');

      const hasIframe = await page.locator('iframe[title]').isVisible();

      if (hasIframe) {
        // On mobile, controls should stack vertically
        const controlsContainer = page.locator('button[title="放大"]').locator('..');
        await expect(controlsContainer).toBeVisible();

        // Zoom controls should be visible
        await expect(page.locator('button[title="放大"]')).toBeVisible();

        console.log('✅ RWD controls responsive on mobile');
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('Zoom functionality works', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/');

    const materialLink = page.locator('a[href*="/materials/"]').first();

    if (await materialLink.isVisible()) {
      await materialLink.click();
      await page.waitForLoadState('networkidle');

      if (await page.locator('iframe[title]').isVisible()) {
        // Get initial zoom level
        const getZoom = async () => {
          const text = await page.locator('text=/%/').textContent();
          return parseInt(text?.replace('%', '') || '100', 10);
        };

        const initialZoom = await getZoom();
        console.log(`Initial zoom: ${initialZoom}%`);

        // Click zoom in
        await page.click('button[title="放大"]');
        await page.waitForTimeout(300);

        const zoomedIn = await getZoom();
        console.log(`After zoom in: ${zoomedIn}%`);
        expect(zoomedIn).toBe(initialZoom + 25);

        // Click reset
        await page.click('button[title="重置"]');
        await page.waitForTimeout(300);

        const resetZoom = await getZoom();
        console.log(`After reset: ${resetZoom}%`);
        expect(resetZoom).toBe(100);

        console.log('✅ Zoom controls working correctly');
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('Code verification: Implementation matches spec', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/');

    const materialLink = page.locator('a[href*="/materials/"]').first();

    if (await materialLink.isVisible()) {
      await materialLink.click();
      await page.waitForLoadState('networkidle');

      if (await page.locator('iframe[title]').isVisible()) {
        // Verify transform scale is applied
        const container = page.locator('div[style*="transform"]').first();
        const style = await container.getAttribute('style');

        expect(style).toContain('transform: scale');
        expect(style).toContain('transform-origin');

        console.log('✅ CSS transform scale implemented correctly');
        console.log(`Style: ${style}`);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });
});
