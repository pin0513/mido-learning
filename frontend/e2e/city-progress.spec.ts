import { test, expect } from "@playwright/test";

/**
 * HP-05 / HP-06。需要 KP_INCLUDE_DRAFTS=true 的建置，以及 KP_ENABLED=true。
 * 進度只寫 localStorage，這段操作不應該再發請求。
 */
test.describe("學習城市的主線與進度", () => {
  test("沒選主線時不畫路線，選了拆解與估算就依序標四站", async ({ page }) => {
    await page.goto("/kp/map");
    await expect(page.getByTestId("city-route")).toHaveCount(0);
    // 「不標路線」＋主線 29 條（B11 發布數學 es／jh 後多 7 條，B14 發布資訊與 AI es／jh 後再多 8 條，B17 發布專案管理 es 5 點後再多 6 條，B21 發布哲學 es 5 點後再多 6 條，同 lib/content/city.test.ts 的 landmarks.length）。
    await expect(page.getByTestId("city-path").locator("option")).toHaveCount(30);
    await page.getByTestId("city-path").selectOption({ label: "拆解與估算（有家庭時間）" });
    await expect(page.getByTestId("city-route")).toHaveCount(1);
    await expect(page.getByTestId("city-stop")).toHaveCount(4);
    const order = await page.getByTestId("city-stop").evaluateAll((nodes) =>
      nodes.map((node) => Number(node.getAttribute("data-stop"))).sort((a, b) => a - b),
    );
    expect(order).toEqual([1, 2, 3, 4]);
    await expect(page.getByRole("link", { name: "打開這條主線・有家庭時間" })).toHaveAttribute("href", "/kp/path/pm.estimate");
  });

  test("範例資料有標示，自己標記不發請求，清掉就重置", async ({ page }) => {
    await page.goto("/kp/map");
    await expect(page.getByTestId("city-progress-notice")).toContainText("範例資料");
    await page.locator('[data-building-id="pm.breakdown@es"]').click();
    await expect(page.getByTestId("city-card")).toContainText("大事拆成小事");
    await expect(page.getByText("這個節點你們一起學過。")).toBeVisible();

    const hits: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      // Next 會預抓頁首連結的 RSC。進度本身不該打 API 或 Firestore。
      if (url.includes("/_next/") || url.includes("_rsc=")) return;
      hits.push(url);
    });
    await page.getByRole("radio", { name: "自己標記" }).check();
    await page.getByLabel("大人怎麼稱呼").fill("爸爸");
    await page.getByLabel("孩子怎麼稱呼").fill("小明");
    await page.getByRole("button", { name: "爸爸在這裡" }).click();
    await page.getByRole("button", { name: "小明讀過" }).click();
    expect(hits).toEqual([]);

    await page.reload();
    await page.getByRole("radio", { name: "自己標記" }).check();
    await expect(page.getByLabel("大人怎麼稱呼")).toHaveValue("爸爸");
    await page.locator('[data-building-id="pm.breakdown@es"]').click();
    await expect(page.getByText("這個節點你們一起學過。")).toBeVisible();

    await page.getByRole("button", { name: "清除這台裝置的記號" }).click();
    await expect(page.getByLabel("大人怎麼稱呼")).toHaveValue("大人");
    const stored = await page.evaluate(() => window.localStorage.getItem("mido-city-progress"));
    expect(stored).toBeNull();
  });
});
