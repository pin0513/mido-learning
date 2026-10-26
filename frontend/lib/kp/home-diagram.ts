import { disciplineRoots, disciplineTitle, type ContentCatalog } from "../content/catalog";
import type { KnowledgePoint, StageInfo } from "../content/types";
import { knowledgePointPath } from "./routes";

/**
 * 首頁單線圖的資料。只放已發布的知識點。
 * 草稿不帶標題、slug、id，跨學門只留學門名稱與「準備中」。
 */

export type DisciplineGlyph = "square" | "circle" | "triangle" | "diamond";

export interface HomeDiscipline {
  id: string;
  title: string;
  shortTitle: string;
  mention: string;
  glyph: DisciplineGlyph;
  ready: boolean;
}

export interface HomeStage {
  id: string;
  name: string;
  grades: string;
}

export interface HomeLink {
  title: string;
  stageName: string;
  href: string;
}

export interface HomeNode {
  id: string;
  title: string;
  question: string;
  idea: string;
  stageId: string;
  stageName: string;
  grades: string;
  href: string;
  prerequisites: HomeLink[];
  next: HomeLink | null;
  also: string[];
}

export interface HomeEdge {
  from: string;
  to: string;
  kind: "pre" | "ext";
}

export interface HomeDiagram {
  id: string;
  nodes: HomeNode[];
  edges: HomeEdge[];
}

export interface TaskCross {
  key: string;
  side: "why" | "related";
  mention: string;
  glyph: DisciplineGlyph;
  /** 草稿只會是「數學 · 準備中」這種句子，不會是知識點標題。 */
  label: string;
  title: string | null;
  href: string | null;
}

export interface TaskStep {
  id: string;
  index: number;
  title: string;
  stageName: string;
  grades: string;
  href: string;
  disciplineTitle: string;
  glyph: DisciplineGlyph;
  crosses: TaskCross[];
}

export interface HomeTask {
  id: string;
  title: string;
  disciplineId: string;
  summary: string;
  intro: string;
  steps: TaskStep[];
  uses: { mention: string; glyph: DisciplineGlyph }[];
  startHref: string;
  startCaption: string;
}

export interface HomeModel {
  disciplines: HomeDiscipline[];
  defaultDisciplineId: string;
  stages: HomeStage[];
  diagrams: HomeDiagram[];
  task: HomeTask | null;
}

const ORDER = ["pm-leadership", "philosophy", "math", "it-ai"];

const PROFILE: Record<string, { shortTitle: string; mention: string; glyph: DisciplineGlyph }> = {
  "pm-leadership": { shortTitle: "專案管理", mention: "專案管理", glyph: "square" },
  philosophy: { shortTitle: "哲學思考", mention: "哲學", glyph: "circle" },
  math: { shortTitle: "數學", mention: "數學", glyph: "triangle" },
  "it-ai": { shortTitle: "資訊與AI", mention: "資訊與 AI", glyph: "diamond" },
};

const OPEN_PATH_ID = "pm.estimate";

function profileOf(folder: string, title: string): { shortTitle: string; mention: string; glyph: DisciplineGlyph } {
  return PROFILE[folder] ?? { shortTitle: title, mention: title, glyph: "circle" };
}

function gradesOf(stage: StageInfo | undefined): string {
  if (!stage || stage.grades.length === 0) return "大學以上";
  const first = stage.grades[0];
  const last = stage.grades[stage.grades.length - 1];
  return first === last ? `${first} 年級` : `${first}–${last} 年級`;
}

function publishedIn(catalog: ContentCatalog, folder: string): KnowledgePoint[] {
  return catalog.points
    .filter((point) => point.folder === folder && point.status === "published")
    .sort((a, b) => {
      const stageDelta = (catalog.taxonomy.stages.get(a.stage)?.rank ?? 0) - (catalog.taxonomy.stages.get(b.stage)?.rank ?? 0);
      if (stageDelta !== 0) return stageDelta;
      return a.title.localeCompare(b.title, "zh-Hant");
    });
}

function toLink(catalog: ContentCatalog, point: KnowledgePoint): HomeLink {
  const stage = catalog.taxonomy.stages.get(point.stage);
  return {
    title: point.title,
    stageName: stage?.name ?? point.stage,
    href: knowledgePointPath(point.concept, point.stage),
  };
}

function mentionsFor(catalog: ContentCatalog, point: KnowledgePoint): string[] {
  const names: string[] = [];
  for (const id of [...point.links.why, ...point.links.related]) {
    const target = catalog.indexes.byId.get(id);
    if (!target || target.folder === point.folder) continue;
    const mention = profileOf(target.folder, disciplineTitle(catalog, target.folder)).mention;
    if (!names.includes(mention)) names.push(mention);
  }
  return names;
}

