import { test, expect } from "@playwright/test";

/**
 * HP-09、HP-11。只在 KP_HOME_ENABLED=true 的行程跑（E2E_CITY_HOME=1）。
 * 旗標關閉的首頁由既有 homepage-groups.spec.ts 覆蓋，這支檔案會整組跳過。
 */
test.describe("學習城市首頁", () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_CITY_HOME, "KP_HOME_ENABLED 沒開");
  });

  test("預設是分層分段總圖，點頁籤才換到地圖和清單", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("全家一起看的知識地圖");
    await expect(page.getByTestId("city-layers")).toBeVisible();
    await expect(page.getByTestId("city-map")).toBeHidden();
    await expect(page.getByRole("group", { name: "切換檢視" }).getByRole("button")).toHaveText([
      "分層分段總圖",
      "知識地圖",
      "清單",
    ]);
    await expect(page.getByTestId("city-progress-notice")).toContainText("範例資料");
    await expect(page.getByTestId("section-knowledge")).toBeVisible();
    await expect(page.getByTestId("section-kid")).toBeVisible();
    await expect(page.getByTestId("section-game")).toBeVisible();

    await page.getByTestId("city-layers").getByRole("button", { name: /大事拆成小事/ }).first().click();
    const card = page.getByTestId("city-card");
    await expect(card).toContainText("大事拆成小事");
    await expect(card).toContainText("國小");
    await expect(card).toContainText("本質層");
    await expect(card.getByRole("heading", { name: "先備" })).toBeVisible();
    await expect(card.getByRole("heading", { name: "被依賴" })).toBeVisible();
    await expect(card.getByRole("link", { name: "讀這一站" })).toBeVisible();

    await page.getByTestId("city-path").selectOption("pm.estimate");
    await expect(page.getByTestId("city-layers").getByRole("button", { name: /大事拆成小事/ }).first()).toHaveAttribute("data-on-path", "1");

    await page.getByRole("group", { name: "層級" }).getByRole("button", { name: "本質層" }).click();
    await expect(page.getByTestId("city-filter")).toContainText("本質層");
    await page.getByRole("group", { name: "領域與階段" }).getByRole("button", { name: /專案管理與領導/ }).click();
    await expect(page.getByTestId("city-filter")).toContainText("專案管理與領導");

    await page.getByTestId("city-view-map").click();
    await expect(page).toHaveURL(/[?&]view=map(?:&|$)/);
    await expect(page.getByTestId("city-map")).toBeVisible();
    await page.getByTestId("city-view-list").click();
    await expect(page).toHaveURL(/[?&]view=list(?:&|$)/);
    await expect(page.getByTestId("city-list")).toBeVisible();
    await page.getByTestId("city-view-system").click();
    await expect(page).not.toHaveURL(/[?&]view=/);
    await expect(page.getByTestId("city-layers")).toBeVisible();
  });

  test("深連結還能打開總圖、地圖、清單，階段篩選留著", async ({ page }) => {
    await page.goto("/?view=system");
    await expect(page.getByTestId("city-layers")).toBeVisible();
    await page.goto("/?view=map");
    await expect(page.getByTestId("city-map")).toBeVisible();
    await page.goto("/?view=city");
    await expect(page.getByTestId("city-map")).toBeVisible();
    await page.goto("/?view=list");
    await expect(page.getByTestId("city-list")).toBeVisible();
    await page.goto("/?s=es");
    await expect(page.getByTestId("city-layers")).toBeVisible();
    await expect(page.getByTestId("city-filter")).toContainText("國小");
    await page.goto("/?d=pm-leadership");
    await expect(page.getByTestId("city-filter")).toContainText("專案管理與領導");
    await page.goto("/?d=pm-leadership&s=sh");
    await expect(page.getByTestId("city-filter")).toContainText("高中");
    await page.goto("/?d=pm-leadership&s=sh&kp=pm.estimate@sh");
    await expect(page.getByTestId("city-card")).toContainText("WBS 與三點估算");
    await page.getByTestId("city-card").getByRole("link", { name: "讀這一站" }).click();
    await expect(page).toHaveURL(/\/kp\/pm\.estimate\/sh/);
  });

  test("英雄的連結點了就切換，不用整頁重載", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("city-layers")).toBeVisible();

    await page.getByRole("link", { name: "看分層分段總圖" }).click();
    await expect(page).toHaveURL(/[?&]view=system(?:&|$)/);
    await expect(page.getByTestId("city-layers")).toBeVisible();

    await page.getByRole("link", { name: "帶孩子從國小階段看起" }).click();
    await expect(page).toHaveURL(/[?&]view=map(?:&|$)/);
    await expect(page).toHaveURL(/[?&]s=es(?:&|$)/);
    await expect(page.getByTestId("city-filter")).toContainText("國小");
    await expect(page.getByTestId("city-map")).toBeVisible();

    await page.getByRole("link", { name: "看清單", exact: true }).click();
    await expect(page).toHaveURL(/[?&]view=list(?:&|$)/);
    await expect(page.getByTestId("city-list")).toBeVisible();
  });

  test("手機寬度從總圖打開知識點，換到地圖仍走學區卡", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByTestId("city-layers")).toBeVisible();
    await page.getByTestId("city-layers").getByRole("button", { name: /大事拆成小事/ }).first().click();
    await page.getByTestId("city-card").getByRole("link", { name: "讀這一站" }).click();
    await expect(page).toHaveURL(/\/kp\/pm\.breakdown\/es/);

    await page.goto("/");
    await page.getByTestId("city-view-map").click();
    await page.getByTestId("city-mobile").getByRole("button", { name: /專案管理與領導/ }).click();
    await page.getByTestId("city-mobile").getByRole("button", { name: /大事拆成小事/ }).click();
    await expect(page.getByTestId("city-card")).toContainText("大事拆成小事");
  });
});
