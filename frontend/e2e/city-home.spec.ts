import { test, expect } from "@playwright/test";

/**
 * 學門總圖。只在 KP_HOME_ENABLED=true 的行程跑（E2E_CITY_HOME=1）。
 * 旗標關閉的首頁由 kp-flags-off.spec.ts 覆蓋，這支檔案會整組跳過。
 */
const DRAFT_TITLES = [
  "部分與整體",
  // B11、B12 已發布的數學點換成仍是草稿的大學數學點。
  "極限與連續",
  "線性代數與資料",
  "認知偏誤與思考盲點",
  "積分：累積與面積",
  "機率模型與不確定性",
];

test.describe("學門總圖", () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_CITY_HOME, "KP_HOME_ENABLED 沒開");
  });

  test("切換學門會換圖，總圖不是表格", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("先選學門，再從上往下看");
    await expect(page.getByText("待定")).toHaveCount(0);
    const diagram = page.getByTestId("home-diagram");
    await expect(diagram.locator("table")).toHaveCount(0);
    await expect(diagram.getByRole("link", { name: /^大事拆成小事/ })).toBeVisible();
    await expect(diagram.getByRole("link", { name: /^時間、金錢、品質的取捨/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "數學" })).toBeVisible();
    await expect(page.getByTestId("discipline-switch").locator("a")).toHaveCount(4);
    await expect(page.getByText("溝通與解決問題")).toHaveCount(0);
    await expect(page.getByText("準備中")).toHaveCount(0);

    await page.getByRole("link", { name: "數學" }).click();
    await expect(page).toHaveURL(/[?&]d=math(?:&|$)/);
    await expect(diagram.getByRole("link", { name: /^規律與關係/ })).toBeVisible();
    // B11 把 ma.pattern@es 的引導問題改成這句（content/knowledge/math/ma.pattern/es.yaml guiding_questions[0]）。
    await expect(diagram.getByRole("link", { name: /同一串數，可能有不只一種規律嗎？/ })).toBeVisible();
    await expect(diagram.getByRole("link", { name: /^大事拆成小事/ })).toHaveCount(0);
    await expect(diagram.locator("table")).toHaveCount(0);

    await page.getByRole("link", { name: "哲學與思考方法" }).click();
    await expect(page).toHaveURL(/[?&]d=philosophy(?:&|$)/);
    await expect(diagram.getByRole("link", { name: /^部分與整體/ })).toBeVisible();
    await page.getByRole("link", { name: "資訊與 AI" }).click();
    await expect(page).toHaveURL(/[?&]d=it-ai(?:&|$)/);
    await expect(diagram.getByRole("link", { name: /^一步一步的指令/ })).toBeVisible();
    await expect(diagram.locator("table")).toHaveCount(0);
  });

  test("?d 深連結打開那個學門", async ({ page }) => {
    await page.goto("/?d=philosophy");
    await expect(page.getByRole("link", { name: "哲學與思考方法" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "哲學與思考方法的學段總圖" })).toBeVisible();
    await expect(page.getByTestId("home-diagram").getByRole("link", { name: /^好問題從/ })).toBeVisible();
    await expect(page.getByTestId("home-diagram").locator("table")).toHaveCount(0);

    await page.goto("/?d=pm-leadership");
    await expect(page.getByRole("link", { name: "專案管理與領導" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("home-diagram").getByRole("link", { name: /^WBS 與三點估算/ })).toBeVisible();
  });

  test("點圓點會打開說明，文字用原文", async ({ page }) => {
    await page.goto("/?d=pm-leadership");
    await page.getByTestId("home-diagram").getByRole("link", { name: /^WBS 與三點估算/ }).click();
    await expect(page).toHaveURL(/[?&]kp=pm\.estimate(?:%40|@)sh/);
    const detail = page.locator("[data-testid='node-detail']:visible");
    await expect(detail.getByRole("heading", { name: "WBS 與三點估算" })).toBeVisible();
    await expect(detail).toContainText("高中");
    await expect(detail).toContainText("PERT");
    await expect(detail).toContainText("先學");
    await expect(detail).toContainText("大事拆成小事");
    await expect(detail).toContainText("接下來");
    await expect(detail).toContainText("實獲值管理（EVM）");
    await expect(detail.getByRole("link", { name: "開始學" })).toHaveAttribute("href", "/kp/pm.estimate/sh");
    for (const title of DRAFT_TITLES) {
      await expect(detail).not.toContainText(title);
    }
  });

  test("目前任務連到已畫出的跨學門，不顯示準備中", async ({ page }) => {
    await page.goto("/?view=task");
    const task = page.getByTestId("task-view");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("目前任務：拆解與估算");
    await expect(task.getByRole("link", { name: /部分與整體/ })).toHaveAttribute("href", /d=philosophy/);
    await expect(task.getByRole("link", { name: /規律與關係/ })).toHaveAttribute("href", /d=math/);
    await expect(task).toContainText("大事拆成小事");
    await expect(task).not.toContainText("準備中");
    await expect(task.locator("table")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("目標：我們想完成什麼");
  });

  test("手機上四個學門都不橫向溢出", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const id of ["pm-leadership", "philosophy", "math", "it-ai"]) {
      await page.goto(`/?d=${id}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await expect(page.getByText("準備中")).toHaveCount(0);
    }
  });

  test("學段名稱不會被線路蓋住", async ({ page }) => {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const id of ["pm-leadership", "philosophy", "math", "it-ai"]) {
        await page.goto(`/?d=${id}`);
        const diagram = page.getByTestId("stage-diagram");
        await expect(diagram.getByTestId("stage-label").first()).toBeVisible();
        await expect(diagram.locator(".hv2-wires")).toBeVisible();
        const hits = await diagram.evaluate((root) => {
          const boxesOf = (selector: string) =>
            [...root.querySelectorAll(selector)].map((el) => {
              const box = el.getBoundingClientRect();
              return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, text: (el.textContent ?? "").slice(0, 24) };
            });
          const labels = boxesOf("[data-testid='stage-label']");
          const texts = boxesOf(".hv2-node .hv2-lb");
          const columns = [...root.querySelectorAll("[data-testid='stage-label-column']")].map((el) => el.getBoundingClientRect());
          const dots = [...root.querySelectorAll(".hv2-node .hv2-fx")].map((el) => el.getBoundingClientRect());
          const rootBox = root.getBoundingClientRect();
          const rail = columns.length > 0 && columns.every((box) => box.width < rootBox.width * 0.6);
          const edge = rail ? Math.max(...columns.map((box) => box.right)) : null;
          const inside = (x: number, y: number, box: { left: number; top: number; right: number; bottom: number }) =>
            x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
          const found: string[] = [];
          const leftOfColumn: number[] = [];
          const arrivals: boolean[] = dots.slice(1).map(() => false);
          const note = (x: number, y: number) => {
            if (edge !== null && x < edge - 0.5) leftOfColumn.push(Math.round(x - edge));
            for (const column of columns) if (inside(x, y, column)) found.push("column");
            for (const label of labels) if (inside(x, y, label)) found.push(label.text);
            for (const text of texts) if (inside(x, y, text)) found.push(text.text);
            dots.slice(1).forEach((dot, index) => {
              const cx = dot.left + dot.width / 2;
              const cy = dot.top + dot.height / 2;
              if (Math.abs(x - cx) <= 8 && y < cy - 10 && y > cy - 36) arrivals[index] = true;
            });
          };
          for (const path of root.querySelectorAll(".hv2-wires path")) {
            if (path.closest("defs") || !(path instanceof SVGPathElement)) continue;
            const matrix = path.getScreenCTM();
            if (!matrix) continue;
            const bbox = path.getBBox();
            const left = new DOMPoint(bbox.x, bbox.y).matrixTransform(matrix);
            if (edge !== null && left.x < edge - 0.5) leftOfColumn.push(Math.round(left.x - edge));
            const length = path.getTotalLength();
            const step = Math.max(3, length / 240);
            for (let distance = 0; distance <= length; distance += step) {
              const point = path.getPointAtLength(distance);
              const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
              note(screen.x, screen.y);
            }
          }
          for (const dot of root.querySelectorAll(".hv2-wires circle")) {
            const box = dot.getBoundingClientRect();
            note(box.left + box.width / 2, box.top + box.height / 2);
            if (edge !== null && box.left < edge - 0.5) leftOfColumn.push(Math.round(box.left - edge));
          }
          return { found, leftOfColumn, arrivals };
        });
        expect(hits.found, `${id} @ ${width} wire over text or label column`).toEqual([]);
        expect(hits.leftOfColumn, `${id} @ ${width} wires left of label column`).toEqual([]);
        expect(hits.arrivals, `${id} @ ${width} spine reaches the next node`).not.toContain(false);
      }
    }
  });

  test("先學的點畫在依賴它的點上面", async ({ page }) => {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const id of ["pm-leadership", "philosophy", "math", "it-ai"]) {
        await page.goto(`/?d=${id}`);
        const diagram = page.getByTestId("stage-diagram");
        await expect(diagram.getByTestId("stage-label").first()).toBeVisible();
        const legend = page.locator("[aria-label='圖例']");
        await expect(legend).toContainText("先學");
        await expect(legend).not.toContainText("可以延伸");
        const order = await diagram.evaluate((root) => {
          const nodes = [...root.querySelectorAll(".hv2-node")];
          const topOf = new Map<string, number>();
          for (const node of nodes) {
            const anchor = node.querySelector("[data-anchor]")?.getAttribute("data-anchor");
            if (anchor) topOf.set(anchor, node.getBoundingClientRect().top);
          }
          const failures: string[] = [];
          for (const node of nodes) {
            const anchor = node.querySelector("[data-anchor]")?.getAttribute("data-anchor");
            const prereqs = (node.getAttribute("data-prereq-ids") ?? "").split(" ").filter(Boolean);
            for (const prereq of prereqs) {
              const above = topOf.get(prereq);
              const here = anchor ? topOf.get(anchor) : undefined;
              if (above === undefined || here === undefined || above >= here - 8) failures.push(`${prereq} -> ${anchor}`);
            }
          }
          const dashed = [...root.querySelectorAll(".hv2-wires path")].filter((path) => path.getAttribute("stroke-dasharray")).length;
          return { failures, dashed };
        });
        expect(order.failures, `${id} @ ${width}`).toEqual([]);
        expect(order.dashed, `${id} @ ${width} dashed wire`).toBe(0);
      }
    }
  });

  test("沒開許願開關時，頁面上沒有浮動許願按鈕", async ({ page }) => {
    test.skip(process.env.WISH_FAB_ENABLED === "true", "這支測的是開關沒開");
    const discipline = (name: string) => page.getByTestId("discipline-switch").getByRole("link", { name, exact: true });
    const pages = [
      { path: "/", ready: page.getByRole("heading", { level: 1, name: "先選學門，再從上往下看" }) },
      { path: "/?d=pm-leadership", ready: discipline("專案管理與領導") },
      { path: "/?d=philosophy", ready: discipline("哲學與思考方法") },
      { path: "/?d=math", ready: discipline("數學") },
      { path: "/?d=it-ai", ready: discipline("資訊與 AI") },
      { path: "/kp", ready: page.getByRole("heading", { level: 1, name: "知識地圖" }) },
      { path: "/kp/map", ready: page.getByRole("heading", { level: 1, name: "知識地圖" }) },
    ];
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      for (const entry of pages) {
        const wishFlag = page.waitForResponse((response) => response.url().includes("/api/wish-fab") && response.request().method() === "GET");
        await page.goto(entry.path);
        const flag = await wishFlag;
        expect(flag.ok(), entry.path).toBe(true);
        expect((await flag.json()).enabled, entry.path).toBe(false);
        await expect(entry.ready, entry.path).toBeVisible();
        await expect(page.getByRole("button", { name: "開啟學習願望聊天" }), entry.path).toHaveCount(0);
        await expect(page.getByRole("button", { name: "關閉聊天" }), entry.path).toHaveCount(0);
        await expect(page.getByText("許個學習願望吧！", { exact: true }), entry.path).toHaveCount(0);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${entry.path} @ ${width}`).toBeLessThanOrEqual(1);
      }
    }
  });

  test("手機點圓點，說明在圖裡面展開", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?d=pm-leadership");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByTestId("home-diagram").getByRole("link", { name: /^大事拆成小事/ }).click();
    const detail = page.locator("[data-testid='node-detail']:visible");
    await expect(detail).toContainText("一件大事看起來很難");
    await expect(detail).toContainText("想一想：一件事要拆到多小，才知道明天就能開始做？");
    const inside = await detail.evaluate((node) => Boolean(node.closest("[data-testid='home-diagram']")));
    expect(inside).toBe(true);
  });
});
