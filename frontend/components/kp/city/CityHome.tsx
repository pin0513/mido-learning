"use client";

import { useEffect } from "react";
import LegacyHome from "@/app/(public)/LegacyHome";
import { recordPageView } from "@/lib/api/analytics";
import type { CityMapData } from "@/lib/content/city";
import { CityMapView } from "./CityMapView";

/** 旗標打開時的首頁。投影片區沿用 LegacyHome，不重複記一次 page view。 */
export function CityHome({ data }: { data: CityMapData }) {
  useEffect(() => {
    recordPageView();
  }, []);

  return (
    <div style={{ background: "#faf9f7" }}>
      <section className="border-b border-[#e5e3de]" style={{ background: "#faf9f7" }}>
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3d3830]">Mido Learning</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight text-[#1a1614] sm:text-5xl">從家庭廣場出發</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#3d3830]">
            環路從國小走到大學，學區依層級排開。點一棟建築，進入那個知識點。地圖、層級總圖與清單可以互換，下面仍是原來的知識學習、小人學與遊戲。
          </p>
        </div>
      </section>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
        <CityMapView data={data} rememberView showStart />
      </div>
      <LegacyHome catalogOnly />
    </div>
  );
}
