/**
 * YAML 知識點 ⇄ 資料庫修訂版（docs/kp-db-restructure.md 第 3、4 節）。
 *
 * - yamlToRecord：YAML 解析出的物件 → KpRecord（結構欄位＋lead＋三圈 Markdown＋圖＋來源）。
 *   遇到不認得的欄位就丟 ConvertError，不會靜靜丟資料。
 * - recordToYaml：KpRecord → schema 形狀的物件（欄位順序同 schema），之後交給 rules 驗證。
 * - recordToYamlText：每晚匯出用的 YAML 文字。
 * - checkRecord／checkRecords：轉回物件後跑 rules 的 checkPoint／checkPoints（資料庫形式，沒有檔案位置）。
 *
 * 「無損」指資料：YAML → 修訂版 → YAML 解析後的物件完全相同（同型別、同值、陣列同順序、
 * 選填欄位有沒有寫也相同）。物件欄位順序不保留（Firestore 的 map 本來就不保留順序），
 * 匯出時一律用 schema 的順序。YAML 註解不是資料，不進修訂版。
 */
import { stringify } from "yaml";
import { checkPoints } from "../rules/catalog";
import { checkPoint } from "../rules/point";
import type { KpDocument, PointResult, PointsResult, RuleContext } from "../rules/types";
import { isRecord } from "../rules/util";
import { circleToMarkdown, markdownToCircle } from "./markdown";
import { ConvertError, type KpRecord } from "./types";

/** [YAML 欄位, 修訂版欄位]。順序就是匯出時的欄位順序（同 schema）。 */
type Renames = readonly (readonly [string, string])[];

const DISCIPLINE: Renames = [["path", "path"], ["layer", "layer"], ["crosscutting", "crosscutting"]];
const STAGE: Renames = [["level", "level"], ["grades", "grades"]];
const CURRICULUM: Renames = [
  ["domains", "domains"],
  ["core_competencies", "coreCompetencies"],
  ["issues", "issues"],
  ["performances", "performances"],
  ["contents", "contents"],
];
const LINKS: Renames = [["why", "why"], ["how", "how"], ["related", "related"], ["deeper", "deeper"]];
const COMPETENCY: Renames = [["specialist", "specialist"], ["generalist", "generalist"]];
const AI: Renames = [["delegable", "delegable"], ["human_experience", "humanExperience"]];
const EST_TIME: Renames = [["school", "school"], ["source", "source"]];
const FORMATS: Renames = [
  ["slides", "slides"],
  ["article", "article"],
  ["exercise", "exercise"],
  ["project", "project"],
  ["ai_prompt", "aiPrompt"],
  ["game", "game"],
];
const SOURCE_FIELDS = ["id", "title", "publisher", "url", "accessed", "kind", "supports"] as const;

type Slot =
  | { yaml: string; kind: "id" | "status" | "circle" | "figures" | "sources" }
  | { yaml: string; kind: "structure" | "lead"; key: string; nested?: Renames };

/** YAML 頂層欄位。順序同 schema 的 properties。 */
const TOP: readonly Slot[] = [
  { yaml: "id", kind: "id" },
  { yaml: "concept", kind: "structure", key: "concept" },
  { yaml: "title", kind: "structure", key: "title" },
  { yaml: "status", kind: "status" },
  { yaml: "version", kind: "structure", key: "version" },
  { yaml: "discipline", kind: "structure", key: "discipline", nested: DISCIPLINE },
  { yaml: "stage", kind: "structure", key: "stage", nested: STAGE },
  { yaml: "curriculum_108", kind: "structure", key: "curriculum108", nested: CURRICULUM },
  { yaml: "to_verify", kind: "structure", key: "toVerify" },
  { yaml: "verify_notes", kind: "structure", key: "verifyNotes" },
  { yaml: "prerequisites", kind: "structure", key: "prerequisites" },
  { yaml: "links", kind: "structure", key: "links", nested: LINKS },
  { yaml: "link_notes", kind: "structure", key: "linkNotes" },
  { yaml: "competency", kind: "structure", key: "competency", nested: COMPETENCY },
  { yaml: "ai", kind: "structure", key: "ai", nested: AI },
  { yaml: "idea", kind: "lead", key: "idea" },
  { yaml: "guiding_questions", kind: "lead", key: "guidingQuestions" },
  { yaml: "scenario", kind: "lead", key: "scenario" },
  { yaml: "goal", kind: "lead", key: "goal" },
  { yaml: "review", kind: "lead", key: "review" },
  { yaml: "formats", kind: "structure", key: "formats", nested: FORMATS },
  { yaml: "audience", kind: "structure", key: "audience" },
  { yaml: "authors", kind: "structure", key: "authors" },
  { yaml: "updated", kind: "structure", key: "updated" },
  { yaml: "est_time", kind: "structure", key: "estTime", nested: EST_TIME },
  { yaml: "why", kind: "circle" },
  { yaml: "how", kind: "circle" },
  { yaml: "what", kind: "circle" },
  { yaml: "figures", kind: "figures" },
  { yaml: "sources", kind: "sources" },
];

