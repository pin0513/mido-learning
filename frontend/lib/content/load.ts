/**
 * 讀取 frontend/content 的 YAML，並做與 P1 相同的驗證。
 * 這個檔案不 import server-only：驗證腳本用 tsx 直接跑，server-only 在 Node 會丟錯。
 * Next 的 server component 請改由 lib/content/index.ts 進入。
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import Ajv, { type AnySchema, type ErrorObject, type ValidateFunction } from "ajv";
import { parse } from "yaml";
import {
  CORE_CODES,
  LAYER_IDS,
  STAGE_IDS,
  type AudienceId,
  type CirclePart,
  type ContentModel,
  type CoreCompetencyInfo,
  type CurriculumCode,
  type DisciplineNode,
  type KnowledgeFigure,
  type KnowledgeSource,
  type LayerInfo,
  type KnowledgeLinks,
  type KnowledgePoint,
  type KnowledgeStatus,
  type LearningPath,
  type StageInfo,
  type Taxonomy,
} from "./types";

const DOMAINS = ["語文", "數學", "自然科學", "社會", "藝術", "綜合活動", "科技", "健康與體育"] as const;
const ISSUES = [
  "性別平等教育",
  "人權教育",
  "環境教育",
  "海洋教育",
  "品德教育",
  "生命教育",
  "法治教育",
  "科技教育",
  "資訊教育",
  "能源教育",
  "安全教育",
  "防災教育",
  "家庭教育",
  "生涯規劃教育",
  "多元文化教育",
  "閱讀素養教育",
  "戶外教育",
  "國際教育",
  "原住民族教育",
] as const;

const AUDIENCE = new Set<string>(["kid", "adult", "family"]);
const A_LEVEL_KINDS = new Set(["curriculum", "government", "exam"]);
const CIRCLE_KEYS = ["why", "how", "what"] as const;
const ROMAN_STAGE: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

/**
 * 交接文件要求擋掉某些網域，但沒有列出網域。
 * 先留空集合，之後補上域名就會生效，這一輪不自行假設要擋哪些站。
 */
export const EXCLUDED_DOMAINS = new Set<string>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null;
  return value;
}

function sameSet(actual: string[], expected: readonly string[]): boolean {
  if (actual.length !== expected.length) return false;
  const left = new Set(actual);
  return expected.every((item) => left.has(item));
}

function stageFromCode(code: string): number | null {
  const match = /^[0-9A-Za-z]+-(I|II|III|IV|V)-[0-9]+$/.exec(code);
  if (!match?.[1]) return null;
  return ROMAN_STAGE[match[1]] ?? null;
}

function excludedHost(url: string): string | null {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const domain of EXCLUDED_DOMAINS) {
    if (host === domain || host.endsWith(`.${domain}`)) return domain;
  }
  return null;
}

function loadIdList(contentDir: string, fileName: string, errors: string[]): Set<string> {
  const file = join(contentDir, fileName);
  if (!existsSync(file)) return new Set();
  const parsed = readYamlFile(file);
  if (parsed.error || !isRecord(parsed.value) || !Array.isArray(parsed.value.ids)) {
    errors.push(`${fileName}: 必須是 ids 陣列`);
    return new Set();
  }
  const ids = new Set<string>();
  for (const id of parsed.value.ids) {
    if (typeof id !== "string" || id.length === 0) {
      errors.push(`${fileName}: ids 裡有空值`);
      continue;
    }
    if (ids.has(id)) errors.push(`${fileName}: id 重複（${id}）`);
    ids.add(id);
  }
  return ids;
}

function loadCurriculumCodes(contentDir: string, errors: string[]): Map<string, CurriculumCode> {
  const map = new Map<string, CurriculumCode>();
  const rel = "taxonomy/curriculum-108-codes.yaml";
  const file = join(contentDir, rel);
  if (!existsSync(file)) {
    errors.push(`${rel}: 必須存在。學習表現與學習內容只能逐字複製官方原文`);
    return map;
  }
  const parsed = readYamlFile(file);
  if (parsed.error || !isRecord(parsed.value)) {
    errors.push(`${rel}: 無法解析 YAML${parsed.error ? `（${parsed.error}）` : ""}`);
    return map;
  }
  for (const [subject, body] of Object.entries(parsed.value)) {
    if (!isRecord(body)) {
      errors.push(`${rel}: ${subject} 必須是物件`);
      continue;
    }
    for (const bucket of ["performances", "contents"] as const) {
      const group = body[bucket];
      if (group === undefined) continue;
      if (!isRecord(group)) {
        errors.push(`${rel}: ${subject} 的 ${bucket} 必須是物件`);
        continue;
      }
      for (const [code, raw] of Object.entries(group)) {
        if (!isRecord(raw) || typeof raw.text !== "string" || raw.text.length === 0) {
          errors.push(`${rel}: ${code} 缺少逐字原文`);
          continue;
        }
        const roman = stageFromCode(code);
        if (typeof raw.stage !== "number" || roman === null || raw.stage !== roman) {
          errors.push(`${rel}: ${code} 的 stage 必須等於代碼裡的學習階段`);
          continue;
        }
        const source = raw.source;
        if (
          !isRecord(source) ||
          typeof source.url !== "string" ||
          !/^https?:\/\//.test(source.url) ||
          typeof source.page !== "number" ||
          !Number.isInteger(source.page) ||
          source.page < 1
        ) {
          errors.push(`${rel}: ${code} 必須附上官方 PDF 網址與頁碼`);
          continue;
        }
        if (map.has(code)) {
          errors.push(`${rel}: 代碼重複（${code}）`);
          continue;
        }
        map.set(code, { code, stage: raw.stage, text: raw.text, sourceUrl: source.url, sourcePage: source.page });
      }
    }
  }
  if (map.size === 0) errors.push(`${rel}: 沒有任何代碼`);
  return map;
}

