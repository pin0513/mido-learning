import { test, expect } from '@playwright/test';

test.describe('Homepage Category Groups', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('shows three category sections with correct headings', async ({ page }) => {
    // 三個 section 都可見
    await expect(page.locator('[data-testid="section-knowledge"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-kid"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-game"]')).toBeVisible();

    // 標題文字正確
    await expect(page.locator('[data-testid="section-knowledge"] h2')).toHaveText('知識學習');
    await expect(page.locator('[data-testid="section-kid"] h2')).toHaveText('小人學');
    await expect(page.locator('[data-testid="section-game"] h2')).toHaveText('遊戲類');
  });

  test('每個 section 都有查看全部連結，且指向正確 href', async ({ page }) => {
    // 知識學習 → /components
    const knowledgeLink = page.locator('[data-testid="section-knowledge"] a:has-text("查看全部")');
    await expect(knowledgeLink).toBeVisible();
    await expect(knowledgeLink).toHaveAttribute('href', '/components');

    // 小人學 → /categories/kid
    const kidLink = page.locator('[data-testid="section-kid"] a:has-text("查看全部")');
    await expect(kidLink).toBeVisible();
    await expect(kidLink).toHaveAttribute('href', '/categories/kid');

    // 遊戲類 → /categories/game
    const gameLink = page.locator('[data-testid="section-game"] a:has-text("查看全部")');
    await expect(gameLink).toBeVisible();
    await expect(gameLink).toHaveAttribute('href', '/categories/game');
  });

  test('瀏覽所有教材 button navigates to /components', async ({ page }) => {
    await page.locator('text=瀏覽所有教材').click();
    await expect(page).toHaveURL(/\/components/);
  });

  test('hero section 仍然存在', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('AI 驅動的');
    // hero 的「瀏覽教材」按鈕存在
    const heroBrowseLink = page.locator('a:has-text("瀏覽教材")').first();
    await expect(heroBrowseLink).toBeVisible();
  });
});