/** structure 欄位在修訂版裡的順序（只影響 JSON 輸出好不好讀）。 */
const STRUCTURE_ORDER = [
  "concept", "title", "version", "discipline", "stage", "curriculum108", "prerequisites", "links", "linkNotes",
  "competency", "ai", "audience", "toVerify", "verifyNotes", "estTime", "formats", "authors", "updated",
];
const LEAD_ORDER = ["idea", "goal", "scenario", "review", "guidingQuestions"];

/** 只允許 JSON 值（Firestore 也存得下），順便深拷貝。 */
function json<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function rename(value: unknown, renames: Renames, from: 0 | 1, where: string, problems: string[]): Record<string, unknown> {
  if (!isRecord(value)) {
    problems.push(`${where} 必須是物件`);
    return {};
  }
  const to = from === 0 ? 1 : 0;
  const known = new Set(renames.map((pair) => pair[from]));
  for (const key of Object.keys(value)) if (!known.has(key)) problems.push(`${where} 有轉換器不認得的欄位 ${key}`);
  const out: Record<string, unknown> = {};
  for (const pair of renames) {
    if (Object.hasOwn(value, pair[from])) out[pair[to]] = json(value[pair[from]]);
  }
  return out;
}

function ordered(value: Record<string, unknown>, order: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of order) if (Object.hasOwn(value, key)) out[key] = value[key];
  for (const key of Object.keys(value)) if (!Object.hasOwn(out, key)) out[key] = value[key];
  return out;
}

/** YAML 解析出的物件 → KpRecord。ref 只用在錯誤訊息（例如 knowledge/pm-leadership/pm.agile/sh.yaml）。 */
export function yamlToRecord(raw: unknown, ref: string): KpRecord {
  const problems: string[] = [];
  if (!isRecord(raw)) throw new ConvertError([`${ref}: 不是物件`]);
  const known = new Set(TOP.map((slot) => slot.yaml));
  for (const key of Object.keys(raw)) if (!known.has(key)) problems.push(`${ref}: 有轉換器不認得的欄位 ${key}`);

  const structure: Record<string, unknown> = {};
  const lead: Record<string, unknown> = {};
  const revision: Record<string, unknown> = {};
  for (const slot of TOP) {
    if (!Object.hasOwn(raw, slot.yaml)) continue;
    const value = raw[slot.yaml];
    const where = `${ref}: ${slot.yaml}`;
    if (slot.kind === "id" || slot.kind === "status") {
      if (typeof value !== "string") problems.push(`${where} 必須是字串`);
      continue;
    }
    if (slot.kind === "circle") {
      revision[slot.yaml] = circleToMarkdown(value, where, problems);
      continue;
    }
    if (slot.kind === "figures" || slot.kind === "sources") {
      if (!Array.isArray(value) || !value.every(isRecord)) problems.push(`${where} 必須是物件陣列`);
      else revision[slot.yaml] = json(value);
      continue;
    }
    if (slot.kind !== "structure" && slot.kind !== "lead") continue;
    const target = slot.kind === "structure" ? structure : lead;
    target[slot.key] = slot.nested ? rename(value, slot.nested, 0, where, problems) : json(value);
  }
  if (typeof raw.id !== "string") problems.push(`${ref}: 沒有 id`);
  if (typeof raw.status !== "string") problems.push(`${ref}: 沒有 status`);
  if (problems.length > 0) throw new ConvertError(problems);

  const content = ordered(
    { structure: ordered(structure, STRUCTURE_ORDER), lead: ordered(lead, LEAD_ORDER), ...revision },
    ["structure", "lead", "why", "how", "what", "figures", "sources"],
  );
  return { kpId: raw.id as string, status: raw.status as KpRecord["status"], revision: content as unknown as KpRecord["revision"] };
}

/** 修訂版在訊息裡的名稱。 */
export function recordRef(record: Pick<KpRecord, "kpId">): string {
  return `knowledge_points/${record.kpId}`;
}

