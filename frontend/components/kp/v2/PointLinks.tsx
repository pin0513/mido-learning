import Link from "next/link";
import type { ContentCatalog, KnowledgePoint } from "@/lib/content";
import { knowledgePointPath } from "@/lib/kp/routes";
import { shownPoint } from "./refs";

export function PointLinks({
  ids,
  all,
  visible,
  currentFolder,
  empty,
}: {
  ids: string[];
  all: ContentCatalog;
  visible: ContentCatalog;
  currentFolder: string;
  empty: string;
}) {
  const known = ids
    .map((id) => all.indexes.byId.get(id))
    .filter((item): item is KnowledgePoint => Boolean(item));
  const links = known.filter((item) => shownPoint(item, currentFolder, visible));
  const hidden = known.length - links.length;
  if (links.length === 0 && hidden === 0) return empty ? <p className="v2-none">{empty}</p> : null;
  return (
    <div className="v2-seq-list">
      {links.map((item) => (
        <Link key={item.id} className="v2-hit v2-seq-link" href={knowledgePointPath(item.concept, item.stage)}>
          {item.title}
        </Link>
      ))}
      {hidden > 0 ? <p className="v2-none">另有 {hidden} 個尚未發布</p> : null}
    </div>
  );
}
