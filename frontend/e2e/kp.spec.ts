import { test, expect } from "@playwright/test";

/**
 * 需要本機已用 KP_INCLUDE_DRAFTS=true、KP_SLIDES_PREVIEW=true 建置，
 * 並以 KP_ENABLED=true 啟動。P2-07 知識圖譜這輪不做，所以沒有 /kp/graph。
 */
test.describe("知識地圖", () => {
  test("開關打開時，桌面導覽有知識地圖", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header").getByRole("link", { name: "知識地圖" })).toBeVisible();
  });

  test("首頁保留層級×階段，也保留學門、階段、核心素養", async ({ page }) => {
    await page.goto("/kp");
    await expect(page.getByRole("heading", { level: 1, name: "知識地圖" })).toBeVisible();
    await expect(page.getByTestId("kp-layer-stage")).toContainText("本質層");
    await expect(page.getByTestId("kp-layer-stage")).toContainText("應用領域");
    await expect(page.getByRole("heading", { name: "學門" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "階段", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "核心素養" })).toBeVisible();
    await expect(page.getByRole("link", { name: "國小" }).first()).toBeVisible();
  });

  test("知識點頁、大學不顯示課綱、待核對有提示", async ({ page }) => {
    await page.goto("/kp/pm.breakdown/es");
    await expect(page.getByRole("heading", { level: 1, name: "大事拆成小事" })).toBeVisible();
    await expect(page.getByTestId("kp-curriculum")).toBeVisible();
    await expect(page.getByTestId("kp-draft")).toHaveCount(0);
    // B17 已發布 pm.goal@es，B18 再發布它的下一階 pm.project@jh；草稿頁改用再下一階 pm.stakeholder@sh。
    await page.goto("/kp/pm.goal/es");
    await expect(page.getByTestId("kp-draft")).toHaveCount(0);
    await page.goto("/kp/pm.project/jh");
    await expect(page.getByTestId("kp-draft")).toHaveCount(0);
    await page.goto("/kp/pm.stakeholder/sh");
    await expect(page.getByTestId("kp-draft")).toHaveText("草稿");
    await page.goto("/kp/pm.breakdown/es");
    await expect(page.getByRole("link", { name: /我們想完成什麼/ })).toBeVisible();
    await expect(page.getByText("尚未發布")).toHaveCount(0);
    await expect(page.getByTestId("kp-slides")).toHaveCount(0);

    // B16 已發布資訊與 AI 大學 6 點（含 it.nn@uni）；仍是草稿、沒有課綱對應的大學點改用 ph.aimind@uni（to_verify: false）。
    // to_verify 的大學草稿只剩溝通與解決問題（這個行程旗標關閉，頁面 404），「課綱對應待核對」改在 softskills.spec.ts 用 sk.hypo@uni 檢查。
    await page.goto("/kp/ph.aimind/uni");
    await expect(page.getByTestId("kp-draft")).toHaveText("草稿");
    await expect(page.getByTestId("kp-curriculum")).toHaveCount(0);
    await expect(page.getByTestId("kp-to-verify")).toHaveCount(0);
    await expect(page.getByTestId("kp-license-body")).toBeEmpty();
  });

  test("空的核心素養與還沒有知識點的層級有說明", async ({ page }) => {
    await page.goto("/kp/competency/A1");
    await expect(page.getByText("目前沒有知識點")).toBeVisible();
    await page.goto("/kp/competency/C3");
    await expect(page.getByText("目前沒有知識點")).toBeVisible();
    await page.goto("/kp/layer/applied");
    await expect(page.getByRole("heading", { level: 1, name: "應用領域" })).toBeVisible();
    await expect(page.getByText("還沒有知識點掛上來")).toBeVisible();
  });

  test("主線順序與共學卡", async ({ page }) => {
    await page.goto("/kp/path/ma.change");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("變化");
    const titles = page.locator("ol h2");
    await expect(titles.nth(0)).toContainText("測量");
    await expect(page.getByTestId("kp-colearn")).toBeVisible();
    await expect(page.getByText("一起騎一段路")).toBeVisible();
  });

  test("內部連結都開得了", async ({ page, request }) => {
    await page.goto("/kp");
    const hrefs = await page.locator('a[href^="/kp"]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href") ?? ""),
    );
    await page.goto("/kp/pm.breakdown/es");
    const more = await page.locator('a[href^="/kp"]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href") ?? ""),
    );
    const paths = [...new Set([...hrefs, ...more].map((href) => href.split("?")[0]).filter((href) => href.startsWith("/kp")))];
    expect(paths.length).toBeGreaterThan(20);
    for (const path of paths) {
      const response = await request.get(path);
      expect(response.status(), path).toBeLessThan(400);
    }
  });

  test("index.json 有 100 筆且 sitemap 不收草稿與會員頁", async ({ request }) => {
    const index = await request.get("/kp/index.json");
    expect(index.status()).toBe(200);
    const rows = (await index.json()) as { id: string; title: string; stage: string; url: string }[];
    expect(rows).toHaveLength(100);
    expect(rows.some((row) => row.id.startsWith("sk."))).toBe(false);
    expect(rows.some((row) => /^(zh|en|ja|lg)\./.test(row.id))).toBe(false);
    expect(rows[0]).toEqual(expect.objectContaining({ id: expect.any(String), title: expect.any(String), stage: expect.any(String), url: expect.stringContaining("https://learn.paulfun.net/kp/") }));

    const sitemap = await request.get("/sitemap.xml");
    const xml = await sitemap.text();
    expect(xml).toContain("/kp/layer/essence");
    expect(xml).toContain("/kp/pm.breakdown/es");
    expect(xml).toContain("/kp/pm.goal/es");
    expect(xml).toContain("/kp/pm.project/jh");
    expect(xml).not.toContain("/kp/pm.stakeholder/sh");
    expect(xml).not.toContain("/kp/sk.");
    expect(xml).not.toContain("/kp/discipline/soft-skills");
    expect(xml).not.toContain("/kp/zh.");
    expect(xml).not.toContain("/kp/en.");
    expect(xml).not.toContain("/kp/ja.");
    expect(xml).not.toContain("/kp/lg.");
    expect(xml).not.toContain("/kp/discipline/language");
    expect(xml).not.toContain("/login");
    expect(xml).not.toContain("/dashboard");
  });

  test("投影片找不到與可播放，且不記觀看", async ({ page }) => {
    const viewed: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/analytics/material")) viewed.push(req.url());
    });
    await page.route("**/api/components/missing-component/materials", (route) =>
      route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false }) }),
    );
    await page.route("**/api/components/preview-ok/materials", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { materials: [{ id: "mat-1", version: 2, filename: "a.zip", size: 1, uploadedAt: "2026-01-01", uploadedBy: "t" }] },
        }),
      }),
    );
    await page.route("**/api/materials/batch", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            materials: [
              {
                id: "mat-1",
                componentId: "preview-ok",
                version: 2,
                entryPoint: "index.html",
                files: ["index.html"],
                baseUrl: "https://example.test/slides/",
                layoutMode: "fixed",
              },
            ],
          },
        }),
      }),
    );
    await page.goto("/kp/preview/slides");
    await expect(page.getByTestId("slides-missing")).toContainText("找不到投影片");
    await expect(page.getByTestId("slides-ok").locator("iframe")).toHaveAttribute("src", /example\.test\/slides\/index\.html/);
    expect(viewed).toEqual([]);
  });

  test.describe("360px", () => {
    test.use({ viewport: { width: 360, height: 800 } });

    for (const path of ["/kp", "/kp/pm.breakdown/es", "/kp/path/ma.change", "/kp/layer/essence"]) {
      test(`${path} 沒有橫向溢出`, async ({ page }) => {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
      });
    }
  });
});
