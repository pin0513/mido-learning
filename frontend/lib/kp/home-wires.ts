/** 學段總圖的主線。每一點只連到下一點，往下走，不再在左邊排一排垂直線。 */

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
  /** 這段接到下一個圓點時才加箭頭。在學段名稱前停住的那截不加。 */
  head?: boolean;
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
  /** 直線若會穿過這些範圍（學段名稱、展開的說明）就這一段不畫。 */
  avoid?: WireBox[];
}

const RADIUS = 16;

function toneFor(fromId: string, toId: string, selectedId: string | null): WireTone {
  if (!selectedId) return "norm";
  return fromId === selectedId || toId === selectedId ? "hi" : "dim";
}

function openSpans(start: number, end: number, cuts: { top: number; bottom: number }[]): { from: number; to: number }[] {
  const dir = end >= start ? 1 : -1;
  const spans: { from: number; to: number }[] = [];
  let cursor = start;
  const ordered = [...cuts].sort((a, b) => dir * (a.top - b.top));
  for (const cut of ordered) {
    const near = dir > 0 ? cut.top : cut.bottom;
    const far = dir > 0 ? cut.bottom : cut.top;
    if (dir * (far - cursor) <= 0 || dir * (near - end) >= 0) continue;
    if (dir * (near - cursor) >= 8) spans.push({ from: cursor, to: near });
    if (dir * (far - cursor) > 0) cursor = far;
  }
  if (dir * (end - cursor) >= 8) spans.push({ from: cursor, to: end });
  return spans;
}

/** 依畫面上的順序，把相鄰兩點連成一條往下的線。跳過中間的先學不在這裡畫。 */
export function routeWires(
  nodes: WireNode[],
  edges: WireEdge[],
  selectedId: string | null,
  options: WireOptions = {},
): { paths: WirePath[]; joints: WireJoint[] } {
  const avoid = options.avoid ?? [];
  const linked = new Map<string, WireEdge["kind"]>();
  for (const edge of edges) linked.set(`${edge.from}->${edge.to}`, edge.kind);
  const paths: WirePath[] = [];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    const from = nodes[index];
    const to = nodes[index + 1];
    const dir = to.y >= from.y ? 1 : -1;
    const start = from.y + dir * RADIUS;
    const end = to.y - dir * RADIUS;
    if (dir * (end - start) < 8) continue;
    const x = Math.round((from.x + to.x) / 2);
    const cuts = avoid
      .filter((box) => x >= box.left && x <= box.right && Math.max(start, end) > box.top && Math.min(start, end) < box.bottom)
      .map((box) => ({ top: box.top - 6, bottom: box.bottom + 6 }));
    const forward = linked.get(`${from.id}->${to.id}`);
    const backward = linked.get(`${to.id}->${from.id}`);
    const hasPre = forward === "pre" || backward === "pre";
    const hasExt = forward === "ext" || backward === "ext";
    const kind = hasExt && !hasPre ? "ext" : "pre";
    const tone = toneFor(from.id, to.id, selectedId);
    for (const span of openSpans(start, end, cuts)) {
      paths.push({
        d: `M ${x} ${Math.round(span.from)} V ${Math.round(span.to)}`,
        kind,
        tone,
        head: Math.abs(span.to - to.y) <= RADIUS + 2,
      });
    }
  }
  return { paths, joints: [] };
}
