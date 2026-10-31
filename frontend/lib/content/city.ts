/**
 * 學習城市的建置時索引。純函式，不讀檔、不打 API。
 * 學區沿用有 content_folder 的學門，順時針依 taxonomy 出現順序（本質在前）。
 * 開發預定區是沒有 content_folder 的根節點。地圖上只畫下一輪的幾塊，索引仍保留全部。
 * 傳進來的內容決定畫哪些學區：頁面先用 launchedCatalog 拿掉旗標關閉的學門，這裡只畫有知識點的學門。
 * 扇形角度依每格（學門×階段）需要的空間分配，語文 108 點會拿到比較大的扇形，不用把點擠在一起。
 */
import type { ContentModel, KnowledgePoint, LearningPath } from "./types";

/** 下一輪預留的空間。語文的旗標關閉時沒有學區，仍以預留空間出現；旗標打開就是學區，不再列為預留。 */
export const NEXT_LOT_IDS = ["psychology", "language", "physics", "engineering", "ai-applied"] as const;

/** 依學門固定顏色，旗標關掉某個學門時，其他學門的顏色不會跟著位移。前四個沿用 kp-theme.css 的 --d-*。 */
export const DISTRICT_COLORS: Record<string, string> = {
  philosophy: "#9cc3d5",
  math: "#e6d27a",
  "pm-leadership": "#eba79c",
  "soft-skills": "#dca6cc",
  "it-ai": "#a6cf96",
  language: "#b4aae6",
};
const FALLBACK_COLORS = ["#c9c0a8", "#a9c4b6", "#d8b48f"] as const;

export interface CityBuilding {
  id: string;
  concept: string;
  stage: string;
  stageName: string;
  title: string;
  idea: string;
  folder: string;
  districtName: string;
  layer: string;
  layerName: string;
  status: KnowledgePoint["status"];
  x: number;
  y: number;
  height: number;
  dependents: number;
  prerequisites: { id: string; title: string }[];
  requiredBy: { id: string; title: string }[];
  bridges: { id: string; title: string }[];
  paths: { id: string; title: string; index: number; colearn: boolean }[];
  aesthetics: boolean;
  href: string;
  pointedRoof: boolean;
  /** 課綱核心素養代碼。不是標題。 */
  competencies: string[];
}

export interface CityRoad {
  from: string;
  to: string;
}

export interface CityBridge {
  from: string;
  to: string;
}

export interface CityLot {
  id: string;
  name: string;
  layer: string;
  layerName: string;
  summary: string;
  x: number;
  y: number;
  featured: boolean;
}

export interface CityLandmark {
  id: string;
  title: string;
  folder: string;
  colearn: boolean;
  stops: string[];
}

export interface CityLabel {
  /** 錨點（扇形中線與標籤環的交點）。 */
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  /** 第一行（學門名）與第二行（層級・點數）的基線。 */
  nameY: number;
  subY: number;
  /** 估算的外框，給碰撞檢查用：[x, y, w, h]。 */
  box: [number, number, number, number];
}

export interface CityDistrict {
  key: string;
  name: string;
  layer: string;
  layerName: string;
  color: string;
  sector: number;
  /** 扇形起點（度，0° 是正右方，順時針）與角度。 */
  start: number;
  span: number;
  count: number;
  label: CityLabel;
}

export interface CityMapData {
  cx: number;
  cy: number;
  /** 整張圖的 viewBox：[x, y, w, h]，含外圍的學門標籤。 */
  view: [number, number, number, number];
  plaza: number;
  rings: [number, number][];
  /** 正上方留給階段名稱的空隙（度）。 */
  spine: number;
  /** 學門色環的內外半徑。 */
  rim: [number, number];
  stageLabels: { id: string; name: string; x: number; y: number }[];
  buildings: CityBuilding[];
  roads: CityRoad[];
  bridges: CityBridge[];
  lots: CityLot[];
  landmarks: CityLandmark[];
  districts: CityDistrict[];
  stages: { id: string; name: string }[];
  layers: { id: string; name: string }[];
  competencies: { code: string; name: string }[];
}

