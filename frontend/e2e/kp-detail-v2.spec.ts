import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * 詳細頁 V2。視覺斷言只在 KP_DETAIL_V2_ENABLED=true 時跑。
 * 旗標關掉時，同一支測試確認舊頁還在，並且直連 /kp-v2 是 404。
 * 草稿頁（數學、資訊）只有 KP_INCLUDE_DRAFTS 的建置才有，沒有就略過。
 */
const V2 = process.env.KP_DETAIL_V2_ENABLED === "true";

const PAGES: { path: string; layer: string; verify: boolean }[] = [
  { path: "/kp/zh.zhuyin/es", layer: "基礎", verify: true },
  { path: "/kp/pm.breakdown/es", layer: "本質", verify: true },
  { path: "/kp/ph.reason/es", layer: "本質", verify: false },
  { path: "/kp/sk.voice/es", layer: "本質", verify: true },
  { path: "/kp/en.abc/es", layer: "基礎", verify: true },
  { path: "/kp/ma.number/es", layer: "本質", verify: true },
  { path: "/kp/it.blocks/es", layer: "基礎", verify: true },
];

test("直連 /kp-v2 是 404，sitemap 也不列", async ({ request }) => {
  expect((await request.get("/kp-v2/zh.zhuyin/es")).status()).toBe(404);
  expect((await request.get("/kp-v2")).status()).toBe(404);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).not.toContain("/kp-v2");
});

test.describe("旗標關閉時詳細頁維持舊版", () => {
  test.skip(V2, "KP_DETAIL_V2_ENABLED is on");

  test("pm.breakdown 沒有 V2 標記，課綱區塊還在", async ({ page }) => {
    const response = await page.goto("/kp/pm.breakdown/es");
    test.skip(response?.status() === 404, "page is not generated");
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId("kp-detail-v2")).toHaveCount(0);
    await expect(page.getByTestId("kp-curriculum")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "大事拆成小事" })).toBeVisible();
  });
});

test.describe("黃金圈詳細頁", () => {
  test.skip(!V2, "KP_DETAIL_V2_ENABLED is off");

  for (const item of PAGES) {
    test(`${item.path} 在 1280 與 390 都站得住`, async ({ page }) => {
      const probe = await page.goto(item.path);
      test.skip(probe?.status() === 404, `${item.path} is not generated`);
      expect(probe?.status()).toBe(200);
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(item.path);
        const root = page.getByTestId("kp-detail-v2");
        await expect(root).toBeVisible();
        const order = await page.locator("#why, #how, #what").evaluateAll((nodes) => nodes.map((node) => node.id));
        expect(order).toEqual(["why", "how", "what"]);
        await expect(root).toContainText("內容補強中");
        await expect(root).toContainText(item.layer);
        await expect(root.locator("dt", { hasText: "難度" })).toHaveCount(0);
        await expect(root).not.toContainText("在家");
        if (item.verify) await expect(root.locator(".v2-status", { hasText: "待核對" })).toBeVisible();
        else await expect(root.locator(".v2-status", { hasText: "待核對" })).toHaveCount(0);
        const headings = await page.getByTestId("v2-aside").locator("h2").allTextContents();
        expect(headings.at(-1)).toBe("審閱狀態");
        if (width === 1280) {
          await expect(page.locator(".v2-chips")).toBeHidden();
          await expect(page.getByTestId("v2-aside").locator("dt", { hasText: "層級" })).toBeVisible();
        } else {
          await expect(page.locator(".v2-chips")).toBeVisible();
          await expect(page.locator(".v2-chips")).toContainText("層級");
          await expect(page.locator(".v2-chips")).toContainText(item.layer);
          const chipsHidden = await page.locator(".v2-in-chips").evaluateAll((nodes) =>
            nodes.every((node) => getComputedStyle(node).display === "none"),
          );
          expect(chipsHidden).toBe(true);
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
        const layout = await page.locator(".kp-detail").evaluate((node) => {
          const issues: string[] = [];
          for (const target of node.querySelectorAll("a, button, summary")) {
            const rect = target.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) continue;
            if (rect.width < 43.5 || rect.height < 43.5) {
              const label = (target.getAttribute("aria-label") || target.textContent || "").trim().slice(0, 24);
              issues.push(`small ${target.tagName} ${Math.round(rect.width)}x${Math.round(rect.height)} ${label}`);
            }
          }
          const boxes = [...node.querySelectorAll("h1, h2, h3, p, li, dt, dd, figcaption, small")]
            .filter((target) => !target.closest("svg"))
            .map((target) => ({ target, rect: target.getBoundingClientRect() }))
            .filter((entry) => entry.rect.width > 1 && entry.rect.height > 1);
          for (let left = 0; left < boxes.length; left += 1) {
            for (let right = left + 1; right < boxes.length; right += 1) {
              const a = boxes[left];
              const b = boxes[right];
              if (a.target.contains(b.target) || b.target.contains(a.target)) continue;
              const overlapX = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
              const overlapY = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
              if (overlapX > 4 && overlapY > 4) {
                issues.push(`overlap ${a.target.tagName}/${b.target.tagName}`);
                if (issues.length > 6) return issues;
              }
            }
          }
          for (const target of node.querySelectorAll("*")) {
            const style = getComputedStyle(target);
            for (const edge of ["marginTop", "marginRight", "marginBottom", "marginLeft"] as const) {
              if (parseFloat(style[edge]) < 0) issues.push(`negative ${edge}`);
            }
          }
          return issues;
        });
        expect(layout).toEqual([]);
        await expect(page.getByRole("button", { name: "開啟學習願望聊天" })).toHaveCount(0);
      }
    });
  }

  test("canonical 仍指向 /kp，axe 沒有 serious", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/kp/zh.zhuyin/es");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://learn.paulfun.net/kp/zh.zhuyin/es");
    const desktop = await new AxeBuilder({ page }).include(".kp-detail").analyze();
    expect(desktop.violations.filter((item) => item.impact === "serious" || item.impact === "critical").map((item) => `${item.id}: ${item.help}`)).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/kp/ph.reason/es");
    const mobile = await new AxeBuilder({ page }).include(".kp-detail").analyze();
    expect(mobile.violations.filter((item) => item.impact === "serious" || item.impact === "critical").map((item) => `${item.id}: ${item.help}`)).toEqual([]);
  });
});
