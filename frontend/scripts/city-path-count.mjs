// 讀一份 /kp/map 的 HTML，印出「標主線」下拉選單（data-testid="city-path"）裡的選項數（含「不標路線」）。
// image smoke 用：只用 Node 內建模組，不需要 pnpm install。
// 用法：node frontend/scripts/city-path-count.mjs /tmp/kp-map.html
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: city-path-count.mjs <html>");
  process.exit(2);
}
const html = readFileSync(file, "utf8");
const match = html.match(/data-testid="city-path"[^>]*>([\s\S]*?)<\/select>/);
if (!match) {
  console.error(`${file}: no city-path select`);
  process.exit(1);
}
console.log((match[1].match(/<option[\s>]/g) ?? []).length);