const CX = 700;
const CY = 700;
const PLAZA = 64;
/** 國小圈最寬：越內圈弧長越短，同樣的點數需要更多排。 */
const RINGS: [number, number][] = [
  [64, 200],
  [200, 310],
  [310, 420],
  [420, 520],
];
const RIM: [number, number] = [526, 534];
const LABEL_R = 552;
/** 正上方的空隙，放「國小、國中、高中、大學」。 */
const SPINE = 18;
/** 扇形之間的空隙（度）。 */
const GAP = 2;
/** 同一格裡，排與排的最小間距、點到格邊的最小距離、同一排相鄰兩點的最小弧長。節點最大半徑 13（本質層外圈）。 */
const ROW_PITCH = 33;
const EDGE = 18;
const SLOT = 36;
const NAME_SIZE = 22;
const SUB_SIZE = 14;

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** 一格（學門×階段）可以排幾排：排距至少 ROW_PITCH，離內外圈至少 EDGE。 */
export function rowRadii(r0: number, r1: number): number[] {
  const count = Math.floor((r1 - r0 - 2 * EDGE) / ROW_PITCH) + 1;
  if (count <= 1) return [(r0 + r1) / 2];
  return Array.from({ length: count }, (_, index) => r0 + EDGE + (index * (r1 - r0 - 2 * EDGE)) / (count - 1));
}

function rowCapacity(radius: number, span: number): number {
  return Math.max(0, Math.floor((radius * rad(span)) / SLOT));
}

/** 這一格要多少角度才放得下 count 個點。 */
function spanNeeded(count: number, ring: [number, number]): number {
  if (count === 0) return 0;
  const radii = rowRadii(ring[0], ring[1]);
  let span = 4;
  while (radii.reduce((sum, radius) => sum + rowCapacity(radius, span), 0) < count && span < 360) span += 0.25;
  return span;
}

/**
 * 每個學區的扇形。最少角度是四個階段裡最擠的那一格需要的角度；
 * 剩下的角度依最少角度的比例分出去，所以每個學區的疏密差不多。
 */
export function sectorLayout(cells: number[][]): { start: number; span: number }[] {
  const minimum = cells.map((counts) => Math.max(12, ...counts.map((count, index) => spanNeeded(count, RINGS[index] ?? RINGS[RINGS.length - 1]))));
  const available = 360 - SPINE - GAP * cells.length;
  const total = minimum.reduce((sum, value) => sum + value, 0);
  const scale = total > 0 ? available / total : 1;
  let cursor = -90 + SPINE / 2 + GAP / 2;
  return minimum.map((value) => {
    const span = value * scale;
    const out = { start: cursor, span };
    cursor += span + GAP;
    return out;
  });
}

/** CJK 一字一個字寬，英數約 0.6 個字寬。只用來估標籤外框。 */
export function textWidth(text: string, size: number): number {
  let width = 0;
  for (const char of text) {
    if (char === " ") width += 0.3;
    else if (/[\u0000-\u024f]/.test(char)) width += 0.6;
    else width += 1;
  }
  return width * size;
}

function placeLabel(mid: number, name: string, sub: string): CityLabel {
  const [x, y] = polar(CX, CY, LABEL_R, mid);
  const cos = Math.cos(rad(mid));
  const sin = Math.sin(rad(mid));
  const anchor: CityLabel["anchor"] = cos > 0.26 ? "start" : cos < -0.26 ? "end" : "middle";
  const height = NAME_SIZE + 8 + SUB_SIZE + 4;
  const top = sin < -0.26 ? y - height : sin > 0.26 ? y : y - height / 2;
  const width = Math.max(textWidth(name, NAME_SIZE), textWidth(sub, SUB_SIZE));
  const left = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
  return {
    x: round(x),
    y: round(y),
    anchor,
    nameY: round(top + NAME_SIZE * 0.86),
    subY: round(top + NAME_SIZE + 8 + SUB_SIZE * 0.86),
    box: [round(left), round(top), round(width), round(height)],
  };
}

