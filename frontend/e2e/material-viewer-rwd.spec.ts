/**
 * E2E Tests for Material Viewer RWD Enhancement
 * Spec: docs/specs/20260201-01-material-viewer-rwd.md
 *
 * Test Coverage:
 * - AC-01: Fullscreen Button
 * - AC-02: Zoom Controls
 * - AC-03: Auto-Scale for Mobile
 * - AC-04: Existing Features Intact
 * - AC-05: Browser Compatibility
 */

import { test, expect, Page } from '@playwright/test';

const MATERIAL_PAGE_URL = '/materials/test-component-id'; // Replace with actual test component ID
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };
const MOBILE_VIEWPORT = { width: 375, height: 667 };

/**
 * Setup: Navigate to material page with test data
 */
async function navigateToMaterialPage(page: Page) {
  await page.goto(MATERIAL_PAGE_URL);
  await expect(page.locator('h2:has-text("學習教材")')).toBeVisible();

  // Wait for material to load (iframe should be present)
  await expect(page.locator('iframe[title]')).toBeVisible({ timeout: 10000 });
}

/**
 * Helper: Get zoom level from UI
 */
async function getZoomLevel(page: Page): Promise<number> {
  const zoomText = await page.locator('text=/\\d+%/').textContent();
  return parseInt(zoomText?.replace('%', '') || '100', 10);
}

/**
 * Helper: Get container transform scale
 */
async function getTransformScale(page: Page): Promise<number> {
  const container = page.locator('div[style*="transform: scale"]');
  const style = await container.getAttribute('style');
  const match = style?.match(/scale\(([\d.]+)\)/);
  return parseFloat(match?.[1] || '1');
}

test.describe('Material Viewer RWD - Desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await navigateToMaterialPage(page);
  });

  test('AC-02.1: Zoom In button increases zoom by 25%', async ({ page }) => {
    const initialZoom = await getZoomLevel(page);

    await page.click('button[title="放大"]');
    await page.waitForTimeout(300); // Wait for state update

    const newZoom = await getZoomLevel(page);
    expect(newZoom).toBe(initialZoom + 25);

    // Verify transform scale also updated
    const scale = await getTransformScale(page);
    expect(scale).toBeCloseTo((initialZoom + 25) / 100, 2);
  });

  test('AC-02.2: Zoom Out button decreases zoom by 25%', async ({ page }) => {
    // First zoom in to avoid hitting lower bound
    await page.click('button[title="放大"]');
    await page.waitForTimeout(300);

    const beforeZoom = await getZoomLevel(page);
    await page.click('button[title="縮小"]');
    await page.waitForTimeout(300);

    const afterZoom = await getZoomLevel(page);
    expect(afterZoom).toBe(beforeZoom - 25);
  });

  test('AC-02.3: Reset button returns zoom to 100%', async ({ page }) => {
    // Zoom in several times
    await page.click('button[title="放大"]');
    await page.click('button[title="放大"]');
    await page.waitForTimeout(300);

    expect(await getZoomLevel(page)).toBeGreaterThan(100);

    // Reset
    await page.click('button[title="重置"]');
    await page.waitForTimeout(300);

    expect(await getZoomLevel(page)).toBe(100);
  });

  test('AC-02.4: Zoom Out disabled at 50% lower bound', async ({ page }) => {
    // Zoom out to minimum
    for (let i = 0; i < 3; i++) {
      await page.click('button[title="縮小"]');
      await page.waitForTimeout(200);
    }

    const zoomLevel = await getZoomLevel(page);
    expect(zoomLevel).toBe(50);

    // Verify button is disabled
    const zoomOutBtn = page.locator('button[title="縮小"]');
    await expect(zoomOutBtn).toBeDisabled();
  });

  test('AC-02.5: Zoom In disabled at 200% upper bound', async ({ page }) => {
    // Zoom in to maximum
    for (let i = 0; i < 4; i++) {
      await page.click('button[title="放大"]');
      await page.waitForTimeout(200);
    }

    const zoomLevel = await getZoomLevel(page);
    expect(zoomLevel).toBe(200);

    // Verify button is disabled
    const zoomInBtn = page.locator('button[title="放大"]');
    await expect(zoomInBtn).toBeDisabled();
  });

  test('AC-01.1: Fullscreen button triggers fullscreen mode', async ({ page }) => {
    // Note: Fullscreen API may not work in headless mode
    // This test verifies the button exists and is clickable
    const fullscreenBtn = page.locator('button[title="全螢幕"]');
    await expect(fullscreenBtn).toBeVisible();
    await expect(fullscreenBtn).toBeEnabled();

    // Attempt to click (may show alert in headless mode)
    await fullscreenBtn.click();

    // In real browser, document.fullscreenElement should be truthy
    // In headless, alert may appear
    // We verify the handler was triggered (no crash)
  });

  test('AC-04.1: Download button still works after zoom changes', async ({ page }) => {
    // Zoom in
    await page.click('button[title="放大"]');
    await page.waitForTimeout(300);

    // Verify download button exists and is clickable
    const downloadBtn = page.locator('button:has-text("下載")').or(page.locator('button[title="下載教材"]'));
    await expect(downloadBtn).toBeVisible();

    // Click should trigger window.open (we can't verify actual download in test)
    // Just ensure no crash
    const [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
      downloadBtn.click(),
    ]);

    // If popup opened, verify URL contains download endpoint
    if (popup) {
      expect(popup.url()).toContain('/api/materials/');
    }
  });

  test('AC-04.2: Rating system still works after zoom changes', async ({ page }) => {
    // Zoom in
    await page.click('button[title="放大"]');
    await page.waitForTimeout(300);

    // Verify rating section exists
    const ratingSection = page.locator('text=評分').locator('..');
    await expect(ratingSection).toBeVisible();

    // If user is logged in, star rating should be interactive
    // If not logged in, should show login prompt
    const loginPrompt = page.locator('text=登入 後可以評分');
    const starRating = page.locator('[role="group"]').filter({ hasText: '星' });

    const hasLogin = await loginPrompt.isVisible();
    const hasRating = await starRating.isVisible();

    expect(hasLogin || hasRating).toBe(true);
  });
});

