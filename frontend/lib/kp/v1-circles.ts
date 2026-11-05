import type { ContentCatalog, KnowledgePoint } from "@/lib/content";
import { buildCircles, type Block, type Circle } from "./circle";

/**
 * V1 頁顯示內容裡已有的結構化三圈（why／how／what），用 V2 的同一套區塊、同樣的段名。
 * 只畫已轉換的圈（YAML 有那一圈），沒寫的圈不補。
 * V1 頁別處已經有情境、家長檢核、AI 分工，這裡不再重複；情境只在帶活動圖時留下圖。
 */
export function v1Circles(point: KnowledgePoint, visible: ContentCatalog): Circle[] {
  return buildCircles(point, visible)
    .circles.filter((circle) => circle.converted)
    .map((circle) => ({
      ...circle,
      blocks: circle.blocks.flatMap((block): Block[] => {
        if (block.kind === "review" || block.kind === "ai") return [];
        if (block.kind !== "scenario") return [block];
        if (!block.figureId) return [];
        const figureOnly: Block = { kind: "scenario", figureId: block.figureId };
        if (block.caption) figureOnly.caption = block.caption;
        return [figureOnly];
      }),
    }))
    .filter((circle) => circle.blocks.length > 0);
}