export function boxesOverlap(a: [number, number, number, number], b: [number, number, number, number], pad = 0): boolean {
  return a[0] < b[0] + b[2] + pad && b[0] < a[0] + a[2] + pad && a[1] < b[1] + b[3] + pad && b[1] < a[1] + a[3] + pad;
}

/** 相鄰標籤擠到時，後一個往遠離圓心的方向挪。 */
function resolveLabels(labels: CityLabel[]): void {
  for (let index = 1; index < labels.length; index += 1) {
    for (let guard = 0; guard < 40; guard += 1) {
      const hit = labels.slice(0, index).some((other) => boxesOverlap(labels[index].box, other.box, 6));
      if (!hit) break;
      const label = labels[index];
      const dy = label.y >= CY ? 4 : -4;
      label.box[1] += dy;
      label.nameY += dy;
      label.subY += dy;
    }
  }
}

function viewBounds(labels: CityLabel[]): [number, number, number, number] {
  const margin = 20;
  let minX = CX - RIM[1];
  let maxX = CX + RIM[1];
  let minY = CY - RIM[1];
  let maxY = CY + RIM[1];
  for (const label of labels) {
    minX = Math.min(minX, label.box[0]);
    maxX = Math.max(maxX, label.box[0] + label.box[2]);
    minY = Math.min(minY, label.box[1]);
    maxY = Math.max(maxY, label.box[1] + label.box[3]);
  }
  return [round(minX - margin), round(minY - margin), round(maxX - minX + margin * 2), round(maxY - minY + margin * 2)];
}

export function polar(cx: number, cy: number, radius: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
}

export function annulus(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r1, a0);
  const [x1, y1] = polar(cx, cy, r1, a1);
  const [x2, y2] = polar(cx, cy, r0, a1);
  const [x3, y3] = polar(cx, cy, r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r1} ${r1} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} A ${r0} ${r0} 0 ${large} 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z`;
}

/** 把 [minX, minY, maxX, maxY] 補成跟整張圖一樣的長寬比，縮放時 SVG 的高度不會跳。 */
function fitAspect(view: CityMapData["view"], minX: number, minY: number, maxX: number, maxY: number, pad: number): string {
  const aspect = view[2] / view[3];
  let w = maxX - minX + pad * 2;
  let h = maxY - minY + pad * 2;
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  const x = (minX + maxX) / 2 - w / 2;
  const y = (minY + maxY) / 2 - h / 2;
  return `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
}

export function viewBoxString(view: CityMapData["view"]): string {
  return view.map((value) => value.toFixed(1)).join(" ");
}

export function focusViewBox(data: Pick<CityMapData, "cx" | "cy" | "plaza" | "rings" | "view" | "districts">, districtIndex: number | null, stageIndex: number | null): string {
  if (districtIndex === null && stageIndex === null) return viewBoxString(data.view);
  if (districtIndex === null && stageIndex !== null) {
    const radius = data.rings[stageIndex][1] + 24;
    return fitAspect(data.view, data.cx - radius, data.cy - radius, data.cx + radius, data.cy + radius, 0);
  }
  const district = districtIndex === null ? undefined : data.districts[districtIndex];
  if (!district) return viewBoxString(data.view);
  const a0 = district.start;
  const a1 = a0 + district.span;
  const r0 = stageIndex === null ? data.plaza : data.rings[stageIndex][0] - 8;
  const r1 = stageIndex === null ? data.rings[data.rings.length - 1][1] : data.rings[stageIndex][1] + 8;
  const xs: number[] = [];
  const ys: number[] = [];
  const angles: number[] = [];
  for (let a = a0; a < a1; a += 3) angles.push(a);
  angles.push(a1);
  for (const a of angles) {
    for (const r of [r0, r1]) {
      const [x, y] = polar(data.cx, data.cy, r, a);
      xs.push(x);
      ys.push(y);
    }
  }
  return fitAspect(data.view, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), 28);
}

function titleOf(points: Map<string, KnowledgePoint>, id: string): string {
  return points.get(id)?.title ?? id;
}