function readSources(value: unknown): KnowledgeSource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const sources: KnowledgeSource[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.title !== "string") continue;
    const source: KnowledgeSource = {
      title: item.title,
      publisher: typeof item.publisher === "string" ? item.publisher : "",
      url: typeof item.url === "string" ? item.url : "",
      accessed: typeof item.accessed === "string" ? item.accessed : "",
      kind: typeof item.kind === "string" ? item.kind : "",
      supports: typeof item.supports === "string" ? item.supports : "",
    };
    if (typeof item.id === "string") source.id = item.id;
    sources.push(source);
  }
  return sources;
}

function readFigures(value: unknown): KnowledgeFigure[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const figures: KnowledgeFigure[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.type !== "string") continue;
    const figure: KnowledgeFigure = { id: item.id, type: item.type };
    if (typeof item.source === "string") figure.source = item.source;
    figures.push(figure);
  }
  return figures;
}

function readCircle(value: unknown): CirclePart | undefined {
  if (!isRecord(value) || typeof value.heading !== "string") return undefined;
  const items: CirclePart["items"] = [];
  if (Array.isArray(value.items)) {
    for (const item of value.items) {
      if (!isRecord(item) || typeof item.title !== "string" || typeof item.text !== "string") continue;
      const parsed: CirclePart["items"][number] = { title: item.title, text: item.text };
      if (typeof item.example === "string") parsed.example = item.example;
      if (typeof item.code === "string") parsed.code = item.code;
      items.push(parsed);
    }
  }
  const circle: CirclePart = {
    heading: value.heading,
    body: asStringArray(value.body) ?? [],
    sources: asStringArray(value.sources) ?? [],
    items,
    checklist: asStringArray(value.checklist) ?? [],
    figures: asStringArray(value.figures) ?? [],
    notes: asStringArray(value.notes) ?? [],
  };
  if (typeof value.activity_figure === "string") circle.activityFigure = value.activity_figure;
  if (
    isRecord(value.qa) &&
    typeof value.qa.question === "string" &&
    typeof value.qa.answer === "string" &&
    typeof value.qa.source === "string"
  ) {
    circle.qa = { question: value.qa.question, answer: value.qa.answer, source: value.qa.source };
  }
  return circle;
}

function circleHasContent(raw: Record<string, unknown>): boolean {
  return (
    (Array.isArray(raw.body) && raw.body.length > 0) ||
    (Array.isArray(raw.items) && raw.items.length > 0) ||
    (Array.isArray(raw.checklist) && raw.checklist.length > 0) ||
    (Array.isArray(raw.figures) && raw.figures.length > 0) ||
    (Array.isArray(raw.notes) && raw.notes.length > 0)
  );
}

function readYamlFile(file: string): { value?: unknown; error?: string } {
  try {
    return { value: parse(readFileSync(file, "utf8")) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message };
  }
}

export function walkYaml(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkYaml(full));
    else if (entry.isFile() && entry.name.endsWith(".yaml")) files.push(full);
  }
  return files.sort();
}

function loadSchema(contentDir: string): AnySchema {
  const file = join(contentDir, "schema", "knowledge-point.schema.json");
  return JSON.parse(readFileSync(file, "utf8")) as AnySchema;
}

function ajvMessages(file: string, errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((error) => {
    const where = error.instancePath || "(root)";
    return `${file}: ${where} ${error.message ?? "不符合 schema"}`;
  });
}

