/**
 * 單一知識點的規則：欄位形狀、分類、108 代碼、來源、圖與來源 id、標題冒號、承諾用語。
 * 輸入是符合 schema 形狀的普通物件，不讀檔案。YAML 載入器（../load.ts）與之後的資料庫修訂版共用這一份。
 */
import type { ErrorObject } from "ajv";
import type { AudienceId, DisciplineNode, KnowledgeLinks, KnowledgePoint, KnowledgeStatus, Taxonomy } from "../types";
import { circleHasContent, readCircle, readFigures, readSources } from "./normalize";
import { checkPromiseWording } from "./promise";
import type { KpDocument, PointResult, RuleContext } from "./types";
import { asStringArray, isRecord, optionalString } from "./util";

const AUDIENCE = new Set<string>(["kid", "adult", "family"]);
const A_LEVEL_KINDS = new Set(["curriculum", "government", "exam"]);
const CIRCLE_KEYS = ["why", "how", "what"] as const;

/**
 * 交接文件要求擋掉某些網域，但沒有列出網域。
 * 先留空集合，之後補上域名就會生效，這一輪不自行假設要擋哪些站。
 */
export const EXCLUDED_DOMAINS = new Set<string>();

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

export function ajvMessages(file: string, errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((error) => {
    const where = error.instancePath || "(root)";
    return `${file}: ${where} ${error.message ?? "不符合 schema"}`;
  });
}

