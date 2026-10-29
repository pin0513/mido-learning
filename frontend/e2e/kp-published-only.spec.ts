import { test, expect } from "@playwright/test";

/**
 * 不帶 KP_INCLUDE_DRAFTS 的 build，並以 KP_ENABLED=true 啟動。
 * E2E_PUBLISHED_COUNT 是這份內容裡 status: published 的筆數。
 */
const DRAFT_TITLES = [
  "甘特圖與里程碑",
  "部分與整體",
  "團隊溝通與會議",
  "排程與資源最佳化",
  "要徑：決定專案長度的那條路",
  "什麼是「專案」？",
  "風險：可能性 × 影響",
  "商業論證與專案治理",
];
// B17 發布的專案管理 es 5 點：頁面 200，而且不露出它們連到的草稿標題（ph.fair、ph.hypothesis、pm.project、pm.team、pm.lead、pm.gantt、pm.risk）。
const B17_PAGES: [string, string, string[]][] = [
  ["/kp/pm.goal/es", "目標：我們想完成什麼？", ["好問題從「為什麼」開始", "什麼是「專案」？"]],
  ["/kp/pm.roles/es", "分工與說到做到", ["怎樣才公平？", "團隊溝通與會議", "領導是行為，不是職位"]],
  ["/kp/pm.sequence/es", "先做什麼、後做什麼", ["甘特圖與里程碑"]],
  ["/kp/pm.planb/es", "如果下雨怎麼辦？", ["風險：可能性 × 影響"]],
  ["/kp/pm.retro/es", "回顧：哪裡好、哪裡可以更好", ["團隊溝通與會議", "假設與實驗：把問題變成可以檢驗的"]],
];
// B11 已發布「規律與關係」（ma.pattern）、「用字母代表數：方程式」（ma.algebra）、ma.measure；B12 已發布高中數學 7 點（ma.function、ma.trig、ma.rate 等）；B13 已發布大學數學 7 點（ma.limit、ma.derivative、ma.linalg 等）。B16 已發布大學資訊與 AI 6 點（it.nn、it.swe、it.aisys 等），草稿樣本改用仍是草稿、接在 pm.breakdown／pm.estimate／pm.triangle 之後的專案管理點（pm.cpm、pm.business）；B17 已發布專案管理 es 5 點（pm.goal、pm.roles、pm.sequence、pm.planb、pm.retro），草稿樣本與 404 頁改用它們的下一階草稿（pm.project、pm.team、pm.gantt、pm.risk）；已發布的 it.aisys、it.governance、it.hcai 分別連到草稿 pm.aiteam@uni、pm.business@uni、ph.aimind@uni，地圖不能露出它們的 slug。

test.describe("正式 build", () => {
  test("index 只有已發布，草稿頁 404，已發布頁不含草稿標題", async ({ request }) => {
    const expected = Number(process.env.E2E_PUBLISHED_COUNT ?? "0");
    const index = await request.get("/kp/index.json");
    expect(index.status()).toBe(200);
    const rows = (await index.json()) as unknown[];
    expect(rows).toHaveLength(expected);

    const project = await request.get("/kp/pm.project/jh");
    expect(project.status()).toBe(404);
    expect(await project.text()).not.toContain("什麼是「專案」？");

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
    expect(html).toContain("目標：我們想完成什麼？");
    expect(html).toContain("尚未發布");
    expect(html).not.toContain("（尚未發布）");
    for (const title of DRAFT_TITLES) {
      expect(html, title).not.toContain(title);
      expect(flight, title).not.toContain(title);
    }
    for (const [path, title, drafts] of B17_PAGES) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      const page = await res.text();
      expect(page, path).toContain(title);
      for (const draft of drafts) expect(page, `${path} ${draft}`).not.toContain(draft);
    }
  });

  test("地圖不放草稿標題，首頁畫出公開學門", async ({ request }) => {
    // B17：pm.goal、pm.schedule、pm.team 也是路線 id，國小一站發布後路線會顯示，不再當草稿 slug 檢查。
    const slugs = ["pm.project", "ph.parts", "pm.aiteam", "pm.business", "pm.cpm", "ph.aimind", "pm.gantt"];
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
      expect(html, path).toContain("分工與說到做到");
      expect(html, path).not.toContain("什麼是「專案」");
      expect(html, path).not.toContain("draft-");
      expect(html, path).not.toContain("城市");
    }
  });
});