function loadTaxonomy(contentDir: string, errors: string[]): Taxonomy | null {
  const taxonomyDir = join(contentDir, "taxonomy");
  const stagesDoc = readYamlFile(join(taxonomyDir, "stages.yaml"));
  const curriculumDoc = readYamlFile(join(taxonomyDir, "curriculum-108.yaml"));
  const competenciesDoc = readYamlFile(join(taxonomyDir, "competencies.yaml"));
  const disciplinesDoc = readYamlFile(join(taxonomyDir, "disciplines.yaml"));
  const formatsDoc = readYamlFile(join(taxonomyDir, "formats.yaml"));
  for (const [name, doc] of [
    ["stages.yaml", stagesDoc],
    ["curriculum-108.yaml", curriculumDoc],
    ["competencies.yaml", competenciesDoc],
    ["disciplines.yaml", disciplinesDoc],
    ["formats.yaml", formatsDoc],
  ] as const) {
    if (doc.error) errors.push(`taxonomy/${name}: 無法解析 YAML（${doc.error}）`);
  }
  if (errors.length > 0) return null;

  const stages = new Map<string, StageInfo>();
  const stageList: StageInfo[] = [];
  if (!isRecord(stagesDoc.value) || !Array.isArray(stagesDoc.value.stages)) {
    errors.push("taxonomy/stages.yaml: 缺少 stages 陣列");
    return null;
  }
  const stageIds: string[] = [];
  for (const raw of stagesDoc.value.stages) {
    if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.name !== "string") {
      errors.push("taxonomy/stages.yaml: 階段缺少 id 或 name");
      continue;
    }
    stageIds.push(raw.id);
    const grades = Array.isArray(raw.grades) ? raw.grades.filter((grade): grade is number => typeof grade === "number") : [];
    const learningStages = Array.isArray(raw.learning_stages)
      ? raw.learning_stages.filter((stage): stage is number => typeof stage === "number")
      : [];
    const info: StageInfo = {
      id: raw.id,
      name: raw.name,
      grades,
      learningStages,
      curriculum108: raw.curriculum_108 === true,
      rank: stageIds.length - 1,
    };
    stages.set(raw.id, info);
    stageList.push(info);
  }
  if (!sameSet(stageIds, STAGE_IDS) || stageIds.join() !== STAGE_IDS.join()) {
    errors.push(`taxonomy/stages.yaml: 階段必須正好是 ${STAGE_IDS.join("、")}，且順序相同`);
  }
  const uni = stages.get("uni");
  if (uni?.curriculum108) errors.push("taxonomy/stages.yaml: 大學不屬於 108 課綱");
  for (const id of ["es", "jh", "sh"] as const) {
    if (stages.get(id)?.curriculum108 !== true) errors.push(`taxonomy/stages.yaml: ${id} 必須標 curriculum_108: true`);
  }

  if (!isRecord(curriculumDoc.value)) return null;
  const domainNames = Array.isArray(curriculumDoc.value.domains)
    ? curriculumDoc.value.domains.flatMap((domain) => (isRecord(domain) && typeof domain.name === "string" ? [domain.name] : []))
    : [];
  if (!sameSet(domainNames, DOMAINS)) {
    errors.push(`taxonomy/curriculum-108.yaml: 領域必須正好是八大領域（${DOMAINS.join("、")}）`);
  }
  const coreCompetencies: CoreCompetencyInfo[] = [];
  const coreCodes = Array.isArray(curriculumDoc.value.core_competencies)
    ? curriculumDoc.value.core_competencies.flatMap((item) => {
        if (!isRecord(item) || typeof item.code !== "string") return [];
        coreCompetencies.push({
          code: item.code,
          facet: typeof item.facet === "string" ? item.facet : "",
          name: typeof item.name === "string" ? item.name : item.code,
        });
        return [item.code];
      })
    : [];
  if (!sameSet(coreCodes, CORE_CODES)) {
    errors.push("taxonomy/curriculum-108.yaml: 核心素養代碼必須正好是 A1–C3，不能增刪");
  }
  const issues = Array.isArray(curriculumDoc.value.issues)
    ? curriculumDoc.value.issues.filter((item): item is string => typeof item === "string")
    : [];
  if (!sameSet(issues, ISSUES)) {
    errors.push("taxonomy/curriculum-108.yaml: 議題清單與官方 19 個議題不一致");
  }

  const generalist = new Set<string>();
  const specialist = new Set<string>();
  if (isRecord(competenciesDoc.value)) {
    for (const item of Array.isArray(competenciesDoc.value.generalist) ? competenciesDoc.value.generalist : []) {
      if (isRecord(item) && typeof item.name === "string") {
        if (generalist.has(item.name)) errors.push(`taxonomy/competencies.yaml: 通才名稱重複（${item.name}）`);
        generalist.add(item.name);
      }
    }
    for (const item of Array.isArray(competenciesDoc.value.specialist) ? competenciesDoc.value.specialist : []) {
      if (isRecord(item) && typeof item.name === "string") {
        if (specialist.has(item.name)) errors.push(`taxonomy/competencies.yaml: 專才名稱重複（${item.name}）`);
        specialist.add(item.name);
      }
    }
  }
  if (generalist.size === 0 || specialist.size === 0) {
    errors.push("taxonomy/competencies.yaml: 專才或通才清單是空的");
  }

  const layers = new Set<string>();
  const layerList: LayerInfo[] = [];
  const crosscutting = new Set<string>();
  const roots: DisciplineNode[] = [];
  const names = new Set<string>();
  const nodeIds = new Set<string>();
  const prefixes = new Set<string>();
  const folders = new Set<string>();

  const visit = (raw: unknown, inherited: string, isRoot: boolean): DisciplineNode | null => {
    if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.name !== "string") {
      errors.push("taxonomy/disciplines.yaml: 節點缺少 id 或 name");
      return null;
    }
    if (names.has(raw.name)) errors.push(`taxonomy/disciplines.yaml: 名稱重複，路徑會無法判斷（${raw.name}）`);
    if (nodeIds.has(raw.id)) errors.push(`taxonomy/disciplines.yaml: id 重複（${raw.id}）`);
    names.add(raw.name);
    nodeIds.add(raw.id);
    const layer = typeof raw.layer === "string" ? raw.layer : inherited;
    if (!LAYER_IDS.includes(layer as (typeof LAYER_IDS)[number])) {
      errors.push(`taxonomy/disciplines.yaml: ${raw.name} 的層級無效（${layer || "空"}）`);
    }
    const idPrefix = typeof raw.id_prefix === "string" ? raw.id_prefix : undefined;
    const contentFolder = typeof raw.content_folder === "string" ? raw.content_folder : undefined;
    if (isRoot && (idPrefix || contentFolder)) {
      if (!idPrefix || !contentFolder) errors.push(`taxonomy/disciplines.yaml: ${raw.name} 的 id_prefix 與 content_folder 必須同時存在`);
      if (contentFolder && folders.has(contentFolder)) errors.push(`taxonomy/disciplines.yaml: 資料夾名稱重複（${contentFolder}）`);
      if (contentFolder) folders.add(contentFolder);
    }
    if (idPrefix && prefixes.has(idPrefix)) errors.push(`taxonomy/disciplines.yaml: id 前綴重複（${idPrefix}）`);
    if (idPrefix) prefixes.add(idPrefix);
    if (!isRoot && contentFolder) {
      errors.push(`taxonomy/disciplines.yaml: 只有最上層學門可以設定內容資料夾（${raw.name}）`);
    }
    const children: DisciplineNode[] = [];
    if (Array.isArray(raw.children)) {
      for (const child of raw.children) {
        const node = visit(child, layer, false);
        if (node) children.push(node);
      }
    }
    const summary = typeof raw.summary === "string" ? raw.summary : undefined;
    return { id: raw.id, name: raw.name, layer, summary, idPrefix, contentFolder, children };
  };

  if (!isRecord(disciplinesDoc.value) || !Array.isArray(disciplinesDoc.value.layers) || !Array.isArray(disciplinesDoc.value.disciplines)) {
    errors.push("taxonomy/disciplines.yaml: 缺少 layers 或 disciplines");
  } else {
    for (const layer of disciplinesDoc.value.layers) {
      if (isRecord(layer) && typeof layer.id === "string") {
        layers.add(layer.id);
        const shortName = typeof layer.short_name === "string" ? layer.short_name.trim() : "";
        if (!shortName) errors.push(`taxonomy/disciplines.yaml: 層級 ${layer.id} 缺少 short_name`);
        layerList.push({
          id: layer.id,
          name: typeof layer.name === "string" ? layer.name : layer.id,
          shortName,
          role: typeof layer.role === "string" ? layer.role : "",
        });
      }
    }
    if (!sameSet([...layers], LAYER_IDS)) {
      errors.push(`taxonomy/disciplines.yaml: 層級必須正好是 ${LAYER_IDS.join("、")}`);
    }
    for (const item of Array.isArray(disciplinesDoc.value.crosscutting) ? disciplinesDoc.value.crosscutting : []) {
      if (isRecord(item) && typeof item.id === "string") crosscutting.add(item.id);
    }
    if (!crosscutting.has("aesthetics")) errors.push("taxonomy/disciplines.yaml: 缺少貫穿主題 aesthetics");
    for (const raw of disciplinesDoc.value.disciplines) {
      const node = visit(raw, "", true);
      if (node) roots.push(node);
    }
  }

  const formatIds = new Set<string>();
  if (!isRecord(formatsDoc.value) || !Array.isArray(formatsDoc.value.formats)) {
    errors.push("taxonomy/formats.yaml: 缺少 formats");
  } else {
    for (const item of formatsDoc.value.formats) {
      if (isRecord(item) && typeof item.id === "string") formatIds.add(item.id);
    }
    if (!formatIds.has("slides")) errors.push("taxonomy/formats.yaml: 缺少 slides");
  }

  const curriculumCodes = loadCurriculumCodes(contentDir, errors);

  if (errors.length > 0) return null;
  return {
    stages,
    stageList,
    layers,
    layerList,
    curriculumCodes,
    domains: new Set(domainNames),
    coreCodes: new Set(coreCodes),
    coreCompetencies,
    issues: new Set(issues),
    generalist,
    specialist,
    crosscutting,
    formatIds,
    roots,
  };
}

