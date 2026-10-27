import { disciplineRoots, disciplineTitle, type ContentCatalog } from "../content/catalog";
import type { KnowledgePoint, StageInfo } from "../content/types";
import { isSoftSkillsEnabled } from "./flags";
import { publicDisciplineIds } from "./home-public";
import { knowledgePointPath } from "./routes";

/**
 * 首頁單線圖。公開哪些學門由 content/home-disciplines.yaml 決定。
 * 專案管理與領導只畫已發布的點，這張圖維持四步。
 * 其他公開學門畫該資料夾裡的每一個知識點。
 * 沒有畫進圖的對象，跨學門只留「準備中」，不帶標題。
 */

export type DisciplineGlyph = "square" | "circle" | "triangle" | "diamond" | "pentagon" | "bubble";

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
  id: string;
  title: string;
  stageName: string;
  href: string;
}

export interface HomePrior {
  id: string;
  /** 已發布才帶標題。還沒發布只寫「準備中」，不帶草稿標題。 */
  label: string;
  href: string | null;
}

export interface HomeNode {
  id: string;
  title: string;
  question: string;
  idea: string;
  stageId: string;
  stageName: string;
  grades: string;
  /** 已發布才有閱讀頁。草稿頁不產生，所以這裡是 null。 */
  pageHref: string | null;
  prerequisites: HomeLink[];
  /** 不畫成箭頭的先學。一個一行。空陣列時畫面沿用 prerequisites。 */
  priors: HomePrior[];
  next: HomeLink | null;
  also: string[];
}

export interface HomeEdge {
  from: string;
  to: string;
  kind: "pre" | "ext";
}

export interface HomeBranch {
  id: string;
  title: string;
  blurb: string;
  ready: boolean;
  task: HomeTask | null;
}

export interface HomeDiagram {
  id: string;
  branchId: string | null;
  nodes: HomeNode[];
  edges: HomeEdge[];
}

export interface TaskCross {
  key: string;
  side: "why" | "related";
  mention: string;
  glyph: DisciplineGlyph;
  /** 圖上有這個點時是學門簡稱；沒有時是「數學 · 準備中」。 */
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
  branches: HomeBranch[];
  task: HomeTask | null;
}

const ORDER = ["pm-leadership", "philosophy", "math", "it-ai"];

const PROFILE: Record<string, { shortTitle: string; mention: string; glyph: DisciplineGlyph }> = {
  "pm-leadership": { shortTitle: "專案管理", mention: "專案管理", glyph: "square" },
  philosophy: { shortTitle: "哲學思考", mention: "哲學", glyph: "circle" },
  math: { shortTitle: "數學", mention: "數學", glyph: "triangle" },
  "it-ai": { shortTitle: "資訊與AI", mention: "資訊與 AI", glyph: "diamond" },
  "soft-skills": { shortTitle: "溝通解題", mention: "溝通", glyph: "pentagon" },
};

const OPEN_PATH_ID = "pm.estimate";
/** 這張圖已經上線，不把同資料夾的草稿加進去。 */
const PUBLISHED_DIAGRAMS = new Set(["pm-leadership", "soft-skills"]);

const SOFT_BRANCHES: { id: string; title: string; blurb: string; short: string; pathName: string }[] = [
  { id: "talk", title: "口語表達", blurb: "上台、簡報、開會", short: "口語", pathName: "口語表達" },
  { id: "emp", title: "同理與溝通", blurb: "感受、同理、化解衝突", short: "同理", pathName: "同理與溝通" },
  { id: "solve", title: "解決問題", blurb: "定義、找原因、改進", short: "解題", pathName: "解決問題" },
];

function branchOf(point: KnowledgePoint): (typeof SOFT_BRANCHES)[number] | undefined {
  return SOFT_BRANCHES.find((branch) => branch.pathName === point.disciplinePath[1]);
}

function profileOf(folder: string, title: string): { shortTitle: string; mention: string; glyph: DisciplineGlyph } {
  return PROFILE[folder] ?? { shortTitle: title, mention: title, glyph: "circle" };
}

function gradesOf(stage: StageInfo | undefined): string {
  if (!stage || stage.grades.length === 0) return "大學以上";
  const first = stage.grades[0];
  const last = stage.grades[stage.grades.length - 1];
  return first === last ? `${first} 年級` : `${first}–${last} 年級`;
}

