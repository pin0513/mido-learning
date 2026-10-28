/**
 * 補強清單只能變短。base 還沒有這份檔時跳過（第一個把清單加進來的 PR）。
 * checkout 常常是淺層，所以先抓 origin/main 再比對。
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const files = ["frontend/content/sources-backfill.yaml", "frontend/content/golden-circle-backfill.yaml"];

function idsOf(text: string, label: string): Set<string> {
  const value = parse(text);
  if (!value || typeof value !== "object" || !Array.isArray((value as { ids?: unknown }).ids)) {
    throw new Error(`${label}: 必須是 ids 陣列`);
  }
  const ids = (value as { ids: unknown[] }).ids.filter((id): id is string => typeof id === "string");
  return new Set(ids);
}

execFileSync("git", ["fetch", "--depth=1", "origin", "main"], { cwd: repoRoot, stdio: "inherit" });

let failed = false;
for (const file of files) {
  let base = "";
  try {
    base = execFileSync("git", ["show", `origin/main:${file}`], { cwd: repoRoot, encoding: "utf8" });
  } catch {
    console.log(`${file}: base 沒有這個檔，跳過`);
    continue;
  }
  let head = "";
  try {
    head = readFileSync(join(repoRoot, file), "utf8");
  } catch {
    console.error(`${file}: base 有這個檔，不能刪掉整份`);
    failed = true;
    continue;
  }
  const baseIds = idsOf(base, `origin/main:${file}`);
  const headIds = idsOf(head, file);
  const added = [...headIds].filter((id) => !baseIds.has(id));
  if (added.length > 0) {
    console.error(`${file}: 只能刪不能加：${added.join(", ")}`);
    failed = true;
  } else {
    console.log(`${file}: ${headIds.size} / ${baseIds.size}，沒有新增`);
  }
}

if (failed) process.exit(1);
