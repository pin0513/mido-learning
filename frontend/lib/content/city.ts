/**
 * 學習城市的建置時索引。純函式，不讀檔、不打 API。
 * 學區沿用有 content_folder 的學門，順時針依 taxonomy 出現順序（本質在前）。
 * 開發預定區是沒有 content_folder 的根節點。地圖上只畫下一輪的幾塊，索引仍保留全部。
 */
import type { ContentModel, KnowledgePoint, LearningPath } from "./types";

export const NEXT_LOT_IDS = ["psychology", "language", "physics", "engineering", "ai-applied"] as const;

const DISTRICT_COLORS = ["#9cc3d5", "#e6d27a", "#eba79c", "#a6cf96"] as const;

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

export interface CityDistrict {
  key: string;
  name: string;
  layer: string;
  layerName: string;
  color: string;
  sector: number;
  count: number;
}

export interface CityMapData {
  cx: number;
  cy: number;
  size: number;
  plaza: number;
  sector: number;
  rings: [number, number][];
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

const SIZE = 1100;
const CX = 550;
const CY = 550;
const PLAZA = 78;
const RINGS: [number, number][] = [
  [78, 175],
  [175, 272],
  [272, 369],
  [369, 466],
];

/** 四個學區各 90°，從正上方順時針，兩側各留 2°。 */
export function sectorStart(index: number, sector: number): number {
  return -90 + index * sector + 2;
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

export function focusViewBox(data: Pick<CityMapData, "cx" | "cy" | "plaza" | "rings" | "sector">, districtIndex: number | null, stageIndex: number | null): string {
  if (districtIndex === null && stageIndex === null) return `0 0 ${SIZE} ${SIZE}`;
  if (districtIndex === null && stageIndex !== null) {
    const radius = data.rings[stageIndex][1] + 36;
    const side = radius * 2;
    return `${(data.cx - radius).toFixed(1)} ${(data.cy - radius).toFixed(1)} ${side.toFixed(1)} ${side.toFixed(1)}`;
  }
  if (districtIndex === null) return `0 0 ${SIZE} ${SIZE}`;
  const a0 = sectorStart(districtIndex, data.sector);
  const a1 = a0 + data.sector;
  const r0 = stageIndex === null ? data.plaza : data.rings[stageIndex][0] - 8;
  const r1 = stageIndex === null ? data.rings[data.rings.length - 1][1] : data.rings[stageIndex][1] + 8;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let a = a0; a <= a1 + 0.01; a += 3) {
    for (const r of [r0, r1]) {
      const [x, y] = polar(data.cx, data.cy, r, a);
      xs.push(x);
      ys.push(y);
    }
  }
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const pad = 28;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  const s = Math.max(w, h);
  const x = minX - pad - (s - w) / 2;
  const y = minY - pad - (s - h) / 2;
  return `${x.toFixed(1)} ${y.toFixed(1)} ${s.toFixed(1)} ${s.toFixed(1)}`;
}

function titleOf(points: Map<string, KnowledgePoint>, id: string): string {
  return points.get(id)?.title ?? id;
}

function crossesFolder(points: Map<string, KnowledgePoint>, source: KnowledgePoint, id: string): boolean {
  const target = points.get(id);
  return Boolean(target && target.folder !== source.folder);
}

export function buildCityMap(model: ContentModel): CityMapData {
  // 徑向圖維持四個學區。新學門的點不放進來，避免第五個扇形把既有座標擠開。
  const points = [...model.points]
    .filter((point) => point.folder !== "soft-skills")
    .sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(points.map((point) => [point.id, point]));
  const stages = [...model.taxonomy.stageList].sort((a, b) => a.rank - b.rank).map((stage) => ({ id: stage.id, name: stage.name }));
  const layers = model.taxonomy.layerList.map((layer) => ({ id: layer.id, name: layer.name }));
  const layerName = new Map(layers.map((layer) => [layer.id, layer.name]));

  const districtsSource = model.taxonomy.roots.filter((root) => root.contentFolder && root.contentFolder !== "soft-skills");
  const sector = 90;
  const districts: CityDistrict[] = districtsSource.map((root, index) => {
    const folder = root.contentFolder ?? root.id;
    const path = model.paths.find((item) => item.disciplineFolder === folder);
    const name = path?.disciplineTitle ?? root.name;
    return {
      key: folder,
      name,
      layer: root.layer,
      layerName: layerName.get(root.layer) ?? root.layer,
      color: DISTRICT_COLORS[index % DISTRICT_COLORS.length],
      sector: index,
      count: points.filter((point) => point.folder === folder).length,
    };
  });
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
      placeCell(cell.map((point) => point.id), district.sector, sIndex, sector, positions);
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

  const lotSpots: Record<string, [number, number]> = {
    psychology: [1000, 170],
    language: [1000, 300],
    physics: [1000, 880],
    engineering: [100, 880],
    "ai-applied": [100, 190],
  };
  const lots: CityLot[] = model.taxonomy.roots
    .filter((root) => !root.contentFolder)
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
  for (const lot of lots) {
    const spot = lotSpots[lot.id];
    if (!spot) continue;
    lot.x = spot[0];
    lot.y = spot[1];
  }

  const landmarks: CityLandmark[] = [...model.paths]
    .filter((path) => path.disciplineFolder !== "soft-skills")
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
    size: SIZE,
    plaza: PLAZA,
    sector,
    rings: RINGS,
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

function placeCell(ids: string[], sectorIndex: number, stageIndex: number, sector: number, positions: Map<string, { x: number; y: number }>): void {
  if (ids.length === 0) return;
  const sorted = [...ids].sort();
  const a0 = sectorStart(sectorIndex, sector);
  const a1 = a0 + sector - 4;
  const [r0, r1] = RINGS[stageIndex] ?? RINGS[0];
  const span = r1 - r0;
  const rows = sorted.length <= 4 ? [sorted] : [sorted.slice(0, Math.ceil(sorted.length / 2)), sorted.slice(Math.ceil(sorted.length / 2))];
  const radii = rows.length === 1 ? [r0 + span * 0.55] : [r0 + span * 0.36, r0 + span * 0.8];
  rows.forEach((row, rowIndex) => {
    const radius = radii[rowIndex];
    row.forEach((id, index) => {
      let angle = a0 + 7 + (a1 - a0 - 14) * ((index + 0.5) / row.length);
      if (rows.length === 2 && rowIndex === 1) angle += ((a1 - a0 - 14) / (2 * Math.max(row.length, 1))) * 0.5;
      const [x, y] = polar(CX, CY, radius, angle);
      positions.set(id, { x, y });
    });
  });
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

export function footprintsOverlap(buildings: Pick<CityBuilding, "folder" | "stage" | "x" | "y">[]): boolean {
  const groups = new Map<string, { x: number; y: number }[]>();
  for (const building of buildings) {
    const key = `${building.folder}|${building.stage}`;
    const list = groups.get(key) ?? [];
    list.push(building);
    groups.set(key, list);
  }
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const dx = group[i].x - group[j].x;
        const dy = group[i].y - group[j].y;
        if (Math.hypot(dx, dy) < 14) return true;
      }
    }
  }
  return false;
}
