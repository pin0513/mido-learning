import type { Metadata } from "next";
import { CityHome } from "@/components/kp/city/CityHome";
import { buildCityMap, loadCatalog, visibleCatalog } from "@/lib/content";

export const metadata: Metadata = {
  title: { absolute: "Mido Learning｜學習城市" },
  description: "從家庭廣場出發，沿著國小到大學的環路走進知識點。也可以改看層級總圖或清單。",
  alternates: { canonical: "https://learn.paulfun.net/" },
  openGraph: {
    title: "Mido Learning｜學習城市",
    description: "從家庭廣場出發，沿著國小到大學的環路走進知識點。",
    url: "https://learn.paulfun.net/",
  },
};

/** 靜態頁。要不要拿來當首頁由 middleware 的 KP_HOME_ENABLED 決定，不在這裡讀旗標。 */
export default function CityHomePage() {
  const map = buildCityMap(visibleCatalog(loadCatalog()));
  return <CityHome data={map} />;
}
