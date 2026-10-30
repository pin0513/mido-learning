/**
 * 跨知識點的規則：重複 id、補件清單、先備與連結存在、先備循環、主線順序。
 * 發布（admin）時要跑這一層；儲存草稿只跑 point.ts。
 */
import type { KnowledgePoint, LearningPath, Taxonomy } from "../types";
import { checkPoint } from "./point";
import type { KpDocument, PathDocument, PathsResult, PointsResult, RuleContext } from "./types";
import { asStringArray, isRecord } from "./util";

/** 依序檢查每個知識點，再跑跨點規則。訊息順序與抽出前的 loadKnowledgePoints＋checkReferences 相同。 */
export function checkPoints(docs: readonly KpDocument[], ctx: RuleContext): PointsResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const points: KnowledgePoint[] = [];
  const seen = new Map<string, string>();
  for (const doc of docs) {
    const result = checkPoint(doc, ctx, seen);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    if (result.point) points.push(result.point);
  }
  for (const listed of ctx.sourcesBackfill) {
    if (!seen.has(listed)) errors.push(`sources-backfill.yaml: 未知的 id（${listed}）`);
  }
  for (const listed of ctx.circleBackfill) {
    if (!seen.has(listed)) errors.push(`golden-circle-backfill.yaml: 未知的 id（${listed}）`);
  }
  errors.push(...checkReferences(points));
  return { errors, warnings, points };
}

export function findCycles(points: readonly KnowledgePoint[]): string[] {
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

/** 先備與 why／how／related／deeper 都要指向存在的知識點，先備不能循環。 */
export function checkReferences(points: readonly KnowledgePoint[]): string[] {
  const errors: string[] = [];
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
  return errors;
}

/** 主線：每條至少兩點、不重複、id 存在、學段一路往後。 */
export function checkPaths(docs: readonly PathDocument[], taxonomy: Taxonomy, points: readonly KnowledgePoint[]): PathsResult {
  const errors: string[] = [];
  const ids = new Set(points.map((point) => point.id));
  const byId = new Map(points.map((point) => [point.id, point]));
  const loaded: LearningPath[] = [];
  const pathIds = new Set<string>();
  for (const doc of docs) {
    const rel = doc.ref;
    const value = doc.raw;
    if (!isRecord(value)) {
      errors.push(`${rel}: 無法解析主線`);
      continue;
    }
    const fileId = doc.docId;
    if (value.id !== fileId) errors.push(`${rel}: id 必須與檔名相同（${fileId ?? ""}）`);
    const disciplineFolder = typeof value.id === "string" ? value.id : fileId ?? "";
    const disciplineTitle = typeof value.title === "string" ? value.title : disciplineFolder;
    if (!Array.isArray(value.paths)) {
      errors.push(`${rel}: 缺少 paths`);
      continue;
    }
    for (const raw of value.paths) {
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
  return { errors, paths: loaded };
}
