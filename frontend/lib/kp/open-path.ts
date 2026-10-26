import { loadCatalog, stageName } from "../content/catalog";
import type { ContentCatalog } from "../content/catalog";
import type { KnowledgePoint } from "../content/types";
import { knowledgePointPath, learningPathPath } from "./routes";

export interface OpenPathLink {
  title: string;
  href: string;
}

export interface OpenPathStop {
  id: string;
  title: string;
  idea: string;
  stage: string;
  stageName: string;
  question: string;
  href: string;
  prerequisites: OpenPathLink[];
  /** 先備裡尚未發布的筆數。不帶標題。 */
  hiddenPrerequisites: number;
  next: OpenPathLink | null;
}

export interface OpenPathBrief {
  id: string;
  title: string;
  href: string;
  colearn: string;
  questions: string[];
  scenario: string;
  stops: OpenPathStop[];
}

function publishedPoint(catalog: ContentCatalog, id: string): KnowledgePoint | undefined {
  const point = catalog.indexes.byId.get(id);
  return point?.status === "published" ? point : undefined;
}

/** 首頁這一輪開放的主線。只帶已發布知識點，草稿標題不進這份資料。 */
export function publishedEstimatePath(catalog: ContentCatalog = loadCatalog()): OpenPathBrief | null {
  const path = catalog.indexes.pathsById.get("pm.estimate");
  if (!path) return null;
  const stops = path.knowledgePointIds
    .map((id) => publishedPoint(catalog, id))
    .filter((point): point is KnowledgePoint => Boolean(point));
  if (stops.length === 0) return null;
  const first = stops[0];
  return {
    id: path.id,
    title: path.title,
    href: learningPathPath(path.id),
    colearn: path.colearn ?? "",
    questions: first.guidingQuestions,
    scenario: first.scenario,
    stops: stops.map((point, index) => {
      const known = point.prerequisites.filter((id) => catalog.indexes.byId.has(id));
      const prerequisites = known
        .map((id) => publishedPoint(catalog, id))
        .filter((item): item is KnowledgePoint => Boolean(item))
        .map((item) => ({ title: item.title, href: knowledgePointPath(item.concept, item.stage) }));
      const next = stops[index + 1];
      return {
        id: point.id,
        title: point.title,
        idea: point.idea,
        stage: point.stage,
        stageName: stageName(catalog, point.stage),
        question: point.guidingQuestions[0] ?? "",
        href: knowledgePointPath(point.concept, point.stage),
        prerequisites,
        hiddenPrerequisites: known.length - prerequisites.length,
        next: next ? { title: next.title, href: knowledgePointPath(next.concept, next.stage) } : null,
      };
    }),
  };
}
