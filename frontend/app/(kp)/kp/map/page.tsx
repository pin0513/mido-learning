import type { Metadata } from "next";
import { CityMapView } from "@/components/kp/city/CityMapView";
import { LicenseNotice } from "@/components/kp/LicenseNotice";
import { buildCityMap, loadCatalog, presentCityMap } from "@/lib/content";
import { includeDraftKnowledgePoints } from "@/lib/kp/flags";

export const metadata: Metadata = {
  title: { absolute: "知識地圖" },
  description: "四個領域是空間，階段由內而外。點一個節點，看先備和延伸。",
  robots: { index: false, follow: false },
};

export default function CityMapPage() {
  const map = presentCityMap(buildCityMap(loadCatalog()), includeDraftKnowledgePoints());
  return (
    <div className="paper wrap" style={{ paddingBlock: "48px" }}>
      <h1 className="head">知識地圖</h1>
      <p className="lead" style={{ marginTop: 16 }}>
        領域依層級順時針排，階段由內而外。亮的節點已開放，暗的尚未接上，不顯示尚未發布的標題。
      </p>
      <div style={{ marginTop: 28 }}>
        <CityMapView data={map} />
      </div>
      <div style={{ marginTop: 32 }}>
        <LicenseNotice />
      </div>
    </div>
  );
}
