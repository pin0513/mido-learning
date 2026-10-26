import type { Metadata } from "next";
import { CityMapView } from "@/components/kp/city/CityMapView";
import { LicenseNotice } from "@/components/kp/LicenseNotice";
import { buildCityMap, loadCatalog, presentCityMap } from "@/lib/content";

export const metadata: Metadata = {
  title: { absolute: "學習城市地圖" },
  description: "從家庭廣場往外走，環路是國小到大學，學區依層級排開。點一棟建築進入知識點。",
  robots: { index: false, follow: false },
};

export default function CityMapPage() {
  const map = presentCityMap(buildCityMap(loadCatalog()));
  return (
    <div className="paper wrap" style={{ paddingBlock: "48px" }}>
      <h1 className="head">學習城市</h1>
      <p className="lead" style={{ marginTop: 16 }}>
        環路是國小到大學，學區依層級順時針排。亮的建築已開放，暗的是施工中，不顯示尚未發布的標題。
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
