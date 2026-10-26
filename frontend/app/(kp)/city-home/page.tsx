import type { Metadata } from "next";
import { CityHome } from "@/components/kp/city/CityHome";
import { buildCityMap, loadCatalog, presentCityMap } from "@/lib/content";
import { publishedEstimatePath } from "@/lib/kp/open-path";
import { includeDraftKnowledgePoints } from "@/lib/kp/flags";
import { KP_SITE_ORIGIN } from "@/lib/kp/routes";

export const metadata: Metadata = {
  title: { absolute: "Mido Learning｜知識地圖" },
  description: "先看層級和階段。沿著國小到大學的環路走進知識點，也可以改看清單。",
  alternates: { canonical: `${KP_SITE_ORIGIN}/` },
  openGraph: {
    title: "Mido Learning｜知識地圖",
    description: "先看層級和階段。沿著國小到大學的環路走進知識點。",
    url: `${KP_SITE_ORIGIN}/`,
  },
};

/** 靜態頁。要不要拿來當首頁由 middleware 的 KP_HOME_ENABLED 決定，不在這裡讀旗標。 */
export default function CityHomePage() {
  const catalog = loadCatalog();
  const map = presentCityMap(buildCityMap(catalog), includeDraftKnowledgePoints());
  return <CityHome data={map} path={publishedEstimatePath(catalog)} />;
}
