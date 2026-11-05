import { expect, test } from "@playwright/test";

/** 互動圖：滑桿要有可讀的名稱（點標籤會聚焦），像素圖畫出來的格子要和每行的數字一致。 */
// 只跑本機或預覽站：沒設 E2E_BASE_URL 時整支略過，不會誤打到正式站。
test.skip(!process.env.E2E_BASE_URL, "需要 E2E_BASE_URL（本機或預覽站）");

const SLIDERS: { path: string; names: string[] }[] = [
  { path: "/kp/ma.coord/jh", names: ["x 坐標（左右）", "y 坐標（上下）"] },
  { path: "/kp/ma.vector/sh", names: ["向量 v 的 x 分量", "向量 v 的 y 分量（也可以在圖上拖）"] },
  { path: "/kp/ma.derivative/uni", names: ["半徑 r（公分）"] },
  { path: "/kp/ma.similar/jh", names: ["旗桿影長（公尺）"] },
  { path: "/kp/ma.prob/jh", names: ["擲幾次"] },
  { path: "/kp/ma.stats/sh", names: ["正面至少幾次"] },
  { path: "/kp/ma.diffeq/uni", names: ["溫差減半要幾分鐘"] },
  { path: "/kp/ma.proof/sh", names: ["前幾個奇數 n"] },
  { path: "/kp/ma.pattern/es", names: ["排幾個三角形"] },
];

for (const { path, names } of SLIDERS) {
  test(`滑桿有名稱 ${path}`, async ({ page }) => {
    await page.goto(path);
    for (const name of names) {
      const slider = page.getByRole("slider", { name, exact: true });
      await expect(slider).toHaveCount(1);
      await page.locator("label", { hasText: name }).first().click();
      await expect(slider).toBeFocused();
    }
  });
}

test("像素圖的格子和每行數字一致", async ({ page }) => {
  await page.goto("/kp/it.data/es");
  const fig = page.locator("figure.kpfig");
  const rowsOf = async () => fig.getByRole("textbox").evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
  const drawn = async () => fig.locator("svg rect").evaluateAll((els) => {
    const n = Math.round(Math.sqrt(els.length));
    return Array.from({ length: n }, (_, r) => els.slice(r * n, r * n + n).map((el) => (el.getAttribute("class")?.includes("fill-white") ? "1" : "0")).join(""));
  });
  const rows = await rowsOf();
  expect(rows).toHaveLength(8);
  expect(await drawn()).toEqual(rows);
  // 點一格，數字跟著變；打短的數字，沒打到的格子保留原值。
  await fig.locator("svg rect").first().click();
  expect((await rowsOf())[0][0]).not.toBe(rows[0][0]);
  const second = fig.getByRole("textbox", { name: "第 2 行的數字" });
  await second.fill("0");
  expect((await rowsOf())[1]).toBe("0" + rows[1].slice(1));
  expect(await drawn()).toEqual(await rowsOf());
});

test("像素圖每行是覆寫模式：退格、清空都不會讓格子位移", async ({ page }) => {
  await page.goto("/kp/it.data/es");
  const box = page.locator("figure.kpfig").getByRole("textbox", { name: "第 3 行的數字" });
  const before = await box.inputValue();
  await box.click();
  await box.press("End");
  await box.press("ArrowLeft");
  await box.press("ArrowLeft");
  await box.press("Backspace");
  await box.press("Backspace");
  await expect(box).toHaveValue(before);
  await box.press("Home");
  await box.pressSequentially(before[0] === "1" ? "0" : "1");
  const flipped = (before[0] === "1" ? "0" : "1") + before.slice(1);
  await expect(box).toHaveValue(flipped);
  await box.press("ControlOrMeta+a");
  await box.press("Delete");
  await expect(box).toHaveValue(flipped);
});
