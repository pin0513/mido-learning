/**
 * 驗證 frontend/content 的知識點。
 * 從 frontend 目錄執行：pnpm validate:content
 *
 * 讀取與檢查看 lib/content/load.ts，和頁面共用同一份。
 */
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { validateContent, walkYaml } from "../lib/content/load";

const STAGE_IDS = ["es", "jh", "sh", "uni"] as const;
const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "content");

const VALID_ES = `id: ph.self@es
concept: ph.self
title: 自我測試
status: draft
version: "0.1"
discipline:
  path: [哲學, 思考方法, 提問與探究]
  layer: essence
  crosscutting: []
stage:
  level: es
curriculum_108:
  domains: [語文]
  core_competencies: [A2]
  issues: []
to_verify: false
verify_notes: []
prerequisites: []
links:
  why: []
  how: []
  related: []
  deeper: [ph.next@jh]
link_notes: 測試用
competency:
  specialist: [探究]
  generalist: [提問]
ai:
  delegable: [整理例句]
  human_experience: [自己說出理由]
idea: 這是驗證器自我測試用的知識點。
guiding_questions: [這句話是事實還是意見？]
scenario: 課堂上老師請學生分辨一句話。
formats:
  slides: []
authors: [測試]
updated: "2026-10-26"
`;

const VALID_JH = `id: ph.next@jh
concept: ph.next
title: 下一個測試
status: draft
version: "0.1"
discipline:
  path: [哲學, 思考方法, 提問與探究]
  layer: essence
  crosscutting: []
stage:
  level: jh
curriculum_108:
  domains: [語文]
  core_competencies: [A2]
  issues: []
to_verify: false
verify_notes: []
prerequisites: [ph.self@es]
links:
  why: []
  how: []
  related: []
  deeper: []
link_notes: 測試用
competency:
  specialist: [探究]
  generalist: [提問]
ai:
  delegable: [整理例句]
  human_experience: [自己說出理由]
idea: 這是驗證器自我測試的第二個知識點。
guiding_questions: [如果前提錯了，結論還成立嗎？]
scenario: 學生把一句話拆成前提和結論。
formats:
  slides: []
authors: [測試]
updated: "2026-10-26"
`;

const VALID_PATH = `id: philosophy
title: 測試
paths:
  - id: ph.selftest
    title: 測試主線
    knowledge_points: [ph.self@es, ph.next@jh]
`;

function writeFixture(dir: string, es: string, jh: string, pathYaml: string): void {
  cpSync(join(CONTENT_DIR, "taxonomy"), join(dir, "taxonomy"), { recursive: true });
  cpSync(join(CONTENT_DIR, "schema"), join(dir, "schema"), { recursive: true });
  mkdirSync(join(dir, "knowledge", "philosophy", "ph.self"), { recursive: true });
  mkdirSync(join(dir, "knowledge", "philosophy", "ph.next"), { recursive: true });
  mkdirSync(join(dir, "paths"), { recursive: true });
  writeFileSync(join(dir, "knowledge", "philosophy", "ph.self", "es.yaml"), es);
  writeFileSync(join(dir, "knowledge", "philosophy", "ph.next", "jh.yaml"), jh);
  writeFileSync(join(dir, "paths", "philosophy.yaml"), pathYaml);
}

function runSelfTest(): string[] {
  const failures: string[] = [];
  const check = (label: string, es: string, jh: string, pathYaml: string, accept: (errors: string[]) => boolean): void => {
    const dir = mkdtempSync(join(tmpdir(), "kp-validate-"));
    try {
      writeFixture(dir, es, jh, pathYaml);
      const errors = validateContent(dir);
      if (!accept(errors)) {
        failures.push(`自我測試失敗（${label}）：\n${errors.join("\n") || "(沒有錯誤)"}`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  const includes = (needle: string) => (errors: string[]) => errors.some((error) => error.includes(needle));

  check("合法樣本", VALID_ES, VALID_JH, VALID_PATH, (errors) => errors.length === 0);
  check("重複 id", VALID_ES, VALID_JH.replace("id: ph.next@jh", "id: ph.self@es").replace("concept: ph.next", "concept: ph.self"), VALID_PATH, includes("id 重複"));
  check("先備不存在", VALID_ES, VALID_JH.replace("prerequisites: [ph.self@es]", "prerequisites: [ph.missing@es]"), VALID_PATH, includes("先備 指向不存在的 id"));
  check(
    "先備循環",
    VALID_ES.replace("prerequisites: []", "prerequisites: [ph.next@jh]").replace("deeper: [ph.next@jh]", "deeper: []"),
    VALID_JH,
    VALID_PATH,
    includes("先備循環"),
  );
  check("編造素養代碼", VALID_ES.replace("core_competencies: [A2]", "core_competencies: [數-n-1]"), VALID_JH, VALID_PATH, includes("core_competencies"));
  check("未知領域", VALID_ES.replace("domains: [語文]", "domains: [生活課程]"), VALID_JH, VALID_PATH, includes("未知領域"));
  check(
    "大學仍填課綱",
    VALID_ES,
    VALID_JH.replace("level: jh", "level: uni").replace("id: ph.next@jh", "id: ph.next@uni").replace("concept: ph.next", "concept: ph.next"),
    VALID_PATH.replace("ph.next@jh", "ph.next@uni"),
    includes("curriculum_108"),
  );
  const esWithoutCurriculum = VALID_ES.replace(/curriculum_108:\n(?:  .*\n)+to_verify:/, "to_verify:");
  check("國小未填課綱", esWithoutCurriculum, VALID_JH, VALID_PATH, includes("curriculum_108"));
  check("deeper 不存在", VALID_ES.replace("deeper: [ph.next@jh]", "deeper: [ph.missing@uni]"), VALID_JH, VALID_PATH, includes("deeper 指向不存在的 id"));
  check(
    "主線指向不存在的 id",
    VALID_ES,
    VALID_JH,
    VALID_PATH.replace("ph.next@jh", "ph.missing@jh"),
    includes("指向不存在的 id"),
  );
  return failures;
}

function countBy(pointsDir: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const file of walkYaml(pointsDir)) {
    const parts = relative(pointsDir, file).split("/");
    const key = `${parts[0]}/${parts[2]?.replace(/\.yaml$/, "")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function main(): void {
  const selfTestErrors = runSelfTest();
  const contentErrors = validateContent(CONTENT_DIR);
  if (selfTestErrors.length > 0) {
    console.error(selfTestErrors.join("\n\n"));
  }
  if (contentErrors.length > 0) {
    console.error(contentErrors.join("\n"));
    console.error(`\n${contentErrors.length} 個內容錯誤`);
  }
  if (selfTestErrors.length > 0 || contentErrors.length > 0) process.exit(1);

  const counts = countBy(join(CONTENT_DIR, "knowledge"));
  const folders = new Map<string, number>();
  const stages = new Map<string, number>();
  for (const [key, count] of counts) {
    const [folder, stage] = key.split("/");
    folders.set(folder ?? "", (folders.get(folder ?? "") ?? 0) + count);
    stages.set(stage ?? "", (stages.get(stage ?? "") ?? 0) + count);
  }
  const folderText = [...folders.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => `${name} ${count}`)
    .join("、");
  const stageText = STAGE_IDS.filter((id) => stages.has(id))
    .map((id) => `${id} ${stages.get(id) ?? 0}`)
    .join("、");
  const total = [...folders.values()].reduce((sum, count) => sum + count, 0);
  console.log(`知識點 ${total} 筆通過驗證（${folderText}）。`);
  console.log(`階段：${stageText}。`);
  console.log("自我測試通過。");
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) main();
