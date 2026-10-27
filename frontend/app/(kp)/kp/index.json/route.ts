import { launchedCatalog, loadCatalog, visibleCatalog } from "@/lib/content";
import { knowledgePointUrl } from "@/lib/kp/routes";

export const dynamic = "force-dynamic";

/** 給之後的家庭看板用。旗標關掉時不列溝通與解決問題，所以每次請求重算。 */
export function GET() {
  const points = [...launchedCatalog(visibleCatalog(loadCatalog())).points].sort((a, b) => a.id.localeCompare(b.id));
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
