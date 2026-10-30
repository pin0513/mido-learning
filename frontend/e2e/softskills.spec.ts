import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";
import { loadContent } from "../lib/content/load";

/**
 * KP_SOFTSKILLS_ENABLED=true 且 KP_HOME_ENABLED=true 時才跑（E2E_SOFTSKILLS=1）。
 * 旗標關掉的四格切換在 city-home.spec.ts。
 */
// B25 發布同理、解題的國小 6 點：標題移到 PUBLISHED_BRANCHES，在自己那條線上要看得到（talk 頁的 sk.discuss@jh 先學會帶出「專心聽，再說回來」，所以不再當草稿查）。
// B26 發布同理、解題的國中 6 點：同樣移到 PUBLISHED_BRANCHES；草稿只剩高中、大學 10 點。
// B27 發布同理、解題的高中 6 點：同樣移到 PUBLISHED_BRANCHES；草稿只剩大學 4 點。
// B28 發布同理、解題的大學 4 點（sk.coach、sk.mediate、sk.a3、sk.hypo）：同樣移到 PUBLISHED_BRANCHES。
// B28 發布大學 4 點後，溝通與解決問題 33 點全部發布，沒有草稿標題可查：草稿標題改成每次從 content/ 算，
// 檢查拆成下面「沒有草稿標題」一則，清單是空的時候明確 skip 並寫原因（報表看得到），不在大迴圈裡空跑成通過。
const { errors: loadErrors, model } = loadContent(join(process.cwd(), "content"));
if (loadErrors.length > 0 || !model) throw new Error(loadErrors.join("\n") || "content 載入失敗");
const DRAFT_TITLES = model.points.filter((point) => point.folder === "soft-skills" && point.status !== "published").map((point) => point.title);

const PUBLISHED_BRANCHES: [string, string, string[]][] = [
  ["emp", "同理與溝通", ["說出感覺：我覺得……因為……", "專心聽，再說回來", "換個位置想", "同理心地圖：說、想、做、感受", "我訊息：說感受，不指責", "非暴力溝通：觀察、感受、需要、請求", "困難對話：先處理情緒，再處理事情", "同理訪談：問開放式問題", "給回饋，也收回饋", "教練式對話：用提問陪對方找答案", "當調解人：幫兩方聽懂彼此"]],
  ["solve", "解決問題", ["問題是什麼？現在和想要", "問五次為什麼", "解題四步：看懂、想法、動手、回頭看", "PDCA：計畫、執行、檢查、改進", "問題樹：大問題拆成小問題", "魚骨圖：把原因分類找", "用資料找真正原因", "選方案：準則、權重、取捨", "設計思考：從同理到原型", "一頁問題報告：帶團隊從問題到行動", "假說驅動：先猜答案，再用資料檢驗"]],
];

const BANNED = ["城市", "街道", "市區", "地標", "廣場", "環路"];

const PAGES = [
  "/",
  "/?d=pm-leadership",
  "/?d=philosophy",
  "/?d=math",
  "/?d=it-ai",
  "/?d=language",
  "/?d=soft-skills",
  "/?d=soft-skills&b=talk",
  "/?d=soft-skills&b=emp",
  "/?d=soft-skills&b=solve",
  "/kp",
  "/kp/map",
  "/kp/sk.voice/es",
];

