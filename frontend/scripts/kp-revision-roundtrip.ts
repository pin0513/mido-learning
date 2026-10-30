/**
 * 證明 YAML → 修訂版 → YAML 無損（docs/kp-db-restructure.md 第 8 節第 2 步）。
 *
 * 對 content/knowledge 底下每一個知識點：
 * 1. 資料：YAML 物件 → KpRecord →（JSON 來回，模擬 Firestore）→ YAML 物件，和原本完全相同；
 *    再轉一次 KpRecord 也相同；匯出的 YAML 文字解析回來也相同；每一圈的 Markdown 讀回再寫出一字不差。
 * 2. Firestore 存得下：只有 JSON 值、沒有陣列直接套陣列。
 * 3. 規則：轉回的物件用 rules 的 checkPoints（資料庫形式）驗證，錯誤與警告和 YAML 相同（訊息開頭換成文件名稱）。
 * 4. 畫面：用轉回的資料建目錄，V2 詳細頁的主欄與側欄 HTML 和原本逐字元相同（含草稿與只看已發布兩種目錄）。
 * 5. 註解：每個檔的 YAML 註解逐字進了 revision.importNotes。每一行以 # 開頭的行都要抽到；
 *    抽到的每一筆在原檔的那一行那一欄逐字相同；把抽到的挖掉之後，原文再也找不到註解，資料也不變。
 *
 * 直接執行：pnpm kp:roundtrip（印出各學門結果，有任何不同就 exit 1）。單元測試見 kp-revision-roundtrip.test.ts。
 * render 詳細頁要把 server-only 與 .css 換成空模組：第一行 import ./node-stubs（只影響載入這支腳本的行程）。
 */
import "./node-stubs";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import Ajv, { type AnySchema } from "ajv";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Lexer, parse } from "yaml";
import { KpDetailV2 } from "../components/kp/v2/KpDetailV2";
import { catalogFromModel, visibleCatalog, type ContentCatalog } from "../lib/content/catalog";
import { loadContent, walkYaml } from "../lib/content/load";
import {
  blankComments,
  checkRecords,
  circleToMarkdown,
  markdownToCircle,
  recordRef,
  recordToYaml,
  yamlText,
  yamlToRecord,
  type KpRecord,
} from "../lib/content/revision";
import type { RuleContext } from "../lib/content/rules";
import type { KnowledgePoint } from "../lib/content/types";

export const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "content");

export interface DisciplineResult {
  points: number;
  data: number;
  render: number;
}

export interface RoundTripReport {
  total: number;
  /** 資料無損的點數。 */
  dataLossless: number;
  /** 主欄與側欄（含草稿目錄；已發布點另外比只看已發布的目錄）都一字不差的點數。 */
  renderIdentical: number;
  /** 比過的頁面數（每點一次含草稿目錄，已發布點再加一次只看已發布）。 */
  renderedPages: number;
  /** 匯出的 YAML 文字與原檔（去掉註解行）完全相同的檔數。只是參考，不是門檻。 */
  yamlTextIdentical: number;
  /** 有註解的檔數。 */
  filesWithComments: number;
  /** 原檔裡以 # 開頭的行數（不靠 Lexer 數）。 */
  commentLines: number;
  /** 逐字抽進 revision.importNotes 的註解筆數。 */
  commentsCaptured: number;
  /** 其中行尾註解的筆數。 */
  inlineComments: number;
  yamlErrors: number;
  yamlWarnings: number;
  revisionErrors: number;
  revisionWarnings: number;
  byDiscipline: Map<string, DisciplineResult>;
  failures: string[];
}

export function ruleContext(contentDir: string, model: { taxonomy: RuleContext["taxonomy"] }): RuleContext {
  const schema = JSON.parse(readFileSync(join(contentDir, "schema", "knowledge-point.schema.json"), "utf8")) as AnySchema;
  const validateSchema = new Ajv({ allErrors: true, strict: true }).compile(schema);
  const ids = (file: string) => new Set((parse(readFileSync(join(contentDir, file), "utf8")) as { ids?: string[] }).ids ?? []);
  return {
    taxonomy: model.taxonomy,
    validateSchema,
    sourcesBackfill: ids("sources-backfill.yaml"),
    circleBackfill: ids("golden-circle-backfill.yaml"),
  };
}