function crossesFolder(points: Map<string, KnowledgePoint>, source: KnowledgePoint, id: string): boolean {
  const target = points.get(id);
  return Boolean(target && target.folder !== source.folder);
}

export function buildCityMap(model: ContentModel): CityMapData {
  // 每個有知識點的學門都是一個學區（六個學門全開時是 241 點）。旗標關閉的學門由頁面先用 launchedCatalog 拿掉。
  const points = [...model.points].sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(points.map((point) => [point.id, point]));
  const stages = [...model.taxonomy.stageList].sort((a, b) => a.rank - b.rank).map((stage) => ({ id: stage.id, name: stage.name }));
  const layers = model.taxonomy.layerList.map((layer) => ({ id: layer.id, name: layer.name }));
  const layerName = new Map(layers.map((layer) => [layer.id, layer.name]));

  const folders = new Set(points.map((point) => point.folder));
  const districtsSource = model.taxonomy.roots.filter((root) => root.contentFolder && folders.has(root.contentFolder));
  const cells = districtsSource.map((root) => stages.map((stage) => points.filter((point) => point.folder === root.contentFolder && point.stage === stage.id).length));
  const sectors = sectorLayout(cells);
  const districts: CityDistrict[] = districtsSource.map((root, index) => {
    const folder = root.contentFolder ?? root.id;
    const path = model.paths.find((item) => item.disciplineFolder === folder);
    const name = path?.disciplineTitle ?? root.name;
    const district = layerName.get(root.layer) ?? root.layer;
    const count = points.filter((point) => point.folder === folder).length;
    const { start, span } = sectors[index];
    return {
      key: folder,
      name,
      layer: root.layer,
      layerName: district,
      color: DISTRICT_COLORS[folder] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
      sector: index,
      start: round(start),
      span: round(span),
      count,
      label: placeLabel(start + span / 2, name, `${district}・${count} 個`),
    };
  });
  resolveLabels(districts.map((district) => district.label));
  const view = viewBounds(districts.map((district) => district.label));
  const districtByFolder = new Map(districts.map((district) => [district.key, district]));

  const dependents = new Map<string, string[]>();
  for (const point of points) {
    for (const prereq of point.prerequisites) {
      if (!byId.has(prereq)) continue;
      const list = dependents.get(prereq) ?? [];
      list.push(point.id);
      dependents.set(prereq, list);
    }
  }

  const pathsByPoint = new Map<string, CityBuilding["paths"]>();
  for (const path of model.paths) {
    path.knowledgePointIds.forEach((id, index) => {
      const list = pathsByPoint.get(id) ?? [];
      list.push({ id: path.id, title: path.title, index, colearn: Boolean(path.colearn) });
      pathsByPoint.set(id, list);
    });
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const district of districts) {
    stages.forEach((stage, sIndex) => {
      const cell = points.filter((point) => point.folder === district.key && point.stage === stage.id);
      placeCell(cell.map((point) => point.id), district.start, district.span, sIndex, positions);
    });
  }

  const buildings: CityBuilding[] = points.map((point) => {
    const pos = positions.get(point.id) ?? { x: CX, y: CY };
    const required = [...(dependents.get(point.id) ?? [])].sort();
    const bridgeIds = [...point.links.why, ...point.links.how, ...point.links.related].filter((id) => crossesFolder(byId, point, id));
    const district = districtByFolder.get(point.folder);
    return {
      id: point.id,
      concept: point.concept,
      stage: point.stage,
      stageName: stages.find((stage) => stage.id === point.stage)?.name ?? point.stage,
      title: point.title,
      idea: point.idea,
      folder: point.folder,
      districtName: district?.name ?? point.folder,
      layer: point.layer,
      layerName: layerName.get(point.layer) ?? point.layer,
      status: point.status,
      x: round(pos.x),
      y: round(pos.y),
      height: 16 + required.length * 9 + (point.status === "published" ? 8 : 0),
      dependents: required.length,
      prerequisites: point.prerequisites.filter((id) => byId.has(id)).map((id) => ({ id, title: titleOf(byId, id) })),
      requiredBy: required.map((id) => ({ id, title: titleOf(byId, id) })),
      bridges: bridgeIds.filter((id) => byId.has(id)).map((id) => ({ id, title: titleOf(byId, id) })),
      paths: pathsByPoint.get(point.id) ?? [],
      aesthetics: point.crosscutting.includes("aesthetics"),
      href: `/kp/${point.concept}/${point.stage}`,
      pointedRoof: point.layer === "essence",
      competencies: point.curriculum108?.coreCompetencies ?? [],
    };
  });

  const roads: CityRoad[] = [];
  for (const point of points) {
    for (const prereq of point.prerequisites) {
      if (byId.has(prereq)) roads.push({ from: prereq, to: point.id });
    }
  }
  roads.sort((a, b) => `${a.from}->${a.to}`.localeCompare(`${b.from}->${b.to}`));

  const bridges: CityBridge[] = [];
  const seen = new Set<string>();
  for (const point of points) {
    for (const id of [...point.links.why, ...point.links.how, ...point.links.related]) {
      if (!crossesFolder(byId, point, id)) continue;
      const key = `${point.id}->${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      bridges.push({ from: point.id, to: id });
    }
  }

  // 預留空間不畫在圖上（避免跟標籤搶位置），地圖下方另列按鈕。x、y 保留欄位，固定 0。
  const lots: CityLot[] = model.taxonomy.roots
    .filter((root) => !root.contentFolder || (root.id === "language" && !folders.has("language")))
    .map((root) => ({
      id: root.id,
      name: root.name,
      layer: root.layer,
      layerName: layerName.get(root.layer) ?? root.layer,
      summary: root.summary ?? "",
      x: 0,
      y: 0,
      featured: (NEXT_LOT_IDS as readonly string[]).includes(root.id),
    }));

  // 主線跟著學區：學門不在地圖上（旗標關閉）就沒有它的主線。
  const landmarks: CityLandmark[] = [...model.paths]
    .filter((path) => folders.has(path.disciplineFolder))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((path: LearningPath) => ({
      id: path.id,
      title: path.title,
      folder: path.disciplineFolder,
      colearn: Boolean(path.colearn),
      stops: [...path.knowledgePointIds],
    }));

  return {
    cx: CX,
    cy: CY,
    view,
    plaza: PLAZA,
    rings: RINGS,
    spine: SPINE,
    rim: RIM,
    stageLabels: stages.map((stage, index) => {
      const ring = RINGS[index] ?? RINGS[RINGS.length - 1];
      return { id: stage.id, name: stage.name, x: CX, y: round(CY - (ring[0] + ring[1]) / 2) };
    }),
    buildings,
    roads,
    bridges,
    lots,
    landmarks,
    districts,
    stages,
    layers,
    competencies: model.taxonomy.coreCompetencies.map((item) => ({ code: item.code, name: item.name })),
  };
}

/**
 * 一格裡的排法：先估「點跟點大約多遠」（格子面積 ÷ 點數開根號），用它決定排數，讓排距和排內間距差不多；
 * 排數上限由環寬決定（排距至少 ROW_PITCH），容量不夠再加排。點數依每排弧長按比例分，
 * 同一排等角度排開，所以排內的弧長間距至少 SLOT、離扇形邊至少 SLOT / 2。
 */
function placeCell(ids: string[], start: number, span: number, stageIndex: number, positions: Map<string, { x: number; y: number }>): void {
  if (ids.length === 0) return;
  const sorted = [...ids].sort();
  const [r0, r1] = RINGS[stageIndex] ?? RINGS[0];
  const maxRows = rowRadii(r0, r1).length;
  const band = r1 - r0;
  const spacing = Math.sqrt((band * ((r0 + r1) / 2) * rad(span)) / sorted.length);
  let rows = Math.min(maxRows, sorted.length, Math.max(1, Math.round(band / spacing)));
  const radiiFor = (count: number) => {
    if (count <= 1) return [(r0 + r1) / 2];
    return Array.from({ length: count }, (_, index) => r0 + EDGE + (index * (band - 2 * EDGE)) / (count - 1));
  };
  let radii = radiiFor(rows);
  while (rows < maxRows && radii.reduce((sum, radius) => sum + rowCapacity(radius, span), 0) < sorted.length) {
    rows += 1;
    radii = radiiFor(rows);
  }
  const capacity = radii.map((radius) => rowCapacity(radius, span));
  const counts = splitRows(sorted.length, capacity);
  let cursor = 0;
  radii.forEach((radius, rowIndex) => {
    const n = counts[rowIndex];
    for (let index = 0; index < n; index += 1) {
      const angle = start + (span * (index + 0.5)) / n;
      const [x, y] = polar(CX, CY, radius, angle);
      positions.set(sorted[cursor], { x, y });
      cursor += 1;
    }
  });
}

/** 依容量比例分配，每排不超過容量。總容量不夠時多的放最外排（測試會抓到重疊）。 */
function splitRows(total: number, capacity: number[]): number[] {
  const sum = capacity.reduce((acc, value) => acc + value, 0);
  const counts = capacity.map(() => 0);
  if (sum <= 0) {
    counts[counts.length - 1] = total;
    return counts;
  }
  const share = capacity.map((value) => (total * value) / sum);
  for (let placed = 0; placed < total; placed += 1) {
    let best = -1;
    for (let index = capacity.length - 1; index >= 0; index -= 1) {
      if (counts[index] >= capacity[index]) continue;
      if (best < 0 || share[index] - counts[index] > share[best] - counts[best]) best = index;
    }
    counts[best < 0 ? counts.length - 1 : best] += 1;
  }
  return counts;
}

/**
 * 地圖可以畫出施工中的建築，但標題、一句話與關聯名稱不進用戶端。
 * keepDraftIdentity 只給草稿 build：保留真實 id，方便對照內容。
 * 正式 build 把草稿換成 draft-N，拿掉 concept 與 href，道路和橋也不帶草稿端點。
 * 主線選單只留至少有一站已發布的，路線只連那些站。
 */
export function presentCityMap(data: CityMapData, keepDraftIdentity = false): CityMapData {
  const published = new Set(data.buildings.filter((building) => building.status === "published").map((building) => building.id));
  const keep = (items: { id: string; title: string }[]) => items.filter((item) => published.has(item.id));
  let draftNumber = 0;
  const buildings = data.buildings.map((building) => {
    if (building.status === "published") {
      return {
        ...building,
        prerequisites: keep(building.prerequisites),
        requiredBy: keep(building.requiredBy),
        bridges: keep(building.bridges),
      };
    }
    const hidden = {
      ...building,
      title: "",
      idea: "",
      prerequisites: [],
      requiredBy: [],
      bridges: [],
      paths: [],
    };
    if (keepDraftIdentity) return hidden;
    draftNumber += 1;
    return { ...hidden, id: `draft-${draftNumber}`, concept: "", href: "" };
  });
  const bothPublished = (from: string, to: string) => published.has(from) && published.has(to);
  return {
    ...data,
    buildings,
    roads: keepDraftIdentity ? data.roads : data.roads.filter((road) => bothPublished(road.from, road.to)),
    bridges: keepDraftIdentity ? data.bridges : data.bridges.filter((bridge) => bothPublished(bridge.from, bridge.to)),
    landmarks: data.landmarks
      .map((landmark) => ({ ...landmark, stops: landmark.stops.filter((id) => published.has(id)) }))
      .filter((landmark) => landmark.stops.length > 0),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 任兩棟建築的中心距離小於 minDistance 就算重疊。預設 30：節點最大半徑 13，兩棟之間至少留 4。 */
export function footprintsOverlap(buildings: Pick<CityBuilding, "x" | "y">[], minDistance = 30): boolean {
  for (let i = 0; i < buildings.length; i += 1) {
    for (let j = i + 1; j < buildings.length; j += 1) {
      if (Math.hypot(buildings[i].x - buildings[j].x, buildings[i].y - buildings[j].y) < minDistance) return true;
    }
  }
  return false;
}
