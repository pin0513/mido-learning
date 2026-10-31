import Link from "next/link";
import type { ReactElement } from "react";
import type { ContentCatalog, KnowledgePoint } from "@/lib/content";
import { knowledgePointPath } from "@/lib/kp/routes";
import { hiddenDraftCount, shownPoint } from "./refs";

export function PointLinks({
  ids,
  all,
  visible,
  currentFolder,
  empty,
  label,
}: {
  ids: string[];
  all: ContentCatalog;
  visible: ContentCatalog;
  /** 目前頁面的學門。同學門的點一律連（shownPoint），即使那個學門的旗標在 build 時關掉，例如軟實力頁連軟實力點。 */
  currentFolder: string;
  empty: string;
  /** 清單的標題（例如 SeqPanel 的「先學」「後學」）。和清單一起畫；清單不畫時標題也不畫，不留孤零零的標題。 */
  label?: string;
}) {
  const known = ids
    .map((id) => all.indexes.byId.get(id))
    .filter((item): item is KnowledgePoint => Boolean(item));
  const links = known.filter((item) => shownPoint(item, currentFolder, visible));
  // 只有真的草稿（status 不是 published）才算「尚未發布」。已發布但學門旗標在 build 時關掉的點
  // 不連、也不計數，否則會把已上線的點寫成尚未發布（docs/kp-db-restructure.md 第 17.1 節問題 2）。
  const hidden = hiddenDraftCount(known, links);
  let list: ReactElement | null;
  if (links.length === 0 && hidden === 0) {
    // 清單本來就空才寫 empty（「沒有，這是起點。」）。清單裡只有旗標擋掉的已發布點時，那句話不對，不畫清單；
    // 有 label 時標題也一起不畫，不留孤零零的「先學」「後學」。
    list = empty && known.length === 0 ? <p className="v2-none">{empty}</p> : null;
  } else {
    list = (
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
  if (list === null || !label) return list;
  // 標題和清單是 fragment 裡的兩個兄弟節點，不包一層容器：它們直接當 SeqPanel 的 .v2-seq（單欄 grid，detail.css）的子元素，
  // 靠那個扁平的 grid 排版與 gap。要包容器或改 .v2-seq 的版型時，兩邊要一起改。
  return (
    <>
      <span className="v2-lbl">{label}</span>
      {list}
    </>
  );
}