/**
 * KpRecord → schema 形狀的物件（欄位順序同 schema）。Markdown 寫錯或有不認得的欄位時
 * raw 為 null，錯誤放在 errors。這一步不跑規則；規則請用 checkRecord。
 */
export function recordToYaml(record: KpRecord): { raw: Record<string, unknown> | null; errors: string[] } {
  const ref = recordRef(record);
  const errors: string[] = [];
  const revision = record.revision as unknown as Record<string, unknown>;
  if (!isRecord(revision) || !isRecord(revision.structure) || !isRecord(revision.lead)) {
    return { raw: null, errors: [`${ref}: 修訂版要有 structure 與 lead`] };
  }
  const structure = revision.structure;
  const lead = revision.lead;
  const knownTop = new Set(["structure", "lead", "why", "how", "what", "figures", "sources"]);
  for (const key of Object.keys(revision)) if (!knownTop.has(key)) errors.push(`${ref}: 修訂版有轉換器不認得的欄位 ${key}`);
  const structureKeys = new Set(TOP.flatMap((slot) => (slot.kind === "structure" ? [slot.key] : [])));
  const leadKeys = new Set(TOP.flatMap((slot) => (slot.kind === "lead" ? [slot.key] : [])));
  for (const key of Object.keys(structure)) if (!structureKeys.has(key)) errors.push(`${ref}: structure 有轉換器不認得的欄位 ${key}`);
  for (const key of Object.keys(lead)) if (!leadKeys.has(key)) errors.push(`${ref}: lead 有轉換器不認得的欄位 ${key}`);

  const raw: Record<string, unknown> = {};
  for (const slot of TOP) {
    const where = `${ref}: ${slot.yaml}`;
    if (slot.kind === "id") {
      raw.id = record.kpId;
      continue;
    }
    if (slot.kind === "status") {
      raw.status = record.status;
      continue;
    }
    if (slot.kind === "circle") {
      const markdown = revision[slot.yaml];
      if (markdown === undefined) continue;
      if (typeof markdown !== "string") {
        errors.push(`${where} 必須是 Markdown 字串`);
        continue;
      }
      const parsed = markdownToCircle(markdown, where);
      errors.push(...parsed.errors);
      if (parsed.part) raw[slot.yaml] = parsed.part;
      continue;
    }
    if (slot.kind === "figures") {
      if (revision.figures !== undefined) raw.figures = json(revision.figures);
      continue;
    }
    if (slot.kind === "sources") {
      if (revision.sources === undefined) continue;
      raw.sources = Array.isArray(revision.sources)
        ? revision.sources.map((source) => (isRecord(source) ? ordered(json(source), SOURCE_FIELDS) : json(source)))
        : json(revision.sources);
      continue;
    }
    if (slot.kind !== "structure" && slot.kind !== "lead") continue;
    const from = slot.kind === "structure" ? structure : lead;
    if (!Object.hasOwn(from, slot.key)) continue;
    raw[slot.yaml] = slot.nested ? rename(from[slot.key], slot.nested, 1, where, errors) : json(from[slot.key]);
  }
  return errors.length > 0 ? { raw: null, errors } : { raw, errors };
}

/** 每晚匯出用的 YAML 文字（序列不縮排、單引號、不折行；YAML 1.1 規則下會被誤讀的字串加引號）。 */
export function yamlText(raw: unknown): string {
  return stringify(raw, { indentSeq: false, lineWidth: 0, minContentWidth: 0, singleQuote: true, version: "1.1" });
}

export function recordToYamlText(record: KpRecord): string {
  const { raw, errors } = recordToYaml(record);
  if (!raw) throw new ConvertError(errors);
  return yamlText(raw);
}

/** 單點規則（存草稿、送審）。Markdown 寫錯算錯誤。 */
export function checkRecord(record: KpRecord, ctx: RuleContext): PointResult {
  const { raw, errors } = recordToYaml(record);
  if (!raw) return { errors, warnings: [], point: null };
  return checkPoint({ ref: recordRef(record), raw }, ctx);
}

/** 目錄規則（發布）：逐點＋重複 id＋補件清單＋引用＋先備循環。 */
export function checkRecords(records: readonly KpRecord[], ctx: RuleContext): PointsResult {
  const errors: string[] = [];
  const docs: KpDocument[] = [];
  for (const record of records) {
    const converted = recordToYaml(record);
    if (converted.raw) docs.push({ ref: recordRef(record), raw: converted.raw });
    else errors.push(...converted.errors);
  }
  const result = checkPoints(docs, ctx);
  return { errors: [...errors, ...result.errors], warnings: result.warnings, points: result.points };
}
