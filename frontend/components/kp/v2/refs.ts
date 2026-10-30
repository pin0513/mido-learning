import { isFolderLaunched, type ContentCatalog } from "@/lib/content/catalog";
import type { KnowledgePoint } from "@/lib/content/types";
import { conceptPath, knowledgePointPath } from "@/lib/kp/routes";
import type { PointRef } from "./text";

/** 可見而且學門已上線（或就是目前這個學門）才連出去。草稿與未上線學門不給連結。 */
export function shownPoint(point: KnowledgePoint, currentFolder: string, visible: ContentCatalog): boolean {
  if (!visible.indexes.byId.has(point.id)) return false;
  return isFolderLaunched(point.folder) || point.folder === currentFolder;
}

/**
 * 「另有 N 個尚未發布」的 N：沒連出去的點裡，status 不是 published 的筆數。
 * 已發布、只因學門旗標沒上線而不連的點不算（它們已經上線，不是「尚未發布」），整筆不出現。
 */
export function hiddenDraftCount(known: KnowledgePoint[], shown: KnowledgePoint[]): number {
  const shownIds = new Set(shown.map((point) => point.id));
  return known.filter((point) => !shownIds.has(point.id) && point.status !== "published").length;
}

/**
 * 內文裡寫到的知識點 id 對到標題與連結。concept@stage 指定階段；只寫 concept 時，
 * 一個階段就連那一頁，多個階段連 concept 總覽頁。沒有可連的頁面時只顯示標題。
 */
export function pointRefs(all: ContentCatalog, visible: ContentCatalog, currentFolder: string): Map<string, PointRef> {
  const refs = new Map<string, PointRef>();
  const byConcept = new Map<string, typeof all.points>();
  for (const point of all.points) {
    const shown = shownPoint(point, currentFolder, visible);
    refs.set(point.id, shown ? { title: point.title, href: knowledgePointPath(point.concept, point.stage) } : { title: point.title });
    const list = byConcept.get(point.concept) ?? [];
    list.push(point);
    byConcept.set(point.concept, list);
  }
  for (const [concept, points] of byConcept) {
    const shown = points.filter((point) => shownPoint(point, currentFolder, visible));
    const first = shown[0] ?? points[0];
    if (shown.length === 1) refs.set(concept, { title: first.title, href: knowledgePointPath(first.concept, first.stage) });
    else if (shown.length > 1) refs.set(concept, { title: first.title, href: conceptPath(concept) });
    else refs.set(concept, { title: first.title });
  }
  return refs;
}
