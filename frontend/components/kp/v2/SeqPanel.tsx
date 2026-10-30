import type { ContentCatalog, KnowledgePoint } from "@/lib/content";
import { PointLinks } from "./PointLinks";

export function SeqPanel({
  point,
  all,
  visible,
}: {
  point: KnowledgePoint;
  all: ContentCatalog;
  visible: ContentCatalog;
}) {
  const nextIds = all.indexes.requiredBy.get(point.id) ?? [];
  return (
    <section>
      <h2>學習順序</h2>
      <div className="v2-seq">
        <PointLinks label="先學" ids={point.prerequisites} all={all} visible={visible} currentFolder={point.folder} empty="沒有，這是起點。" />
        <PointLinks label="後學" ids={nextIds} all={all} visible={visible} currentFolder={point.folder} empty="還沒有往下接的知識點。" />
      </div>
    </section>
  );
}
