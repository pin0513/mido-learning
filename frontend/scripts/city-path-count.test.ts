import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { countPathOptions } from "./city-path-count.mjs";

const select = (inner: string, attrs = 'data-testid="city-path"') => `<label>學習主線<select ${attrs} class="mt-1">${inner}</select></label>`;
const option = (value: string, text: string) => `<option data-path-option="" value="${value}">${text}</option>`;

test("數 city-path 選單裡帶 data-path-option 的選項（含「不標路線」）", () => {
  assert.equal(countPathOptions(select(option("", "不標路線") + option("a", "路線 A") + option("b", "路線 B"))), 3);
});

test("找不到 city-path 選單回傳 null", () => {
  assert.equal(countPathOptions("<main><select data-testid=\"other\"><option data-path-option>x</option></select></main>"), null);
  assert.equal(countPathOptions(""), null);
});

test("不被別的選單、屬性值裡的 > 與 <option、註解、script 內文騙到", () => {
  const html = [
    '<select data-testid="other">' + option("x", "別的") + "</select>",
    "<!-- <select data-testid=\"city-path\"><option data-path-option>假的</option></select> -->",
    '<script>const s = \'<select data-testid="city-path"><option data-path-option>假的</option></select>\';</script>',
    select(
      option("", "不標路線") +
        '<option data-path-option="" value="q" title="a > b <option data-path-option>">有 &gt; 的標題</option>' +
        "<!-- <option data-path-option>註解裡的</option> -->" +
        '<option data-path-option=\'\' value=\'s\'>單引號</option>' +
        "<option data-path-option value=bare>沒有引號</option>",
      'class="x" data-testid="city-path" title="</select>"',
    ),
    option("after", "選單外面的"),
  ].join("\n");
  assert.equal(countPathOptions(html), 4);
});

test("沒有 data-path-option 的 option 不算（只數地圖寫出來的主線選項）", () => {
  assert.equal(countPathOptions(select("<option>沒有標記</option>" + option("a", "A"))), 1);
});

test("CLI：印出數字；沒有選單時 exit 1", () => {
  const dir = mkdtempSync(join(tmpdir(), "city-path-"));
  const script = fileURLToPath(new URL("./city-path-count.mjs", import.meta.url));
  const good = join(dir, "good.html");
  writeFileSync(good, select(option("", "不標路線") + option("a", "A")));
  assert.equal(execFileSync(process.execPath, [script, good], { encoding: "utf8" }).trim(), "2");
  const bad = join(dir, "bad.html");
  writeFileSync(bad, "<p>no map</p>");
  assert.throws(() => execFileSync(process.execPath, [script, bad], { stdio: "pipe" }), /no city-path select/);
});
