"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CityMapData } from "@/lib/content/city";

const HeroIllustration = dynamic(() => import("@/app/(public)/HeroIllustration"), { ssr: false });

const HOW = [
  {
    title: "環路是學習階段",
    body: "四條環路由內而外是國小、國中、高中、大學。孩子從內圈開始，大人可以走到外圈。同一個主題，每一環有自己讀得懂的版本。",
    image: "/kp/garden-city-diagram.webp",
    alt: "霍華德 1898 年的田園城市圖：同心圓環繞中央廣場",
    href: "/kp/path/pm.estimate",
    action: "看一條走完四環的主線",
  },
  {
    title: "學區是學門",
    body: "城被切成四個學區：哲學、數學、專案管理與領導、資訊與 AI。沿著一個學區往外走，就是同一門學問一環一環長大。",
    image: "/kp/diagram-no-2-howard-ebenezer-to-morrow.webp",
    alt: "霍華德的分區圖：城市被切成扇形的區",
  },
  {
    title: "樓高是地基",
    body: "越多知識點把它當先備，建築就蓋得越高。尖頂是本質層，平頂是其他層。",
    image: "/kp/gezicht-op-palmanova-vogelvluchtperspectief-1693.webp",
    alt: "1693 年帕爾馬諾瓦星形城鳥瞰圖",
  },
  {
    title: "燈亮是走過",
    body: "橘點是孩子，白圈是大人。進度存在這台裝置，畫面標示範例資料。",
    image: "/kp/plattegrond-van-de-vesting-palmanova.webp",
    alt: "帕爾馬諾瓦要塞城平面圖",
  },
];

export function HowSection() {
  const [open, setOpen] = useState(0);
  return (
    <section className="sec paper" aria-labelledby="how">
      <div className="wrap">
        <div className="intro2 rv">
          <h2 id="how" className="head">怎麼讀這座城</h2>
          <p>看懂四件事，就知道自己在哪、下一站往哪走。</p>
        </div>
        <div className="acc rv">
          {HOW.map((panel, index) => {
            const expanded = open === index;
            return (
              <div
                key={panel.title}
                className="pn"
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={() => setOpen(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setOpen(index);
                  }
                }}
              >
                <span className="sliver">{panel.title}</span>
                <div className="open">
                  <div className="txt">
                    <h3>{panel.title}</h3>
                    <p>{panel.body}</p>
                    {panel.href ? (
                      <Link className="btn btn-chalk btn-sm" href={panel.href} style={{ alignSelf: "flex-start" }}>
                        {panel.action}
                      </Link>
                    ) : null}
                    {index === 3 ? <p><span className="sample">範例資料</span></p> : null}
                  </div>
                  <div className="pic">
                    <img src={panel.image} alt={panel.alt} width={800} height={560} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="sketch-slot" aria-hidden="true">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}

export function OpenPlate({ data }: { data: CityMapData }) {
  const path = data.landmarks.find((item) => item.id === "pm.estimate");
  const stops = (path?.stops ?? [])
    .map((id) => data.buildings.find((building) => building.id === id))
    .filter((building): building is NonNullable<typeof building> => Boolean(building?.title));
  const photos = [
    ["/kp/plattegrond-van-de-vesting-palmanova.webp", "帕爾馬諾瓦要塞城平面圖，九角星形的同心城"],
    ["/kp/gezicht-op-palmanova-vogelvluchtperspectief-1693.webp", "帕爾馬諾瓦鳥瞰圖，1693 年"],
    ["/kp/garden-city-diagram.webp", "霍華德田園城市同心圓圖"],
  ];
  const [photo, setPhoto] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setPhoto((current) => (current + 1) % photos.length), 6000);
    return () => window.clearInterval(timer);
  }, [photos.length]);
  const [index, setIndex] = useState(Math.max(0, stops.findIndex((stop) => stop.stage === "sh")));
  const current = stops[index] ?? stops[0];
  if (!current) return null;
  return (
    <section className="board" aria-labelledby="show">
      <div className="plate">
        <div className="sq">
          <div className="sqin">
            {photos.map(([src, alt], photoIndex) => (
              <img
                key={src}
                className={photoIndex === photo ? "on drift" : undefined}
                src={src}
                alt={photoIndex === photo ? alt : ""}
                aria-hidden={photoIndex === photo ? undefined : true}
                width={1024}
                height={883}
              />
            ))}
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="43" fill="none" stroke="#ff5b22" strokeWidth="1.6" />
              <circle cx="50" cy="50" r="2.6" fill="#ff5b22" />
            </svg>
          </div>
        </div>
        <div className="side">
          <div className="rv">
            <h2 id="show" className="head">這一輪開放：拆解與估算</h2>
            <p className="muted-on-board" style={{ marginTop: 20 }}>同一個主題，從國小走到大學，每一環一站。</p>
          </div>
          <div className="tabs" role="tablist" aria-label="選一環">
            {stops.map((stop, stopIndex) => (
              <button key={stop.id} type="button" role="tab" aria-selected={stopIndex === index} onClick={() => setIndex(stopIndex)}>
                {stop.stageName}
              </button>
            ))}
          </div>
          <div role="tabpanel" style={{ marginTop: 32 }}>
            <h3>{current.title}</h3>
            <p className="desc">{current.idea}</p>
          </div>
          <div className="cells">
            <Link href={current.href}>讀這一站</Link>
            <Link href="/kp/path/pm.estimate">走整條主線</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AboutInset() {
  return (
    <section className="inset" id="about" aria-labelledby="about-heading">
      <div className="l rv">
        <h2 id="about-heading">一位爸爸的學習實驗</h2>
        <p className="lead">Mido Learning 是 AI 教案、親子實驗，還有家庭計分板。知識城市是這裡最新的一塊地。</p>
        <div className="shape">
          <img src="/kp/diagram-no-2-howard-ebenezer-to-morrow.webp" alt="霍華德分區圖局部" width={1920} height={1312} />
        </div>
      </div>
      <div className="r rv">
        <div>
          <h3>為什麼是一座城</h3>
          <p>知識點之間有先備關係，像房子要蓋在地基上。排成一座城，孩子看得到自己在哪一環，大人也看得到兩個人是不是走在同一條路上。</p>
        </div>
        <div>
          <h3>手繪還在紙上</h3>
          <p>黑板是城，紙色區塊留著手繪線稿。進度是這台裝置上的範例資料，授權仍是待定。</p>
        </div>
        <p>
          <button type="button" className="btn btn-accent" onClick={() => window.dispatchEvent(new Event("mido-open-wish"))}>
            許一個學習願望
          </button>
        </p>
      </div>
    </section>
  );
}