/** 學段由上往下。同一個學段裡，先學排在前面；沒有先學關係時維持檔案順序。 */
function sortPoints(catalog: ContentCatalog, points: KnowledgePoint[]): KnowledgePoint[] {
  const fileOrder = new Map(points.map((point, index) => [point.id, index]));
  const stages = [...new Set(points.map((point) => point.stage))].sort(
    (a, b) => (catalog.taxonomy.stages.get(a)?.rank ?? 0) - (catalog.taxonomy.stages.get(b)?.rank ?? 0),
  );
  const sorted: KnowledgePoint[] = [];
  for (const stage of stages) {
    sorted.push(...topoWithin(points.filter((point) => point.stage === stage), fileOrder));
  }
  return sorted;
}

function topoWithin(group: KnowledgePoint[], fileOrder: Map<string, number>): KnowledgePoint[] {
  const ids = new Set(group.map((point) => point.id));
  const byId = new Map(group.map((point) => [point.id, point]));
  const incoming = new Map(group.map((point) => [point.id, 0]));
  const outgoing = new Map<string, string[]>();
  for (const point of group) {
    for (const id of new Set(point.prerequisites)) {
      if (!ids.has(id)) continue;
      incoming.set(point.id, (incoming.get(point.id) ?? 0) + 1);
      const list = outgoing.get(id) ?? [];
      list.push(point.id);
      outgoing.set(id, list);
    }
  }
  const compare = (a: string, b: string) => (fileOrder.get(a) ?? 0) - (fileOrder.get(b) ?? 0);
  const ready = group.map((point) => point.id).filter((id) => incoming.get(id) === 0).sort(compare);
  const sorted: KnowledgePoint[] = [];
  const seen = new Set<string>();
  while (ready.length > 0) {
    const id = ready.shift() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    const point = byId.get(id);
    if (point) sorted.push(point);
    for (const child of outgoing.get(id) ?? []) {
      incoming.set(child, (incoming.get(child) ?? 1) - 1);
      if (incoming.get(child) === 0) {
        ready.push(child);
        ready.sort(compare);
      }
    }
  }
  for (const point of group) {
    if (!seen.has(point.id)) sorted.push(point);
  }
  return sorted;
}

function diagramPoints(catalog: ContentCatalog, folder: string, publicIds: readonly string[]): KnowledgePoint[] {
  if (!publicIds.includes(folder)) return [];
  const points = catalog.points.filter((point) => point.folder === folder);
  const shown = PUBLISHED_DIAGRAMS.has(folder) ? points.filter((point) => point.status === "published") : points;
  return sortPoints(catalog, shown);
}

function toLink(catalog: ContentCatalog, point: KnowledgePoint): HomeLink {
  const stage = catalog.taxonomy.stages.get(point.stage);
  return {
    id: point.id,
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
  return edges.filter((edge) => edge.kind === "pre" || !solidReachable(edges, edge.from, edge.to));
}

/** 沿實線往下走得到，虛線就可以拿掉。實線本身不動。 */
function solidReachable(edges: HomeEdge[], from: string, to: string): boolean {
  const next = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.kind !== "pre") continue;
    const list = next.get(edge.from) ?? [];
    list.push(edge.to);
    next.set(edge.from, list);
  }
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const id of next.get(current) ?? []) {
      if (id === to) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(id);
    }
  }
  return false;
}

function nodeHref(folder: string, id: string): string {
  return `/?d=${folder}&kp=${encodeURIComponent(id)}`;
}

function crossesFor(catalog: ContentCatalog, point: KnowledgePoint, stepIndex: number, onDiagram: Set<string>): TaskCross[] {
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
      const shown = onDiagram.has(target.id);
      rows.push({
        key: `${stepIndex}-${side}-${index}`,
        side,
        mention: profile.mention,
        glyph: profile.glyph,
        label: shown ? profile.mention : `${profile.mention} · 準備中`,
        title: shown ? target.title : null,
        href: shown ? nodeHref(target.folder, target.id) : null,
      });
    });
  }
  return rows;
}

