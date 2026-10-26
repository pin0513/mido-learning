import { test, expect } from "@playwright/test";

/**
 * HP-09、HP-11。只在 KP_HOME_ENABLED=true 的行程跑（E2E_CITY_HOME=1）。
 * 旗標關閉的首頁由既有 homepage-groups.spec.ts 覆蓋，這支檔案會整組跳過。
 */
test.describe("學習城市首頁", () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_CITY_HOME, "KP_HOME_ENABLED 沒開");
  });

  test("地圖是預設檢視，投影片區還在，可以切到層級總圖與清單", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("全家一起走的學習城市");
    await expect(page.getByTestId("city-map")).toBeVisible();
    await expect(page.getByTestId("city-progress-notice")).toContainText("範例資料");
    await expect(page.getByTestId("section-knowledge")).toBeVisible();
    await expect(page.getByTestId("section-kid")).toBeVisible();
    await expect(page.getByTestId("section-game")).toBeVisible();

    await page.getByTestId("city-view-system").click();
    await expect(page.getByTestId("city-layers")).toBeVisible();
    await page.getByTestId("city-view-list").click();
    await expect(page.getByTestId("city-list")).toBeVisible();
    await page.goto("/");
    await expect(page.getByTestId("city-list")).toBeVisible();
    await page.getByTestId("city-view-map").click();
    await expect(page.getByTestId("city-map")).toBeVisible();
  });

  test("從這裡開始落到環路，建築卡進得了知識點", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "帶孩子從國小環出發" }).click();
    await expect(page).toHaveURL(/[?&]s=es/);
    await page.goto("/?d=pm-leadership");
    await expect(page.getByTestId("city-filter")).toContainText("專案管理與領導");
    await page.goto("/?d=pm-leadership&s=sh");
    await expect(page.getByTestId("city-filter")).toContainText("高中");
    await page.goto("/?d=pm-leadership&s=sh&kp=pm.estimate@sh");
    await expect(page.getByTestId("city-card")).toContainText("WBS 與三點估算");
    await page.getByTestId("city-card").getByRole("link", { name: "讀這一站" }).click();
    await expect(page).toHaveURL(/\/kp\/pm\.estimate\/sh/);
  });

  test("手機寬度三步內打開知識點", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByTestId("city-mobile").getByRole("button", { name: /專案管理與領導/ }).click();
    await page.getByTestId("city-mobile").getByRole("button", { name: /大事拆成小事/ }).click();
    await page.getByTestId("city-card").getByRole("link", { name: "讀這一站" }).click();
    await expect(page).toHaveURL(/\/kp\/pm\.breakdown\/es/);
  });
});
