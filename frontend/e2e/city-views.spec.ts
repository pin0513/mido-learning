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

  test("範例家人有看得見的名牌，而且名牌不壓到節點與標籤", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/kp/map", { waitUntil: "networkidle" });
    const tags = page.getByTestId("city-person-tag");
    await expect(tags).toHaveCount(2);
    await expect(tags.locator("text")).toHaveText(["孩子", "大人"]);
    const hits = await page.evaluate(() => {
      const svg = document.querySelector('[data-testid="city-map"]');
      if (!svg) return -1;
      const ov = (a: DOMRect, b: DOMRect) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
      const boxes = [...svg.querySelectorAll('[data-testid="city-person-tag"] rect')].map((rect) => rect.getBoundingClientRect());
      const others = [...svg.querySelectorAll(".bld, .bld-d, .lbl text, .ringlbl text")].map((node) => node.getBoundingClientRect());
      return boxes.reduce((count, box) => count + others.filter((other) => ov(box, other)).length, 0) + (ov(boxes[0], boxes[1]) ? 1 : 0);
    });
    expect(hits).toBe(0);
  });

  test("放大到一圈或一個學區時，學門標籤不會被切一半", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const query of ["?s=es", "?s=jh", "?s=sh", "?s=uni", "?d=math", "?d=philosophy&s=uni"]) {
      await page.goto(`/kp/map${query}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const clipped = await page.evaluate(() => {
        const svg = document.querySelector('[data-testid="city-map"]');
        if (!svg) return ["no map"];
        const frame = svg.getBoundingClientRect();
        return [...svg.querySelectorAll(".lbl text, .ringlbl text")]
          .filter((node) => getComputedStyle(node).visibility !== "hidden")
          .filter((node) => {
            const box = node.getBoundingClientRect();
            return box.left < frame.left - 0.5 || box.right > frame.right + 0.5 || box.top < frame.top - 0.5 || box.bottom > frame.bottom + 0.5;
          })
          .map((node) => node.textContent);
      });
      expect(clipped, query).toEqual([]);
    }
    // 只選學區：自己的學門標籤整個看得到；最外圈：四個學門標籤都在。
    await page.goto("/kp/map?d=math", { waitUntil: "networkidle" });
    await expect(page.locator('[data-testid="city-district-label"][data-district="math"]')).not.toHaveAttribute("visibility", "hidden");
    await page.goto("/kp/map?s=uni", { waitUntil: "networkidle" });
    await expect(page.locator('[data-testid="city-district-label"]:not([visibility="hidden"])')).toHaveCount(4);
  });

  test("手機版選了學區：小地圖在清單上面，階段一次展開一段", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/kp/map", { waitUntil: "networkidle" });
    await page.getByTestId("city-mobile").getByRole("button", { name: /^專案管理與領導（/ }).click();
    const map = page.getByTestId("city-map");
    const mobile = page.getByTestId("city-mobile");
    await expect(map).toBeVisible();
    const mapBox = await map.boundingBox();
    const listBox = await mobile.boundingBox();
    expect(mapBox && listBox && mapBox.y + mapBox.height <= listBox.y + 1).toBe(true);
    expect(mapBox && mapBox.x >= 0 && mapBox.x + mapBox.width <= 390 + 1).toBe(true);
    const stages = mobile.getByTestId("city-mobile-stage");
    await expect(stages.locator("button[aria-expanded]")).toHaveCount(4);
    await expect(stages.locator('button[aria-expanded="true"]')).toHaveCount(1);
    await expect(mobile.locator('[data-stage="es"] button[aria-expanded="true"]')).toHaveCount(1);
    await expect(mobile.locator('[data-stage="jh"] li')).toHaveCount(0);
    await mobile.locator('[data-stage="jh"] button[aria-expanded]').click();
    await expect(page).toHaveURL(/[?&]s=jh/);
    await expect(mobile.locator('[data-stage="jh"] button[aria-expanded="true"]')).toHaveCount(1);
    await expect(mobile.locator('[data-stage="es"] li')).toHaveCount(0);
    expect(await mobile.locator('[data-stage="jh"] li').count()).toBeGreaterThan(0);
    // 再點一次收起來。
    await mobile.locator('[data-stage="jh"] button[aria-expanded]').click();
    await expect(stages.locator('button[aria-expanded="true"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });
});