/** Firestore 不收 undefined、NaN，也不收陣列直接套陣列。 */
export function firestoreProblems(value: unknown, where: string, insideArray = false): string[] {
  if (value === null || typeof value === "string" || typeof value === "boolean") return [];
  if (typeof value === "number") return Number.isFinite(value) ? [] : [`${where} 不是有限數字`];
  if (Array.isArray(value)) {
    if (insideArray) return [`${where} 是陣列裡的陣列`];
    return value.flatMap((item, index) => firestoreProblems(item, `${where}[${index}]`, true));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => firestoreProblems(item, `${where}.${key}`));
  }
  return [`${where} 是 ${typeof value}`];
}

const CIRCLES = ["why", "how", "what"] as const;

function renderParts(point: KnowledgePoint, all: ContentCatalog, visible: ContentCatalog): { main: string; aside: string; html: string } {
  const html = renderToStaticMarkup(createElement(KpDetailV2, { point, all, visible }));
  const mainStart = html.indexOf('<div class="v2-main">');
  const asideStart = html.indexOf('<aside class="v2-aside"');
  const asideEnd = html.indexOf("</aside>", asideStart);
  if (mainStart < 0 || asideStart < 0 || asideEnd < 0) throw new Error(`${point.id}: 找不到主欄或側欄`);
  return { main: html.slice(mainStart, asideStart), aside: html.slice(asideStart, asideEnd + "</aside>".length), html };
}

function firstDifference(a: string, b: string): string {
  let index = 0;
  while (index < a.length && a[index] === b[index]) index += 1;
  return `第 ${index} 字元：「${a.slice(index, index + 40)}」≠「${b.slice(index, index + 40)}」`;
}

export interface RoundTripOptions {
  contentDir?: string;
  /** 測試用：模擬資料庫裡的修訂版被改過，證明比對抓得到差異。 */
  mutate?: (record: KpRecord) => KpRecord;
}

