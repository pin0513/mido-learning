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
    // B17 已發布 pm.goal@es，B18 再發布它的下一階 pm.project@jh，B19 再發布 pm.stakeholder@sh，B20 再發布 pm.business@uni；草稿頁改用它 links.why 連到的哲學草稿 ph.applied@uni。
    await page.goto("/kp/pm.goal/es");
    await expect(page.getByTestId("kp-draft")).toHaveCount(0);
    await page.goto("/kp/pm.project/jh");
    await expect(page.getByTestId("kp-draft")).toHaveCount(0);
    await page.goto("/kp/pm.stakeholder/sh");
    await expect(page.getByTestId("kp-draft")).toHaveCount(0);
    await page.goto("/kp/pm.business/uni");
    await expect(page.getByTestId("kp-draft")).toHaveCount(0);
    // B24 發布 ph.applied@uni 後，這個行程（沒開溝通與解決問題旗標）已沒有草稿頁；它改查沒有草稿標記。「草稿」標記改由 softskills.spec.ts 的 sk.hypo@uni 檢查。B28 發布 sk.hypo@uni 後全站沒有草稿，softskills.spec.ts 改查它發布後沒有這些標記；草稿與待核對的組合由 review-state.test.ts 的合成內容守住。
    await page.goto("/kp/ph.applied/uni");
    await expect(page.getByTestId("kp-draft")).toHaveCount(0);
    // B21 發布哲學 es 5 點；ph.fair@es 對應語文與綜合活動兩個領域（舊版頁的課綱區塊只列領域、核心素養與議題，不列學習表現代碼）。
    await page.goto("/kp/ph.fair/es");
    await expect(page.getByTestId("kp-draft")).toHaveCount(0);
    await expect(page.getByTestId("kp-curriculum")).toContainText("語文、綜合活動");
    await expect(page.getByTestId("kp-curriculum")).toContainText("品德教育、法治教育");
    await expect(page.getByTestId("kp-curriculum")).not.toContainText("2-III-7");
    // B22 發布哲學 jh 6 點；ph.evidence@jh 對應社會與自然科學兩個領域（自然科學的學習表現代碼是小寫字母開頭，舊版頁同樣不列）。
    await page.goto("/kp/ph.evidence/jh");
    await expect(page.getByTestId("kp-draft")).toHaveCount(0);
    await expect(page.getByTestId("kp-curriculum")).toContainText("社會、自然科學");
    await expect(page.getByTestId("kp-curriculum")).toContainText("閱讀素養教育");
    await expect(page.getByTestId("kp-curriculum")).not.toContainText("ah-IV-1");
    // B23 發布哲學 sh 7 點；ph.aijudge@sh 對應科技與語文兩個領域，議題是資訊教育（舊版頁不列學習表現代碼）。
    await page.goto("/kp/ph.aijudge/sh");
    await expect(page.getByTestId("kp-draft")).toHaveCount(0);
    await expect(page.getByTestId("kp-curriculum")).toContainText("科技、語文");
    await expect(page.getByTestId("kp-curriculum")).toContainText("資訊教育");
    await expect(page.getByTestId("kp-curriculum")).not.toContainText("運 a-V-2");
    await page.goto("/kp/pm.breakdown/es");
    await expect(page.getByRole("link", { name: /我們想完成什麼/ })).toBeVisible();
    await expect(page.getByText("尚未發布")).toHaveCount(0);
    await expect(page.getByTestId("kp-slides")).toHaveCount(0);

    // B16 已發布資訊與 AI 大學 6 點（含 it.nn@uni）；仍是草稿、沒有課綱對應的大學點改用 ph.aimind@uni（to_verify: false）。
    // to_verify 的大學草稿只剩溝通與解決問題（這個行程旗標關閉，頁面 404），「課綱對應待核對」改在 softskills.spec.ts 用 sk.hypo@uni 檢查。B28 發布 sk.hypo@uni 後全站沒有草稿，softskills.spec.ts 改查它發布後沒有這些標記；草稿與待核對的組合由 review-state.test.ts 的合成內容守住。
    // B24 發布 ph.aimind@uni 後，它改查已發布的大學點：沒有草稿標記、沒有課綱區塊、沒有待核對。「草稿＋不待核對」的組合已沒有真實樣本（剩下的草稿都是 to_verify: true 的軟實力點）。
    await page.goto("/kp/ph.aimind/uni");
    await expect(page.getByTestId("kp-draft")).toHaveCount(0);
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
    expect(xml).toContain("/kp/pm.stakeholder/sh");
    // B20 發布 pm.business@uni 後，它進 sitemap；草稿改查 ph.applied@uni。
    // B24 發布 ph.applied@uni 後，它也進 sitemap；這個行程的草稿只剩軟實力點，由下面的 /kp/sk. 檢查（同時也因旗標關閉不列）。
    expect(xml).toContain("/kp/pm.business/uni");
    expect(xml).toContain("/kp/ph.applied/uni");
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