export function resolvePath(roots: DisciplineNode[], segments: string[]): { node: DisciplineNode; root: DisciplineNode; idPrefix?: string } | null {
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
  sourcesBackfill: ReadonlySet<string>,
  circleBackfill: ReadonlySet<string>,
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

/**
 * 檢查一個知識點並讀成 KnowledgePoint。
 * `seen` 只給 checkPoints 用：在原本的位置（id 檢查之後）比對重複 id，讓訊息順序與抽出前一致。
 */
export function checkPoint(doc: KpDocument, ctx: RuleContext, seen?: Map<string, string>): PointResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rel = doc.ref;
  const { taxonomy, validateSchema: validate, sourcesBackfill, circleBackfill } = ctx;
  const raw = doc.raw;
  if (!validate(raw)) {
    errors.push(...ajvMessages(rel, validate.errors));
    return { errors, warnings, point: null };
  }
  if (!isRecord(raw) || !isRecord(raw.discipline) || !isRecord(raw.stage) || !isRecord(raw.links)) {
    errors.push(`${rel}: 欄位形狀不對`);
    return { errors, warnings, point: null };
  }
  const id = String(raw.id);
  const concept = String(raw.concept);
  const stage = String(raw.stage.level);
  const pathSegments = asStringArray(raw.discipline.path) ?? [];
  const prerequisites = asStringArray(raw.prerequisites) ?? [];
  const links: KnowledgeLinks = {
    why: asStringArray(raw.links.why) ?? [],
    how: asStringArray(raw.links.how) ?? [],
    related: asStringArray(raw.links.related) ?? [],
    deeper: asStringArray(raw.links.deeper) ?? [],
  };
  const location = doc.location;
  if (location) {
    if (!location.wellFormed) {
      errors.push(`${rel}: 路徑必須是 knowledge/<學門>/<concept>/<階段>.yaml`);
    }
    if (location.conceptDir !== concept || location.stageFile !== stage) {
      errors.push(`${rel}: 檔名必須是 ${concept}/${stage}.yaml`);
    }
  }
  if (!id.endsWith(`@${stage}`) || id.slice(0, id.length - stage.length - 1) !== concept) {
    errors.push(`${rel}: id 必須是 ${concept}@${stage}`);
  }
  if (seen) {
    const previous = seen.get(id);
    if (previous) errors.push(`${rel}: id 重複（${id}），另一份在 ${previous}`);
    seen.set(id, rel);
  }

  const resolved = resolvePath(taxonomy.roots, pathSegments);
  // 資料庫文件沒有檔案位置，學門資料夾直接取學科樹最上層的 content_folder。
  const folder = location?.folder ?? resolved?.root.contentFolder ?? "";
  if (!resolved) {
    errors.push(`${rel}: discipline.path 不在學科樹裡（${pathSegments.join(" / ")}）`);
  } else {
    if (raw.discipline.layer !== resolved.node.layer) {
      errors.push(`${rel}: layer 應為 ${resolved.node.layer}，目前是 ${String(raw.discipline.layer)}`);
    }
    if (!resolved.root.idPrefix || !resolved.root.contentFolder) {
      errors.push(`${rel}: 學門「${resolved.root.name}」還沒有 id 前綴或內容資料夾`);
    } else {
      if (location && location.folder !== resolved.root.contentFolder) {
        errors.push(`${rel}: 應放在 knowledge/${resolved.root.contentFolder}/`);
      }
      if (!id.startsWith(`${resolved.idPrefix}.`)) {
        errors.push(`${rel}: id 前綴應為 ${resolved.idPrefix}`);
      }
    }
  }
  if (!taxonomy.stages.has(stage)) errors.push(`${rel}: 未知階段 ${stage}`);
  const stageInfo = taxonomy.stages.get(stage);
  if (stageInfo && Array.isArray(raw.stage.grades)) {
    for (const grade of raw.stage.grades) {
      if (typeof grade !== "number" || !stageInfo.grades.includes(grade)) {
        errors.push(`${rel}: 年級 ${String(grade)} 不在${stageInfo.name}的範圍`);
      }
    }
  }
  let curriculum108: KnowledgePoint["curriculum108"];
  if (isRecord(raw.curriculum_108)) {
    if (stageInfo && !stageInfo.curriculum108) errors.push(`${rel}: ${stageInfo.name}不填 curriculum_108`);
    const domains = asStringArray(raw.curriculum_108.domains) ?? [];
    const codes = asStringArray(raw.curriculum_108.core_competencies) ?? [];
    const issueList = asStringArray(raw.curriculum_108.issues) ?? [];
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
    const performances = asStringArray(raw.curriculum_108.performances);
    const contents = asStringArray(raw.curriculum_108.contents);
    if (performances) curriculum108.performances = performances;
    if (contents) curriculum108.contents = contents;
  } else if (stageInfo?.curriculum108) {
    errors.push(`${rel}: ${stageInfo.name}必須填 curriculum_108`);
  }
  const crosscutting = asStringArray(raw.discipline.crosscutting) ?? [];
  for (const item of crosscutting) {
    if (!taxonomy.crosscutting.has(item)) errors.push(`${rel}: 未知的貫穿主題「${item}」`);
  }
  const specialist = isRecord(raw.competency) ? (asStringArray(raw.competency.specialist) ?? []) : [];
  const generalist = isRecord(raw.competency) ? (asStringArray(raw.competency.generalist) ?? []) : [];
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

  const title = String(raw.title ?? "");
  if (title.includes(":")) errors.push(`${rel}: 標題請用全形冒號（：）`);

  const status = raw.status;
  const knowledgeStatus: KnowledgeStatus =
    status === "published" || status === "review" || status === "draft" ? status : "draft";
  const formats = isRecord(raw.formats) ? raw.formats : {};
  const slides = asStringArray(formats.slides) ?? [];
  const audienceRaw = asStringArray(raw.audience) ?? [];
  const audience = audienceRaw.filter((item): item is AudienceId => AUDIENCE.has(item));
  const ai = isRecord(raw.ai) ? raw.ai : {};
  const grades = Array.isArray(raw.stage.grades)
    ? raw.stage.grades.filter((grade): grade is number => typeof grade === "number")
    : [];
  const guidingQuestions = asStringArray(raw.guiding_questions) ?? [];
  checkDetail(
    rel,
    id,
    raw,
    stage,
    knowledgeStatus === "review" || knowledgeStatus === "published",
    guidingQuestions,
    taxonomy,
    sourcesBackfill,
    circleBackfill,
    errors,
    warnings,
  );
  // 承諾用語：2026-10-30 決定先當警告，不擋 CI 也不擋發布。
  warnings.push(...checkPromiseWording(rel, raw));

  const point: KnowledgePoint = {
    file: rel,
    id,
    concept,
    title,
    status: knowledgeStatus,
    version: String(raw.version ?? ""),
    disciplinePath: pathSegments,
    layer: String(raw.discipline.layer ?? ""),
    crosscutting,
    folder,
    stage,
    grades,
    curriculum108,
    toVerify: raw.to_verify === true,
    verifyNotes: asStringArray(raw.verify_notes) ?? [],
    prerequisites,
    links,
    linkNotes: String(raw.link_notes ?? ""),
    specialist,
    generalist,
    delegable: asStringArray(ai.delegable) ?? [],
    humanExperience: asStringArray(ai.human_experience) ?? [],
    idea: String(raw.idea ?? ""),
    goal: optionalString(raw.goal),
    review: optionalString(raw.review),
    guidingQuestions,
    scenario: String(raw.scenario ?? ""),
    slides,
    article: optionalString(formats.article),
    exercise: optionalString(formats.exercise),
    project: optionalString(formats.project),
    aiPrompt: optionalString(formats.ai_prompt),
    game: optionalString(formats.game),
    audience,
    authors: asStringArray(raw.authors) ?? [],
    updated: String(raw.updated ?? ""),
  };
  if (isRecord(raw.est_time) && typeof raw.est_time.school === "string" && typeof raw.est_time.source === "string") {
    point.estTime = { school: raw.est_time.school, source: raw.est_time.source };
  }
  const why = readCircle(raw.why);
  const how = readCircle(raw.how);
  const what = readCircle(raw.what);
  if (why) point.why = why;
  if (how) point.how = how;
  if (what) point.what = what;
  const figures = readFigures(raw.figures);
  const sourceList = readSources(raw.sources);
  if (figures) point.figures = figures;
  if (sourceList) point.sources = sourceList;
  return { errors, warnings, point };
}
