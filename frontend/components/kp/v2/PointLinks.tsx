import Link from "next/link";
import type { ContentCatalog, KnowledgePoint } from "@/lib/content";
import { knowledgePointPath } from "@/lib/kp/routes";
import { hiddenDraftCount, shownPoint } from "./refs";

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
  // 只有真的草稿（status 不是 published）才算「尚未發布」。已發布但學門旗標在 build 時關掉的點
  // 不連、也不計數，否則會把已上線的點寫成尚未發布（docs/kp-db-restructure.md 第 17.1 節問題 2）。
  const hidden = hiddenDraftCount(known, links);
  if (links.length === 0 && hidden === 0) {
    // 清單本來就空才寫 empty（「沒有，這是起點。」）。清單裡只有旗標擋掉的已發布點時，那句話不對，整段不畫。
    return empty && known.length === 0 ? <p className="v2-none">{empty}</p> : null;
  }
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
