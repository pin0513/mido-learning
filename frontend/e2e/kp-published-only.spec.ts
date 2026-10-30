import { test, expect } from "@playwright/test";

/**
 * 不帶 KP_INCLUDE_DRAFTS 的 build，並以 KP_ENABLED=true 啟動。
 * E2E_PUBLISHED_COUNT 是這份內容裡 status: published 的筆數。
 */
// B19 發布專案管理 sh 5 點後，原本的 sh 草稿樣本（衝突、敏捷、要徑、利害關係人）改用仍是草稿的 uni 與哲學點。
// B20 發布專案管理 uni 5 點後，專案管理 24 點全部發布，草稿樣本只剩哲學點（pm uni 5 點的 links 連到的 ph.applied、ph.epistem、ph.complex、ph.aimind 都還是草稿）。
// B21 發布哲學 es 5 點後，ph.parts@es 改用它的下一階草稿 ph.feedback@jh。
const DRAFT_TITLES = [
  "應用倫理：科技、商業與專業責任",
  "因果鏈與回饋迴圈",
  "AI 時代的思考：人機分工與判斷",
  "知識論與不確定性",
  "系統思考：槓桿點與非預期後果",
  "倫理學的三種視角",
  "複雜性思維與模型的限度",
  "認知偏誤與思考盲點",
];
// B17 發布的專案管理 es 5 點、B18 發布的 jh 5 點與 B19 發布的 sh 5 點：頁面 200，帶出已發布的相鄰點標題，不露出它們連到的草稿標題。
// B18 發布 pm.project、pm.team、pm.lead、pm.gantt、pm.risk 後，es 頁的下一階改成已發布標題。
// B19 發布 pm.stakeholder、pm.cpm、pm.conflict、pm.style、pm.agile 後，jh 頁的下一階也改成已發布標題；草稿只剩 ph.fair、ph.hypothesis、哲學 sh／uni 點與 uni 的專案管理點。
// B20 發布 uni 5 點後，sh 頁的下一階也改成已發布標題，並加上 uni 5 頁；各頁不露出的只剩它們連到的哲學草稿。
const PM_PAGES: [string, string[], string[]][] = [
  // B21 發布 ph.question@es、ph.fair@es 後，pm.goal@es、pm.roles@es 連過去的標題改成正向檢查，不露出的改用它們的下一階草稿；pm.sequence@es 改用 ph.parts@es 的下一階草稿。
  ["/kp/pm.goal/es", ["目標：我們想完成什麼？", "什麼是「專案」？", "好問題從「為什麼」開始"], ["假設與實驗：把問題變成可以檢驗的"]],
  ["/kp/pm.roles/es", ["分工與說到做到", "團隊溝通與會議", "領導是行為，不是職位", "怎樣才公平？"], ["兩難與價值衝突"]],
  ["/kp/pm.sequence/es", ["先做什麼、後做什麼", "甘特圖與里程碑"], ["因果鏈與回饋迴圈"]],
  ["/kp/pm.planb/es", ["如果下雨怎麼辦？", "風險：可能性 × 影響"], ["知識論與不確定性"]],
  ["/kp/pm.retro/es", ["回顧：哪裡好、哪裡可以更好", "團隊溝通與會議"], ["假設與實驗：把問題變成可以檢驗的"]],
  ["/kp/pm.project/jh", ["什麼是「專案」？", "目標：我們想完成什麼？", "利害關係人"], ["應用倫理：科技、商業與專業責任"]],
  ["/kp/pm.gantt/jh", ["甘特圖與里程碑", "先做什麼、後做什麼", "要徑：決定專案長度的那條路"], ["系統思考：槓桿點與非預期後果"]],
  ["/kp/pm.team/jh", ["團隊溝通與會議", "分工與說到做到", "領導是行為，不是職位", "衝突與協商", "利害關係人"], ["倫理學的三種視角"]],
  ["/kp/pm.lead/jh", ["領導是行為，不是職位", "團隊溝通與會議", "情境領導"], ["AI 時代的思考：人機分工與判斷"]],
  ["/kp/pm.risk/jh", ["風險：可能性 × 影響", "如果下雨怎麼辦？"], ["複雜性思維與模型的限度"]],
  ["/kp/pm.stakeholder/sh", ["利害關係人", "什麼是「專案」？", "團隊溝通與會議", "商業論證與專案治理"], ["系統思考：槓桿點與非預期後果", "應用倫理：科技、商業與專業責任"]],
  ["/kp/pm.cpm/sh", ["要徑：決定專案長度的那條路", "甘特圖與里程碑", "WBS 與三點估算", "排程與資源最佳化"], ["複雜性思維與模型的限度"]],
  ["/kp/pm.conflict/sh", ["衝突與協商", "團隊溝通與會議", "利害關係人", "組織行為與心理安全感"], ["倫理學的三種視角"]],
  ["/kp/pm.style/sh", ["情境領導", "領導是行為，不是職位", "組織行為與心理安全感"], ["倫理學的三種視角"]],
  ["/kp/pm.agile/sh", ["敏捷與迭代", "回顧：哪裡好、哪裡可以更好", "甘特圖與里程碑", "複雜性與不確定性"], ["假設與實驗：把問題變成可以檢驗的", "知識論與不確定性"]],
  ["/kp/pm.business/uni", ["商業論證與專案治理", "利害關係人", "時間、金錢、品質的取捨", "決策、倫理與 AI 協作"], ["應用倫理：科技、商業與專業責任"]],
  ["/kp/pm.schedule/uni", ["排程與資源最佳化", "要徑：決定專案長度的那條路", "WBS 與三點估算", "實獲值管理（EVM）"], ["複雜性思維與模型的限度"]],
  ["/kp/pm.org/uni", ["組織行為與心理安全感", "衝突與協商", "情境領導"], ["倫理學的三種視角"]],
  ["/kp/pm.complexity/uni", ["複雜性與不確定性", "敏捷與迭代", "風險：可能性 × 影響", "決策、倫理與 AI 協作"], ["知識論與不確定性", "複雜性思維與模型的限度"]],
  ["/kp/pm.aiteam/uni", ["決策、倫理與 AI 協作", "商業論證與專案治理", "複雜性與不確定性"], ["AI 時代的思考：人機分工與判斷", "應用倫理：科技、商業與專業責任"]],
  // B21 發布的哲學 es 5 點：頁面 200，帶出已發布的相鄰點標題（links.how／related、先備、被依賴），不露出 links.deeper 連到的 jh 草稿標題。
  ["/kp/ph.question/es", ["好問題從「為什麼」開始", "部分與整體"], ["假設與實驗：把問題變成可以檢驗的"]],
  ["/kp/ph.fact/es", ["事實還是意見？", "我怎麼知道的？"], ["常見的推理謬誤", "證據與來源"]],
  ["/kp/ph.know/es", ["我怎麼知道的？", "事實還是意見？"], ["證據與來源", "假設與實驗：把問題變成可以檢驗的"]],
  ["/kp/ph.fair/es", ["怎樣才公平？", "分工與說到做到"], ["兩難與價值衝突"]],
  ["/kp/ph.parts/es", ["部分與整體", "大事拆成小事", "好問題從「為什麼」開始"], ["因果鏈與回饋迴圈"]],
];
// B11 已發布「規律與關係」（ma.pattern）、「用字母代表數：方程式」（ma.algebra）、ma.measure；B12 已發布高中數學 7 點（ma.function、ma.trig、ma.rate 等）；B13 已發布大學數學 7 點（ma.limit、ma.derivative、ma.linalg 等）。B16 已發布大學資訊與 AI 6 點（it.nn、it.swe、it.aisys 等），草稿樣本改用仍是草稿、接在 pm.breakdown／pm.estimate／pm.triangle 之後的專案管理點（pm.cpm、pm.business）；B17 已發布專案管理 es 5 點（pm.goal、pm.roles、pm.sequence、pm.planb、pm.retro）；B18 再發布 jh 5 點（pm.project、pm.gantt、pm.team、pm.lead、pm.risk），草稿樣本與 404 頁改用再下一階的 sh／uni 草稿（pm.stakeholder、pm.conflict、pm.agile、pm.complexity）；B19 再發布 sh 5 點（pm.stakeholder、pm.cpm、pm.conflict、pm.style、pm.agile），草稿樣本與 404 頁改用 uni 與哲學草稿（pm.business、pm.org、pm.complexity、ph.systems、ph.ethicstheory）；已發布的 it.aisys、it.governance、it.hcai 分別連到草稿 pm.aiteam@uni、pm.business@uni、ph.aimind@uni，地圖不能露出它們的 slug。B20 再發布 uni 5 點（pm.business、pm.schedule、pm.org、pm.complexity、pm.aiteam），專案管理 24 點全部發布，草稿樣本與 404 頁改用哲學草稿（ph.applied、ph.epistem、ph.complex、ph.aimind、ph.systems、ph.ethicstheory、ph.parts）。

