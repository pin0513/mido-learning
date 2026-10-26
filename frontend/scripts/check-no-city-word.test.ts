import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const ROOTS = ["app", "components", "content", "lib"];

function filesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      found.push(...filesUnder(path));
      continue;
    }
    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry)) continue;
    if (/\.(tsx?|jsx?|ya?ml)$/.test(entry)) found.push(path);
  }
  return found;
}

/** Drop comments so internal notes can keep the analogy. Strings stay. */
function stripComments(source: string, yaml: boolean): string {
  if (yaml) return source.replace(/(^|\s)#[^\n]*/g, "$1");
  let out = "";
  let i = 0;
  let quote: "'" | "\"" | "`" | null = null;
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (quote) {
      out += c;
      if (c === "\\" && quote !== "`") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === "\"" || c === "`") {
      quote = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

const BANNED = ["城市", "街道", "市區", "地標", "廣場", "環路"];

test("使用者看得到的程式與內容沒有城市或市區用語", () => {
  const hits: string[] = [];
  for (const root of ROOTS) {
    for (const path of filesUnder(join(ROOT, root))) {
      const yaml = path.endsWith(".yaml") || path.endsWith(".yml");
      const text = stripComments(readFileSync(path, "utf8"), yaml);
      const lines = text.split("\n");
      lines.forEach((line, index) => {
        const word = BANNED.find((item) => line.includes(item));
        if (word) hits.push(`${relative(ROOT, path)}:${index + 1}: ${word}: ${line.trim()}`);
      });
    }
  }
  assert.deepEqual(hits, []);
});