test.describe("溝通與解決問題", () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_SOFTSKILLS, "KP_SOFTSKILLS_ENABLED 沒開");
  });

  for (const width of [1280, 390]) {
    test(`${width} 沒有禁用字、準備中不能點、切換格數正確`, async ({ page }) => {
      test.setTimeout(120_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("requestfailed", (request) => {
        const url = request.url();
        const reason = request.failure()?.errorText ?? "";
        if (/analytics|8080|firebase|favicon/i.test(url)) return;
        // 換頁時 Next 會取消還沒回來的 prefetch（_rsc）。
        if (reason.includes("ERR_ABORTED") || url.includes("_rsc=")) return;
        errors.push(`${reason || "failed"} ${url}`);
      });
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const text = message.text();
        if (/analytics|8080|firebase|favicon|ERR_CONNECTION_REFUSED/i.test(text)) return;
        errors.push(text);
      });
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });

      for (const path of PAGES) {
        const response = await page.goto(path, { waitUntil: "networkidle" });
        expect(response?.status(), path).toBe(200);
        const html = await page.content();
        for (const word of BANNED) expect(html, `${path} ${word}`).not.toContain(word);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, path).toBeLessThanOrEqual(1);
        await expect(page.getByRole("button", { name: "開啟學習願望聊天" })).toHaveCount(0);
        await expect(page.getByText("許個學習願望吧！")).toHaveCount(0);
      }

      const index = await page.request.get("/kp/index.json");
      expect(index.status()).toBe(200);
      const indexRows = (await index.json()) as { id: string }[];
      expect(indexRows.some((row) => row.id === "sk.voice@es")).toBe(true);

      await page.goto("/?d=soft-skills&b=talk", { waitUntil: "networkidle" });
      const slots = page.getByTestId("discipline-switch").locator(".hv2-sg");
      await expect(slots).toHaveCount(6);
      const links = page.getByTestId("discipline-switch").locator("a");
      await expect(links).toHaveCount(5);
      const languageSlot = page.getByTestId("discipline-switch").locator(".hv2-sg", { hasText: "語文" });
      await expect(languageSlot).toHaveCount(1);
      expect(await languageSlot.evaluate((node) => node.tagName)).toBe("SPAN");
      await expect(languageSlot).toContainText("準備中");
      const rows = await slots.evaluateAll((nodes) => {
        const tops = nodes.map((node) => Math.round(node.getBoundingClientRect().top));
        return [...new Set(tops)];
      });
      if (width === 1280) expect(rows.length).toBe(1);
      else expect(rows.length).toBe(2);

      // B27 起三條線上的先學全部已發布，首頁沒有「準備中」的先學；「準備中」不能點改由 home-diagram.test.ts 的合成測試守住（只查資料層的 href）。
      // 所以下面的迴圈目前跑 0 次。瀏覽器層「prior-pending 不在 <a> 裡」的檢查要等再有草稿先學、或改用合成內容的 build 時補回（列在 B27 PR 的後續）。
      const pending = page.getByTestId("prior-pending");
      expect(await pending.count()).toBe(0);
      for (const tag of await pending.all()) {
        expect(await tag.evaluate((node) => node.tagName === "A" || node.closest("a") != null)).toBe(false);
      }
      // B25：同理、解題兩條線都有已發布的國小點，切換列不再有鎖住的格子。
      const locked = page.getByTestId("branch-switch").locator("[aria-disabled='true']");
      await expect(locked).toHaveCount(0);
      await expect(page.getByTestId("branch-switch").locator("a")).toHaveCount(3);

      for (const [branch, name, titles] of PUBLISHED_BRANCHES) {
        await page.goto(`/?d=soft-skills&b=${branch}`, { waitUntil: "networkidle" });
        await expect(page.getByRole("heading", { name: `${name}正在準備中` })).toHaveCount(0);
        for (const title of titles) await expect(page.getByText(title, { exact: true }).first(), `${branch} ${title}`).toBeVisible();
        await assertLabelsClear(page);
      }

      await page.goto("/?d=soft-skills&b=talk", { waitUntil: "networkidle" });
      await assertLabelsClear(page);
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }
});

