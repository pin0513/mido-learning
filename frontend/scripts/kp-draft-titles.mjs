#!/usr/bin/env node
// 列出 content/knowledge 裡 status: draft 的知識點，一行一筆：「id<TAB>title」。
// 給 .github/workflows/frontend-image-smoke.yml 的草稿標題不露出檢查用：草稿從內容算出來，不再手寫標題。
// workflow 沒有 pnpm install，所以這支只用 Node 內建模組；只讀最上層（第 0 欄）的 id、title、status 三個純量。
// 任何檔讀不到這三個欄位就失敗（exit 2），不會因為格式變了而靜靜回傳「沒有草稿」。
// 用法：node scripts/kp-draft-titles.mjs [content/knowledge 目錄]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** @typedef {{ id: string, title: string, status: string }} Head */
/** @typedef {Head & { file: string }} Point */

/**
 * 解開 YAML 單行純量：純文字、'單引號'（'' 代表 '）、"雙引號"（只處理 \" 與 \\）。
 * @param {string} raw
 * @returns {string}
 */
export function unquote(raw) {
  const value = raw.replace(/\s+#.*$/, "").trim();
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) return value.slice(1, -1).replaceAll("''", "'");
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) return value.slice(1, -1).replace(/\\(["\\])/g, "$1");
  return value;
}

/**
 * 從一份知識點 YAML 讀最上層的 id、title、status；缺任何一個就回 null。
 * @param {string} source
 * @returns {Head | null}
 */
export function readHead(source) {
  /** @type {Record<string, string>} */
  const head = {};
  for (const line of source.split(/\r?\n/)) {
    const m = /^(id|title|status):(.*)$/.exec(line);
    if (m && !(m[1] in head)) head[m[1]] = unquote(m[2]);
  }
  return head.id && head.title && head.status ? { id: head.id, title: head.title, status: head.status } : null;
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function yamlFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...yamlFiles(path));
    else if (/\.ya?ml$/.test(entry)) out.push(path);
  }
  return out;
}

/**
 * 掃過整個目錄：points 是讀得到三個欄位的檔，errors 是讀不到的檔。
 * @param {string} dir
 * @returns {{ points: Point[], errors: string[] }}
 */
export function scan(dir) {
  /** @type {Point[]} */
  const points = [];
  /** @type {string[]} */
  const errors = [];
  for (const file of yamlFiles(dir)) {
    const head = readHead(readFileSync(file, "utf8"));
    if (head) points.push({ ...head, file });
    else errors.push(file);
  }
  return { points, errors };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = process.argv[2] ?? "content/knowledge";
  const { points, errors } = scan(dir);
  if (errors.length > 0 || points.length === 0) {
    console.error(`kp-draft-titles: cannot read id/title/status from ${errors.length > 0 ? errors.join(", ") : `any file under ${dir}`}`);
    process.exit(2);
  }
  for (const point of points) if (point.status === "draft") console.log(`${point.id}\t${point.title}`);
}
