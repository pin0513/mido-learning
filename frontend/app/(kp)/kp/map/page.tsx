import type { Metadata } from "next";
import { headers } from "next/headers";
import { CityMapView } from "@/components/kp/city/CityMapView";
import { LicenseNotice } from "@/components/kp/LicenseNotice";
import { buildCityMap, launchedCatalog, loadCatalog, presentCityMap } from "@/lib/content";
import { includeDraftKnowledgePoints } from "@/lib/kp/flags";

export const metadata: Metadata = {
  title: { absolute: "知識地圖" },
  description: "每個領域是一塊扇形，階段由內而外。點一個節點，看先備和延伸。",
  robots: { index: false, follow: false },
};

/**
 * 請求時才算（await headers()），跟 /kp 一樣讀執行時的學門旗標：
 * KP_SOFTSKILLS_ENABLED、KP_YUWEN_ENABLED 關著時，launchedCatalog 拿掉那個學門的點與主線，地圖就沒有那塊扇形。
 * 草稿照舊交給 presentCityMap：正式 build 只畫暗色節點，不帶標題、id 與網址。
 */
export default async function CityMapPage() {
  await headers();
  const map = presentCityMap(buildCityMap(launchedCatalog(loadCatalog())), includeDraftKnowledgePoints());
  return (
    <div className="paper wrap" style={{ paddingBlock: "48px" }}>
      <h1 className="head">知識地圖</h1>
      <p className="lead" style={{ marginTop: 16 }}>
        領域依層級順時針排，知識點越多扇形越大，階段由內而外。亮的節點已開放，暗的尚未接上，不顯示尚未發布的標題。
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