test.describe("溝通與解決問題的草稿", () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_SOFTSKILLS, "KP_SOFTSKILLS_ENABLED 沒開");
  });

  // B28 前是首頁大迴圈裡的 DRAFT_TITLES 檢查；B28 起軟實力沒有草稿，清單空了就明確 skip。草稿不露出的長期守門在 city.test.ts、home-diagram.test.ts、hidden-notice.test.ts（合成內容）。
  test("首頁與地圖沒有軟實力草稿標題", async ({ page }) => {
    test.skip(DRAFT_TITLES.length === 0, "溝通與解決問題已沒有草稿（B28 起 33/33 發布）；草稿標題不露出由 city.test.ts、home-diagram.test.ts、hidden-notice.test.ts 的合成內容守住");
    for (const path of PAGES) {
      const response = await page.goto(path, { waitUntil: "networkidle" });
      expect(response?.status(), path).toBe(200);
      const html = await page.content();
      for (const title of DRAFT_TITLES) expect(html, `${path} ${title}`).not.toContain(title);
    }
  });

  // B16 已發布資訊與 AI 大學 6 點；仍是草稿、to_verify、沒有課綱對應的大學點只剩溝通與解決問題，原本 kp.spec.ts 對 it.nn@uni 的檢查移到這裡。
  // B28 發布 sk.hypo@uni（to_verify: false）後，舊版頁的「草稿」與「課綱對應待核對」標記已沒有真實的大學草稿；改查它發布後沒有草稿標記、沒有課綱區塊、沒有待核對。
  // 「草稿」標記在這個行程已沒有真實樣本（全站 241 點都已發布）；草稿與待核對的組合由 review-state.test.ts 的合成內容守住。
  test("sk.hypo@uni 已發布：沒有草稿標記、沒有課綱區塊、沒有待核對", async ({ page }) => {
    const response = await page.goto("/kp/sk.hypo/uni");
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId("kp-draft")).toHaveCount(0);
    await expect(page.getByTestId("kp-curriculum")).toHaveCount(0);
    await expect(page.getByTestId("kp-to-verify")).toHaveCount(0);
    await expect(page.getByTestId("kp-license-body")).toBeEmpty();
  });
});

async function assertLabelsClear(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const view = page.viewportSize()?.height ?? 800;
  for (let top = 0; top < height; top += Math.floor(view * 0.7)) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
    const problem = await page.evaluate(() => {
      const labels = [...document.querySelectorAll<HTMLElement>(".hv2-lb")];
      for (const label of labels) {
        const rect = label.getBoundingClientRect();
        if (rect.bottom < 8 || rect.top > window.innerHeight - 8 || rect.width < 8) continue;
        const x = rect.left + rect.width / 2;
        const y = Math.min(Math.max(rect.top + Math.min(18, rect.height / 2), 1), window.innerHeight - 1);
        const hit = document.elementFromPoint(x, y);
        if (!hit || (!label.contains(hit) && hit !== label)) return `covered:${label.innerText.slice(0, 24)}`;
      }
      const wires = [...document.querySelectorAll<SVGPathElement>(".hv2-wires path")];
      for (const wire of wires) {
        const length = wire.getTotalLength?.() ?? 0;
        if (length < 4) continue;
        const steps = Math.max(6, Math.ceil(length / 16));
        const matrix = wire.getScreenCTM();
        if (!matrix) continue;
        for (let index = 0; index <= steps; index += 1) {
          const point = wire.getPointAtLength((length * index) / steps);
          const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
          for (const label of labels) {
            const rect = label.getBoundingClientRect();
            if (screen.x < rect.left + 2 || screen.x > rect.right - 2) continue;
            if (screen.y < rect.top + 2 || screen.y > rect.bottom - 2) continue;
            return `wire:${label.innerText.slice(0, 24)}`;
          }
        }
      }
      const nodes = [...document.querySelectorAll<HTMLElement>(".hv2-node")];
      for (const node of nodes) {
        const ids = (node.dataset.prereqIds ?? "").split(" ").filter(Boolean);
        const anchor = node.querySelector<HTMLElement>("[data-anchor]");
        if (!anchor) continue;
        const y = anchor.getBoundingClientRect().top;
        for (const id of ids) {
          const previous = document.querySelector<HTMLElement>(`[data-anchor="${CSS.escape(id)}"]`);
          if (!previous) continue;
          if (previous.getBoundingClientRect().top >= y) return `order:${id}`;
        }
      }
      return "";
    });
    expect(problem).toBe("");
  }
}
