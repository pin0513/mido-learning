import { expect, type Page } from "@playwright/test";

/**
 * /kp/map 的學區檢查（旗標打開幾個學門，就該有幾塊扇形）：
 * 建築數、路線選項數、學門標籤與圖例數，標籤不互壓、不壓到節點，節點彼此不重疊，頁面沒有橫向捲動。
 */
export async function expectMapSectors(page: Page, expected: { buildings: number; options: number; districts: string[] }) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const response = await page.goto("/kp/map", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(page.locator("[data-building-id]")).toHaveCount(expected.buildings);
  await expect(page.locator("[data-building-count]")).toHaveAttribute("data-building-count", String(expected.buildings));
  await expect(page.getByTestId("city-path").locator("option")).toHaveCount(expected.options);
  const labels = page.getByTestId("city-district-label");
  await expect(labels).toHaveCount(expected.districts.length);
  expect(await labels.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-district")))).toEqual(expected.districts);
  await expect(page.getByTestId("city-legend-district")).toHaveCount(expected.districts.length);
  const problem = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('[data-testid="city-district-label"] text')].map((node) => node.getBoundingClientRect());
    const nodes = [...document.querySelectorAll("[data-building-id] circle, [data-building-id] rect")].map((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, r: rect.width / 2 };
    });
    const hit = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        // 同一個標籤的兩行上下相鄰，不算碰撞。
        if (hit(boxes[i], boxes[j]) && Math.abs(boxes[i].top - boxes[j].top) > 1) return `label×label ${i} ${j}`;
      }
      for (const node of nodes) {
        const dx = Math.max(boxes[i].left - node.x, 0, node.x - boxes[i].right);
        const dy = Math.max(boxes[i].top - node.y, 0, node.y - boxes[i].bottom);
        if (Math.hypot(dx, dy) < node.r) return `label×node ${i}`;
      }
    }
    const centers = [...document.querySelectorAll<SVGGElement>("[data-building-id]")].map((group) => {
      const circle = group.querySelector("circle, rect");
      const rect = (circle ?? group).getBoundingClientRect();
      return { id: group.dataset.buildingId ?? "", x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, r: Math.min(rect.width, rect.height) / 2 };
    });
    for (let i = 0; i < centers.length; i += 1) {
      for (let j = i + 1; j < centers.length; j += 1) {
        const a = centers[i];
        const b = centers[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) < (a.r + b.r) * 0.98) return `node×node ${a.id} ${b.id}`;
      }
    }
    if (document.documentElement.scrollWidth > window.innerWidth + 1) return "page overflow";
    return "";
  });
  expect(problem).toBe("");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kp/map", { waitUntil: "networkidle" });
  const mobile = page.getByTestId("city-mobile");
  for (const name of await labels.evaluateAll((nodes) => nodes.map((node) => node.querySelector("text")?.textContent ?? ""))) {
    // 手機版的學門按鈕寫成「名稱（層級，點數）」。
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await expect(mobile.getByRole("button", { name: new RegExp(`^${escaped}（`) })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}
