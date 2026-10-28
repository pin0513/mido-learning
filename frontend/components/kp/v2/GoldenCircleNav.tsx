import type { KnowledgePoint } from "@/lib/content";
import type { Circle } from "@/lib/kp/circle";

const LABEL = { why: "為什麼學", how: "怎麼學", what: "學什麼" } as const;

function blurb(circle: Circle, point: KnowledgePoint): string {
  if (circle.converted) return circle.heading;
  if (circle.kind === "why") return point.guidingQuestions[0] ?? "內容補強中";
  if (circle.kind === "how") {
    if (!point.scenario) return "內容補強中";
    const parts = point.scenario.split("：");
    if (parts.length >= 2 && parts[0] && parts[1]) return `${parts[0]}：${parts[1]}`;
    return point.scenario;
  }
  const formats = circle.blocks.find((block) => block.kind === "formats");
  if (formats && formats.kind === "formats" && formats.items[0]) return formats.items[0].label;
  return "內容補強中";
}

export function GoldenCircleNav({ circles, point }: { circles: Circle[]; point: KnowledgePoint }) {
  return (
    <nav className="v2-gc" aria-label="黃金圈：本頁段落">
      <svg viewBox="0 0 200 200">
        <a href="#what" aria-label="What，學什麼">
          <circle cx="100" cy="100" r="97" fill="#ffe9df" stroke="#ffd2bd" strokeWidth="2" />
          <text x="100" y="29" textAnchor="middle" fontSize="19" fontWeight="800" fill="#1a1614">What</text>
        </a>
        <a href="#how" aria-label="How，怎麼學">
          <circle cx="100" cy="100" r="67" fill="#ffd2bd" />
          <text x="100" y="58" textAnchor="middle" fontSize="19" fontWeight="800" fill="#1a1614">How</text>
        </a>
        <a href="#why" aria-label="Why，為什麼學">
          <circle cx="100" cy="100" r="37" fill="#ff5b22" />
          <text x="100" y="107" textAnchor="middle" fontSize="20" fontWeight="800" fill="#1a1614">Why</text>
        </a>
      </svg>
      <ol>
        {circles.map((circle) => (
          <li key={circle.kind}>
            <a className="v2-hit" href={`#${circle.kind}`}>
              <span className={`v2-tag v2-tag-${circle.kind}`}>{circle.kind === "why" ? "Why" : circle.kind === "how" ? "How" : "What"}</span>
              <span>
                <strong>{LABEL[circle.kind]}</strong>
                <small>{blurb(circle, point)}</small>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