function edgesFor(points: KnowledgePoint[]): HomeEdge[] {
  const ids = new Set(points.map((point) => point.id));
  const folder = points[0]?.folder;
  const seen = new Set<string>();
  const edges: HomeEdge[] = [];
  const add = (from: string, to: string, kind: HomeEdge["kind"]) => {
    const key = `${kind}:${from}->${to}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ from, to, kind });
  };
  const prerequisitePairs = new Set<string>();
  for (const point of points) {
    for (const id of point.prerequisites) {
      const other = points.find((item) => item.id === id);
      if (!other || other.folder !== folder || !ids.has(id)) continue;
      prerequisitePairs.add(`${id}->${point.id}`);
      add(id, point.id, "pre");
    }
  }
  for (const point of points) {
    for (const id of point.links.deeper) {
      const other = points.find((item) => item.id === id);
      if (!other || other.folder !== folder || !ids.has(id)) continue;
      if (prerequisitePairs.has(`${point.id}->${id}`)) continue;
      add(point.id, id, "ext");
    }
  }
  return edges;
}

function crossesFor(catalog: ContentCatalog, point: KnowledgePoint, stepIndex: number): TaskCross[] {
  const rows: TaskCross[] = [];
  const sides = [
    ["why", point.links.why],
    ["related", point.links.related],
  ] as const;
  for (const [side, ids] of sides) {
    ids.forEach((id, index) => {
      const target = catalog.indexes.byId.get(id);
      if (!target || target.folder === point.folder) return;
      const title = disciplineTitle(catalog, target.folder);
      const profile = profileOf(target.folder, title);
      const published = target.status === "published";
      rows.push({
        key: `${stepIndex}-${side}-${index}`,
        side,
        mention: profile.mention,
        glyph: profile.glyph,
        label: published ? `${profile.mention} · ${side === "why" ? "為什麼" : "相關"}` : `${profile.mention} · 準備中`,
        title: published ? target.title : null,
        href: published ? knowledgePointPath(target.concept, target.stage) : null,
      });
    });
  }
  return rows;
}

export function buildHomeDiagram(catalog: ContentCatalog): HomeModel {
  const stages: HomeStage[] = catalog.taxonomy.stageList.map((stage) => ({
    id: stage.id,
    name: stage.name,
    grades: gradesOf(stage),
  }));
  const roots = [...disciplineRoots(catalog)].sort((a, b) => {
    const left = ORDER.indexOf(a.contentFolder ?? "");
    const right = ORDER.indexOf(b.contentFolder ?? "");
    return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
  });
  const disciplines: HomeDiscipline[] = roots.map((root) => {
    const id = root.contentFolder ?? root.id;
    const title = disciplineTitle(catalog, id);
    const profile = profileOf(id, title);
    return {
      id,
      title,
      shortTitle: profile.shortTitle,
      mention: profile.mention,
      glyph: profile.glyph,
      ready: publishedIn(catalog, id).length > 0,
    };
  });

  const diagrams: HomeDiagram[] = disciplines.map((discipline) => {
    const points = publishedIn(catalog, discipline.id);
    const byId = new Map(points.map((point) => [point.id, point]));
    const nodes: HomeNode[] = points.map((point) => {
      const stage = catalog.taxonomy.stages.get(point.stage);
      const prerequisites = point.prerequisites
        .map((id) => catalog.indexes.byId.get(id))
        .filter((item): item is KnowledgePoint => item?.status === "published")
        .map((item) => toLink(catalog, item));
      const deeper = point.links.deeper
        .map((id) => byId.get(id))
        .find((item): item is KnowledgePoint => Boolean(item));
      return {
        id: point.id,
        title: point.title,
        question: point.guidingQuestions[0] ?? "",
        idea: point.idea,
        stageId: point.stage,
        stageName: stage?.name ?? point.stage,
        grades: gradesOf(stage),
        href: knowledgePointPath(point.concept, point.stage),
        prerequisites,
        next: deeper ? toLink(catalog, deeper) : null,
        also: mentionsFor(catalog, point),
      };
    });
    return { id: discipline.id, nodes, edges: edgesFor(points) };
  });

  const path = catalog.indexes.pathsById.get(OPEN_PATH_ID);
  const defaultDisciplineId = disciplines.some((item) => item.id === path?.disciplineFolder)
    ? path?.disciplineFolder ?? disciplines[0]?.id ?? ""
    : disciplines.find((item) => item.ready)?.id ?? disciplines[0]?.id ?? "";

  let task: HomeTask | null = null;
  if (path) {
    const stops = path.knowledgePointIds
      .map((id) => catalog.indexes.byId.get(id))
      .filter((point): point is KnowledgePoint => point?.status === "published");
    if (stops.length > 0) {
      const discipline = profileOf(path.disciplineFolder, path.disciplineTitle);
      const steps: TaskStep[] = stops.map((point, index) => {
        const stage = catalog.taxonomy.stages.get(point.stage);
        return {
          id: point.id,
          index: index + 1,
          title: point.title,
          stageName: stage?.name ?? point.stage,
          grades: gradesOf(stage),
          href: knowledgePointPath(point.concept, point.stage),
          disciplineTitle: path.disciplineTitle,
          glyph: discipline.glyph,
          crosses: crossesFor(catalog, point, index + 1),
        };
      });
      const uses: HomeTask["uses"] = [];
      for (const step of steps) {
        for (const cross of step.crosses) {
          if (!uses.some((item) => item.mention === cross.mention)) uses.push({ mention: cross.mention, glyph: cross.glyph });
        }
      }
      const first = steps[0];
      const last = steps[steps.length - 1];
      task = {
        id: path.id,
        title: path.title,
        disciplineId: path.disciplineFolder,
        summary: `一條路，${steps.length} 步，從${first.stageName}走到${last.stageName}。`,
        intro: `從${first.stageName}一路往下走 ${steps.length} 步。左右的虛線，接到這一步會用到的其他學門。`,
        steps,
        uses,
        startHref: first.href,
        startCaption: `${first.title} · ${first.stageName}，孩子可以先做`,
      };
      const onPath = new Map(stops.map((point, index) => [point.id, stops[index + 1]]));
      for (const diagram of diagrams) {
        if (diagram.id !== path.disciplineFolder) continue;
        for (const node of diagram.nodes) {
          const following = onPath.get(node.id);
          if (following) node.next = toLink(catalog, following);
        }
      }
    }
  }

  return { disciplines, defaultDisciplineId, stages, diagrams, task };
}
