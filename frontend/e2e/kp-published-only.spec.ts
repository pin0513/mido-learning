import { test, expect } from "@playwright/test";

/**
 * 不帶 KP_INCLUDE_DRAFTS 的 build，並以 KP_ENABLED=true 啟動。
 * E2E_PUBLISHED_COUNT 是這份內容裡 status: published 的筆數。
 */
// B19 發布專案管理 sh 5 點後，原本的 sh 草稿樣本（衝突、敏捷、要徑、利害關係人）改用仍是草稿的 uni 與哲學點。
const DRAFT_TITLES = [
  "組織行為與心理安全感",
  "部分與整體",
  "決策、倫理與 AI 協作",
  "排程與資源最佳化",
  "系統思考：槓桿點與非預期後果",
  "倫理學的三種視角",
  "複雜性與不確定性",
  "商業論證與專案治理",
];
// B17 發布的專案管理 es 5 點、B18 發布的 jh 5 點與 B19 發布的 sh 5 點：頁面 200，帶出已發布的相鄰點標題，不露出它們連到的草稿標題。
// B18 發布 pm.project、pm.team、pm.lead、pm.gantt、pm.risk 後，es 頁的下一階改成已發布標題。
// B19 發布 pm.stakeholder、pm.cpm、pm.conflict、pm.style、pm.agile 後，jh 頁的下一階也改成已發布標題；草稿只剩 ph.fair、ph.hypothesis、哲學 sh／uni 點與 uni 的專案管理點。
const PM_PAGES: [string, string[], string[]][] = [
  ["/kp/pm.goal/es", ["目標：我們想完成什麼？", "什麼是「專案」？"], ["好問題從「為什麼」開始", "商業論證與專案治理"]],
  ["/kp/pm.roles/es", ["分工與說到做到", "團隊溝通與會議", "領導是行為，不是職位"], ["怎樣才公平？", "組織行為與心理安全感"]],
  ["/kp/pm.sequence/es", ["先做什麼、後做什麼", "甘特圖與里程碑"], ["排程與資源最佳化"]],
  ["/kp/pm.planb/es", ["如果下雨怎麼辦？", "風險：可能性 × 影響"], ["複雜性與不確定性"]],
  ["/kp/pm.retro/es", ["回顧：哪裡好、哪裡可以更好", "團隊溝通與會議"], ["假設與實驗：把問題變成可以檢驗的", "複雜性與不確定性"]],
  ["/kp/pm.project/jh", ["什麼是「專案」？", "目標：我們想完成什麼？", "利害關係人"], ["商業論證與專案治理"]],
  ["/kp/pm.gantt/jh", ["甘特圖與里程碑", "先做什麼、後做什麼", "要徑：決定專案長度的那條路"], ["排程與資源最佳化"]],
  ["/kp/pm.team/jh", ["團隊溝通與會議", "分工與說到做到", "領導是行為，不是職位", "衝突與協商", "利害關係人"], ["組織行為與心理安全感"]],
  ["/kp/pm.lead/jh", ["領導是行為，不是職位", "團隊溝通與會議", "情境領導"], ["組織行為與心理安全感"]],
  ["/kp/pm.risk/jh", ["風險：可能性 × 影響", "如果下雨怎麼辦？"], ["複雜性與不確定性"]],
  ["/kp/pm.stakeholder/sh", ["利害關係人", "什麼是「專案」？", "團隊溝通與會議"], ["商業論證與專案治理", "系統思考：槓桿點與非預期後果"]],
  ["/kp/pm.cpm/sh", ["要徑：決定專案長度的那條路", "甘特圖與里程碑", "WBS 與三點估算"], ["排程與資源最佳化"]],
  ["/kp/pm.conflict/sh", ["衝突與協商", "團隊溝通與會議", "利害關係人"], ["組織行為與心理安全感", "倫理學的三種視角"]],
  ["/kp/pm.style/sh", ["情境領導", "領導是行為，不是職位"], ["組織行為與心理安全感"]],
  ["/kp/pm.agile/sh", ["敏捷與迭代", "回顧：哪裡好、哪裡可以更好", "甘特圖與里程碑"], ["假設與實驗：把問題變成可以檢驗的", "複雜性與不確定性", "決策、倫理與 AI 協作"]],
];
// B11 已發布「規律與關係」（ma.pattern）、「用字母代表數：方程式」（ma.algebra）、ma.measure；B12 已發布高中數學 7 點（ma.function、ma.trig、ma.rate 等）；B13 已發布大學數學 7 點（ma.limit、ma.derivative、ma.linalg 等）。B16 已發布大學資訊與 AI 6 點（it.nn、it.swe、it.aisys 等），草稿樣本改用仍是草稿、接在 pm.breakdown／pm.estimate／pm.triangle 之後的專案管理點（pm.cpm、pm.business）；B17 已發布專案管理 es 5 點（pm.goal、pm.roles、pm.sequence、pm.planb、pm.retro）；B18 再發布 jh 5 點（pm.project、pm.gantt、pm.team、pm.lead、pm.risk），草稿樣本與 404 頁改用再下一階的 sh／uni 草稿（pm.stakeholder、pm.conflict、pm.agile、pm.complexity）；B19 再發布 sh 5 點（pm.stakeholder、pm.cpm、pm.conflict、pm.style、pm.agile），草稿樣本與 404 頁改用 uni 與哲學草稿（pm.business、pm.org、pm.complexity、ph.systems、ph.ethicstheory）；已發布的 it.aisys、it.governance、it.hcai 分別連到草稿 pm.aiteam@uni、pm.business@uni、ph.aimind@uni，地圖不能露出它們的 slug。

