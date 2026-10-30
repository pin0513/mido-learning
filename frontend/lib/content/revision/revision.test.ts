import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import Ajv, { type AnySchema } from "ajv";
import { parse } from "yaml";
import { loadContent } from "../load";
import { checkPoint, type RuleContext } from "../rules";
import {
  ConvertError,
  blankComments,
  checkRecord,
  circleToMarkdown,
  extractComments,
  importAuditEntry,
  markdownToCircle,
  recordToYaml,
  yamlToRecord,
  type KpRecord,
} from "./index";

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "content");
const agileFile = join(contentDir, "knowledge", "pm-leadership", "pm.agile", "sh.yaml");

function context(): RuleContext {
  const { model } = loadContent(contentDir);
  assert.ok(model);
  const schema = JSON.parse(readFileSync(join(contentDir, "schema", "knowledge-point.schema.json"), "utf8")) as AnySchema;
  const validateSchema = new Ajv({ allErrors: true, strict: true }).compile(schema);
  const ids = (file: string) => new Set((parse(readFileSync(join(contentDir, file), "utf8")) as { ids?: string[] }).ids ?? []);
  return { taxonomy: model.taxonomy, validateSchema, sourcesBackfill: ids("sources-backfill.yaml"), circleBackfill: ids("golden-circle-backfill.yaml") };
}

function roundTrip(part: Record<string, unknown>): { markdown: string; back: Record<string, unknown> | null } {
  const problems: string[] = [];
  const markdown = circleToMarkdown(part, "why", problems);
  assert.deepEqual(problems, []);
  const parsed = markdownToCircle(markdown, "why");
  assert.deepEqual(parsed.errors, []);
  return { markdown, back: parsed.part };
}

test("Markdown 的固定寫法", () => {
  const { markdown } = roundTrip({
    heading: "三個衝刺",
    body: ["先排衝刺。", "再展示。"],
    qa: { question: "回饋要怎麼用？", answer: "挑最重要的。", source: "scrum-guide" },
    items_title: "四步做",
    items: [
      { title: "排三個衝刺", text: "每個衝刺一樣長。" },
      { title: "生涯反思", text: "涯 Ca-V-2：生涯反思與變化因應。", example: "例如畢業典禮", code: "涯 Ca-V-2" },
    ],
    checklist_title: "每輪檢查",
    checklist: ["有可用的版本"],
    activity_figure: "agile-flow",
    figures: ["agile-compare"],
    notes: ["第一則。", "第二則。"],
    sources: ["scrum-guide", "zonghe"],
  });
  assert.equal(
    markdown,
    [
      "## 三個衝刺",
      "",
      "先排衝刺。",
      "",
      "再展示。",
      "",
      ':::qa{source="scrum-guide"}',
      "### 回饋要怎麼用？",
      "挑最重要的。",
      ":::",
      "",
      ':::items{title="四步做"}',
      "- 排三個衝刺",
      "  每個衝刺一樣長。",
      '- 生涯反思 {code="涯 Ca-V-2"}',
      "  涯 Ca-V-2：生涯反思與變化因應。",
      "  > 例如畢業典禮",
      ":::",
      "",
      ':::checklist{title="每輪檢查"}',
      "- 有可用的版本",
      ":::",
      "",
      '::figure{#agile-flow role="activity"}',
      "::figure{#agile-compare}",
      "",
      ":::notes",
      "第一則。",
      "",
      "第二則。",
      ":::",
      "",
      "[^scrum-guide] [^zonghe]",
      "",
    ].join("\n"),
  );
});

test("會和語法撞到的值用 JSON 字串寫，讀回來一字不差", () => {
  const part = {
    heading: "# 不是標題",
    body: ["- 不是清單", " 前後有空白 ", "第一行\n第二行", ":::", "[^not-a-source]", "\\反斜線", "引號\"與{大括號}"],
    qa: { question: "> 不是引言", answer: "### 不是問題", source: "src-a" },
    items_title: '標題有"引號"',
    items: [
      { title: "有{大括號}的標題", text: "  兩格縮排開頭", example: "> 例子", code: "1-IV-1" },
      { title: "- 開頭", text: "- 也是" },
    ],
    checklist: ["::figure{#x}", "## 二"],
    figures: [],
    notes: [],
    sources: ["src-a"],
  };
  const { markdown, back } = roundTrip(part);
  assert.deepEqual(back, part);
  assert.ok(markdown.includes("::figure{}"), "figures: [] 也要保留");
  assert.ok(markdown.includes(":::notes\n:::"), "notes: [] 也要保留");
});

