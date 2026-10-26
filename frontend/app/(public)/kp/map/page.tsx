import type { Metadata } from "next";
import { CityMapView } from "@/components/kp/city/CityMapView";
import { LicenseNotice } from "@/components/kp/LicenseNotice";
import { buildCityMap, loadCatalog, visibleCatalog } from "@/lib/content";

export const metadata: Metadata = {
  title: { absolute: "學習城市地圖" },
  description: "從家庭廣場往外走，環路是國小到大學，學區依層級排開。點一棟建築進入知識點。",
  robots: { index: false, follow: false },
};

export default function CityMapPage() {
  const map = buildCityMap(visibleCatalog(loadCatalog()));
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">學習城市</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#3d3830]">
        這張圖疊在層級總圖上面：環路是階段，學區依層級順時針排，屋頂形狀是層級。層級表和學門、階段、核心素養的入口仍在知識地圖。
      </p>
      <div className="mt-6">
        <CityMapView data={map} />
      </div>
      <div className="mt-8">
        <LicenseNotice />
      </div>
    </div>
  );
}
