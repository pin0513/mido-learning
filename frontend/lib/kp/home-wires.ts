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

const RADIUS = 16;

function toneFor(edge: WireEdge, selectedId: string | null): WireTone {
  if (!selectedId) return "norm";
  return edge.from === selectedId || edge.to === selectedId ? "hi" : "dim";
}

/** 兩點之間的直線會不會穿過別的圓點。穿過就改走左側直角。 */
function blocked(nodes: WireNode[], x: number, y1: number, y2: number, skip: Set<string>): boolean {
  const top = Math.min(y1, y2) + RADIUS;
  const bot = Math.max(y1, y2) - RADIUS;
  if (bot - top < 4) return false;
  return nodes.some((node) => !skip.has(node.id) && Math.abs(node.x - x) < 12 && node.y > top && node.y < bot);
}

export function routeWires(nodes: WireNode[], edges: WireEdge[], selectedId: string | null): { paths: WirePath[]; joints: WireJoint[] } {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const paths: WirePath[] = [];
  const joints: WireJoint[] = [];
  const channels: { top: number; bot: number; x: number }[] = [];
  let slot = 0;
  const left = nodes.reduce((min, node) => Math.min(min, node.x), Number.POSITIVE_INFINITY);

  const takeChannel = (y1: number, y2: number) => {
    const top = Math.min(y1, y2);
    const bot = Math.max(y1, y2);
    const free = channels.find((channel) => channel.bot < top - 8 || channel.top > bot + 8);
    if (free) {
      free.top = Math.min(free.top, top);
      free.bot = Math.max(free.bot, bot);
      return free.x;
    }
    const x = Math.max(10, left - 48 - slot * 18);
    slot += 1;
    channels.push({ top, bot, x });
    return x;
  };

  for (const edge of edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    const tone = toneFor(edge, selectedId);
    const sameColumn = Math.abs(from.x - to.x) < 8;
    const skip = new Set([from.id, to.id]);
    if (sameColumn && !blocked(nodes, from.x, from.y, to.y, skip)) {
      const dir = to.y >= from.y ? 1 : -1;
      const y0 = from.y + dir * RADIUS;
      const y1 = to.y - dir * RADIUS;
      paths.push({ d: `M ${from.x} ${y0} V ${y1}`, kind: edge.kind, tone });
      continue;
    }
    const channel = takeChannel(from.y, to.y);
    const x0 = from.x - RADIUS;
    const x1 = to.x - RADIUS;
    paths.push({
      d: `M ${x0} ${from.y} H ${channel} V ${to.y} H ${x1}`,
      kind: edge.kind,
      tone,
    });
    joints.push({ x: channel, y: from.y, tone }, { x: channel, y: to.y, tone });
  }

  return { paths, joints };
}
