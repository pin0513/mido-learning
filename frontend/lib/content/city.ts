/**
 * 學習城市的建置時索引。純函式，不讀檔、不打 API。
 * 學區沿用有 content_folder 的學門，順時針依 taxonomy 出現順序（本質在前）。
 * 開發預定區是沒有 content_folder 的根節點。地圖上只畫下一輪的幾塊，索引仍保留全部。
 */
import type { ContentModel, KnowledgePoint, LearningPath } from "./types";

export const NEXT_LOT_IDS = ["psychology", "language", "physics", "engineering", "ai-applied"] as const;

const DISTRICT_COLORS = ["#6b4f3a", "#1f6b4a", "#8a5a2b", "#2c4c7c"] as const;

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
}

const SIZE = 1000;
const CX = 500;
const CY = 500;
const PLAZA = 92;
const RINGS: [number, number][] = [
  [92, 190],
  [190, 290],
  [290, 390],
  [390, 480],
];

export function sectorStart(index: number, sector: number): number {
  return -90 - sector / 2 + index * sector;
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
  const points = [...model.points].sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(points.map((point) => [point.id, point]));
  const stages = [...model.taxonomy.stageList].sort((a, b) => a.rank - b.rank).map((stage) => ({ id: stage.id, name: stage.name }));
  const layers = model.taxonomy.layerList.map((layer) => ({ id: layer.id, name: layer.name }));
  const stageIndex = new Map(stages.map((stage, index) => [stage.id, index]));
  const layerIndex = new Map(layers.map((layer, index) => [layer.id, index]));
  const layerName = new Map(layers.map((layer) => [layer.id, layer.name]));

  const districtsSource = model.taxonomy.roots.filter((root) => root.contentFolder);
  const sector = 360 / (districtsSource.length + 1);
  const districts: CityDistrict[] = districtsSource.map((root, index) => {
    const folder = root.contentFolder ?? root.id;
    const path = model.paths.find((item) => item.disciplineFolder === folder);
    const name = folder === "pm-leadership" ? "專案管理與領導" : (path?.disciplineTitle ?? root.name);
    return {
      key: folder,
      name: name.endsWith("區") ? name : `${name}區`,
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
      height: 10 + required.length * 7,
      dependents: required.length,
      prerequisites: point.prerequisites.filter((id) => byId.has(id)).map((id) => ({ id, title: titleOf(byId, id) })),
      requiredBy: required.map((id) => ({ id, title: titleOf(byId, id) })),
      bridges: bridgeIds.filter((id) => byId.has(id)).map((id) => ({ id, title: titleOf(byId, id) })),
      paths: pathsByPoint.get(point.id) ?? [],
      aesthetics: point.crosscutting.includes("aesthetics"),
      href: `/kp/${point.concept}/${point.stage}`,
      pointedRoof: (layerIndex.get(point.layer) ?? 0) >= 2,
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

  const lotSector = districts.length;
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
  for (const layer of layers) {
    const group = lots.filter((lot) => lot.layer === layer.id && lot.featured);
    const sIndex = layers.findIndex((item) => item.id === layer.id);
    group.forEach((lot, index) => {
      const [r0, r1] = RINGS[Math.min(sIndex, RINGS.length - 1)] ?? RINGS[0];
      const span = sector - 12;
      const ang = sectorStart(lotSector, sector) + 6 + ((index + 0.5) * span) / Math.max(group.length, 1);
      const [x, y] = polar(CX, CY, (r0 + r1) / 2, ang);
      lot.x = round(x);
      lot.y = round(y);
    });
  }

  const landmarks: CityLandmark[] = [...model.paths]
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
  };
}

function placeCell(ids: string[], sectorIndex: number, stageIndex: number, sector: number, positions: Map<string, { x: number; y: number }>): void {
  if (ids.length === 0) return;
  const sorted = [...ids].sort();
  const cols = Math.min(4, sorted.length);
  const rows = Math.ceil(sorted.length / cols);
  const a0 = sectorStart(sectorIndex, sector) + 7;
  const span = sector - 14;
  const [r0, r1] = RINGS[stageIndex] ?? RINGS[0];
  sorted.forEach((id, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const ang = a0 + ((col + 0.5) * span) / cols;
    const radius = r0 + ((row + 1) * (r1 - r0)) / (rows + 1);
    const [x, y] = polar(CX, CY, radius, ang);
    positions.set(id, { x, y });
  });
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
