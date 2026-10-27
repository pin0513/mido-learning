import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { includeDraftKnowledgePoints, isSoftSkillsEnabled } from "../kp/flags";
import { loadContent } from "./load";
import type {
  ContentIndexes,
  ContentModel,
  KnowledgePoint,
  LearningPath,
  PathNeighbor,
  Taxonomy,
} from "./types";

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "content");

export interface ContentCatalog {
  taxonomy: Taxonomy;
  points: KnowledgePoint[];
  paths: LearningPath[];
  indexes: ContentIndexes;
}

function comparePoints(taxonomy: Taxonomy, a: KnowledgePoint, b: KnowledgePoint): number {
  const stageDelta = (taxonomy.stages.get(a.stage)?.rank ?? 0) - (taxonomy.stages.get(b.stage)?.rank ?? 0);
  if (stageDelta !== 0) return stageDelta;
  return a.title.localeCompare(b.title, "zh-Hant");
}

export function buildIndexes(taxonomy: Taxonomy, points: KnowledgePoint[], paths: LearningPath[]): ContentIndexes {
  const byId = new Map(points.map((point) => [point.id, point]));
  const byDiscipline = new Map<string, KnowledgePoint[]>();
  const byStage = new Map<string, KnowledgePoint[]>();
  const byLayer = new Map<string, KnowledgePoint[]>();
  const byCompetency = new Map<string, KnowledgePoint[]>();
  const requiredBy = new Map<string, string[]>();
  for (const layer of taxonomy.layerList) byLayer.set(layer.id, []);
  for (const code of taxonomy.coreCompetencies) byCompetency.set(code.code, []);
  for (const point of points) {
    const discipline = byDiscipline.get(point.folder) ?? [];
    discipline.push(point);
    byDiscipline.set(point.folder, discipline);
    const stage = byStage.get(point.stage) ?? [];
    stage.push(point);
    byStage.set(point.stage, stage);
    const layer = byLayer.get(point.layer) ?? [];
    layer.push(point);
    byLayer.set(point.layer, layer);
    for (const code of point.curriculum108?.coreCompetencies ?? []) {
      const list = byCompetency.get(code) ?? [];
      list.push(point);
      byCompetency.set(code, list);
    }
    for (const prereq of point.prerequisites) {
      const list = requiredBy.get(prereq) ?? [];
      list.push(point.id);
      requiredBy.set(prereq, list);
    }
  }
  for (const list of byDiscipline.values()) list.sort((a, b) => comparePoints(taxonomy, a, b));
  for (const list of byStage.values()) list.sort((a, b) => comparePoints(taxonomy, a, b));
  for (const list of byLayer.values()) list.sort((a, b) => comparePoints(taxonomy, a, b));
  for (const list of byCompetency.values()) list.sort((a, b) => comparePoints(taxonomy, a, b));

  const pathsById = new Map(paths.map((path) => [path.id, path]));
  const pathsByDiscipline = new Map<string, LearningPath[]>();
  for (const path of paths) {
    const list = pathsByDiscipline.get(path.disciplineFolder) ?? [];
    list.push(path);
    pathsByDiscipline.set(path.disciplineFolder, list);
  }

  const neighbors = new Map<string, PathNeighbor[]>();
  for (const path of paths) {
    const visibleIds = path.knowledgePointIds.filter((id) => byId.has(id));
    visibleIds.forEach((id, index) => {
      const neighbor: PathNeighbor = {
        pathId: path.id,
        pathTitle: path.title,
        disciplineFolder: path.disciplineFolder,
        disciplineTitle: path.disciplineTitle,
        colearn: path.colearn,
        previousId: index > 0 ? visibleIds[index - 1] ?? null : null,
        nextId: index < visibleIds.length - 1 ? visibleIds[index + 1] ?? null : null,
      };
      const list = neighbors.get(id) ?? [];
      list.push(neighbor);
      neighbors.set(id, list);
    });
  }

  return { byId, byDiscipline, byStage, byLayer, byCompetency, requiredBy, neighbors, pathsById, pathsByDiscipline };
}

