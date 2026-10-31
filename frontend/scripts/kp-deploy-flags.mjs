#!/usr/bin/env node
// 從 .github/workflows/deploy-frontend.yml 讀 KP_BUILD_FLAGS 或 KP_RUNTIME_FLAGS，原樣印出（例如 KP_ENABLED=true,KP_HOME_ENABLED=true,…）。
// 正式旗標只寫在 deploy-frontend.yml 一個地方；frontend-image-smoke.yml 與 validate-knowledge-points.yml 用這支讀，不另外抄一份。
// workflow 不一定有 pnpm install，所以只用 Node 內建模組；只認 env 區塊裡單行的「名稱: 值」。
// 找不到、出現不只一次、或值不是「KP_*=true|false」用逗號串起來，就失敗（exit 2），不會靜靜回傳空字串讓 build 變成旗標全關。
// 用法：node scripts/kp-deploy-flags.mjs KP_BUILD_FLAGS [deploy-frontend.yml 路徑]
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_WORKFLOW = join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".github", "workflows", "deploy-frontend.yml");

/**
 * 檢查並拆開「KP_A=true,KP_B=false」。
 * @param {string} list
 * @returns {[string, string][]}
 */
export function parseFlagList(list) {
  if (!list) throw new Error("旗標清單是空的");
  return list.split(",").map((pair) => {
    const match = /^(KP_[A-Z0-9_]+)=(true|false)$/.exec(pair);
    if (!match) throw new Error(`旗標格式要是 KP_*=true|false：${pair}`);
    return [match[1], match[2]];
  });
}

/**
 * 從 workflow 原文讀出 name 那一行的值（去掉引號與行尾註解）。
 * @param {string} source
 * @param {string} name
 * @returns {string}
 */
export function readFlags(source, name) {
  const pattern = new RegExp(`^\\s+${name}:\\s*(.*)$`);
  const values = source.split(/\r?\n/).flatMap((line) => {
    const match = pattern.exec(line);
    return match ? [match[1].replace(/\s+#.*$/, "").trim().replace(/^(["'])(.*)\1$/, "$2")] : [];
  });
  if (values.length !== 1) throw new Error(`${name} 在 workflow 裡要剛好一行，找到 ${values.length} 行`);
  parseFlagList(values[0]);
  return values[0];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [name, file = DEFAULT_WORKFLOW] = process.argv.slice(2);
  try {
    if (name !== "KP_BUILD_FLAGS" && name !== "KP_RUNTIME_FLAGS") throw new Error("第一個參數要是 KP_BUILD_FLAGS 或 KP_RUNTIME_FLAGS");
    process.stdout.write(`${readFlags(readFileSync(file, "utf8"), name)}\n`);
  } catch (error) {
    process.stderr.write(`kp-deploy-flags: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(2);
  }
}
