import { test, expect } from "@playwright/test";

/**
 * 同一份 build、不帶 KP_ENABLED / KP_HOME_ENABLED。
 * 不帶 KP_ENABLED / KP_HOME_ENABLED。只開首頁旗標也不算打開。
 */
const CLOSED = ["/city-home", "/kp", "/kp/map", "/kp/index.json"];

test.describe("旗標關閉", () => {
  test("首頁是舊版，導覽沒有知識地圖", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-TW");
    await expect(page.locator("h1")).toContainText("AI 驅動的");
    await expect(page.getByText("從家庭廣場出發")).toHaveCount(0);
    await expect(page.getByText("全家一起走的知識地圖")).toHaveCount(0);
    await expect(page.locator("header").getByRole("link", { name: "知識地圖" })).toHaveCount(0);
  });

  for (const path of CLOSED) {
    test(`${path} 是 404 且 noindex`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(404);
      expect(response.headers()["x-robots-tag"] ?? "").toContain("noindex");
      expect(await response.text()).toContain("這個網址目前沒有開放。");
    });
  }

  test("sitemap 沒有知識地圖網址", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain("/kp");
  });
});