test("Markdown 區塊順序可以不同，讀出的資料相同", () => {
  const parsed = markdownToCircle(
    ["## 標題", "", "[^a-1]", "", "::figure{#fig-1}", "", "段落一", "", ":::checklist", "- 一", ":::", "", "段落二", ""].join("\n"),
    "how",
  );
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.part, { heading: "標題", body: ["段落一", "段落二"], checklist: ["一"], figures: ["fig-1"], sources: ["a-1"] });
});

test("Markdown 寫錯時回報行號，checkRecord 算錯誤", () => {
  const ctx = context();
  const raw = parse(readFileSync(agileFile, "utf8")) as Record<string, unknown>;
  const record = yamlToRecord(raw, "knowledge/pm-leadership/pm.agile/sh.yaml");
  const cases: [string, RegExp][] = [
    ["沒有標題的段落\n", /第 1 行：第一行必須是「## 標題」/],
    ["## 標題\n\n:::items\n- 一\n  內容\n", /第 3 行：區塊沒有用 ::: 收尾/],
    ["## 標題\n\n:::video{url=\"https://example.com\"}\n:::\n", /第 3 行：不認得的區塊 :::video/],
    ["## 標題\n\n\\\"沒收尾\n", /第 3 行：JSON 字串寫錯/],
    ["## 標題\n\n::figure{#a role=\"hero\"}\n", /第 3 行：::figure 只收/],
  ];
  for (const [markdown, expected] of cases) {
    const broken: KpRecord = { ...record, revision: { ...record.revision, why: markdown } };
    const result = checkRecord(broken, ctx);
    assert.equal(result.point, null);
    assert.match(result.errors.join("\n"), expected);
    assert.match(result.errors[0] ?? "", /^knowledge_points\/pm\.agile@sh: why /);
  }
});

test("轉換器不認得的欄位會擋下，不靜靜丟資料", () => {
  const raw = parse(readFileSync(agileFile, "utf8")) as Record<string, unknown>;
  assert.throws(() => yamlToRecord({ ...raw, video: "x" }, "a.yaml"), (error: unknown) => error instanceof ConvertError && /video/.test(error.message));
  const why = { ...(raw.why as Record<string, unknown>), banner: "x" };
  assert.throws(() => yamlToRecord({ ...raw, why }, "a.yaml"), /why 有轉換器不認得的欄位 banner/);
  const record = yamlToRecord(raw, "a.yaml");
  const extra = { ...record, revision: { ...record.revision, structure: { ...record.revision.structure, color: "red" } } } as KpRecord;
  assert.match(recordToYaml(extra).errors.join("\n"), /structure 有轉換器不認得的欄位 color/);
});

test("修訂版的欄位照規格：structure、lead、三圈 Markdown、圖、來源", () => {
  const raw = parse(readFileSync(agileFile, "utf8")) as Record<string, unknown>;
  const record = yamlToRecord(raw, "a.yaml");
  assert.equal(record.kpId, "pm.agile@sh");
  assert.equal(record.status, "published");
  assert.deepEqual(Object.keys(record.revision), ["structure", "lead", "why", "how", "what", "figures", "sources"]);
  assert.deepEqual(record.revision.structure.curriculum108?.coreCompetencies, ["A2", "A3", "C2"]);
  assert.equal(record.revision.structure.ai.humanExperience[0], "面對批評調整方向、判斷何時該停");
  assert.equal(record.revision.lead.guidingQuestions.length, 3);
  assert.ok(record.revision.why?.startsWith("## 先做小版本，再一路改進\n"));
  assert.ok(record.revision.how?.includes('::figure{#agile-flow role="activity"}'));
});

test("checkRecord 和 YAML 的單點規則結果相同（只有訊息開頭不同）", () => {
  const ctx = context();
  const rel = "knowledge/pm-leadership/pm.agile/sh.yaml";
  const raw = parse(readFileSync(agileFile, "utf8")) as Record<string, unknown>;
  const fromYaml = checkPoint({ ref: rel, raw }, ctx);
  const fromRecord = checkRecord(JSON.parse(JSON.stringify(yamlToRecord(raw, rel))) as KpRecord, ctx);
  const relabel = (list: string[]) => list.map((message) => message.replace(`${rel}: `, "knowledge_points/pm.agile@sh: "));
  assert.deepEqual(fromRecord.errors, relabel(fromYaml.errors));
  assert.deepEqual([...fromRecord.warnings].sort(), relabel(fromYaml.warnings).sort());
  assert.ok(fromYaml.point && fromRecord.point);
  assert.deepEqual({ ...fromRecord.point, file: fromYaml.point.file }, fromYaml.point);
});

const SAMPLE = [
  "# B9 提案：x.y@sh",
  "#   - 縮排、全形「引號」與 # 井號都原樣保留   ",
  "id: x.y@sh",
  "title: 'a # 不是註解'",
  "why:",
  "  # 圈內註解",
  "  heading: 為什麼",
  "  items:",
  "  - title: 甲 # 行尾註解",
  "    text: 乙",
  "#",
  "# 檔尾註解",
  "",
].join("\n");

test("YAML 註解逐字抽出，帶行號、欄位與附著的欄位路徑", () => {
  const comments = extractComments(SAMPLE);
  assert.deepEqual(comments, [
    { line: 1, column: 1, text: "# B9 提案：x.y@sh", inline: false, path: "id" },
    { line: 2, column: 1, text: "#   - 縮排、全形「引號」與 # 井號都原樣保留   ", inline: false, path: "id" },
    { line: 6, column: 3, text: "# 圈內註解", inline: false, path: "why.heading" },
    { line: 9, column: 14, text: "# 行尾註解", inline: true, path: "why.items[0].title" },
    { line: 11, column: 1, text: "#", inline: false, path: null },
    { line: 12, column: 1, text: "# 檔尾註解", inline: false, path: null },
  ]);
  // 挖掉之後再也沒有註解，資料不變；位置不對就丟錯。
  const blanked = blankComments(SAMPLE, comments);
  assert.deepEqual(extractComments(blanked), []);
  assert.deepEqual(parse(blanked), parse(SAMPLE));
  assert.throws(() => blankComments(SAMPLE, [{ ...comments[0], column: 2 }]), /不是這段註解/);
  assert.deepEqual(extractComments("id: a\n"), []);
});

test("註解進第一版修訂的 importNotes，不轉回 YAML，也寫得進 audit_log", () => {
  const text = readFileSync(agileFile, "utf8");
  const raw = parse(text);
  const plain = yamlToRecord(raw, "knowledge/pm-leadership/pm.agile/sh.yaml");
  assert.equal(plain.revision.importNotes, undefined);

  const withSource = "# 審稿紀錄：第一行\n" + text;
  const record = yamlToRecord(parse(withSource), "knowledge/pm-leadership/pm.agile/sh.yaml", {
    sourceText: withSource,
    commit: "e1763c7",
  });
  assert.deepEqual(record.revision.importNotes?.file, "knowledge/pm-leadership/pm.agile/sh.yaml");
  assert.equal(record.revision.importNotes?.commit, "e1763c7");
  assert.equal(record.revision.importNotes?.comments[0]?.text, "# 審稿紀錄：第一行");
  assert.equal(Object.keys(record.revision).at(-1), "importNotes");

  const back = recordToYaml(JSON.parse(JSON.stringify(record)) as KpRecord);
  assert.deepEqual(back.errors, []);
  assert.deepEqual(back.raw, raw);
  assert.match(
    recordToYaml({ ...record, revision: { ...record.revision, importNotes: { file: 1 } as never } }).errors.join(),
    /importNotes 要有 file 與 comments/,
  );

  const entry = importAuditEntry(record, {
    revisionId: "r1",
    actor: "import",
    at: "2026-10-30T05:00:00Z",
    file: "knowledge/pm-leadership/pm.agile/sh.yaml",
    commit: "e1763c7",
  });
  assert.equal(entry.action, "kp.import");
  assert.deepEqual(entry.comments, record.revision.importNotes?.comments);
  assert.notEqual(entry.comments, record.revision.importNotes?.comments);
});

test("單元測試沒有預先載入 node-stubs：誤 import server-only 仍然會失敗", () => {
  const require = createRequire(import.meta.url);
  assert.throws(() => require("server-only"));
});