export function runRoundTrip({ contentDir = CONTENT_DIR, mutate }: RoundTripOptions = {}): RoundTripReport {
  const original = loadContent(contentDir);
  if (!original.model) throw new Error(`內容載入失敗：\n${original.errors.join("\n")}`);
  const model = original.model;
  const ctx = ruleContext(contentDir, model);
  const failures: string[] = [];
  const byDiscipline = new Map<string, DisciplineResult>();
  const dataOk = new Set<string>();
  const refOf = new Map<string, string>();
  const records: KpRecord[] = [];
  let yamlTextIdentical = 0;
  let filesWithComments = 0;
  let commentLines = 0;
  let commentsCaptured = 0;
  let inlineComments = 0;

  const files = walkYaml(join(contentDir, "knowledge"));
  for (const file of files) {
    const rel = relative(contentDir, file);
    const text = readFileSync(file, "utf8");
    const raw = parse(text) as Record<string, unknown>;
    const id = String(raw.id);
    const folder = rel.split("/")[1] ?? "";
    const tally = byDiscipline.get(folder) ?? { points: 0, data: 0, render: 0 };
    tally.points += 1;
    byDiscipline.set(folder, tally);
    refOf.set(rel, recordRef({ kpId: id }));
    const fail = (message: string) => failures.push(`${rel}: ${message}`);

    let record: KpRecord;
    try {
      record = yamlToRecord(raw, rel, { sourceText: text, file: rel });
    } catch (error) {
      fail(`轉不成修訂版：${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const commentProblems = checkComments(text, raw, record);
    for (const problem of commentProblems) fail(`註解：${problem}`);
    const comments = record.revision.importNotes?.comments ?? [];
    const hashLines = text.split("\n").filter((line) => /^\s*#/.test(line)).length;
    commentLines += hashLines;
    commentsCaptured += comments.length;
    inlineComments += comments.filter((comment) => comment.inline).length;
    if (comments.length > 0) filesWithComments += 1;

    const json = JSON.parse(JSON.stringify(record)) as KpRecord;
    const stored = mutate ? mutate(json) : json;
    records.push(stored);
    const before = failures.length;
    if (!isDeepStrictEqual(json, record)) fail("修訂版不是純 JSON");
    for (const problem of firestoreProblems(stored, "revision")) fail(`Firestore 存不下：${problem}`);

    const back = recordToYaml(stored);
    if (!back.raw) {
      fail(`轉不回 YAML：${back.errors.join("；")}`);
    } else {
      if (!isDeepStrictEqual(back.raw, raw)) fail("YAML → 修訂版 → YAML 的資料不同");
      const again = yamlToRecord(back.raw, rel);
      // 從 YAML 物件轉回來沒有原文，所以沒有 importNotes；其餘要相同。
      const expected = structuredClone(record);
      delete expected.revision.importNotes;
      if (!isDeepStrictEqual(again, expected)) fail("第二次轉成的修訂版不同");
      const exported = yamlText(back.raw);
      if (!isDeepStrictEqual(parse(exported), raw)) fail("匯出的 YAML 文字解析回來不同");
      const withoutComments = text
        .split("\n")
        .filter((line) => !/^\s*#/.test(line))
        .join("\n");
      if (exported === withoutComments) yamlTextIdentical += 1;
    }
    for (const circle of CIRCLES) {
      const markdown = stored.revision[circle];
      if (markdown === undefined) continue;
      const parsed = markdownToCircle(markdown, circle);
      const problems: string[] = [];
      const rewritten = parsed.part ? circleToMarkdown(parsed.part, circle, problems) : "";
      if (problems.length > 0 || rewritten !== markdown) fail(`${circle} 的 Markdown 讀回再寫出不同`);
    }
    if (failures.length === before) {
      dataOk.add(id);
      tally.data += 1;
    }
  }

  // 規則：轉回的物件走資料庫形式，訊息開頭由檔案路徑換成文件名稱。
  const checked = checkRecords(records, ctx);
  const relabel = (message: string) => {
    const colon = message.indexOf(": ");
    const ref = colon > 0 ? refOf.get(message.slice(0, colon)) : undefined;
    return ref ? `${ref}${message.slice(colon)}` : message;
  };
  const sorted = (list: string[]) => [...list].sort();
  if (!isDeepStrictEqual(sorted(checked.errors), sorted(original.errors.map(relabel)))) {
    failures.push(`規則錯誤不同：YAML ${original.errors.length} 則、修訂版 ${checked.errors.length} 則`);
  }
  if (!isDeepStrictEqual(sorted(checked.warnings), sorted(original.warnings.map(relabel)))) {
    failures.push(`規則警告不同：YAML ${original.warnings.length} 則、修訂版 ${checked.warnings.length} 則`);
  }

  // 讀成頁面用的型別後，除了 file（檔案路徑 → 文件名稱）都要相同。
  const convertedById = new Map(checked.points.map((point) => [point.id, point]));
  for (const point of model.points) {
    const converted = convertedById.get(point.id);
    if (!converted) {
      failures.push(`${point.id}: 修訂版讀不出知識點`);
      continue;
    }
    if (!isDeepStrictEqual({ ...converted, file: point.file }, point)) failures.push(`${point.id}: 讀成的知識點不同`);
  }

  // 畫面：兩份目錄（原本、修訂版轉回），同一點的主欄與側欄要逐字元相同。
  const convertedPoints = model.points.map((point) => convertedById.get(point.id) ?? point);
  const allBefore = catalogFromModel(model);
  const allAfter = catalogFromModel({ taxonomy: model.taxonomy, points: convertedPoints, paths: model.paths });
  const views: [ContentCatalog, ContentCatalog, boolean][] = [
    [visibleCatalog(allBefore, true), visibleCatalog(allAfter, true), true],
    [visibleCatalog(allBefore, false), visibleCatalog(allAfter, false), false],
  ];
  const renderBad = new Set<string>();
  let renderedPages = 0;
  for (const [visibleBefore, visibleAfter, drafts] of views) {
    for (const point of visibleBefore.points) {
      const after = visibleAfter.indexes.byId.get(point.id);
      const label = `${point.id}（${drafts ? "含草稿" : "只看已發布"}）`;
      renderedPages += 1;
      if (!after) {
        failures.push(`${label}: 修訂版目錄裡看不到`);
        renderBad.add(point.id);
        continue;
      }
      const a = renderParts(point, allBefore, visibleBefore);
      const b = renderParts(after, allAfter, visibleAfter);
      if (a.main !== b.main) failures.push(`${label}: 主欄不同，${firstDifference(a.main, b.main)}`);
      if (a.aside !== b.aside) failures.push(`${label}: 側欄不同，${firstDifference(a.aside, b.aside)}`);
      if (a.html !== b.html) renderBad.add(point.id);
      if (a.main !== b.main || a.aside !== b.aside) renderBad.add(point.id);
    }
  }
  let renderIdentical = 0;
  for (const point of model.points) {
    if (renderBad.has(point.id)) continue;
    renderIdentical += 1;
    const tally = byDiscipline.get(point.folder);
    if (tally) tally.render += 1;
  }

  return {
    total: files.length,
    dataLossless: dataOk.size,
    renderIdentical,
    renderedPages,
    yamlTextIdentical,
    filesWithComments,
    commentLines,
    commentsCaptured,
    inlineComments,
    yamlErrors: original.errors.length,
    yamlWarnings: original.warnings.length,
    revisionErrors: checked.errors.length,
    revisionWarnings: checked.warnings.length,
    byDiscipline,
    failures,
  };
}

/** 第 5 項：註解有沒有全部、逐字抽到。 */
export function checkComments(text: string, raw: unknown, record: KpRecord): string[] {
  const problems: string[] = [];
  const comments = record.revision.importNotes?.comments ?? [];
  const captured = new Set(comments.filter((comment) => !comment.inline).map((comment) => comment.line));
  text.split("\n").forEach((line, index) => {
    if (/^\s*#/.test(line) && !captured.has(index + 1)) problems.push(`第 ${index + 1} 行的註解沒抽到`);
  });
  let blanked: string;
  try {
    blanked = blankComments(text, comments);
  } catch (error) {
    return [...problems, error instanceof Error ? error.message : String(error)];
  }
  if ([...new Lexer().lex(blanked)].some((token) => token.startsWith("#"))) problems.push("挖掉抽到的註解後，原文還有註解");
  if (!isDeepStrictEqual(parse(blanked), raw)) problems.push("挖掉註解後資料不同");
  return problems;
}

function main() {
  const report = runRoundTrip();
  console.log(`知識點 ${report.total} 筆：資料無損 ${report.dataLossless}、主欄與側欄一字不差 ${report.renderIdentical}（比了 ${report.renderedPages} 頁）。`);
  console.log(`規則：YAML 錯誤 ${report.yamlErrors}／警告 ${report.yamlWarnings}；修訂版錯誤 ${report.revisionErrors}／警告 ${report.revisionWarnings}。`);
  console.log(`註解：${report.filesWithComments} 個檔、${report.commentLines} 行以 # 開頭；逐字抽進 importNotes ${report.commentsCaptured} 筆（行尾註解 ${report.inlineComments}）。`);
  console.log(`參考：匯出的 YAML 文字與原檔（去掉註解）一字不差 ${report.yamlTextIdentical} 檔。`);
  console.log("學門\t點數\t資料無損\t畫面相同");
  for (const [folder, tally] of [...report.byDiscipline].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`${folder}\t${tally.points}\t${tally.data}\t${tally.render}`);
  }
  if (report.failures.length > 0) {
    console.error(`\n不同 ${report.failures.length} 處：`);
    for (const failure of report.failures.slice(0, 50)) console.error(`- ${failure}`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
