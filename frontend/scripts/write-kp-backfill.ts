/**
 * 依目前 status: published 的知識點重寫兩份補強清單。
 * 清單只能刪、不能加；這個腳本只在清單還沒進 main 時用來產生第一版。
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "../lib/content/load";

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "content");
const { errors, model } = loadContent(contentDir);
if (!model) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const ids = model.points
  .filter((point) => point.status === "published")
  .map((point) => point.id)
  .sort((left, right) => left.localeCompare(right));
const body = `# 只能刪，不能加。\nids:\n${ids.map((id) => `  - ${id}`).join("\n")}\n`;
writeFileSync(join(contentDir, "sources-backfill.yaml"), body);
writeFileSync(join(contentDir, "golden-circle-backfill.yaml"), body);
console.log(`寫入 ${ids.length} 個 published id`);
if (errors.length > 0) console.log(`產生清單時有 ${errors.length} 個既有內容錯誤，寫完後請再跑驗證`);
