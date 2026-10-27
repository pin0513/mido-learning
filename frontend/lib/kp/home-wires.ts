/** 學段總圖的直角線路。實線是先學，虛線是可以延伸。 */

export interface WireNode {
  id: string;
  x: number;
  y: number;
}

export interface WireEdge {
  from: string;
  to: string;
  kind: "pre" | "ext";
}

export type WireTone = "norm" | "hi" | "dim";

export interface WirePath {
  d: string;
  kind: "pre" | "ext";
  tone: WireTone;
}

export interface WireJoint {
  x: number;
  y: number;
  tone: WireTone;
}

export interface WireBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface WireOptions {
  /** 學段名稱的範圍。線路可以穿過學段之間的空隙，但不能壓到這些盒子。 */
  obstacles?: WireBox[];
  /** 平行的垂直線至少隔開這麼多。390 寬時用 7。 */
  minGap?: number;
}

interface Point {
  x: number;
  y: number;
}

const RADIUS = 16;
const LEFT_LIMIT = 10;

function toneFor(edge: WireEdge, selectedId: string | null): WireTone {
  if (!selectedId) return "norm";
  return edge.from === selectedId || edge.to === selectedId ? "hi" : "dim";
}

/** 兩點之間的直線會不會穿過別的圓點。穿過就改走旁邊的直角。 */
function blocked(nodes: WireNode[], x: number, y1: number, y2: number, skip: Set<string>): boolean {
  const top = Math.min(y1, y2) + RADIUS;
  const bot = Math.max(y1, y2) - RADIUS;
  if (bot - top < 4) return false;
  return nodes.some((node) => !skip.has(node.id) && Math.abs(node.x - x) < 12 && node.y > top && node.y < bot);
}

function rangesOverlap(y0: number, y1: number, top: number, bottom: number): boolean {
  return Math.max(y0, y1) > top && Math.min(y0, y1) < bottom;
}

function assignLanes(spans: { top: number; bot: number }[]): number[] {
  const order = spans.map((span, index) => ({ ...span, index })).sort((a, b) => a.top - b.top || a.bot - b.bot);
  const active: { bot: number; lane: number }[] = [];
  const lanes = new Array<number>(spans.length).fill(0);
  for (const span of order) {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      if (active[index].bot < span.top - 8) active.splice(index, 1);
    }
    const used = new Set(active.map((item) => item.lane));
    let lane = 0;
    while (used.has(lane)) lane += 1;
    lanes[span.index] = lane;
    active.push({ bot: span.bot, lane });
  }
  return lanes;
}

function pointsToPath(points: Point[]): string {
  const compact: Point[] = [];
  for (const point of points) {
    const prev = compact[compact.length - 1];
    if (prev && prev.x === point.x && prev.y === point.y) continue;
    compact.push(point);
  }
  let d = `M ${compact[0].x} ${compact[0].y}`;
  for (let index = 1; index < compact.length; index += 1) {
    const prev = compact[index - 1];
    const point = compact[index];
    if (point.y === prev.y) d += ` H ${point.x}`;
    else if (point.x === prev.x) d += ` V ${point.y}`;
    else d += ` L ${point.x} ${point.y}`;
  }
  return d;
}

function hitsBox(x: number, y0: number, y1: number, box: WireBox): boolean {
  return x >= box.left && x <= box.right && rangesOverlap(y0, y1, box.top, box.bottom);
}

function walkVertical(
  x: number,
  y0: number,
  y1: number,
  obstacles: WireBox[],
  minGap: number,
  lanes: Map<string, number>,
  labelRight: number,
): Point[] {
  const dir = y1 >= y0 ? 1 : -1;
  const pad = 6;
  const hits = obstacles
    .map((box, index) => ({ ...box, index }))
    .filter((box) => hitsBox(x, y0, y1, box))
    .sort((a, b) => dir * (a.top - b.top));
  const points: Point[] = [{ x, y: y0 }];
  for (const box of hits) {
    const entry = dir > 0 ? Math.max(Math.min(y0, y1), box.top - pad) : Math.min(Math.max(y0, y1), box.bottom + pad);
    const exit = dir > 0 ? Math.min(Math.max(y0, y1), box.bottom + pad) : Math.max(Math.min(y0, y1), box.top - pad);
    if (dir * (exit - entry) <= 0) continue;
    const lane = lanes.get(`${box.index}:${x}`) ?? 0;
    const clear = Math.round(labelRight + 8 + lane * minGap);
    if (clear === x) continue;
    points.push({ x, y: entry });
    points.push({ x: clear, y: entry });
    points.push({ x: clear, y: exit });
    points.push({ x, y: exit });
  }
  points.push({ x, y: y1 });
  return points;
}

