// 讀一份 /kp/map 的 HTML，印出「學習主線」下拉選單（data-testid="city-path"）裡的選項數（含「不標路線」）。
// 選項都帶 data-path-option；這裡用一個小的 HTML tokenizer 走過標籤（認得註解、引號裡的 >、script／style 內文），
// 只數 city-path 這個 <select> 裡帶 data-path-option 的元素，不靠一條正規表示式猜。
// image smoke 用：只用 Node 內建模組，不需要 pnpm install。
// 用法：node frontend/scripts/city-path-count.mjs /tmp/kp-map.html
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** 把 HTML 切成開始標籤與結束標籤（文字略過）。屬性值會解開引號；沒有值的屬性是 ""。 */
export function* tags(html) {
  let i = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt < 0) return;
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (html[lt + 1] === "!" || html[lt + 1] === "?") {
      const end = html.indexOf(">", lt);
      i = end < 0 ? n : end + 1;
      continue;
    }
    const closing = html[lt + 1] === "/";
    let j = lt + (closing ? 2 : 1);
    const nameStart = j;
    while (j < n && /[A-Za-z0-9:-]/.test(html[j])) j += 1;
    const name = html.slice(nameStart, j).toLowerCase();
    if (!name) {
      // 不是標籤（例如文字裡的「a < b」）。
      i = lt + 1;
      continue;
    }
    const attrs = new Map();
    let selfClosing = false;
    while (j < n && html[j] !== ">") {
      const ch = html[j];
      if (/\s/.test(ch)) {
        j += 1;
        continue;
      }
      if (ch === "/") {
        selfClosing = true;
        j += 1;
        continue;
      }
      const attrStart = j;
      while (j < n && !/[\s=>/]/.test(html[j])) j += 1;
      const attr = html.slice(attrStart, j).toLowerCase();
      while (j < n && /\s/.test(html[j])) j += 1;
      let value = "";
      if (html[j] === "=") {
        j += 1;
        while (j < n && /\s/.test(html[j])) j += 1;
        const quote = html[j];
        if (quote === '"' || quote === "'") {
          const end = html.indexOf(quote, j + 1);
          value = html.slice(j + 1, end < 0 ? n : end);
          j = end < 0 ? n : end + 1;
        } else {
          const valueStart = j;
          while (j < n && !/[\s>]/.test(html[j])) j += 1;
          value = html.slice(valueStart, j);
        }
      }
      if (attr && !attrs.has(attr)) attrs.set(attr, value);
    }
    i = j + 1;
    yield { name, closing, attrs, selfClosing };
    if (!closing && RAW_TEXT.has(name)) {
      // script／style 等的內文不是標籤，直接跳到對應的結束標籤。
      const end = html.toLowerCase().indexOf(`</${name}`, i);
      i = end < 0 ? n : end;
    }
  }
}

/** city-path 下拉選單裡帶 data-path-option 的選項數；找不到選單回傳 null。 */
export function countPathOptions(html) {
  let depth = 0; // >0 表示在 city-path 的 <select> 裡（數巢狀的 select 以防萬一）
  let found = false;
  let count = 0;
  for (const tag of tags(html)) {
    if (depth === 0) {
      if (!tag.closing && tag.name === "select" && tag.attrs.get("data-testid") === "city-path") {
        found = true;
        depth = 1;
      }
      continue;
    }
    if (tag.name === "select") {
      depth += tag.closing ? -1 : 1;
      continue;
    }
    if (!tag.closing && tag.attrs.has("data-path-option") && !VOID.has(tag.name)) count += 1;
  }
  return found ? count : null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: city-path-count.mjs <html>");
    process.exit(2);
  }
  const count = countPathOptions(readFileSync(file, "utf8"));
  if (count === null) {
    console.error(`${file}: no city-path select`);
    process.exit(1);
  }
  console.log(count);
}
