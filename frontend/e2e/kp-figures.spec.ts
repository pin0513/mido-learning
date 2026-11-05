import { expect, test } from "@playwright/test";

/** 互動圖：滑桿要有可讀的名稱（點標籤會聚焦），像素圖畫出來的格子要和每行的數字一致。 */
const SLIDERS: { path: string; names: string[] }[] = [
  { path: "/kp/ma.coord/jh", names: ["x 坐標（左右）", "y 坐標（上下）"] },
  { path: "/kp/ma.vector/sh", names: ["向量 v 的 x 分量", "向量 v 的 y 分量（也可以在圖上拖）"] },
  { path: "/kp/ma.derivative/uni", names: ["半徑 r（公分）"] },
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