function dodgePolyline(
  points: Point[],
  obstacles: WireBox[],
  minGap: number,
  lanes: Map<string, number>,
  labelRight: number,
): Point[] {
  if (obstacles.length === 0 || points.length === 0) return points;
  const out: Point[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const from = out[out.length - 1];
    const to = points[index];
    if (from.x !== to.x) {
      out.push(to);
      continue;
    }
    const walked = walkVertical(from.x, from.y, to.y, obstacles, minGap, lanes, labelRight);
    out.pop();
    out.push(...walked);
  }
  return out;
}

export function routeWires(
  nodes: WireNode[],
  edges: WireEdge[],
  selectedId: string | null,
  options: WireOptions = {},
): { paths: WirePath[]; joints: WireJoint[] } {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const minGap = options.minGap ?? 7;
  const obstacles = options.obstacles ?? [];
  const raw: { points: Point[]; kind: WireEdge["kind"]; tone: WireTone; elbow: boolean }[] = [];
  const elbowSpans: { top: number; bot: number }[] = [];

  for (const edge of edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    const tone = toneFor(edge, selectedId);
    const sameColumn = Math.abs(from.x - to.x) < 8;
    const skip = new Set([from.id, to.id]);
    if (sameColumn && !blocked(nodes, from.x, from.y, to.y, skip)) {
      const dir = to.y >= from.y ? 1 : -1;
      raw.push({
        points: [
          { x: from.x, y: from.y + dir * RADIUS },
          { x: from.x, y: to.y - dir * RADIUS },
        ],
        kind: edge.kind,
        tone,
        elbow: false,
      });
      continue;
    }
    elbowSpans.push({ top: Math.min(from.y, to.y), bot: Math.max(from.y, to.y) });
    raw.push({
      points: [
        { x: from.x - RADIUS, y: from.y },
        { x: 0, y: from.y },
        { x: 0, y: to.y },
        { x: to.x - RADIUS, y: to.y },
      ],
      kind: edge.kind,
      tone,
      elbow: true,
    });
  }

  const lanes = assignLanes(elbowSpans);
  const laneCount = lanes.reduce((max, lane) => Math.max(max, lane + 1), 0);
  const nodeLeft = nodes.reduce((min, node) => Math.min(min, node.x), Number.POSITIVE_INFINITY);
  const rightLimit = Number.isFinite(nodeLeft) ? nodeLeft - RADIUS - 8 : LEFT_LIMIT;
  let gap = minGap;
  if (laneCount > 1) {
    const room = rightLimit - LEFT_LIMIT;
    const fit = Math.floor(room / (laneCount - 1));
    gap = Math.max(minGap, Math.min(18, fit));
  }
  const xForLane = (lane: number) => Math.round(rightLimit - lane * gap);

  let elbowIndex = 0;
  for (const item of raw) {
    if (!item.elbow) continue;
    const x = xForLane(lanes[elbowIndex] ?? 0);
    elbowIndex += 1;
    item.points[1].x = x;
    item.points[2].x = x;
  }

  const crossings: { box: number; x: number }[] = [];
  for (const item of raw) {
    for (let index = 1; index < item.points.length; index += 1) {
      const from = item.points[index - 1];
      const to = item.points[index];
      if (from.x !== to.x) continue;
      obstacles.forEach((box, boxIndex) => {
        if (hitsBox(from.x, from.y, to.y, box)) crossings.push({ box: boxIndex, x: from.x });
      });
    }
  }
  const dodgeLanes = new Map<string, number>();
  for (const boxIndex of new Set(crossings.map((item) => item.box))) {
    const xs = [...new Set(crossings.filter((item) => item.box === boxIndex).map((item) => item.x))].sort((a, b) => a - b);
    xs.forEach((x, lane) => dodgeLanes.set(`${boxIndex}:${x}`, lane));
  }
  const labelRight = obstacles.reduce((max, box) => Math.max(max, box.right), 0);

  const paths: WirePath[] = [];
  const joints: WireJoint[] = [];
  for (const item of raw) {
    const points = dodgePolyline(item.points, obstacles, minGap, dodgeLanes, labelRight);
    paths.push({ d: pointsToPath(points), kind: item.kind, tone: item.tone });
    if (!item.elbow) continue;
    for (const point of [item.points[1], item.points[2]]) {
      const covered = obstacles.some((box) => point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom);
      if (!covered) joints.push({ x: point.x, y: point.y, tone: item.tone });
    }
  }

  return { paths, joints };
}
