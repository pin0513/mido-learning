import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

/**
 * HP-07、HP-08、HP-13。草稿建置 + KP_ENABLED=true。
 * 層級總圖與清單跟地圖共用選取；手機走學區卡片。
 */
test.describe("學習城市的三種檢視", () => {
  test("層級總圖的格數與選取會跟著清單走", async ({ page }) => {
    await page.goto("/kp");
    await expect(page.getByTestId("kp-layer-stage")).toBeVisible();
    await page.getByRole("link", { name: "層級總圖" }).click();
    await expect(page.getByTestId("city-layers")).toBeVisible();
    await expect(page.getByTestId("kp-layer-stage")).toHaveCount(0);
    const counts = await page.locator("td[data-count]").evaluateAll((nodes) =>
      nodes.map((node) => Number(node.getAttribute("data-count"))),
    );
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(100);
    await expect(page.locator('td[data-layer="essence"][data-stage="es"]')).toContainText("大事拆成小事");
    await expect(page.locator('td[data-layer="applied"][data-stage="es"]')).toContainText("還沒有知識點");

    await page.locator('td[data-layer="essence"][data-stage="es"]').getByRole("button", { name: /大事拆成小事/ }).click();
    await expect(page.getByTestId("city-card")).toContainText("大事拆成小事");
    await expect(page.getByTestId("city-filter")).toContainText("專案管理與領導");
    await page.getByTestId("city-view-list").click();
    await expect(page.getByTestId("city-list")).toBeVisible();
    await expect(page.getByTestId("city-card")).toContainText("大事拆成小事");
    await expect(page.getByTestId("city-filter")).toContainText("國小");
    await page.getByTestId("city-view-map").click();
    await expect(page.getByTestId("city-map")).toBeVisible();
    await expect(page.getByTestId("city-card")).toContainText("大事拆成小事");
  });

  test("鍵盤可以進入建築，axe 沒有 serious", async ({ page }) => {
    await page.goto("/kp/map");
    await page.locator('[data-building-id="pm.breakdown@es"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("city-card").getByRole("heading", { level: 2 })).toHaveText("大事拆成小事");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("city-card").getByRole("heading", { level: 2 })).toHaveText("知識地圖");

    const results = await new AxeBuilder({ page }).include('[data-testid="city-experience"]').analyze();
    const serious = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
    expect(serious.map((item) => `${item.id}: ${item.help}`)).toEqual([]);
  });

  test("375px 從學區卡片進到知識點，頁面不橫向捲動", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 });
    await page.goto("/kp/map");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByTestId("city-mobile")).toBeVisible();
    await page.getByTestId("city-mobile").getByRole("button", { name: /專案管理與領導/ }).click();
    await page.getByTestId("city-mobile").getByRole("button", { name: /大事拆成小事/ }).click();
    await page.getByTestId("city-card").getByRole("link", { name: "讀這一站" }).click();
    await expect(page).toHaveURL(/\/kp\/pm\.breakdown\/es/);
    const detailOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(detailOverflow).toBeLessThanOrEqual(1);
  });
});
