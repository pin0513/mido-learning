/**
 * 讀取 frontend/content 的 YAML，交給規則包（./rules）驗證。
 * 這裡只負責讀檔：分類參考資料、schema、補件清單、知識點與主線 YAML；
 * 每一條規則都在 ./rules，吃記憶體物件，之後資料庫的修訂版也用同一份。
 * 這個檔案不 import server-only：驗證腳本用 tsx 直接跑，server-only 在 Node 會丟錯。
 * Next 的 server component 請改由 lib/content/index.ts 進入。
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import Ajv, { type AnySchema, type ValidateFunction } from "ajv";
import { parse } from "yaml";
import { checkPaths, checkPoints, type KpDocument, type PathDocument, type RuleContext } from "./rules";
import {
  CORE_CODES,
  LAYER_IDS,
  STAGE_IDS,
  type ContentModel,
  type CoreCompetencyInfo,
  type CurriculumCode,
  type DisciplineNode,
  type LayerInfo,
  type KnowledgePoint,
  type LearningPath,
  type StageInfo,
  type Taxonomy,
} from "./types";

export { EXCLUDED_DOMAINS } from "./rules";

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

const ROMAN_STAGE: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, Vc: 5 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameSet(actual: string[], expected: readonly string[]): boolean {
  if (actual.length !== expected.length) return false;
  const left = new Set(actual);
  return expected.every((item) => left.has(item));
}

const CODE_ROMAN = "IV|III|II|V|I";
/** Vc（自然科學高中必修）只接在字母開頭的代碼後面，例如 an-Vc-2；數字開頭的 2-Vc-1 不是課綱代碼。 */
const CODE_ROMAN_VC = "IV|III|II|Vc|V|I";

/** 從代碼推出學習階段。有羅馬數字用羅馬數字；數學的年級碼（D-10-2、D-11A-1、N-3-9）對到該年級所屬階段。 */
function stageFromCode(code: string): number | null {
  const body = code.replace(/^[\u4e00-\u9fff] /, "");
  const roman = new RegExp(`^(?:[0-9]{1,2}[a-z]?-(${CODE_ROMAN})|[A-Za-z]{1,2}-(${CODE_ROMAN_VC}))-[0-9]{1,2}$`).exec(body);
  const r = roman?.[1] ?? roman?.[2];
  if (r) return ROMAN_STAGE[r] ?? null;
  const grade = /^[A-Z]-(?:([1-9]|1[0-2]))[A-Z]?-[0-9]{1,2}$/.exec(body);
  if (!grade?.[1]) return null;
  const year = Number(grade[1]);
  if (year <= 2) return 1;
  if (year <= 4) return 2;
  if (year <= 6) return 3;
  if (year <= 9) return 4;
  return 5;
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


function loadKnowledgePoints(
  contentDir: string,
  ctx: RuleContext,
  errors: string[],
  warnings: string[],
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

  const docs: KpDocument[] = [];
  for (const file of files) {
    const rel = relative(contentDir, file);
    const parsed = readYamlFile(file);
    if (parsed.error) {
      errors.push(`${rel}: 無法解析 YAML（${parsed.error}）`);
      continue;
    }
    const parts = rel.split("/");
    docs.push({
      ref: rel,
      raw: parsed.value,
      location: {
        wellFormed: parts.length === 4 && parts[0] === "knowledge" && parts[3]?.endsWith(".yaml") === true,
        folder: parts[1] ?? "",
        conceptDir: parts[2] ?? "",
        stageFile: (parts[3] ?? "").replace(/\.yaml$/, ""),
      },
    });
  }
  const result = checkPoints(docs, ctx);
  errors.push(...result.errors);
  warnings.push(...result.warnings);
  return result.points;
}

function loadPaths(contentDir: string, taxonomy: Taxonomy, points: KnowledgePoint[], errors: string[]): LearningPath[] {
  const pathsDir = join(contentDir, "paths");
  let files: string[] = [];
  try {
    files = walkYaml(pathsDir);
  } catch {
    errors.push("paths/: 找不到主線目錄");
    return [];
  }
  const docs: PathDocument[] = [];
  for (const file of files) {
    const rel = relative(contentDir, file);
    const parsed = readYamlFile(file);
    if (parsed.error) {
      errors.push(`${rel}: 無法解析主線`);
      continue;
    }
    docs.push({ ref: rel, docId: rel.split("/").pop()?.replace(/\.yaml$/, ""), raw: parsed.value });
  }
  const result = checkPaths(docs, taxonomy, points);
  errors.push(...result.errors);
  return result.paths;
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
  const ctx: RuleContext = { taxonomy, validateSchema: validate, sourcesBackfill, circleBackfill };
  const points = loadKnowledgePoints(contentDir, ctx, errors, warnings);
  const paths = loadPaths(contentDir, taxonomy, points, errors);
  return { errors, warnings, model: { taxonomy, points, paths } };
}

export function validateContent(contentDir: string): { errors: string[]; warnings: string[] } {
  const { errors, warnings } = loadContent(contentDir);
  return { errors, warnings };
}
