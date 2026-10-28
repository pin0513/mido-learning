/**
 * 驗證 frontend/content 的知識點。
 * 從 frontend 目錄執行：pnpm validate:content
 *
 * 讀取與檢查看 lib/content/load.ts，和頁面共用同一份。
 */
import { appendFileSync, cpSync, mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
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

const TWO_SOURCES = `sources:
  - id: kuoyu
    title: 十二年國教課程綱要國民中小學暨普通型高級中等學校語文領域國語文
    publisher: 國家教育研究院
    url: https://stv.naer.edu.tw/data/course_outline/pta_18510_4703638_59125.pdf
    accessed: "2026-10-28"
    kind: curriculum
    supports: 注音符號的學習表現
  - id: note
    title: 課堂筆記
    publisher: 測試
    url: https://example.com/note
    accessed: "2026-10-28"
    kind: textbook
    supports: 補充例子
`;

const CIRCLE = (key: string, source: string) => `${key}:
  heading: ${key === "why" ? "為什麼要學" : key === "how" ? "怎麼學會" : "學到什麼"}
  body: ["這是自我測試用的一句話"]
  sources: [${source}]
`;

const FULL_CIRCLES = `${CIRCLE("why", "kuoyu")}${CIRCLE("how", "note")}${CIRCLE("what", "kuoyu")}`;

function published(yaml: string): string {
  return yaml.replace("status: draft", "status: published");
}

function withBlock(yaml: string, block: string): string {
  return yaml.replace("to_verify:", `${block}to_verify:`);
}

function runSelfTest(): string[] {
  const failures: string[] = [];
  const check = (
    label: string,
    es: string,
    jh: string,
    pathYaml: string,
    accept: (errors: string[]) => boolean,
    after?: (dir: string) => void,
  ): void => {
    const dir = mkdtempSync(join(tmpdir(), "kp-validate-"));
    try {
      writeFixture(dir, es, jh, pathYaml);
      after?.(dir);
      const { errors } = validateContent(dir);
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
  check("沒有 sources", published(VALID_ES), VALID_JH, VALID_PATH, includes("缺少 sources"));
  check("只有 1 筆來源", withBlock(published(VALID_ES), TWO_SOURCES.replace(/  - id: note[\s\S]*$/, "")), VALID_JH, VALID_PATH, includes("來源至少要 2 筆"));
  const auxSources = TWO_SOURCES.replaceAll("kind: curriculum", "kind: aux").replaceAll("kind: textbook", "kind: aux");
  check("全部 aux", withBlock(published(VALID_ES), auxSources), VALID_JH, VALID_PATH, includes("來源不能全部是 aux"));
  const textbookSources = TWO_SOURCES.replace("kind: curriculum", "kind: textbook");
  check("國小沒有 A 級來源", withBlock(published(VALID_ES), textbookSources), VALID_JH, VALID_PATH, includes("A 級來源"));
  check(
    "圖 type 不存在",
    withBlock(published(VALID_ES), `${TWO_SOURCES}figures:\n  - id: bad-fig\n    type: diagram\n    alt: 不存在的圖\n`),
    VALID_JH,
    VALID_PATH,
    includes("oneOf"),
  );
  check(
    "figure id 不存在",
    withBlock(published(VALID_ES), `${TWO_SOURCES}${CIRCLE("why", "kuoyu").replace("sources: [kuoyu]", "figures: [missing]\n  sources: [kuoyu]")}`),
    VALID_JH,
    VALID_PATH,
    includes("指向不存在的圖（missing）"),
  );
  check(
    "source id 不存在",
    withBlock(published(VALID_ES), `${TWO_SOURCES}${CIRCLE("why", "missing")}`),
    VALID_JH,
    VALID_PATH,
    includes("指向不存在的來源（missing）"),
  );
  check(
    "自編代碼",
    published(VALID_ES).replace("issues: []", "issues: []\n  performances: [3-I-9]"),
    VALID_JH,
    VALID_PATH,
    includes("不可自編"),
  );
  check(
    "既有國語文代碼",
    VALID_ES.replace("issues: []", "issues: []\n  performances: [3-I-1]\n  contents: [Aa-I-1]"),
    VALID_JH,
    VALID_PATH,
    (errors) => errors.length === 0,
  );
  const accepted = [
    ["綜合活動學習表現", "performances", "1c-III-9"],
    ["科目前綴學習表現", "performances", "輔 3b-V-9"],
    ["家政學習內容", "contents", "輔 Ca-IV-9"],
    ["公民學習內容", "contents", "歷 Ba-IV-9"],
    ["涂科目前綴", "contents", "涂 Da-IV-1"],
    ["高中數學代碼", "contents", "D-10-2"],
    ["高中數學分流代碼", "contents", "D-11A-1"],
    ["國中數學代碼", "contents", "n-III-1"],
  ] as const;
  for (const [label, field, code] of accepted) {
    const quoted = code.includes(" ") ? `"${code}"` : code;
    check(
      `${label}格式可過但未收錄`,
      VALID_ES.replace("issues: []", `issues: []\n  ${field}: [${quoted}]`),
      VALID_JH,
      VALID_PATH,
      (errors) =>
        errors.some((error) => error.includes(`「${code}」不在`)) &&
        !errors.some((error) => error.includes("must match pattern")),
    );
  }
  const rejected = [
    ["多一個字母", "performances", "1bb-III-1"],
    ["Unicode 羅馬數字", "performances", "2-Ⅱ-4"],
    ["核心素養代碼", "performances", "綜-E-A2"],
    ["前綴少空格", "contents", "家Ca-IV-1"],
    ["年級超出 12", "contents", "D-13-1"],
    ["小寫羅馬數字", "contents", "n-iii-1"],
    ["代碼不完整", "contents", "D-10-"],
  ] as const;
  for (const [label, field, code] of rejected) {
    check(
      `${label}不是課綱代碼格式`,
      VALID_ES.replace("issues: []", `issues: []\n  ${field}: [${code}]`),
      VALID_JH,
      VALID_PATH,
      (errors) =>
        errors.some((error) => error.includes("must match pattern")) &&
        !errors.some((error) => error.includes("不可自編")),
    );
  }
  const codeFixture = `
格式測試:
  performances:
    1c-III-9:
      stage: 3
      text: 測試用學習表現。
      source:
        url: https://example.com/curriculum.pdf
        page: 1
    "輔 3b-V-9":
      stage: 5
      text: 測試用學習表現。
      source:
        url: https://example.com/curriculum.pdf
        page: 2
  contents:
    n-III-1:
      stage: 3
      text: 測試用學習內容。
      source:
        url: https://example.com/curriculum.pdf
        page: 3
    N-3-9:
      stage: 2
      text: 測試用學習內容。
      source:
        url: https://example.com/curriculum.pdf
        page: 4
    "輔 Ca-IV-9":
      stage: 4
      text: 測試用學習內容。
      source:
        url: https://example.com/curriculum.pdf
        page: 5
    "歷 Ba-IV-9":
      stage: 4
      text: 測試用學習內容。
      source:
        url: https://example.com/curriculum.pdf
        page: 6
    "涂 Da-IV-1":
      stage: 4
      text: 測試用學習內容。
      source:
        url: https://example.com/curriculum.pdf
        page: 7
    D-10-2:
      stage: 5
      text: 測試用學習內容。
      source:
        url: https://example.com/curriculum.pdf
        page: 8
    D-11A-1:
      stage: 5
      text: 測試用學習內容。
      source:
        url: https://example.com/curriculum.pdf
        page: 9
`;
  const addCodes = (dir: string) => {
    appendFileSync(join(dir, "taxonomy", "curriculum-108-codes.yaml"), codeFixture);
  };
  check(
    "國小新格式收錄後可過",
    VALID_ES.replace("issues: []", "issues: []\n  performances: [1c-III-9]\n  contents: [n-III-1, N-3-9]"),
    VALID_JH,
    VALID_PATH,
    (errors) => errors.length === 0,
    addCodes,
  );
  check(
    "國中科目前綴收錄後可過",
    VALID_ES,
    VALID_JH.replace("issues: []", 'issues: []\n  contents: ["輔 Ca-IV-9", "歷 Ba-IV-9", "涂 Da-IV-1"]'),
    VALID_PATH,
    (errors) => errors.length === 0,
    addCodes,
  );
  check(
    "高中數學與涯代碼收錄後可過",
    VALID_ES.replace("deeper: [ph.next@jh]", "deeper: [ph.next@sh]"),
    VALID_JH.replace("id: ph.next@jh", "id: ph.next@sh")
      .replace("level: jh", "level: sh")
      .replace("issues: []", 'issues: []\n  performances: ["輔 3b-V-9"]\n  contents: [D-10-2, D-11A-1]'),
    VALID_PATH.replace("ph.next@jh", "ph.next@sh"),
    (errors) => errors.length === 0,
    (dir) => {
      addCodes(dir);
      renameSync(
        join(dir, "knowledge", "philosophy", "ph.next", "jh.yaml"),
        join(dir, "knowledge", "philosophy", "ph.next", "sh.yaml"),
      );
    },
  );
  check(
    "代碼 stage 與階段不符",
    VALID_ES.replace("issues: []", "issues: []\n  performances: [1c-III-9]"),
    VALID_JH,
    VALID_PATH,
    includes("stage 必須等於"),
    (dir) => {
      appendFileSync(
        join(dir, "taxonomy", "curriculum-108-codes.yaml"),
        `
格式測試:
  performances:
    1c-III-9:
      stage: 1
      text: 測試用學習表現。
      source:
        url: https://example.com/curriculum.pdf
        page: 1
`,
      );
    },
  );
  check(
    "published 缺 what 而且不在清單",
    withBlock(published(VALID_ES), `${TWO_SOURCES}${CIRCLE("why", "kuoyu")}${CIRCLE("how", "note")}`),
    VALID_JH,
    VALID_PATH,
    includes("缺少黃金圈的 what"),
  );
  check(
    "清單內的點已補齊",
    withBlock(published(VALID_ES), `${TWO_SOURCES}${FULL_CIRCLES}`),
    VALID_JH,
    VALID_PATH,
    (errors) => errors.some((error) => error.includes("請從 sources-backfill.yaml 移出")) && errors.some((error) => error.includes("請從 golden-circle-backfill.yaml 移出")),
    (dir) => {
      const list = "# 只能刪，不能加。\nids:\n  - ph.self@es\n";
      writeFileSync(join(dir, "sources-backfill.yaml"), list);
      writeFileSync(join(dir, "golden-circle-backfill.yaml"), list);
    },
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
  const { errors: contentErrors, warnings } = validateContent(CONTENT_DIR);
  if (selfTestErrors.length > 0) {
    console.error(selfTestErrors.join("\n\n"));
  }
  if (warnings.length > 0) {
    console.log(warnings.join("\n"));
    console.log(`\n${warnings.length} 個警告`);
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
