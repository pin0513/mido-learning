/**
 * 驗證 frontend/content 的知識點。
 * 從 frontend 目錄執行：pnpm validate:content
 */
import { cpSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv, { type AnySchema, type ErrorObject, type ValidateFunction } from "ajv";
import { parse } from "yaml";

const CORE_CODES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"] as const;
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
const STAGE_IDS = ["es", "jh", "sh", "uni"] as const;
const LAYER_IDS = ["essence", "foundation", "advanced", "applied"] as const;

interface StageInfo {
  id: string;
  name: string;
  grades: number[];
  curriculum108: boolean;
  rank: number;
}

interface DisciplineNode {
  id: string;
  name: string;
  layer: string;
  idPrefix?: string;
  contentFolder?: string;
  children: DisciplineNode[];
}

interface Taxonomy {
  stages: Map<string, StageInfo>;
  layers: Set<string>;
  domains: Set<string>;
  coreCodes: Set<string>;
  issues: Set<string>;
  generalist: Set<string>;
  specialist: Set<string>;
  crosscutting: Set<string>;
  formatIds: Set<string>;
  roots: DisciplineNode[];
}

interface KnowledgePoint {
  file: string;
  id: string;
  concept: string;
  stage: string;
  folder: string;
  prerequisites: string[];
  links: { why: string[]; how: string[]; related: string[]; deeper: string[] };
}

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "content");

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

function readYamlFile(file: string): { value?: unknown; error?: string } {
  try {
    return { value: parse(readFileSync(file, "utf8")) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message };
  }
}

function walkYaml(dir: string): string[] {
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
    stages.set(raw.id, {
      id: raw.id,
      name: raw.name,
      grades,
      curriculum108: raw.curriculum_108 === true,
      rank: stageIds.length - 1,
    });
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
  const coreCodes = Array.isArray(curriculumDoc.value.core_competencies)
    ? curriculumDoc.value.core_competencies.flatMap((item) => (isRecord(item) && typeof item.code === "string" ? [item.code] : []))
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
      if (idPrefix && prefixes.has(idPrefix)) errors.push(`taxonomy/disciplines.yaml: id 前綴重複（${idPrefix}）`);
      if (contentFolder && folders.has(contentFolder)) errors.push(`taxonomy/disciplines.yaml: 資料夾名稱重複（${contentFolder}）`);
      if (idPrefix) prefixes.add(idPrefix);
      if (contentFolder) folders.add(contentFolder);
    }
    if (!isRoot && (idPrefix || contentFolder)) {
      errors.push(`taxonomy/disciplines.yaml: 只有最上層學門可以設定 id 前綴（${raw.name}）`);
    }
    const children: DisciplineNode[] = [];
    if (Array.isArray(raw.children)) {
      for (const child of raw.children) {
        const node = visit(child, layer, false);
        if (node) children.push(node);
      }
    }
    return { id: raw.id, name: raw.name, layer, idPrefix, contentFolder, children };
  };

  if (!isRecord(disciplinesDoc.value) || !Array.isArray(disciplinesDoc.value.layers) || !Array.isArray(disciplinesDoc.value.disciplines)) {
    errors.push("taxonomy/disciplines.yaml: 缺少 layers 或 disciplines");
  } else {
    for (const layer of disciplinesDoc.value.layers) {
      if (isRecord(layer) && typeof layer.id === "string") layers.add(layer.id);
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

  if (errors.length > 0) return null;
  return {
    stages,
    layers,
    domains: new Set(domainNames),
    coreCodes: new Set(coreCodes),
    issues: new Set(issues),
    generalist,
    specialist,
    crosscutting,
    formatIds,
    roots,
  };
}

function resolvePath(roots: DisciplineNode[], segments: string[]): { node: DisciplineNode; root: DisciplineNode } | null {
  let level = roots;
  let root: DisciplineNode | null = null;
  let current: DisciplineNode | null = null;
  for (const segment of segments) {
    const found = level.find((node) => node.name === segment);
    if (!found) return null;
    if (!root) root = found;
    current = found;
    level = found.children;
  }
  if (!current || !root) return null;
  return { node: current, root };
}

function loadKnowledgePoints(contentDir: string, taxonomy: Taxonomy, validate: ValidateFunction, errors: string[]): KnowledgePoint[] {
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
    const links = {
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
        if (!id.startsWith(`${resolved.root.idPrefix}.`)) {
          errors.push(`${rel}: id 前綴應為 ${resolved.root.idPrefix}`);
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
    } else if (stageInfo?.curriculum108) {
      errors.push(`${rel}: ${stageInfo.name}必須填 curriculum_108`);
    }
    const crosscutting = asStringArray(parsed.value.discipline.crosscutting) ?? [];
    for (const item of crosscutting) {
      if (!taxonomy.crosscutting.has(item)) errors.push(`${rel}: 未知的貫穿主題「${item}」`);
    }
    if (isRecord(parsed.value.competency)) {
      for (const name of asStringArray(parsed.value.competency.specialist) ?? []) {
        if (!taxonomy.specialist.has(name)) errors.push(`${rel}: 未知專才標籤「${name}」`);
      }
      for (const name of asStringArray(parsed.value.competency.generalist) ?? []) {
        if (!taxonomy.generalist.has(name)) errors.push(`${rel}: 未知通才標籤「${name}」`);
      }
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
    points.push({ file: rel, id, concept, stage, folder, prerequisites, links });
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

function loadPaths(contentDir: string, taxonomy: Taxonomy, points: KnowledgePoint[], errors: string[]): void {
  const ids = new Set(points.map((point) => point.id));
  const byId = new Map(points.map((point) => [point.id, point]));
  const pathsDir = join(contentDir, "paths");
  let files: string[] = [];
  try {
    files = walkYaml(pathsDir);
  } catch {
    errors.push("paths/: 找不到主線目錄");
    return;
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
    }
  }
}

export function validateContent(contentDir: string): string[] {
  const errors: string[] = [];
  const taxonomy = loadTaxonomy(contentDir, errors);
  if (!taxonomy) return errors;
  let validate: ValidateFunction;
  try {
    const ajv = new Ajv({ allErrors: true, strict: true });
    validate = ajv.compile(loadSchema(contentDir));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [`schema/knowledge-point.schema.json: 無法編譯（${message}）`];
  }
  const points = loadKnowledgePoints(contentDir, taxonomy, validate, errors);
  checkReferences(points, errors);
  loadPaths(contentDir, taxonomy, points, errors);
  return errors;
}

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
