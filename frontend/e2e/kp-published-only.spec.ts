import { test, expect } from "@playwright/test";

/**
 * 不帶 KP_INCLUDE_DRAFTS 的 build，並以 KP_ENABLED=true 啟動。
 * E2E_PUBLISHED_COUNT 是這份內容裡 status: published 的筆數。
 */
const DRAFT_TITLES = [
  "目標：我們想完成什麼？",
  "部分與整體",
  "函數的眼光：指數與對數",
  "排程與資源最佳化",
  "從平均變化率到瞬間變化率",
  "什麼是「專案」？",
  "先做什麼、後做什麼",
  "三角函數與週期",
];
// B11 已發布「規律與關係」（ma.pattern）、「用字母代表數：方程式」（ma.algebra）、ma.measure，草稿樣本改用仍是草稿的數學點。

test.describe("正式 build", () => {
  test("index 只有已發布，草稿頁 404，已發布頁不含草稿標題", async ({ request }) => {
    const expected = Number(process.env.E2E_PUBLISHED_COUNT ?? "0");
    const index = await request.get("/kp/index.json");
    expect(index.status()).toBe(200);
    const rows = (await index.json()) as unknown[];
    expect(rows).toHaveLength(expected);

    const goal = await request.get("/kp/pm.goal/es");
    expect(goal.status()).toBe(404);
    expect(await goal.text()).not.toContain("目標：我們想完成什麼？");

    const breakdown = await request.get("/kp/pm.breakdown/es");
    const html = await breakdown.text();
    const rsc = await request.get("/kp/pm.breakdown/es", {
      headers: { RSC: "1", Accept: "text/x-component" },
    });
    const flight = rsc.status() === 200 ? await rsc.text() : "";
    if (expected === 0) {
      expect(breakdown.status()).toBe(404);
      expect(html).not.toContain("大事拆成小事");
      return;
    }

    expect(breakdown.status()).toBe(200);
    expect(html).toContain("大事拆成小事");
    expect(html).toContain("尚未發布");
    expect(html).not.toContain("（尚未發布）");
    for (const title of DRAFT_TITLES) {
      expect(html, title).not.toContain(title);
      expect(flight, title).not.toContain(title);
    }
  });

  test("地圖不放草稿標題，首頁畫出公開學門", async ({ request }) => {
    const slugs = ["pm.goal", "ph.parts", "ma.function", "ma.trig", "pm.schedule", "ma.rate"];
    const map = await request.get("/kp/map");
    expect(map.status()).toBe(200);
    const mapHtml = await map.text();
    const mapRsc = await request.get("/kp/map", { headers: { RSC: "1", Accept: "text/x-component" } });
    const mapFlight = mapRsc.status() === 200 ? await mapRsc.text() : "";
    for (const slug of slugs) {
      expect(mapHtml, slug).not.toContain(slug);
      expect(mapFlight, slug).not.toContain(slug);
    }
    expect(mapHtml).toContain("draft-");
    expect(mapHtml).not.toContain("部分與整體");

    for (const path of ["/city-home", "/"]) {
      const page = await request.get(path);
      expect(page.status(), path).toBe(200);
      const html = await page.text();
      expect(html, path).toContain("先選學門，再從上往下看");
      expect(html, path).toContain("規律與關係");
      expect(html, path).toContain("ma.pattern");
      expect(html, path).not.toContain("目標：我們想完成什麼");
      expect(html, path).not.toContain("draft-");
      expect(html, path).not.toContain("城市");
    }
  });
});
