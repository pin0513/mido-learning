import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { loadContent } from "../lib/content/load";
import { folderLaunched } from "./folder-flags";

/**
 * 詳細頁 V2。視覺斷言只在 KP_DETAIL_V2_ENABLED=true 時跑。
 * 旗標關掉時，同一支測試確認舊頁還在，並且直連 /kp-v2 是 404。
 * 草稿頁（數學、資訊）只有 KP_INCLUDE_DRAFTS 的建置才有，沒有就略過。
 */
const V2 = process.env.KP_DETAIL_V2_ENABLED === "true";

const PAGES: { path: string; layer: string; verify: boolean; converted?: boolean }[] = [
  // 待核對補證：zh.zhuyin@es 補上反拼法的出處，to_verify 改為 false；「已轉換＋待核對」的真實樣本改由 zh.syntax@jh（to_verify 維持 true）覆蓋。
  { path: "/kp/zh.zhuyin/es", layer: "基礎", verify: false, converted: true },
  { path: "/kp/zh.syntax/jh", layer: "基礎", verify: true, converted: true },
  // PM 審查：zh.format@es 的 clreq 撐不起稿紙規定，to_verify 改回 true，也當「已轉換＋待核對」的樣本。
  { path: "/kp/zh.format/es", layer: "基礎", verify: true, converted: true },
  { path: "/kp/pm.breakdown/es", layer: "本質", verify: false, converted: true },
  { path: "/kp/ph.reason/es", layer: "本質", verify: false, converted: true },
  // B21 已轉換並發布哲學 es 5 點；ph.fair@es 是兩個領域（國語文、綜合活動）的國小點。
  { path: "/kp/ph.fair/es", layer: "本質", verify: false, converted: true },
  // B22 已轉換並發布哲學 jh 6 點；ph.hypothesis@jh 是自然科學與數學兩個領域的國中點（學習表現代碼都是小寫字母開頭）。
  { path: "/kp/ph.hypothesis/jh", layer: "本質", verify: false, converted: true },
  // B23 已轉換並發布哲學 sh 7 點；ph.systems@sh 是社會與自然科學兩個領域的高中點（自然科學代碼 tm-Vc-1 是第五學習階段的 Vc）。
  { path: "/kp/ph.systems/sh", layer: "本質", verify: false, converted: true },
  { path: "/kp/sk.voice/es", layer: "本質", verify: false, converted: true },
  { path: "/kp/en.abc/es", layer: "基礎", verify: false, converted: true },
  // B11 已轉換並發布 ma.number@es（to_verify: false）；B16 已轉換並發布 it.nn@uni（進階層，to_verify: false）。
  // 進階層已沒有草稿；未轉換的大學草稿改由 ph.aimind@uni（to_verify: false）與 sk.hypo@uni（to_verify: true，溝通與解決問題旗標開啟才產生）覆蓋。
  // B24 已轉換並發布哲學 uni 6 點（含 ph.aimind@uni）；未轉換的大學草稿只剩 sk.hypo@uni（to_verify: true）。未轉換又不待核對的草稿已沒有真實樣本。
  { path: "/kp/ma.number/es", layer: "本質", verify: false, converted: true },
  { path: "/kp/it.nn/uni", layer: "進階", verify: false, converted: true },
  { path: "/kp/ph.aimind/uni", layer: "本質", verify: false, converted: true },
  // B28 已轉換並發布 sk.hypo@uni（to_verify: false），這一列改成已轉換；未轉換的真實頁改由下面「未轉換的真實頁」從 content/ 算。
  { path: "/kp/sk.hypo/uni", layer: "本質", verify: false, converted: true },
  // B14 已轉換並發布 it.blocks@es（to_verify: false）；仍是草稿、to_verify、未轉換的國小點改由 sk.listen@es 覆蓋。
  // B25 已轉換並發布 sk.listen@es（to_verify: false），軟實力國小已沒有草稿；未轉換又待核對的樣本只剩上面的 sk.hypo@uni。
  // B26：sk.hypo@uni 發布後這一列會變成已轉換（B28 已改）；未轉換／待核對的三種組合改由 components/kp/v2/review-state.test.ts 的合成內容守住（不靠真實草稿）。
  { path: "/kp/it.blocks/es", layer: "基礎", verify: false, converted: true },
  { path: "/kp/sk.listen/es", layer: "本質", verify: false, converted: true },
];

