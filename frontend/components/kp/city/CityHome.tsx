"use client";

import { useEffect } from "react";
import Link from "next/link";
import { recordPageView } from "@/lib/api/analytics";
import type { CityMapData } from "@/lib/content/city";
import { KpFrame } from "@/components/kp/shell/KpFrame";
import { CityMapView } from "./CityMapView";
import type { OpenPathBrief } from "@/lib/kp/open-path";
import { AboutInset, HowSection, OpenPlate } from "./CitySections";
import { SlideMenu } from "./SlideMenu";

/** 旗標打開時的首頁。投影片區併進這一頁，不重複記一次 page view。 */
export function CityHome({ data, path }: { data: CityMapData; path: OpenPathBrief | null }) {
  useEffect(() => {
    recordPageView();
  }, []);

  return (
    <KpFrame>
      <section className="hero" aria-labelledby="city-hero">
        <div className="card">
          <div className="card-body rv">
            <h1 id="city-hero">全家一起走的知識地圖</h1>
            <p>先看層級和階段怎麼排。孩子走國小環，大人走自己的那一環。</p>
            <figure className="explain-fig">
              <img
                src="/kp/garden-city-diagram.webp"
                alt="Ebenezer Howard 1898 年的同心圓圖：由內而外四條環路，用來說明學習階段"
                width={336}
                height={247}
              />
              <figcaption>
                圖：
                <a href="https://commons.wikimedia.org/wiki/File:Garden_City_diagram.jpg">Ebenezer Howard，1898</a>
                ，
                <a href="https://creativecommons.org/publicdomain/mark/1.0/">公眾領域</a>
                ，Wikimedia Commons。
              </figcaption>
            </figure>
            <Link className="btn btn-accent" href="/?view=system">看分層分段總圖</Link>
          </div>
          <div className="card-foot">
            <nav className="textlinks" aria-label="其他看法">
              <Link href="/?view=map&s=es">帶孩子從國小環出發</Link>
              <Link href="/?view=list">看清單</Link>
              <Link href="/#slides">投影片教材</Link>
            </nav>
          </div>
        </div>
        <div className="citypanel board-2">
          <CityMapView data={data} defaultView="system" tabOrder={["system", "map", "list"]} mapParam="map" />
        </div>
      </section>
      <HowSection />
      {path ? <OpenPlate path={path} /> : null}
      <SlideMenu />
      <AboutInset />
    </KpFrame>
  );
}
