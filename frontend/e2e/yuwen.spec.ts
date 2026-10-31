import { test, expect, type Page } from "@playwright/test";
import { expectMapSectors } from "./city-map-sectors";

/**
 * KP_YUWEN_ENABLED=true、KP_SOFTSKILLS_ENABLED=true、KP_HOME_ENABLED=true 時才跑（E2E_YUWEN=1）。
 */
const BANNED = ["城市", "街道", "市區", "地標", "廣場", "環路"];

const VIEWS = [
  ["basic", "zh"],
  ["read", "zh"],
  ["classic", "zh"],
  ["write", "zh"],
  ["practical", "zh"],
  ["ai", "zh"],
  ["en-talk", "en"],
  ["en-read", "en"],
  ["en-bench", "en"],
  ["ja-read", "ja"],
  ["ja-talk", "ja"],
] as const;

test.describe("語文", () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_YUWEN, "KP_YUWEN_ENABLED 沒開");
  });

  test("知識地圖六個學區：241 個節點、50 個路線選項", async ({ page }) => {
    test.setTimeout(120_000);
    await expectMapSectors(page, {
      buildings: 241,
      options: 50,
      districts: ["philosophy", "math", "pm-leadership", "soft-skills", "it-ai", "language"],
    });
  });

  test("108 個知識點與 sitemap", async ({ request }) => {
    test.setTimeout(180_000);
    const index = await request.get("/kp/index.json");
    expect(index.status()).toBe(200);
    const rows = (await index.json()) as { id: string; url: string }[];
    const language = rows.filter((row) => /^(zh|en|ja|lg)\./.test(row.id));
    expect(language).toHaveLength(108);
    for (const row of language) {
      const path = new URL(row.url).pathname;
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
    }
    const sitemap = await request.get("/sitemap.xml");
    const xml = await sitemap.text();
    const listed = xml.match(/\/kp\/(?:zh|en|ja|lg)\.[^<]+/g) ?? [];
    expect(listed.length).toBeGreaterThanOrEqual(108);

    for (const [from, to] of [["en", "en-talk"], ["ja", "ja-read"]] as const) {
      const response = await request.get(`/?d=language&b=${from}`, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(response.headers().location ?? "").toContain(`b=${to}`);
    }
  });

  for (const width of [1280, 390]) {
    test(`${width} 切換、說明與線路`, async ({ page }) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("requestfailed", (request) => {
        const url = request.url();
        const reason = request.failure()?.errorText ?? "";
        if (/analytics|8080|firebase|favicon/i.test(url)) return;
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

      await page.goto("/?d=language&b=basic", { waitUntil: "networkidle" });
      const language = page.getByTestId("discipline-switch").getByRole("link", { name: "語文" });
      await expect(language).toHaveAttribute("href", /b=basic/);
      await expect(page.getByTestId("discipline-switch").locator(".hv2-sg")).toHaveCount(6);
      await expect(page.getByRole("button", { name: "開啟學習願望聊天" })).toHaveCount(0);

      for (const [branch, kind] of VIEWS) {
        await page.goto(`/?d=language&b=${branch}`, { waitUntil: "networkidle" });
        await assertView(page, width, kind, branch);
        const html = await page.content();
        for (const word of BANNED) expect(html, word).not.toContain(word);
      }

      await page.goto("/?d=language&b=xyz", { waitUntil: "networkidle" });
      await expect(page.getByTestId("branch-switch").locator("[aria-pressed='true']")).toContainText("基礎");
      await page.goto("/?d=soft-skills&b=talk", { waitUntil: "networkidle" });
      // B25 發布同理、解題的國小點後，三條線（口語、同理、解題）都能點。
      await expect(page.getByTestId("branch-switch").locator("a")).toHaveCount(3);
      await expect(page.getByRole("heading", { name: "溝通與解決問題的學段總圖" })).toBeVisible();
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }
});

async function assertView(page: Page, width: number, kind: "zh" | "en" | "ja", branch: string) {
  await expect(page.getByTestId("language-group")).toBeVisible();
  const labels = await page.getByTestId("language-group").locator("a").allInnerTexts();
  expect(labels.map((label) => label.trim())).toEqual(["國文", "外語"]);
  if (kind === "zh") {
    await expect(page.getByTestId("language-sub")).toHaveCount(0);
    await expect(page.getByTestId("mapping-note")).toHaveCount(0);
  } else {
    await expect(page.getByTestId("language-sub")).toBeVisible();
    const sub = await page.getByTestId("language-sub").locator("a").allInnerTexts();
    expect(sub.map((label) => label.trim())).toEqual(["英文", "日文"]);
    await expect(page.getByTestId("mapping-note")).toContainText("不是官方換算");
    if (kind === "ja") await expect(page.getByTestId("mapping-note")).toContainText("JLPT");
    else await expect(page.getByTestId("mapping-note")).toContainText("美國年級");
  }
  const lines = page.getByTestId("branch-switch").locator(".yw-bt");
  await expect(lines).toHaveCount(kind === "zh" ? 6 : kind === "en" ? 3 : 2);
  const tops = await lines.evaluateAll((nodes) => [...new Set(nodes.map((node) => Math.round(node.getBoundingClientRect().top)))]);
  if (kind === "zh" && width === 390) expect(tops.length).toBe(2);
  else expect(tops.length).toBe(1);

  const problem = await page.evaluate(() => {
    const rows = ["language-group", "language-sub", "branch-switch"]
      .map((id) => document.querySelector(`[data-testid="${id}"]`))
      .filter((node): node is HTMLElement => node instanceof HTMLElement);
    let previous = -1;
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      if (rect.top < previous - 1) return "overlap";
      previous = rect.bottom;
    }
    const buttons = [...document.querySelectorAll<HTMLElement>(".yw-choice, .yw-bt")];
    for (const button of buttons) {
      const rect = button.getBoundingClientRect();
      if (rect.height < 44) return `short:${button.innerText}`;
      if (button.scrollWidth > button.clientWidth + 1 || button.scrollHeight > button.clientHeight + 1) return `clip:${button.innerText}`;
    }
    if (document.documentElement.scrollWidth - document.documentElement.clientWidth > 1) return "scroll";
    return "";
  });
  expect(problem, branch).toBe("");
  if (branch === "en-bench") await expect(page.getByTestId("milestone-card")).toContainText("不是官方換算");
  if (branch === "en-talk" || branch === "basic") await assertLabelsClear(page);
}

async function assertLabelsClear(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const view = page.viewportSize()?.height ?? 800;
  for (let top = 0; top < height; top += Math.floor(view * 0.7)) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
    const problem = await page.evaluate(() => {
      const labels = [...document.querySelectorAll<HTMLElement>(".hv2-lb")];
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
      return "";
    });
    expect(problem).toBe("");
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
}