function resolvePath(roots: DisciplineNode[], segments: string[]): { node: DisciplineNode; root: DisciplineNode; idPrefix?: string } | null {
  let level = roots;
  let root: DisciplineNode | null = null;
  let current: DisciplineNode | null = null;
  let idPrefix: string | undefined;
  for (const segment of segments) {
    const found = level.find((node) => node.name === segment);
    if (!found) return null;
    if (!root) root = found;
    if (found.idPrefix) idPrefix = found.idPrefix;
    current = found;
    level = found.children;
  }
  if (!current || !root) return null;
  return { node: current, root, idPrefix };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function codeInBand(stageNumber: number, band: number[], allowLater: boolean): boolean {
  if (band.length === 0) return false;
  const min = Math.min(...band);
  const max = Math.max(...band);
  if (stageNumber < min) return false;
  if (stageNumber > max) return allowLater;
  return true;
}

function citeCode(
  rel: string,
  where: string,
  code: string,
  taxonomy: Taxonomy,
  band: number[],
  allowLater: boolean,
  errors: string[],
): void {
  const entry = taxonomy.curriculumCodes.get(code);
  if (!entry) {
    errors.push(`${rel}: ${where} 的代碼「${code}」不在 curriculum-108-codes.yaml，不可自編`);
    return;
  }
  if (!codeInBand(entry.stage, band, allowLater)) {
    errors.push(`${rel}: ${where} 的代碼「${code}」學習階段 ${entry.stage} 不在這個學段`);
  }
}

function checkDetail(
  rel: string,
  id: string,
  raw: Record<string, unknown>,
  stage: string,
  strict: boolean,
  guiding: string[],
  taxonomy: Taxonomy,
  sourcesBackfill: Set<string>,
  circleBackfill: Set<string>,
  errors: string[],
  warnings: string[],
): void {
  const sources = readSources(raw.sources) ?? [];
  const hasSources = sources.length > 0;
  const sourceProblems: string[] = [];
  if (!hasSources) {
    sourceProblems.push(`${rel}: 缺少 sources`);
  } else {
    if (sources.length < 2) sourceProblems.push(`${rel}: 來源至少要 2 筆`);
    if (sources.every((source) => source.kind === "aux")) sourceProblems.push(`${rel}: 來源不能全部是 aux`);
    if ((stage === "es" || stage === "jh" || stage === "sh") && !sources.some((source) => A_LEVEL_KINDS.has(source.kind))) {
      sourceProblems.push(`${rel}: 至少要有一筆 A 級來源（curriculum、government、exam）`);
    }
    const urls = new Set<string>();
    for (const source of sources) {
      if (urls.has(source.url)) sourceProblems.push(`${rel}: 來源網址重複（${source.url}）`);
      urls.add(source.url);
      const banned = excludedHost(source.url);
      if (banned) sourceProblems.push(`${rel}: 來源網域在排除清單（${banned}）`);
    }
  }
  if (sourcesBackfill.has(id) && sourceProblems.length === 0) {
    errors.push(`${rel}: 已符合來源規則，請從 sources-backfill.yaml 移出 ${id}`);
  } else if (sourceProblems.length > 0) {
    const target = strict && !sourcesBackfill.has(id) ? errors : warnings;
    target.push(...sourceProblems);
  }

  const seenSourceIds = new Set<string>();
  for (const source of sources) {
    if (!source.id) {
      const message = `${rel}: 來源「${source.title}」缺少 id`;
      (strict ? errors : warnings).push(message);
      continue;
    }
    if (seenSourceIds.has(source.id)) errors.push(`${rel}: sources id 重複（${source.id}）`);
    seenSourceIds.add(source.id);
  }

  const circleProblems: string[] = [];
  for (const key of CIRCLE_KEYS) {
    const circle = raw[key];
    if (!isRecord(circle)) {
      circleProblems.push(`${rel}: 缺少黃金圈的 ${key}`);
      continue;
    }
    if (!circleHasContent(circle)) circleProblems.push(`${rel}: ${key} 的 body、items、checklist、figures、notes 至少要有一項`);
  }
  if (circleBackfill.has(id) && circleProblems.length === 0) {
    errors.push(`${rel}: 已符合黃金圈規則，請從 golden-circle-backfill.yaml 移出 ${id}`);
  } else if (circleProblems.length > 0) {
    const target = strict && !circleBackfill.has(id) ? errors : warnings;
    target.push(...circleProblems);
  }

  const figureIds = new Set<string>();
  for (const figure of readFigures(raw.figures) ?? []) {
    if (figureIds.has(figure.id)) errors.push(`${rel}: figures id 重複（${figure.id}）`);
    figureIds.add(figure.id);
    if (figure.source && !seenSourceIds.has(figure.source)) {
      errors.push(`${rel}: figures.source 指向不存在的來源（${figure.source}）`);
    }
  }
  if (isRecord(raw.est_time) && typeof raw.est_time.source === "string" && !seenSourceIds.has(raw.est_time.source)) {
    errors.push(`${rel}: est_time.source 指向不存在的來源（${raw.est_time.source}）`);
  }

  const band = taxonomy.stages.get(stage)?.learningStages ?? [];
  for (const key of CIRCLE_KEYS) {
    const circle = raw[key];
    if (!isRecord(circle)) continue;
    for (const sourceId of asStringArray(circle.sources) ?? []) {
      if (!seenSourceIds.has(sourceId)) errors.push(`${rel}: ${key}.sources 指向不存在的來源（${sourceId}）`);
    }
    if (isRecord(circle.qa)) {
      if (typeof circle.qa.question === "string" && !guiding.includes(circle.qa.question)) {
        errors.push(`${rel}: ${key}.qa.question 不在 guiding_questions`);
      }
      if (typeof circle.qa.source === "string" && !seenSourceIds.has(circle.qa.source)) {
        errors.push(`${rel}: ${key}.qa.source 指向不存在的來源（${circle.qa.source}）`);
      }
    }
    for (const figureId of asStringArray(circle.figures) ?? []) {
      if (!figureIds.has(figureId)) errors.push(`${rel}: ${key}.figures 指向不存在的圖（${figureId}）`);
    }
    if (typeof circle.activity_figure === "string" && !figureIds.has(circle.activity_figure)) {
      errors.push(`${rel}: ${key}.activity_figure 指向不存在的圖（${circle.activity_figure}）`);
    }
    if (Array.isArray(circle.items)) {
      for (const item of circle.items) {
        if (isRecord(item) && typeof item.code === "string") citeCode(rel, `${key}.items`, item.code, taxonomy, band, key === "why", errors);
      }
    }
  }

  if (isRecord(raw.curriculum_108)) {
    for (const code of asStringArray(raw.curriculum_108.performances) ?? []) {
      citeCode(rel, "performances", code, taxonomy, band, false, errors);
    }
    for (const code of asStringArray(raw.curriculum_108.contents) ?? []) {
      citeCode(rel, "contents", code, taxonomy, band, false, errors);
    }
  }
}

function loadKnowledgePoints(
  contentDir: string,
  taxonomy: Taxonomy,
  validate: ValidateFunction,
  errors: string[],
  warnings: string[],
  sourcesBackfill: Set<string>,
  circleBackfill: Set<string>,
): KnowledgePoint[] {
  const knowledgeDir = join(contentDir, "knowledge");
  let files: string[] = [];
  try {
    files = walkYaml(knowledgeDir);
  } catch {
    errors.push("knowledge/: 找不到知識點目錄");
    return [];
  }
  if (files.length === 0) errors.push("knowledge/: 沒有任何知識點檔案");

  const points: KnowledgePoint[] = [];
  const seen = new Map<string, string>();
  for (const file of files) {
    const rel = relative(contentDir, file);
    const parsed = readYamlFile(file);
    if (parsed.error) {
      errors.push(`${rel}: 無法解析 YAML（${parsed.error}）`);
      continue;
    }
    if (!validate(parsed.value)) {
      errors.push(...ajvMessages(rel, validate.errors));
      continue;
    }
    if (!isRecord(parsed.value) || !isRecord(parsed.value.discipline) || !isRecord(parsed.value.stage) || !isRecord(parsed.value.links)) {
      errors.push(`${rel}: 欄位形狀不對`);
      continue;
    }
    const id = String(parsed.value.id);
    const concept = String(parsed.value.concept);
    const stage = String(parsed.value.stage.level);
    const pathSegments = asStringArray(parsed.value.discipline.path) ?? [];
    const prerequisites = asStringArray(parsed.value.prerequisites) ?? [];
    const links: KnowledgeLinks = {
      why: asStringArray(parsed.value.links.why) ?? [],
      how: asStringArray(parsed.value.links.how) ?? [],
      related: asStringArray(parsed.value.links.related) ?? [],
      deeper: asStringArray(parsed.value.links.deeper) ?? [],
    };
    const parts = rel.split("/");
    if (parts.length !== 4 || parts[0] !== "knowledge" || !parts[3]?.endsWith(".yaml")) {
      errors.push(`${rel}: 路徑必須是 knowledge/<學門>/<concept>/<階段>.yaml`);
    }
    const folder = parts[1] ?? "";
    const conceptDir = parts[2] ?? "";
    const stageFile = (parts[3] ?? "").replace(/\.yaml$/, "");
    if (conceptDir !== concept || stageFile !== stage) {
      errors.push(`${rel}: 檔名必須是 ${concept}/${stage}.yaml`);
    }
    if (!id.endsWith(`@${stage}`) || id.slice(0, id.length - stage.length - 1) !== concept) {
      errors.push(`${rel}: id 必須是 ${concept}@${stage}`);
    }
    const previous = seen.get(id);
    if (previous) errors.push(`${rel}: id 重複（${id}），另一份在 ${previous}`);
    seen.set(id, rel);

    const resolved = resolvePath(taxonomy.roots, pathSegments);
    if (!resolved) {
      errors.push(`${rel}: discipline.path 不在學科樹裡（${pathSegments.join(" / ")}）`);
    } else {
      if (parsed.value.discipline.layer !== resolved.node.layer) {
        errors.push(`${rel}: layer 應為 ${resolved.node.layer}，目前是 ${String(parsed.value.discipline.layer)}`);
      }
      if (!resolved.root.idPrefix || !resolved.root.contentFolder) {
        errors.push(`${rel}: 學門「${resolved.root.name}」還沒有 id 前綴或內容資料夾`);
      } else {
        if (folder !== resolved.root.contentFolder) {
          errors.push(`${rel}: 應放在 knowledge/${resolved.root.contentFolder}/`);
        }
        if (!id.startsWith(`${resolved.idPrefix}.`)) {
          errors.push(`${rel}: id 前綴應為 ${resolved.idPrefix}`);
        }
      }
    }
    if (!taxonomy.stages.has(stage)) errors.push(`${rel}: 未知階段 ${stage}`);
    const stageInfo = taxonomy.stages.get(stage);
    if (stageInfo && Array.isArray(parsed.value.stage.grades)) {
      for (const grade of parsed.value.stage.grades) {
        if (typeof grade !== "number" || !stageInfo.grades.includes(grade)) {
          errors.push(`${rel}: 年級 ${String(grade)} 不在${stageInfo.name}的範圍`);
        }
      }
    }
    let curriculum108: KnowledgePoint["curriculum108"];
    if (isRecord(parsed.value.curriculum_108)) {
      if (stageInfo && !stageInfo.curriculum108) errors.push(`${rel}: ${stageInfo.name}不填 curriculum_108`);
      const domains = asStringArray(parsed.value.curriculum_108.domains) ?? [];
      const codes = asStringArray(parsed.value.curriculum_108.core_competencies) ?? [];
      const issueList = asStringArray(parsed.value.curriculum_108.issues) ?? [];
      for (const domain of domains) {
        if (!taxonomy.domains.has(domain)) errors.push(`${rel}: 未知領域「${domain}」`);
      }
      for (const code of codes) {
        if (!taxonomy.coreCodes.has(code)) errors.push(`${rel}: 核心素養代碼只能是 A1–C3（${code}）`);
      }
      for (const issue of issueList) {
        if (!taxonomy.issues.has(issue)) errors.push(`${rel}: 未知議題「${issue}」`);
      }
      curriculum108 = { domains, coreCompetencies: codes, issues: issueList };
      const performances = asStringArray(parsed.value.curriculum_108.performances);
      const contents = asStringArray(parsed.value.curriculum_108.contents);
      if (performances) curriculum108.performances = performances;
      if (contents) curriculum108.contents = contents;
    } else if (stageInfo?.curriculum108) {
      errors.push(`${rel}: ${stageInfo.name}必須填 curriculum_108`);
    }
    const crosscutting = asStringArray(parsed.value.discipline.crosscutting) ?? [];
    for (const item of crosscutting) {
      if (!taxonomy.crosscutting.has(item)) errors.push(`${rel}: 未知的貫穿主題「${item}」`);
    }
    const specialist = isRecord(parsed.value.competency) ? (asStringArray(parsed.value.competency.specialist) ?? []) : [];
    const generalist = isRecord(parsed.value.competency) ? (asStringArray(parsed.value.competency.generalist) ?? []) : [];
    for (const name of specialist) {
      if (!taxonomy.specialist.has(name)) errors.push(`${rel}: 未知專才標籤「${name}」`);
    }
    for (const name of generalist) {
      if (!taxonomy.generalist.has(name)) errors.push(`${rel}: 未知通才標籤「${name}」`);
    }
    const linkBuckets: Array<[string, string[]]> = [
      ["why", links.why],
      ["how", links.how],
      ["related", links.related],
      ["deeper", links.deeper],
      ["prerequisites", prerequisites],
    ];
    const used = new Map<string, string>();
    for (const [bucket, list] of linkBuckets) {
      for (const target of list) {
        if (target === id) errors.push(`${rel}: ${bucket} 不能指向自己`);
        const prior = used.get(target);
        if (prior) errors.push(`${rel}: ${target} 同時出現在 ${prior} 與 ${bucket}`);
        used.set(target, bucket);
      }
    }
    const ownRank = taxonomy.stages.get(stage)?.rank ?? -1;
    for (const target of links.deeper) {
      const targetStage = target.split("@")[1] ?? "";
      const targetRank = taxonomy.stages.get(targetStage)?.rank;
      if (targetRank === undefined || targetRank <= ownRank) {
        errors.push(`${rel}: deeper ${target} 的階段必須比 ${stage} 後面`);
      }
    }

    const title = String(parsed.value.title ?? "");
    if (title.includes(":")) errors.push(`${rel}: 標題請用全形冒號（：）`);

    const status = parsed.value.status;
    const knowledgeStatus: KnowledgeStatus =
      status === "published" || status === "review" || status === "draft" ? status : "draft";
    const formats = isRecord(parsed.value.formats) ? parsed.value.formats : {};
    const slides = asStringArray(formats.slides) ?? [];
    const audienceRaw = asStringArray(parsed.value.audience) ?? [];
    const audience = audienceRaw.filter((item): item is AudienceId => AUDIENCE.has(item));
    const ai = isRecord(parsed.value.ai) ? parsed.value.ai : {};
    const grades = Array.isArray(parsed.value.stage.grades)
      ? parsed.value.stage.grades.filter((grade): grade is number => typeof grade === "number")
      : [];
    const guidingQuestions = asStringArray(parsed.value.guiding_questions) ?? [];
    checkDetail(
      rel,
      id,
      parsed.value,
      stage,
      knowledgeStatus === "review" || knowledgeStatus === "published",
      guidingQuestions,
      taxonomy,
      sourcesBackfill,
      circleBackfill,
      errors,
      warnings,
    );

    const point: KnowledgePoint = {
      file: rel,
      id,
      concept,
      title,
      status: knowledgeStatus,
      version: String(parsed.value.version ?? ""),
      disciplinePath: pathSegments,
      layer: String(parsed.value.discipline.layer ?? ""),
      crosscutting,
      folder,
      stage,
      grades,
      curriculum108,
      toVerify: parsed.value.to_verify === true,
      verifyNotes: asStringArray(parsed.value.verify_notes) ?? [],
      prerequisites,
      links,
      linkNotes: String(parsed.value.link_notes ?? ""),
      specialist,
      generalist,
      delegable: asStringArray(ai.delegable) ?? [],
      humanExperience: asStringArray(ai.human_experience) ?? [],
      idea: String(parsed.value.idea ?? ""),
      goal: optionalString(parsed.value.goal),
      review: optionalString(parsed.value.review),
      guidingQuestions,
      scenario: String(parsed.value.scenario ?? ""),
      slides,
      article: optionalString(formats.article),
      exercise: optionalString(formats.exercise),
      project: optionalString(formats.project),
      aiPrompt: optionalString(formats.ai_prompt),
      game: optionalString(formats.game),
      audience,
      authors: asStringArray(parsed.value.authors) ?? [],
      updated: String(parsed.value.updated ?? ""),
    };
    if (isRecord(parsed.value.est_time) && typeof parsed.value.est_time.school === "string" && typeof parsed.value.est_time.source === "string") {
      point.estTime = { school: parsed.value.est_time.school, source: parsed.value.est_time.source };
    }
    const why = readCircle(parsed.value.why);
    const how = readCircle(parsed.value.how);
    const what = readCircle(parsed.value.what);
    if (why) point.why = why;
    if (how) point.how = how;
    if (what) point.what = what;
    const figures = readFigures(parsed.value.figures);
    const sourceList = readSources(parsed.value.sources);
    if (figures) point.figures = figures;
    if (sourceList) point.sources = sourceList;
    points.push(point);
  }
  for (const listed of sourcesBackfill) {
    if (!seen.has(listed)) errors.push(`sources-backfill.yaml: 未知的 id（${listed}）`);
  }
  for (const listed of circleBackfill) {
    if (!seen.has(listed)) errors.push(`golden-circle-backfill.yaml: 未知的 id（${listed}）`);
  }
  return points;
}

function findCycles(points: KnowledgePoint[]): string[] {
  const adjacent = new Map<string, string[]>();
  for (const point of points) adjacent.set(point.id, []);
  for (const point of points) {
    for (const prereq of point.prerequisites) {
      adjacent.get(prereq)?.push(point.id);
    }
  }
  const color = new Map<string, number>();
  const errors: string[] = [];
  const visit = (id: string, stack: string[]): void => {
    color.set(id, 1);
    for (const next of adjacent.get(id) ?? []) {
      if (color.get(next) === 1) {
        const start = stack.indexOf(next);
        errors.push(`先備循環：${[...stack.slice(start), next].join(" → ")}`);
      } else if ((color.get(next) ?? 0) === 0) {
        visit(next, [...stack, next]);
      }
    }
    color.set(id, 2);
  };
  for (const point of points) {
    if ((color.get(point.id) ?? 0) === 0) visit(point.id, [point.id]);
  }
  return errors;
}

function checkReferences(points: KnowledgePoint[], errors: string[]): void {
  const ids = new Set(points.map((point) => point.id));
  for (const point of points) {
    const refs = [
      ...point.prerequisites.map((id) => ["先備", id] as const),
      ...point.links.why.map((id) => ["why", id] as const),
      ...point.links.how.map((id) => ["how", id] as const),
      ...point.links.related.map((id) => ["related", id] as const),
      ...point.links.deeper.map((id) => ["deeper", id] as const),
    ];
    for (const [kind, id] of refs) {
      if (!ids.has(id)) errors.push(`${point.file}: ${kind} 指向不存在的 id（${id}）`);
    }
  }
  errors.push(...findCycles(points));
}

function loadPaths(contentDir: string, taxonomy: Taxonomy, points: KnowledgePoint[], errors: string[]): LearningPath[] {
  const ids = new Set(points.map((point) => point.id));
  const byId = new Map(points.map((point) => [point.id, point]));
  const pathsDir = join(contentDir, "paths");
  const loaded: LearningPath[] = [];
  let files: string[] = [];
  try {
    files = walkYaml(pathsDir);
  } catch {
    errors.push("paths/: 找不到主線目錄");
    return loaded;
  }
  const pathIds = new Set<string>();
  for (const file of files) {
    const rel = relative(contentDir, file);
    const parsed = readYamlFile(file);
    if (parsed.error || !isRecord(parsed.value)) {
      errors.push(`${rel}: 無法解析主線`);
      continue;
    }
    const fileId = rel.split("/").pop()?.replace(/\.yaml$/, "");
    if (parsed.value.id !== fileId) errors.push(`${rel}: id 必須與檔名相同（${fileId ?? ""}）`);
    const disciplineFolder = typeof parsed.value.id === "string" ? parsed.value.id : fileId ?? "";
    const disciplineTitle = typeof parsed.value.title === "string" ? parsed.value.title : disciplineFolder;
    if (!Array.isArray(parsed.value.paths)) {
      errors.push(`${rel}: 缺少 paths`);
      continue;
    }
    for (const raw of parsed.value.paths) {
      if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.title !== "string") {
        errors.push(`${rel}: 主線缺少 id 或 title`);
        continue;
      }
      if (pathIds.has(raw.id)) errors.push(`${rel}: 主線 id 重複（${raw.id}）`);
      pathIds.add(raw.id);
      const list = asStringArray(raw.knowledge_points);
      if (!list || list.length < 2) {
        errors.push(`${rel}: 主線 ${raw.id} 至少要有兩個知識點`);
        continue;
      }
      let previousRank = -1;
      const local = new Set<string>();
      for (const id of list) {
        if (local.has(id)) errors.push(`${rel}: 主線 ${raw.id} 重複列入 ${id}`);
        local.add(id);
        if (!ids.has(id)) {
          errors.push(`${rel}: 主線 ${raw.id} 指向不存在的 id（${id}）`);
          continue;
        }
        const rank = taxonomy.stages.get(byId.get(id)?.stage ?? "")?.rank ?? -1;
        if (rank <= previousRank) errors.push(`${rel}: 主線 ${raw.id} 的階段必須一路往後（${id}）`);
        previousRank = rank;
      }
      const colearn = typeof raw.colearn === "string" && raw.colearn.trim().length > 0 ? raw.colearn.trim() : undefined;
      loaded.push({
        id: raw.id,
        title: raw.title,
        disciplineFolder,
        disciplineTitle,
        knowledgePointIds: list,
        colearn,
      });
    }
  }
  return loaded;
}

export function loadContent(contentDir: string): { errors: string[]; warnings: string[]; model: ContentModel | null } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const taxonomy = loadTaxonomy(contentDir, errors);
  if (!taxonomy) return { errors, warnings, model: null };
  let validate: ValidateFunction;
  try {
    const ajv = new Ajv({ allErrors: true, strict: true });
    validate = ajv.compile(loadSchema(contentDir));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { errors: [`schema/knowledge-point.schema.json: 無法編譯（${message}）`], warnings, model: null };
  }
  const sourcesBackfill = loadIdList(contentDir, "sources-backfill.yaml", errors);
  const circleBackfill = loadIdList(contentDir, "golden-circle-backfill.yaml", errors);
  const points = loadKnowledgePoints(contentDir, taxonomy, validate, errors, warnings, sourcesBackfill, circleBackfill);
  checkReferences(points, errors);
  const paths = loadPaths(contentDir, taxonomy, points, errors);
  return { errors, warnings, model: { taxonomy, points, paths } };
}

export function validateContent(contentDir: string): { errors: string[]; warnings: string[] } {
  const { errors, warnings } = loadContent(contentDir);
  return { errors, warnings };
}
