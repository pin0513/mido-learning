import { disciplineRoots, disciplineTitle, type ContentCatalog } from "../content/catalog";
import type { KnowledgePoint, StageInfo } from "../content/types";
import { isSoftSkillsEnabled, isYuwenEnabled } from "./flags";
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
  /** 英日共用的點。其他點是空字串。 */
  badge: string;
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
  disciplineId: string;
  title: string;
  short: string;
  blurb: string;
  ready: boolean;
  task: HomeTask | null;
  group: "zh" | "fl" | "sk";
  language: "zh" | "en" | "ja" | "sk";
}

export interface HomeStageNote {
  grades?: string;
  lines: string[];
}

export interface HomeDiagram {
  id: string;
  branchId: string | null;
  nodes: HomeNode[];
  edges: HomeEdge[];
  stageNotes?: Record<string, HomeStageNote>;
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

const ORDER = ["pm-leadership", "philosophy", "math", "it-ai", "language", "soft-skills"];

const PROFILE: Record<string, { shortTitle: string; mention: string; glyph: DisciplineGlyph }> = {
  "pm-leadership": { shortTitle: "專案管理", mention: "專案管理", glyph: "square" },
  philosophy: { shortTitle: "哲學思考", mention: "哲學", glyph: "circle" },
  math: { shortTitle: "數學", mention: "數學", glyph: "triangle" },
  "it-ai": { shortTitle: "資訊與AI", mention: "資訊與 AI", glyph: "diamond" },
  "soft-skills": { shortTitle: "溝通解題", mention: "溝通", glyph: "pentagon" },
  language: { shortTitle: "語文", mention: "語文", glyph: "bubble" },
};

const OPEN_PATH_ID = "pm.estimate";
/** 這張圖已經上線，不把同資料夾的草稿加進去。 */
const PUBLISHED_DIAGRAMS = new Set(["pm-leadership", "soft-skills", "language"]);

export const ENGLISH_MAPPING_NOTE = "學段和全民英檢、多益、托福、美國年級的對應，是本站的學習建議，不是官方換算。";
export const JAPANESE_MAPPING_NOTE = "學段和 JLPT 級數的對應，是本站的學習建議，不是官方換算。";

const ENGLISH_STAGE_NOTES: Record<string, HomeStageNote> = {
  es: { grades: "3–6 年級", lines: ["英語初階的準備", "CEFR A1"] },
  jh: { grades: "7–9 年級", lines: ["全民英檢初級", "CEFR A2"] },
  sh: { grades: "10–12 年級", lines: ["全民英檢中級", "CEFR B1"] },
  uni: { grades: "大學以上", lines: ["多益、托福", "CEFR B2–C1"] },
};

const JAPANESE_STAGE_NOTES: Record<string, HomeStageNote> = {
  es: { lines: ["JLPT N5 的準備"] },
  jh: { lines: ["JLPT N5"] },
  sh: { lines: ["JLPT N4–N3"] },
  uni: { lines: ["JLPT N2–N1"] },
};

const LG_ALL = ["lg.listen@es", "lg.review@jh", "lg.ai@sh", "lg.culture@uni"];

interface BranchSpec {
  disciplineId: string;
  id: string;
  title: string;
  short: string;
  blurb: string;
  pathName: string;
  group: HomeBranch["group"];
  language: HomeBranch["language"];
  pathId: string;
  extraKps?: string[];
}

const BRANCH_SPECS: BranchSpec[] = [
  { disciplineId: "soft-skills", id: "talk", title: "口語表達", blurb: "上台、簡報、開會", short: "口語", pathName: "口語表達", group: "sk", language: "sk", pathId: "sk.talk" },
  { disciplineId: "soft-skills", id: "emp", title: "同理與溝通", blurb: "感受、同理、化解衝突", short: "同理", pathName: "同理與溝通", group: "sk", language: "sk", pathId: "" },
  { disciplineId: "soft-skills", id: "solve", title: "解決問題", blurb: "定義、找原因、改進", short: "解題", pathName: "解決問題", group: "sk", language: "sk", pathId: "" },
  { disciplineId: "language", id: "basic", title: "基礎功", blurb: "標點、錯字、字音字形、病句", short: "基礎", pathName: "基礎功", group: "zh", language: "zh", pathId: "zh.basics" },
  { disciplineId: "language", id: "read", title: "閱讀理解", blurb: "擷取、推論、評鑑、讀懂立場", short: "閱讀", pathName: "閱讀理解", group: "zh", language: "zh", pathId: "zh.reading" },
  { disciplineId: "language", id: "classic", title: "文言與古典", blurb: "古詩、近體詩、文言入門", short: "古文", pathName: "文言與古典", group: "zh", language: "zh", pathId: "zh.classic" },
  { disciplineId: "language", id: "write", title: "作文與表達", blurb: "完整句、描寫、結構、評論", short: "寫作", pathName: "作文與表達", group: "zh", language: "zh", pathId: "zh.compose" },
  { disciplineId: "language", id: "practical", title: "應用文案", blurb: "留言條、海報、企劃、對象", short: "文案", pathName: "應用文案", group: "zh", language: "zh", pathId: "zh.practical" },
  { disciplineId: "language", id: "ai", title: "AI 協作寫作", blurb: "先想再問、查證、共寫、揭露", short: "AI", pathName: "AI 協作寫作", group: "zh", language: "zh", pathId: "zh.aivoice" },
  { disciplineId: "language", id: "en-talk", title: "聽說", blurb: "發音、會話、聽力、口說", short: "聽說", pathName: "英文聽說", group: "fl", language: "en", pathId: "en.speak" },
  { disciplineId: "language", id: "en-read", title: "讀寫", blurb: "字彙、文法、讀本、作文", short: "讀寫", pathName: "英文讀寫", group: "fl", language: "en", pathId: "en.readus" },
  { disciplineId: "language", id: "en-bench", title: "檢定與方法", blurb: "英檢、多益、托福、學習方法", short: "檢定", pathName: "英文檢定與方法", group: "fl", language: "en", pathId: "en.bench", extraKps: LG_ALL },
  { disciplineId: "language", id: "ja-read", title: "假名與讀寫", blurb: "假名、漢字、讀原文", short: "讀寫", pathName: "日文讀寫", group: "fl", language: "ja", pathId: "ja.script", extraKps: ["lg.review@jh", "lg.ai@sh"] },
  { disciplineId: "language", id: "ja-talk", title: "會話與敬語", blurb: "招呼、介紹、敬語", short: "會話", pathName: "日文會話", group: "fl", language: "ja", pathId: "ja.talk", extraKps: ["lg.listen@es", "lg.culture@uni"] },
];

function ownBranch(point: KnowledgePoint): BranchSpec | undefined {
  const last = point.disciplinePath[point.disciplinePath.length - 1];
  return BRANCH_SPECS.find((branch) => branch.disciplineId === point.folder && branch.pathName === last);
}

function pointsOnBranch(points: KnowledgePoint[], spec: BranchSpec): KnowledgePoint[] {
  const extra = new Set(spec.extraKps ?? []);
  return points.filter((point) => extra.has(point.id) || ownBranch(point)?.id === spec.id);
}

function stageNotesFor(spec: BranchSpec): Record<string, HomeStageNote> | undefined {
  if (spec.language === "en") return ENGLISH_STAGE_NOTES;
  if (spec.language === "ja") return JAPANESE_STAGE_NOTES;
  return undefined;
}

function branchHref(point: KnowledgePoint): string | null {
  const branch = ownBranch(point);
  if (point.folder === "soft-skills" && branch) {
    return `/?d=soft-skills&b=${branch.id}&kp=${encodeURIComponent(point.id)}`;
  }
  if (point.folder === "language") {
    const id = branch?.id ?? BRANCH_SPECS.find((spec) => spec.extraKps?.includes(point.id))?.id ?? "basic";
    return `/?d=language&b=${id}&kp=${encodeURIComponent(point.id)}`;
  }
  return null;
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

/** 大綱表格順序。同一個學段裡沒有先學關係時，用這個當次序，不跟檔名字母走。 */
const SOFT_ORDER = [
  "sk.voice@es", "sk.point@es", "sk.showtell@es",
  "sk.audience@jh", "sk.speech@jh", "sk.discuss@jh",
  "sk.consensus@sh", "sk.present@sh", "sk.qa@sh",
  "sk.persuade@uni", "sk.facilitate@uni",
  "sk.feelings@es", "sk.listen@es", "sk.otherside@es",
  "sk.empmap@jh", "sk.imsg@jh", "sk.nvc@jh",
  "sk.hardtalk@sh", "sk.interview@sh", "sk.feedback@sh",
  "sk.coach@uni", "sk.mediate@uni",
  "sk.problem@es", "sk.why5@es", "sk.polya@es",
  "sk.pdca@jh", "sk.issuetree@jh", "sk.fishbone@jh",
  "sk.rootcause@sh", "sk.decide@sh", "sk.design@sh",
  "sk.a3@uni", "sk.hypo@uni",
];

function diagramPoints(catalog: ContentCatalog, folder: string, publicIds: readonly string[]): KnowledgePoint[] {
  if (!publicIds.includes(folder)) return [];
  const points = catalog.points.filter((point) => point.folder === folder);
  const shown = PUBLISHED_DIAGRAMS.has(folder) ? points.filter((point) => point.status === "published") : points;
  if (folder === "soft-skills") {
    const rank = new Map(SOFT_ORDER.map((id, index) => [id, index]));
    shown.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999) || a.id.localeCompare(b.id));
  }
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
      href: shown ? (branchHref(target) ?? nodeHref(target.folder, target.id)) : null,
      });
    });
  }
  return rows;
}