test.describe("正式 build", () => {
  test("index 只有已發布，草稿頁 404，已發布頁不含草稿標題", async ({ request }) => {
    const expected = Number(process.env.E2E_PUBLISHED_COUNT ?? "0");
    const index = await request.get("/kp/index.json");
    expect(index.status()).toBe(200);
    const rows = (await index.json()) as unknown[];
    expect(rows).toHaveLength(expected);

    // B19 發布 pm.stakeholder@sh 後，404 頁改用它的下一階草稿 pm.business@uni；B20 發布 pm.business@uni 後，404 頁改用它 links.why 連到的哲學草稿 ph.applied@uni。
    const applied = await request.get("/kp/ph.applied/uni");
    expect(applied.status()).toBe(404);
    expect(await applied.text()).not.toContain("應用倫理：科技、商業與專業責任");

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
    // B21 發布 ph.parts@es 後，pm.breakdown@es 的 links.why 帶出它的標題。
    expect(html).toContain("部分與整體");
    // B21 起 pm.breakdown@es 的連結都已發布；「尚未發布」只標示不帶標題，改看 ph.parts@es 連到的下一階草稿 ph.feedback@jh。
    expect(html).not.toContain("尚未發布");
    const parts = await (await request.get("/kp/ph.parts/es")).text();
    expect(parts).toContain("尚未發布");
    expect(parts).not.toContain("（尚未發布）");
    expect(parts).not.toContain("因果鏈與回饋迴圈");
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
    // B20：專案管理 24 點全部發布（pm.org 等也是路線 id），改查 pm uni 5 點連過去、仍是草稿的哲學點 ph.applied、ph.epistem、ph.complex、ph.aimind，以及 ph.parts、ph.systems、ph.ethicstheory。
    // B21：哲學 es 5 點發布後多顯示 6 條哲學路線，ph.systems、ph.epistemology 是路線 id（ph.epistem 是 ph.epistemology 的前綴），ph.parts 已發布，不再當草稿 slug 檢查；改查 es 5 點 links.deeper 連到、仍是草稿的 ph.feedback、ph.hypothesis、ph.evidence、ph.fallacy。
    const slugs = ["ph.applied", "ph.feedback", "ph.hypothesis", "ph.evidence", "ph.fallacy", "ph.complex", "ph.aimind", "ph.ethicstheory"];
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
    expect(mapHtml).not.toContain("因果鏈與回饋迴圈");

    for (const path of ["/city-home", "/"]) {
      const page = await request.get(path);
      expect(page.status(), path).toBe(200);
      const html = await page.text();
      expect(html, path).toContain("先選學門，再從上往下看");
      expect(html, path).toContain("規律與關係");
      expect(html, path).toContain("ma.pattern");
      expect(html, path).toContain("分工與說到做到");
      expect(html, path).toContain("什麼是「專案」？");
      // B19 發布 pm.stakeholder@sh 後，首頁畫出它；B20 再畫出它的下一階 pm.business@uni。
      // 專案管理已沒有草稿；哲學圖本來就畫草稿（不在只畫已發布的圖裡），所以不露出的改用只畫已發布的軟實力圖裡仍是草稿的 sk.mediate@uni。
      expect(html, path).toContain("利害關係人");
      expect(html, path).toContain("商業論證與專案治理");
      expect(html, path).not.toContain("當調解人：幫兩方聽懂彼此");
      expect(html, path).not.toContain("draft-");
      expect(html, path).not.toContain("城市");
    }
  });
});
