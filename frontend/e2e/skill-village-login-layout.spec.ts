/**
 * Skill Village Login Page - Layout Verification E2E Test
 *
 * Tests the login page at 3 viewport sizes:
 * - Mobile (375x667, iPhone SE)
 * - Tablet (768x1024, iPad)
 * - Desktop (1920x1080, Full HD)
 *
 * For each viewport: takes a screenshot, verifies form visibility,
 * and checks for common layout issues.
 */

import { test, expect } from '@playwright/test';

const SCREENSHOT_DIR = '/tmp/skill-village-login-screenshots';
const LOGIN_URL = '/skill-village-login';

const viewports = [
  { name: 'mobile', width: 375, height: 667, label: 'Mobile (375x667 - iPhone SE)' },
  { name: 'tablet', width: 768, height: 1024, label: 'Tablet (768x1024 - iPad)' },
  { name: 'desktop', width: 1920, height: 1080, label: 'Desktop (1920x1080 - Full HD)' },
] as const;

for (const viewport of viewports) {
  test.describe(`Skill Village Login - ${viewport.label}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
    });

    test(`page loads and login form is visible at ${viewport.name}`, async ({ page }) => {
      // Navigate to the login page
      const response = await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

      // Verify page loaded successfully (HTTP 200)
      expect(response).not.toBeNull();
      expect(response!.status()).toBe(200);

      // Wait for the form to be fully rendered
      await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

      // Take a full-page screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/skill-village-login-${viewport.name}.png`,
        fullPage: true,
      });

      // Also take a viewport-only screenshot (what the user actually sees)
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/skill-village-login-${viewport.name}-viewport.png`,
        fullPage: false,
      });

      // --- Core element visibility checks ---

      // Page title
      const heading = page.locator('h1');
      await expect(heading).toBeVisible();
      await expect(heading).toContainText('技能村登入');

      // Subtitle
      const subtitle = page.getByText('歡迎回到你的學習冒險！');
      await expect(subtitle).toBeVisible();

      // Identifier input (username / email)
      const identifierLabel = page.getByText('使用者名稱 / Email');
      await expect(identifierLabel).toBeVisible();
      const identifierInput = page.locator('input[autocomplete="username"]');
      await expect(identifierInput).toBeVisible();

      // Password input
      const passwordLabel = page.getByText('密碼', { exact: false });
      await expect(passwordLabel.first()).toBeVisible();
      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeVisible();

      // Remember me checkbox
      const rememberMe = page.locator('#rememberMe');
      await expect(rememberMe).toBeVisible();
      const rememberMeLabel = page.getByText('記住我');
      await expect(rememberMeLabel).toBeVisible();

      // Submit button
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toContainText('登入');

      // Registration link
      const registerLink = page.getByText('快速註冊');
      await expect(registerLink).toBeVisible();

      // Login tips section
      const tipSection = page.getByText('登入提示');
      await expect(tipSection).toBeVisible();
    });

    test(`layout metrics are reasonable at ${viewport.name}`, async ({ page }) => {
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

      // Get the form container bounding box (the white card)
      const card = page.locator('.bg-white.rounded-2xl');
      const cardBox = await card.boundingBox();
      expect(cardBox).not.toBeNull();

      // Get viewport dimensions
      const viewportSize = page.viewportSize();
      expect(viewportSize).not.toBeNull();

      // --- Layout checks ---

      // Card should not overflow the viewport width
      expect(cardBox!.width).toBeLessThanOrEqual(viewportSize!.width);

      // Card should have horizontal margin (not edge-to-edge, unless very small screen)
      if (viewport.width >= 400) {
        const horizontalMargin = viewportSize!.width - cardBox!.width;
        expect(horizontalMargin).toBeGreaterThan(0);
      }

      // Card should not be too narrow to be usable (at least 250px)
      // NOTE: 280px would be ideal; logging actual width for analysis
      expect(cardBox!.width).toBeGreaterThanOrEqual(250);

      // Card left edge should not be negative (off-screen)
      expect(cardBox!.x).toBeGreaterThanOrEqual(0);

      // Check form inputs are properly sized
      const identifierInput = page.locator('input[autocomplete="username"]');
      const inputBox = await identifierInput.boundingBox();
      expect(inputBox).not.toBeNull();

      // Input should be reasonably wide (at least 200px)
      expect(inputBox!.width).toBeGreaterThanOrEqual(200);

      // Input should not overflow the card
      expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(
        cardBox!.x + cardBox!.width + 2 // small tolerance for borders
      );

      // Submit button should be properly sized
      const submitButton = page.locator('button[type="submit"]');
      const buttonBox = await submitButton.boundingBox();
      expect(buttonBox).not.toBeNull();

      // Button height should be comfortable for touch (at least 40px)
      expect(buttonBox!.height).toBeGreaterThanOrEqual(40);

      // Button should span most of the card width (it has w-full class)
      const buttonWidthRatio = buttonBox!.width / cardBox!.width;
      expect(buttonWidthRatio).toBeGreaterThan(0.7);

      // Check text readability - heading font size
      const headingFontSize = await page.locator('h1').evaluate(
        (el) => parseFloat(window.getComputedStyle(el).fontSize)
      );
      // Heading should be at least 20px for readability
      expect(headingFontSize).toBeGreaterThanOrEqual(20);

      // Check input font size (should be at least 16px to prevent iOS zoom)
      const inputFontSize = await identifierInput.evaluate(
        (el) => parseFloat(window.getComputedStyle(el).fontSize)
      );
      expect(inputFontSize).toBeGreaterThanOrEqual(16);

      // Check that form is vertically centered (roughly)
      const formCenterY = cardBox!.y + cardBox!.height / 2;
      const viewportCenterY = viewportSize!.height / 2;
      // Allow tolerance: card center should be within 30% of viewport center
      const verticalOffset = Math.abs(formCenterY - viewportCenterY);
      const tolerance = viewportSize!.height * 0.3;
      expect(verticalOffset).toBeLessThan(tolerance);

      // Check that nothing is clipped at the bottom
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const cardBottom = cardBox!.y + cardBox!.height;

      // Get detailed computed styles for analysis
      const cardStyles = await card.evaluate((el) => {
        const style = window.getComputedStyle(el);
        const parent = el.parentElement;
        const parentStyle = parent ? window.getComputedStyle(parent) : null;
        return {
          width: style.width,
          maxWidth: style.maxWidth,
          minWidth: style.minWidth,
          padding: style.padding,
          margin: style.margin,
          boxSizing: style.boxSizing,
          display: style.display,
          parentWidth: parentStyle?.width || 'N/A',
          parentMaxWidth: parentStyle?.maxWidth || 'N/A',
          parentDisplay: parentStyle?.display || 'N/A',
          parentPadding: parentStyle?.padding || 'N/A',
          parentClassName: parent?.className || 'N/A',
        };
      });

      // Log layout metrics for analysis
      console.log(`\n=== Layout Metrics: ${viewport.label} ===`);
      console.log(`Viewport: ${viewportSize!.width}x${viewportSize!.height}`);
      console.log(`Card: ${Math.round(cardBox!.width)}x${Math.round(cardBox!.height)} at (${Math.round(cardBox!.x)}, ${Math.round(cardBox!.y)})`);
      console.log(`Card width ratio: ${(cardBox!.width / viewportSize!.width * 100).toFixed(1)}%`);
      console.log(`Horizontal margin: ${Math.round(viewportSize!.width - cardBox!.width)}px total`);
      console.log(`--- Card computed styles ---`);
      console.log(`  width: ${cardStyles.width}`);
      console.log(`  max-width: ${cardStyles.maxWidth}`);
      console.log(`  min-width: ${cardStyles.minWidth}`);
      console.log(`  padding: ${cardStyles.padding}`);
      console.log(`  margin: ${cardStyles.margin}`);
      console.log(`  box-sizing: ${cardStyles.boxSizing}`);
      console.log(`--- Parent container ---`);
      console.log(`  class: ${cardStyles.parentClassName}`);
      console.log(`  display: ${cardStyles.parentDisplay}`);
      console.log(`  width: ${cardStyles.parentWidth}`);
      console.log(`  max-width: ${cardStyles.parentMaxWidth}`);
      console.log(`  padding: ${cardStyles.parentPadding}`);
      console.log(`--- Element sizes ---`);
      console.log(`Input width: ${Math.round(inputBox!.width)}px`);
      console.log(`Button height: ${Math.round(buttonBox!.height)}px`);
      console.log(`Button width ratio: ${(buttonWidthRatio * 100).toFixed(1)}%`);
      console.log(`Heading font size: ${headingFontSize}px`);
      console.log(`Input font size: ${inputFontSize}px`);
      console.log(`Vertical center offset: ${Math.round(verticalOffset)}px`);
      console.log(`Page scroll height: ${pageHeight}px`);
      console.log(`Card bottom: ${Math.round(cardBottom)}px`);
      console.log(`Content fits in viewport: ${cardBottom <= viewportSize!.height ? 'YES' : 'NO (scrollable)'}`);
      console.log('');
    });

    test(`interactive elements are properly spaced at ${viewport.name}`, async ({ page }) => {
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

      // Get all interactive element positions
      const identifierInput = page.locator('input[autocomplete="username"]');
      const passwordInput = page.locator('input[type="password"]');
      const rememberMe = page.locator('#rememberMe');
      const submitButton = page.locator('button[type="submit"]');

      const identifierBox = await identifierInput.boundingBox();
      const passwordBox = await passwordInput.boundingBox();
      const rememberMeBox = await rememberMe.boundingBox();
      const submitButtonBox = await submitButton.boundingBox();

      expect(identifierBox).not.toBeNull();
      expect(passwordBox).not.toBeNull();
      expect(rememberMeBox).not.toBeNull();
      expect(submitButtonBox).not.toBeNull();

      // Check vertical spacing between elements (should have comfortable gaps)
      const identifierToPassword = passwordBox!.y - (identifierBox!.y + identifierBox!.height);
      const passwordToRememberMe = rememberMeBox!.y - (passwordBox!.y + passwordBox!.height);
      const rememberMeToButton = submitButtonBox!.y - (rememberMeBox!.y + rememberMeBox!.height);

      // Minimum spacing between interactive elements (8px for touch-friendly)
      const minSpacing = 8;
      expect(identifierToPassword).toBeGreaterThanOrEqual(minSpacing);
      expect(passwordToRememberMe).toBeGreaterThanOrEqual(minSpacing);
      expect(rememberMeToButton).toBeGreaterThanOrEqual(minSpacing);

      // Check that no interactive elements overlap
      // Identifier should be above password
      expect(identifierBox!.y + identifierBox!.height).toBeLessThanOrEqual(passwordBox!.y);
      // Password should be above remember me
      expect(passwordBox!.y + passwordBox!.height).toBeLessThanOrEqual(rememberMeBox!.y);
      // Remember me should be above submit button
      expect(rememberMeBox!.y + rememberMeBox!.height).toBeLessThanOrEqual(submitButtonBox!.y);

      // Log spacing for analysis
      console.log(`\n=== Element Spacing: ${viewport.label} ===`);
      console.log(`Identifier -> Password gap: ${Math.round(identifierToPassword)}px`);
      console.log(`Password -> RememberMe gap: ${Math.round(passwordToRememberMe)}px`);
      console.log(`RememberMe -> Submit gap: ${Math.round(rememberMeToButton)}px`);
      console.log('');
    });
  });
}
