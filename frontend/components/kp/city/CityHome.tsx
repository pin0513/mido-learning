"use client";

import { useEffect } from "react";
import Link from "next/link";
import { recordPageView } from "@/lib/api/analytics";
import type { CityMapData } from "@/lib/content/city";
import { KpFrame } from "@/components/kp/shell/KpFrame";
import { CityMapView } from "./CityMapView";
import { AboutInset, HowSection, OpenPlate } from "./CitySections";
import { SlideMenu } from "./SlideMenu";

/** 旗標打開時的首頁。投影片區併進這一頁，不重複記一次 page view。 */
export function CityHome({ data }: { data: CityMapData }) {
  useEffect(() => {
    recordPageView();
  }, []);

  return (
    <KpFrame>
      <section className="hero" aria-labelledby="city-hero">
        <div className="card">
          <div className="stageband" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="card-body rv">
            <h1 id="city-hero">全家一起走的學習城市</h1>
            <p>給親子一起讀的知識地圖。孩子走國小環，大人走自己的那一環。</p>
            <Link className="btn btn-accent" href="/?s=es">帶孩子從國小環出發</Link>
          </div>
          <div className="card-foot">
            <nav className="textlinks" aria-label="其他看法">
              <Link href="/?view=system">看分層分段總圖</Link>
              <Link href="/?view=list">看清單</Link>
              <Link href="/#slides">投影片教材</Link>
            </nav>
          </div>
        </div>
        <div className="citypanel board-2">
          <CityMapView data={data} rememberView />
        </div>
      </section>
      <HowSection />
      <OpenPlate data={data} />
      <SlideMenu />
      <AboutInset />
    </KpFrame>
  );
}
