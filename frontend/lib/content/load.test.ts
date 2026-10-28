import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateContent } from "./load";

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "content");

function cloneContent(): string {
  const dir = mkdtempSync(join(tmpdir(), "kp-load-"));
  cpSync(contentDir, dir, { recursive: true });
  return dir;
}

test("子節點前綴可以過，既有知識點仍然 0 個錯誤", () => {
  const { errors } = validateContent(contentDir);
  assert.deepEqual(errors, []);
});

test("子節點不能設內容資料夾，前綴也不能重複或用錯", () => {
  const folder = cloneContent();
  try {
    const taxonomy = join(folder, "taxonomy", "disciplines.yaml");
    const original = readFileSync(taxonomy, "utf8");
    writeFileSync(taxonomy, original.replace("id_prefix: zh\n", "id_prefix: zh\n        content_folder: chinese-files\n"));
    assert.ok(validateContent(folder).errors.some((error) => error.includes("只有最上層學門可以設定內容資料夾")));

    writeFileSync(taxonomy, original.replace("id_prefix: zh\n", "id_prefix: lg\n"));
    assert.ok(validateContent(folder).errors.some((error) => error.includes("id 前綴重複（lg）")));

    writeFileSync(taxonomy, original);
    const point = join(folder, "knowledge", "language", "zh.punct", "es.yaml");
    const yaml = readFileSync(point, "utf8").replace(
      "  - 語文\n  - 國文\n  - 基礎功\n",
      "  - 語文\n  - 外語\n  - 英文\n  - 英文聽說\n",
    );
    writeFileSync(point, yaml);
    assert.ok(validateContent(folder).errors.some((error) => error.includes("id 前綴應為 en")));
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
