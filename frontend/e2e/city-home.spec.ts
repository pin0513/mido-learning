import { test, expect } from "@playwright/test";

/**
 * 學門總圖。只在 KP_HOME_ENABLED=true 的行程跑（E2E_CITY_HOME=1）。
 * 旗標關閉的首頁由 kp-flags-off.spec.ts 覆蓋，這支檔案會整組跳過。
 */
const DRAFT_TITLES = [
  "部分與整體",
  "規律與關係",
  "用字母代表數：方程式",
  "認知偏誤與思考盲點",
  "統計推論：抽樣與信賴",
  "從平均變化率到瞬間變化率",
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
    await expect(diagram.getByRole("link", { name: /大事拆成小事/ })).toBeVisible();
    await expect(diagram.getByRole("link", { name: /如果預算砍一半/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "數學" })).toBeVisible();
    await expect(page.getByText("準備中")).toHaveCount(0);

    await page.getByRole("link", { name: "數學" }).click();
    await expect(page).toHaveURL(/[?&]d=math(?:&|$)/);
    await expect(diagram.getByRole("link", { name: /規律與關係/ })).toBeVisible();
    await expect(diagram.getByRole("link", { name: /你怎麼確定第 100 個/ })).toBeVisible();
    await expect(diagram.getByRole("link", { name: /大事拆成小事/ })).toHaveCount(0);
    await expect(diagram.locator("table")).toHaveCount(0);

    await page.getByRole("link", { name: "哲學與思考方法" }).click();
    await expect(page).toHaveURL(/[?&]d=philosophy(?:&|$)/);
    await expect(diagram.getByRole("link", { name: /部分與整體/ })).toBeVisible();
    await page.getByRole("link", { name: "資訊與 AI" }).click();
    await expect(page).toHaveURL(/[?&]d=it-ai(?:&|$)/);
    await expect(diagram.getByRole("link", { name: /一步一步的指令/ })).toBeVisible();
    await expect(diagram.locator("table")).toHaveCount(0);
  });

  test("?d 深連結打開那個學門", async ({ page }) => {
    await page.goto("/?d=philosophy");
    await expect(page.getByRole("link", { name: "哲學與思考方法" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "哲學與思考方法的學段總圖" })).toBeVisible();
    await expect(page.getByTestId("home-diagram").getByRole("link", { name: /好問題從/ })).toBeVisible();
    await expect(page.getByTestId("home-diagram").locator("table")).toHaveCount(0);

    await page.goto("/?d=pm-leadership");
    await expect(page.getByRole("link", { name: "專案管理與領導" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("home-diagram").getByRole("link", { name: /WBS 與三點估算/ })).toBeVisible();
  });

  test("點圓點會打開說明，文字用原文", async ({ page }) => {
    await page.goto("/?d=pm-leadership");
    await page.getByTestId("home-diagram").getByRole("link", { name: /WBS 與三點估算/ }).click();
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

  test("手機點圓點，說明在圖裡面展開", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?d=pm-leadership");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByTestId("home-diagram").getByRole("link", { name: /大事拆成小事/ }).click();
    const detail = page.locator("[data-testid='node-detail']:visible");
    await expect(detail).toContainText("一件大事看起來很難");
    await expect(detail).toContainText("想一想：一件事要拆到多小，才知道明天就能開始做？");
    const inside = await detail.evaluate((node) => Boolean(node.closest("[data-testid='home-diagram']")));
    expect(inside).toBe(true);
  });
});
