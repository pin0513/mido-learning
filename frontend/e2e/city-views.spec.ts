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
    // 引線（如果有）每一段都不碰到別的節點：沿線每 1px 取一點，離節點外框至少 2px。
    const leaderHits = await page.evaluate(() => {
      const svg = document.querySelector('[data-testid="city-map"]');
      if (!svg) return ["no map"];
      const nodes = [...svg.querySelectorAll(".bld, .bld-d")].map((node) => node.getBoundingClientRect());
      const out: string[] = [];
      for (const line of svg.querySelectorAll<SVGPolylineElement>('[data-testid="city-person-leader"]')) {
        const matrix = line.getScreenCTM();
        if (!matrix) continue;
        const points = [...line.points].map((point) => new DOMPoint(point.x, point.y).matrixTransform(matrix));
        const length = line.getTotalLength();
        const start = points[0];
        // 起點那棟（自己）不算。
        const own = nodes.filter((box) => start.x > box.left - 12 && start.x < box.right + 12 && start.y > box.top - 12 && start.y < box.bottom + 12);
        for (let distance = 0; distance <= length; distance += 1) {
          const local = line.getPointAtLength(distance);
          const point = new DOMPoint(local.x, local.y).matrixTransform(matrix);
          for (const box of nodes) {
            if (own.includes(box)) continue;
            if (point.x > box.left - 2 && point.x < box.right + 2 && point.y > box.top - 2 && point.y < box.bottom + 2) out.push(`${Math.round(point.x)},${Math.round(point.y)}`);
          }
        }
      }
      return out;
    });
    expect(leaderHits).toEqual([]);
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

  test("手機版直接打開 ?d=language：小地圖一出現就是整個圓，不先閃一下放大的視野", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // 每個 animation frame 記下地圖看得見時的 viewBox（從頁面一開始就記）。
    await page.addInitScript(() => {
      const seen: string[] = [];
      (window as unknown as { __cityBoxes: string[] }).__cityBoxes = seen;
      const tick = () => {
        const svg = document.querySelector('[data-testid="city-map"]');
        const box = svg?.getAttribute("viewBox");
        if (svg && box && svg.getBoundingClientRect().width > 0 && seen.at(-1) !== box) seen.push(box);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto("/kp/map?d=language", { waitUntil: "networkidle" });
    await expect(page.getByTestId("city-map")).toBeVisible();
    await page.waitForTimeout(500);
    const boxes = await page.evaluate(() => (window as unknown as { __cityBoxes: string[] }).__cityBoxes);
    expect(boxes.length).toBeGreaterThan(0);
    // 只出現過一個視野：整個圓（正方形）。
    expect(new Set(boxes).size).toBe(1);
    const [, , w, h] = boxes[0].split(" ").map(Number);
    expect(Math.abs(w - h)).toBeLessThan(0.5);
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
    // 整個輪子都在小地圖與畫面裡（留白至少 8px），左右置中；小地圖上不放名牌。
    const wheel = await page.evaluate(() => {
      const svg = document.querySelector('[data-testid="city-map"]');
      if (!svg) return null;
      const frame = svg.getBoundingClientRect();
      const boxes = [...svg.querySelectorAll(".bld, .bld-d, .plaza, circle")].map((node) => node.getBoundingClientRect()).filter((box) => box.width > 0);
      const left = Math.min(...boxes.map((box) => box.left));
      const right = Math.max(...boxes.map((box) => box.right));
      const top = Math.min(...boxes.map((box) => box.top));
      const bottom = Math.max(...boxes.map((box) => box.bottom));
      const tags = [...svg.querySelectorAll('[data-testid="city-person-tag"]')].filter((node) => getComputedStyle(node).display !== "none").length;
      return { left, right, top, bottom, frame: { left: frame.left, right: frame.right, top: frame.top, bottom: frame.bottom }, width: window.innerWidth, tags };
    });
    expect(wheel).not.toBeNull();
    if (wheel) {
      expect(wheel.left).toBeGreaterThanOrEqual(Math.max(wheel.frame.left, 8) - 0.5);
      expect(wheel.right).toBeLessThanOrEqual(Math.min(wheel.frame.right, wheel.width - 8) + 0.5);
      expect(wheel.top).toBeGreaterThanOrEqual(wheel.frame.top - 0.5);
      expect(wheel.bottom).toBeLessThanOrEqual(wheel.frame.bottom + 0.5);
      expect(Math.abs(wheel.left - (wheel.width - wheel.right))).toBeLessThanOrEqual(12);
      expect(wheel.tags).toBe(0);
    }
    const stages = mobile.getByTestId("city-mobile-stage");
    await expect(stages.locator("button[aria-expanded]")).toHaveCount(4);
    await expect(stages.locator('button[aria-expanded="true"]')).toHaveCount(1);
    await expect(mobile.locator('[data-stage="es"] button[aria-expanded="true"]')).toHaveCount(1);
    // 收起來的段落仍在 DOM（hidden）：每個按鈕的 aria-controls 都指得到面板。
    const controls = await stages.locator("button[aria-expanded]").evaluateAll((buttons) =>
      buttons.map((button) => {
        const panel = document.getElementById(button.getAttribute("aria-controls") ?? "");
        return { expanded: button.getAttribute("aria-expanded"), exists: Boolean(panel), hidden: panel?.hidden ?? null };
      }),
    );
    expect(controls).toEqual(controls.map((item) => ({ expanded: item.expanded, exists: true, hidden: item.expanded !== "true" })));
    await expect(mobile.locator('[data-stage="jh"] [data-testid="city-mobile-panel"]')).toBeHidden();
    await mobile.locator('[data-stage="jh"] button[aria-expanded]').click();
    await expect(page).toHaveURL(/[?&]s=jh/);
    await expect(mobile.locator('[data-stage="jh"] button[aria-expanded="true"]')).toHaveCount(1);
    await expect(mobile.locator('[data-stage="es"] [data-testid="city-mobile-panel"]')).toBeHidden();
    await expect(mobile.locator('[data-stage="jh"] [data-testid="city-mobile-panel"]')).toBeVisible();
    expect(await mobile.locator('[data-stage="jh"] li').count()).toBeGreaterThan(0);
    // 再點一次收起來。
    await mobile.locator('[data-stage="jh"] button[aria-expanded]').click();
    await expect(stages.locator('button[aria-expanded="true"]')).toHaveCount(0);
    await expect(mobile.locator('[data-stage="jh"] [data-testid="city-mobile-panel"]')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });
});