function priorLabel(catalog: ContentCatalog, source: KnowledgePoint, targetId: string, onDiagram: Set<string>): HomePrior {
  const target = catalog.indexes.byId.get(targetId);
  const targetBranch = target ? ownBranch(target) : undefined;
  const sourceBranch = ownBranch(source);
  const tag = (branch: BranchSpec) => (branch.disciplineId === "language" ? branch.pathName : branch.short);
  if (!target || target.status !== "published") {
    let suffix = "";
    if (target && target.folder === source.folder && targetBranch && targetBranch.id !== sourceBranch?.id) {
      suffix = `（${tag(targetBranch)}）`;
    } else if (target && target.folder !== source.folder) {
      suffix = `（${profileOf(target.folder, disciplineTitle(catalog, target.folder)).mention}）`;
    }
    return { id: targetId, label: `準備中${suffix}`, href: null };
  }
  const mention = profileOf(target.folder, disciplineTitle(catalog, target.folder)).mention;
  let label = target.title;
  if (target.folder === source.folder && targetBranch && targetBranch.id !== sourceBranch?.id) label = `${target.title}（${tag(targetBranch)}）`;
  else if (target.folder !== source.folder) label = `${target.title}（${mention}）`;
  const href = branchHref(target)
    ?? (onDiagram.has(target.id) ? nodeHref(target.folder, target.id) : knowledgePointPath(target.concept, target.stage));
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
      badge: point.id.startsWith("lg.") ? "英日共用" : "",
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
  yuwen = isYuwenEnabled(),
): HomeModel {
  const languageLive = softSkills && yuwen;
  const stages: HomeStage[] = catalog.taxonomy.stageList.map((stage) => ({
    id: stage.id,
    name: stage.name,
    grades: gradesOf(stage),
  }));
  const listed = softSkills
    ? [...new Set([...publicIds.filter((id) => id !== "language" && id !== "soft-skills"), "soft-skills", ...(languageLive ? ["language"] : [])])]
    : publicIds.filter((id) => id !== "soft-skills" && id !== "language");
  const roots = [...disciplineRoots(catalog)]
    .filter((root) => softSkills || root.contentFolder !== "soft-skills")
    .filter((root) => languageLive || root.contentFolder !== "language")
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
  if (softSkills && !languageLive) {
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
  const languagePoints = pointsByDiscipline.get("language") ?? [];
  const diagrams: HomeDiagram[] = [];
  const orderedByDiagram = new Map<string, KnowledgePoint[]>();
  for (const discipline of disciplines) {
    if (discipline.id === "language" && !languageLive) {
      diagrams.push({ id: "language", branchId: null, nodes: [], edges: [] });
      continue;
    }
    if (discipline.id === "soft-skills" || discipline.id === "language") {
      const pool = discipline.id === "soft-skills" ? softPoints : languagePoints;
      for (const branch of BRANCH_SPECS.filter((item) => item.disciplineId === discipline.id)) {
        const points = sortPoints(catalog, pointsOnBranch(pool, branch));
        const key = `${discipline.id}:${branch.id}`;
        orderedByDiagram.set(key, points);
        diagrams.push({
          id: discipline.id,
          branchId: branch.id,
          nodes: nodesFor(catalog, points),
          edges: adjacentEdges(points),
          stageNotes: stageNotesFor(branch),
        });
      }
      continue;
    }
    const points = pointsByDiscipline.get(discipline.id) ?? [];
    diagrams.push({ id: discipline.id, branchId: null, nodes: nodesFor(catalog, points), edges: edgesFor(points) });
  }
  const onDiagram = new Set(diagrams.flatMap((diagram) => diagram.nodes.map((node) => node.id)));
  for (const diagram of diagrams) {
    if (diagram.branchId == null) continue;
    if (diagram.id !== "soft-skills" && diagram.id !== "language") continue;
    const points = orderedByDiagram.get(`${diagram.id}:${diagram.branchId}`) ?? [];
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
  const activeSpecs = BRANCH_SPECS.filter((branch) => (branch.disciplineId === "soft-skills" ? softSkills : languageLive));
  const branches: HomeBranch[] = activeSpecs.map((branch) => {
    const diagram = diagrams.find((item) => item.id === branch.disciplineId && item.branchId === branch.id);
    const ready = (diagram?.nodes.length ?? 0) > 0;
    return {
      id: branch.id,
      disciplineId: branch.disciplineId,
      title: branch.title,
      short: branch.short,
      blurb: branch.blurb,
      group: branch.group,
      language: branch.language,
      ready,
      task: ready && branch.pathId ? taskFor(catalog, branch.pathId, onDiagram, true) : null,
    };
  });

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
