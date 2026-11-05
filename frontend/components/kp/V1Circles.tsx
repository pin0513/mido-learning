import type { ContentCatalog, KnowledgePoint } from "@/lib/content";
import { v1Circles } from "@/lib/kp/v1-circles";
import { CircleSection } from "./v2/CircleSection";
import { pointRefs } from "./v2/refs";
import "./v2/detail.css";

export function V1Circles({ point, all, visible }: { point: KnowledgePoint; all: ContentCatalog; visible: ContentCatalog }) {
  const circles = v1Circles(point, visible);
  if (circles.length === 0) return null;
  const refs = pointRefs(all, visible, point.folder);
  return (
    <div className="kp-detail kp-detail-embed" data-testid="kp-v1-circles">
      {circles.map((circle) => (
        <CircleSection key={circle.kind} circle={circle} point={point} all={all} visible={visible} refs={refs} />
      ))}
    </div>
  );
}