test.describe("正式 build", () => {
  test("index 只有已發布，草稿頁 404，已發布頁不含草稿標題", async ({ request }) => {
    const expected = Number(process.env.E2E_PUBLISHED_COUNT ?? "0");
    const index = await request.get("/kp/index.json");
    expect(index.status()).toBe(200);
    const rows = (await index.json()) as unknown[];
    expect(rows).toHaveLength(expected);

    // B19 發布 pm.stakeholder@sh 後，404 頁改用它的下一階草稿 pm.business@uni。
    const business = await request.get("/kp/pm.business/uni");
    expect(business.status()).toBe(404);
    expect(await business.text()).not.toContain("商業論證與專案治理");

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
    for (const [path, titles, drafts] of PM_PAGES) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      const page = await res.text();
      for (const title of titles) expect(page, `${path} ${title}`).toContain(title);
      for (const draft of drafts) expect(page, `${path} ${draft}`).not.toContain(draft);
    }
  });

  test("地圖不放草稿標題，首頁畫出公開學門", async ({ request }) => {
    // B17：pm.goal、pm.schedule、pm.team 也是路線 id，國小一站發布後路線會顯示，不再當草稿 slug 檢查。
    // B18：pm.project、pm.gantt 已發布，改查仍是草稿的 pm.stakeholder、pm.conflict。
    // B19：pm.stakeholder、pm.cpm、pm.conflict 已發布，改查仍是草稿的 pm.org、pm.complexity、ph.systems（分別由 pm.conflict／pm.style、pm.agile、pm.stakeholder 連過去）。
    const slugs = ["pm.org", "ph.parts", "pm.aiteam", "pm.business", "pm.complexity", "ph.aimind", "ph.systems"];
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
      expect(html, path).toContain("什麼是「專案」？");
      // B19 發布 pm.stakeholder@sh 後，首頁畫出它；不露出的改用它的下一階草稿。
      expect(html, path).toContain("利害關係人");
      expect(html, path).not.toContain("商業論證與專案治理");
      expect(html, path).not.toContain("draft-");
      expect(html, path).not.toContain("城市");
    }
  });
});