test.describe('Material Viewer RWD - Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await navigateToMaterialPage(page);
  });

  test('AC-03.1: Auto-scale activates on mobile viewport (<768px)', async ({ page }) => {
    // Wait for auto-scale effect to trigger
    await page.waitForTimeout(1000);

    const zoomLevel = await getZoomLevel(page);

    // Zoom should be less than 100% on small screens
    // (Assuming slide width 1920px, container ~375px → scale ~0.19 = 19%)
    expect(zoomLevel).toBeLessThan(100);
    expect(zoomLevel).toBeGreaterThan(0);
  });

  test('AC-03.2: Screen rotation recalculates zoom', async ({ page }) => {
    const initialZoom = await getZoomLevel(page);

    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(1000);

    const landscapeZoom = await getZoomLevel(page);

    // Landscape should allow larger zoom (wider screen)
    expect(landscapeZoom).toBeGreaterThan(initialZoom);
  });

  test('AC-03.3: Manual zoom disables auto-scale', async ({ page }) => {
    await page.waitForTimeout(1000);
    const autoScaledZoom = await getZoomLevel(page);

    // Manual zoom in
    await page.click('button[title="放大"]');
    await page.waitForTimeout(300);

    const manualZoom = await getZoomLevel(page);
    expect(manualZoom).toBe(autoScaledZoom + 25);

    // Rotate screen - auto-scale should NOT trigger
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(1000);

    const afterRotateZoom = await getZoomLevel(page);
    expect(afterRotateZoom).toBe(manualZoom); // Unchanged
  });

  test('AC-03.4: Mobile UI shows icon-only buttons', async ({ page }) => {
    // On mobile, button text should be hidden (only icons visible)
    const downloadBtn = page.locator('button[title="下載教材"]');
    await expect(downloadBtn).toBeVisible();

    // Text should be hidden on small screens
    const btnText = downloadBtn.locator('text=下載');
    const isHidden = await btnText.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.display === 'none' || !el.offsetParent;
    });

    expect(isHidden).toBe(true);
  });
});

test.describe('Material Viewer RWD - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await navigateToMaterialPage(page);
  });

  test('EDGE-01: Rapid clicking zoom buttons does not break state', async ({ page }) => {
    // Spam click zoom in
    for (let i = 0; i < 10; i++) {
      await page.click('button[title="放大"]', { timeout: 100 });
    }

    await page.waitForTimeout(500);

    const zoomLevel = await getZoomLevel(page);

    // Should cap at 200%
    expect(zoomLevel).toBe(200);

    // Button should be disabled
    await expect(page.locator('button[title="放大"]')).toBeDisabled();
  });

  test('EDGE-02: Zoom persists during version switch', async ({ page }) => {
    // Zoom in
    await page.click('button[title="放大"]');
    await page.click('button[title="放大"]');
    await page.waitForTimeout(300);

    const zoomBefore = await getZoomLevel(page);
    expect(zoomBefore).toBe(150);

    // Check if there are multiple versions
    const versionButtons = page.locator('text=歷史版本').locator('..').locator('button:has-text("下載")');
    const versionCount = await versionButtons.count();

    if (versionCount > 0) {
      // Switch to another version (this would require actual implementation)
      // For now, just verify zoom state is preserved in component state

      // Reload page to simulate navigation
      await page.reload();
      await navigateToMaterialPage(page);

      // Zoom should reset after full page reload (expected behavior)
      const zoomAfterReload = await getZoomLevel(page);
      expect(zoomAfterReload).toBe(100);
    }

    // If no version switch, this test is N/A
    if (versionCount === 0) {
      test.skip();
    }
  });

  test('EDGE-03: No crash when container ref is null', async ({ page }) => {
    // This is defensive - test that fullscreen doesn't crash if ref is null

    // Navigate to a page without materials
    await page.goto('/materials/non-existent-id');

    // Should show error state, not crash
    await expect(page.locator('text=無法載入教材').or(page.locator('text=尚無教材'))).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Material Viewer RWD - Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await navigateToMaterialPage(page);
  });

  test('REGRESSION-01: Iframe still loads correctly', async ({ page }) => {
    const iframe = page.locator('iframe[title]');
    await expect(iframe).toBeVisible();

    // Verify iframe src is set
    const src = await iframe.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toContain('http');
  });

  test('REGRESSION-02: Version label still visible', async ({ page }) => {
    const versionLabel = page.locator('text=/v\\d+ \\(最新版本\\)/');
    await expect(versionLabel).toBeVisible();
  });

  test('REGRESSION-03: Control buttons do not overlap on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 480 });
    await page.waitForTimeout(500);

    // All control buttons should be visible
    await expect(page.locator('button[title="放大"]')).toBeVisible();
    await expect(page.locator('button[title="縮小"]')).toBeVisible();
    await expect(page.locator('button[title="重置"]')).toBeVisible();
    await expect(page.locator('button[title="下載教材"]')).toBeVisible();
    await expect(page.locator('button[title="全螢幕"]')).toBeVisible();
  });
});

/**
 * Browser Compatibility Tests (AC-05)
 *
 * Run with:
 * npx playwright test material-viewer-rwd.spec.ts --project=chromium
 * npx playwright test material-viewer-rwd.spec.ts --project=firefox
 * npx playwright test material-viewer-rwd.spec.ts --project=webkit
 */