function applySlidesFixture(points: KnowledgePoint[]): KnowledgePoint[] {
  const raw = process.env.KP_SLIDES_FIXTURE;
  if (!raw) return points;
  const separator = raw.indexOf(":");
  if (separator <= 0) return points;
  const id = raw.slice(0, separator);
  const componentId = raw.slice(separator + 1).trim();
  if (!componentId) return points;
  return points.map((point) =>
    point.id === id ? { ...point, slides: [componentId] } : point,
  );
}

function modelToCatalog(model: ContentModel, slidesFixture: boolean): ContentCatalog {
  const points = slidesFixture ? applySlidesFixture(model.points) : model.points;
  return {
    taxonomy: model.taxonomy,
    points,
    paths: model.paths,
    indexes: buildIndexes(model.taxonomy, points, model.paths),
  };
}

let cached: ContentCatalog | null = null;

/** 建置或 dev 時讀 content/。靜態頁把結果烤進 HTML，正式行程不再讀檔。 */
export function loadCatalog(): ContentCatalog {
  if (cached) return cached;
  const { errors, model } = loadContent(CONTENT_DIR);
  if (!model || errors.length > 0) {
    throw new Error(errors.join("\n") || "知識點內容無法載入");
  }
  cached = modelToCatalog(model, true);
  return cached;
}

export function isPointVisible(point: KnowledgePoint, includeDrafts = includeDraftKnowledgePoints()): boolean {
  if (point.status === "published") return true;
  return includeDrafts;
}

/** 依 D17 過濾後重建索引。主線本身仍保留，但前後筆只連到看得到的知識點。 */
export function visibleCatalog(catalog: ContentCatalog, includeDrafts = includeDraftKnowledgePoints()): ContentCatalog {
  const points = catalog.points.filter((point) => isPointVisible(point, includeDrafts));
  const visibleIds = new Set(points.map((point) => point.id));
  const paths = catalog.paths.map((path) => ({
    ...path,
    knowledgePointIds: path.knowledgePointIds.filter((id) => visibleIds.has(id)),
  }));
  return {
    taxonomy: catalog.taxonomy,
    points,
    paths,
    indexes: buildIndexes(catalog.taxonomy, points, paths),
  };
}

export function disciplineRoots(catalog: ContentCatalog) {
  return catalog.taxonomy.roots.filter((root) => root.contentFolder && root.idPrefix);
}

/** 旗標關掉時，清單頁不帶溝通與解決問題。知識點頁本身仍可建置，由 middleware 擋。 */
export function launchedCatalog(catalog: ContentCatalog): ContentCatalog {
  if (isSoftSkillsEnabled()) return catalog;
  const points = catalog.points.filter((point) => point.folder !== "soft-skills");
  const visibleIds = new Set(points.map((point) => point.id));
  const paths = catalog.paths
    .filter((path) => path.disciplineFolder !== "soft-skills")
    .map((path) => ({
      ...path,
      knowledgePointIds: path.knowledgePointIds.filter((id) => visibleIds.has(id)),
    }));
  return {
    taxonomy: catalog.taxonomy,
    points,
    paths,
    indexes: buildIndexes(catalog.taxonomy, points, paths),
  };
}

export function disciplineTitle(catalog: ContentCatalog, folder: string): string {
  const path = catalog.paths.find((item) => item.disciplineFolder === folder);
  if (path) return path.disciplineTitle;
  return catalog.taxonomy.roots.find((root) => root.contentFolder === folder)?.name ?? folder;
}

export function stageName(catalog: ContentCatalog, stage: string): string {
  return catalog.taxonomy.stages.get(stage)?.name ?? stage;
}

export function competencyName(catalog: ContentCatalog, code: string): string {
  return catalog.taxonomy.coreCompetencies.find((item) => item.code === code)?.name ?? code;
}

export function layerName(catalog: ContentCatalog, layerId: string): string {
  return catalog.taxonomy.layerList.find((layer) => layer.id === layerId)?.name ?? layerId;
}