function priorLabel(catalog: ContentCatalog, source: KnowledgePoint, targetId: string, onDiagram: Set<string>): HomePrior {
  const target = catalog.indexes.byId.get(targetId);
  if (!target || target.status !== "published") {
    let suffix = "";
    if (target && target.folder === source.folder) {
      const branch = branchOf(target);
      if (branch && branch.id !== branchOf(source)?.id) suffix = `（${branch.short}）`;
    } else if (target) {
      suffix = `（${profileOf(target.folder, disciplineTitle(catalog, target.folder)).mention}）`;
    }
    return { id: targetId, label: `準備中${suffix}`, href: null };
  }
  const branch = branchOf(target);
  const mention = profileOf(target.folder, disciplineTitle(catalog, target.folder)).mention;
  let label = target.title;
  if (target.folder === source.folder && branch && branch.id !== branchOf(source)?.id) label = `${target.title}（${branch.short}）`;
  else if (target.folder !== source.folder) label = `${target.title}（${mention}）`;
  const href = target.folder === "soft-skills" && branch
    ? `/?d=soft-skills&b=${branch.id}&kp=${encodeURIComponent(target.id)}`
    : onDiagram.has(target.id)
      ? nodeHref(target.folder, target.id)
      : knowledgePointPath(target.concept, target.stage);
  return { id: target.id, label, href };
}

function adjacentEdges(points: KnowledgePoint[]): HomeEdge[] {
  const edges: HomeEdge[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    if (point.prerequisites.includes(previous.id)) edges.push({ from: previous.id, to: point.id, kind: "pre" });
  }
  return edges;
}

function nodesFor(catalog: ContentCatalog, points: KnowledgePoint[]): HomeNode[] {
  const byId = new Map(points.map((point) => [point.id, point]));
  return points.map((point) => {
    const stage = catalog.taxonomy.stages.get(point.stage);
    const prerequisites = point.prerequisites
      .map((id) => byId.get(id))
      .filter((item): item is KnowledgePoint => Boolean(item))
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
      pageHref: point.status === "published" ? knowledgePointPath(point.concept, point.stage) : null,
      prerequisites,
      priors: [],
      next: deeper ? toLink(catalog, deeper) : null,
      also: mentionsFor(catalog, point),
    };
  });
}