// Playwright 從 frontend/ 執行（playwright.config.ts 所在）。
const { errors, model } = loadContent(join(process.cwd(), "content"));
if (errors.length > 0 || !model) throw new Error(errors.join("\n") || "content 載入失敗");
const UNCONVERTED = model.points.filter((point) => !(point.why && point.how && point.what));
// 學門旗標在 e2e/folder-flags.ts（照 isFolderLaunched 寫，lib/kp/folder-flags.test.ts 守住兩邊一致）。
const DRAFTS_BUILT = process.env.KP_INCLUDE_DRAFTS === "true";

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
        if (item.converted) await expect(root).not.toContainText("內容補強中");
        else await expect(root).toContainText("內容補強中");
        await expect(root).toContainText(item.layer);
        await expect(root.locator("dt", { hasText: "難度" })).toHaveCount(0);
        const visible = await root.innerText();
        expect(visible.replaceAll("在家長", "")).not.toContain("在家");
        if (item.verify) await expect(root.locator(".v2-status", { hasText: "待核對" })).toBeVisible();
        else await expect(root.locator(".v2-status", { hasText: "待核對" })).toHaveCount(0);
        const headings = await page.getByTestId("v2-aside").locator("h2").allTextContents();
        expect(headings.at(-1)).toBe("審閱狀態");
        const crumbGaps = await page.locator(".v2-crumbs").evaluate((nav) => {
          const glyph = (el: Element, edge: "start" | "end") => {
            const nodes: Text[] = [];
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              if ((walker.currentNode.textContent || "").trim()) nodes.push(walker.currentNode as Text);
            }
            const node = edge === "end" ? nodes.at(-1) : nodes[0];
            if (!node) return null;
            const text = node.textContent || "";
            let index = edge === "end" ? text.length - 1 : 0;
            const step = edge === "end" ? -1 : 1;
            while (index >= 0 && index < text.length && /\s/.test(text[index])) index += step;
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + 1);
            const rect = range.getBoundingClientRect();
            return { x: edge === "end" ? rect.right : rect.left, y: rect.top };
          };
          const bad: string[] = [];
          for (const sep of nav.querySelectorAll(".v2-sep")) {
            const prev = sep.previousElementSibling;
            const next = sep.nextElementSibling;
            if (!prev || !next) {
              bad.push("neighbor");
              continue;
            }
            const slashL = glyph(sep, "start");
            const slashR = glyph(sep, "end");
            const before = glyph(prev, "end");
            const after = glyph(next, "start");
            if (!slashL || !slashR || !before || !after) {
              bad.push("glyph");
              continue;
            }
            if (Math.abs(before.y - slashL.y) > 8 || Math.abs(after.y - slashL.y) > 8) continue;
            const left = slashL.x - before.x;
            const right = after.x - slashR.x;
            if (Math.abs(left - right) > 1.5) bad.push(`${left.toFixed(1)}/${right.toFixed(1)}`);
          }
          return bad;
        });
        expect(crumbGaps).toEqual([]);
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
            // 內文裡的知識點連結是行內連結，依 WCAG 2.5.8 行內例外不受 44px 限制。
            if (target.matches("a.v2-ref")) continue;
            if (rect.width < 43.5 || rect.height < 43.5) {
              const label = (target.getAttribute("aria-label") || target.textContent || "").trim().slice(0, 24);
              issues.push(`small ${target.tagName} ${Math.round(rect.width)}x${Math.round(rect.height)} ${label}`);
            }
          }
          const snippet = (el: Element) => (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 24);
          const boxes = [...node.querySelectorAll("h1, h2, h3, p, li, dt, dd, figcaption, small")]
            .filter((target) => !target.closest("svg"))
            .filter((target) => target.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
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
                issues.push(`overlap ${a.target.tagName}/${b.target.tagName} ${snippet(a.target)} | ${snippet(b.target)}`);
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

  // B28（B26 待辦 R1）：sk.hypo@uni 發布後，全站知識點都已轉換，沒有寫死的未轉換真實頁可查。
  // 樣本改成每次從 content/ 算：沒有 why／how／what 的點（含草稿；草稿頁只有 KP_INCLUDE_DRAFTS 的 build 才產生）。之後再出現未轉換的點會自動查到。
  // 沒有樣本時明確 skip 並寫原因（報表看得到），不會空跑成通過；三種審閱狀態組合的長期守門在 components/kp/v2/review-state.test.ts（合成內容）。
  test("未轉換的真實頁：顯示內容補強中，待核對照 to_verify", async ({ page }) => {
    test.skip(UNCONVERTED.length === 0, "全站知識點都已轉換（B28 起沒有未轉換的點），沒有未轉換的真實頁；審閱狀態三種組合由 components/kp/v2/review-state.test.ts 的合成內容守住");
    test.info().annotations.push({ type: "unconverted", description: UNCONVERTED.map((point) => point.id).join("、") });
    let checked = 0;
    for (const point of UNCONVERTED) {
      const response = await page.goto(`/kp/${point.concept}/${point.stage}`);
      // B28：只有學門旗標關閉，或草稿而這個 build 沒帶草稿（KP_INCLUDE_DRAFTS 不是 true）時才允許 404；
      // 已發布、或帶草稿 build 的草稿，在開著的學門卻 404 就是錯。
      if (response?.status() === 404 && (!folderLaunched(point.folder) || (point.status !== "published" && !DRAFTS_BUILT))) continue;
      expect(response?.status(), point.id).toBe(200);
      const root = page.getByTestId("kp-detail-v2");
      await expect(root, point.id).toContainText("內容補強中");
      if (point.toVerify) await expect(root.locator(".v2-status", { hasText: "待核對" }), point.id).toBeVisible();
      else await expect(root.locator(".v2-status", { hasText: "待核對" }), point.id).toHaveCount(0);
      checked += 1;
    }
    test.skip(checked === 0, "未轉換的點這個 build 都沒有產生頁面（草稿或旗標關閉）；審閱狀態由 review-state.test.ts 的合成內容守住");
    expect(checked).toBeGreaterThan(0);
  });

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
