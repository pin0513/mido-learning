import { loadCatalog, visibleCatalog } from "@/lib/content";
import { knowledgePointUrl } from "@/lib/kp/routes";

export const dynamic = "force-static";

/** 給之後的家庭看板用。內容跟這次 build 看得到的知識點相同，沒有寫入。 */
export function GET() {
  const points = [...visibleCatalog(loadCatalog()).points].sort((a, b) => a.id.localeCompare(b.id));
  return Response.json(
    points.map((point) => ({
      id: point.id,
      title: point.title,
      stage: point.stage,
      layer: point.layer,
      url: knowledgePointUrl(point.concept, point.stage),
    })),
  );
}