function taskFor(
  catalog: ContentCatalog,
  pathId: string,
  onDiagram: Set<string>,
  hideUnpublishedTitles: boolean,
): HomeTask | null {
  const path = catalog.indexes.pathsById.get(pathId);
  if (!path) return null;
  const stops = path.knowledgePointIds
    .map((id) => catalog.indexes.byId.get(id))
    .filter((point): point is KnowledgePoint => point?.status === "published");
  if (stops.length === 0) return null;
  const discipline = profileOf(path.disciplineFolder, path.disciplineTitle);
  const steps: TaskStep[] = stops.map((point, index) => {
    const stage = catalog.taxonomy.stages.get(point.stage);
    const crosses = crossesFor(catalog, point, index + 1, onDiagram).map((cross) => {
      if (!hideUnpublishedTitles || cross.title == null) return cross;
      const targetId = cross.href?.match(/kp=([^&]+)/)?.[1];
      const decoded = targetId ? decodeURIComponent(targetId) : "";
      const target = catalog.indexes.byId.get(decoded);
      if (target && target.status !== "published") {
        return { ...cross, label: `${cross.mention} · 準備中`, title: null, href: null };
      }
      return cross;
    });
    return {
      id: point.id,
      index: index + 1,
      title: point.title,
      stageName: stage?.name ?? point.stage,
      grades: gradesOf(stage),
      href: knowledgePointPath(point.concept, point.stage),
      disciplineTitle: path.disciplineTitle,
      glyph: discipline.glyph,
      crosses,
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
  return {
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
}

export function buildHomeDiagram(
  catalog: ContentCatalog,
  publicIds: readonly string[] = publicDisciplineIds(),
  softSkills = isSoftSkillsEnabled(),
): HomeModel {
  const stages: HomeStage[] = catalog.taxonomy.stageList.map((stage) => ({
    id: stage.id,
    name: stage.name,
    grades: gradesOf(stage),
  }));
  const listed = softSkills
    ? [...new Set([...publicIds.filter((id) => id !== "language"), "soft-skills"])]
    : publicIds.filter((id) => id !== "soft-skills" && id !== "language");
  const roots = [...disciplineRoots(catalog)]
    .filter((root) => softSkills || root.contentFolder !== "soft-skills")
    .sort((a, b) => {
      const left = ORDER.indexOf(a.contentFolder ?? "");
      const right = ORDER.indexOf(b.contentFolder ?? "");
      return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
    });
  const pointsByDiscipline = new Map(roots.map((root) => {
    const id = root.contentFolder ?? root.id;
    return [id, diagramPoints(catalog, id, listed)] as const;
  }));
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
      ready: (pointsByDiscipline.get(id)?.length ?? 0) > 0,
    };
  });
  if (softSkills) {
    const at = disciplines.findIndex((item) => item.id === "soft-skills");
    disciplines.splice(at === -1 ? disciplines.length : at, 0, {
      id: "language",
      title: "語文",
      shortTitle: "語文",
      mention: "語文",
      glyph: "bubble",
      ready: false,
    });
  }

  const softPoints = pointsByDiscipline.get("soft-skills") ?? [];
  const diagrams: HomeDiagram[] = [];
  for (const discipline of disciplines) {
    if (discipline.id === "language") {
      diagrams.push({ id: "language", branchId: null, nodes: [], edges: [] });
      continue;
    }
    if (discipline.id === "soft-skills") {
      for (const branch of SOFT_BRANCHES) {
        const points = softPoints.filter((point) => branchOf(point)?.id === branch.id);
        diagrams.push({
          id: "soft-skills",
          branchId: branch.id,
          nodes: nodesFor(catalog, points),
          edges: adjacentEdges(points),
        });
      }
      continue;
    }
    const points = pointsByDiscipline.get(discipline.id) ?? [];
    diagrams.push({ id: discipline.id, branchId: null, nodes: nodesFor(catalog, points), edges: edgesFor(points) });
  }
  const onDiagram = new Set(diagrams.flatMap((diagram) => diagram.nodes.map((node) => node.id)));
  for (const diagram of diagrams) {
    if (diagram.id !== "soft-skills") continue;
    const points = softPoints.filter((point) => branchOf(point)?.id === diagram.branchId);
    diagram.nodes.forEach((node, index) => {
      const point = points[index];
      if (!point) return;
      const previousId = index > 0 ? points[index - 1]?.id : null;
      const skip = previousId && point.prerequisites.includes(previousId) ? previousId : null;
      node.priors = point.prerequisites
        .filter((id) => id !== skip)
        .map((id) => priorLabel(catalog, point, id, onDiagram));
    });
  }
  const branches: HomeBranch[] = softSkills
    ? SOFT_BRANCHES.map((branch) => {
        const diagram = diagrams.find((item) => item.id === "soft-skills" && item.branchId === branch.id);
        const ready = (diagram?.nodes.length ?? 0) > 0;
        return {
          id: branch.id,
          title: branch.title,
          blurb: branch.blurb,
          ready,
          task: ready ? taskFor(catalog, branch.id === "talk" ? "sk.talk" : "", onDiagram, true) : null,
        };
      })
    : [];

  const path = catalog.indexes.pathsById.get(OPEN_PATH_ID);
  const defaultDisciplineId = disciplines.some((item) => item.id === path?.disciplineFolder)
    ? path?.disciplineFolder ?? disciplines[0]?.id ?? ""
    : disciplines.find((item) => item.ready)?.id ?? disciplines[0]?.id ?? "";

  const task = path ? taskFor(catalog, path.id, onDiagram, false) : null;
  if (task && path) {
    const stops = path.knowledgePointIds
      .map((id) => catalog.indexes.byId.get(id))
      .filter((point): point is KnowledgePoint => point?.status === "published");
    const onPath = new Map(stops.map((point, index) => [point.id, stops[index + 1]]));
    for (const diagram of diagrams) {
      if (diagram.id !== path.disciplineFolder) continue;
      for (const node of diagram.nodes) {
        const following = onPath.get(node.id);
        if (following) node.next = toLink(catalog, following);
      }
    }
  }

  return { disciplines, defaultDisciplineId, stages, diagrams, branches, task };
}
