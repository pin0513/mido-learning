"use client";

import Link from "next/link";
import { ColearnCard } from "@/components/kp/ColearnCard";
import { Estimator } from "@/components/kp/Estimator";
import { StageGlyph } from "@/components/kp/StageGlyph";
import type { OpenPathBrief } from "@/lib/kp/open-path";

const HOW = [
  {
    title: "環路是學習階段",
    body: "四條環路由內而外是國小、國中、高中、大學。孩子從內圈開始，大人可以走到外圈。同一個主題，每一環有自己讀得懂的版本。",
  },
  {
    title: "學區是學門",
    body: "城被切成四個學區：哲學、數學、專案管理與領導、資訊與 AI。沿著一個學區往外走，就是同一門學問一環一環長大。",
  },
  {
    title: "樓高是地基",
    body: "越多知識點把它當先備，建築就蓋得越高。尖頂是本質層，平頂是其他層。",
  },
  {
    title: "燈亮是走過",
    body: "橘點是孩子，白圈是大人。進度存在這台裝置，畫面標示範例資料。",
  },
];

export function HowSection() {
  return (
    <section className="sec paper" aria-labelledby="how">
      <div className="wrap">
        <h2 id="how" className="head">怎麼讀這座城</h2>
        <p className="how-lead">四件事。看懂了就知道自己在哪、下一站往哪走。</p>
        <div className="how-grid">
          {HOW.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
        <p className="how-more">
          <Link className="btn btn-ink" href="/kp/path/pm.estimate">看一條走完四環的主線</Link>
        </p>
      </div>
    </section>
  );
}

export function OpenPlate({ path }: { path: OpenPathBrief }) {
  return (
    <section className="sec board" aria-labelledby="show">
      <div className="wrap">
        <h2 id="show" className="head">這一輪開放：{path.title}</h2>
        <p className="path-lead">同一條主線，從國小走到大學，四站都已發布。先備若還沒發布，只記筆數、不寫標題。</p>
        <ol className="stops">
          {path.stops.map((stop, index) => (
            <li key={stop.id} className="stop">
              <StageGlyph stage={stop.stage} label={`${stop.stageName}環`} />
              <div>
                <p className="meta">{index + 1}. {stop.stageName}環</p>
                <h3>{stop.title}</h3>
                <p>{stop.idea}</p>
                {stop.question ? (
                  <p className="ask"><span>引導問題</span>{stop.question}</p>
                ) : null}
                <p className="rel">
                  先備：
                  {stop.prerequisites.length === 0 && stop.hiddenPrerequisites === 0 ? "沒有" : null}
                  {stop.prerequisites.map((item, itemIndex) => (
                    <span key={item.href}>
                      {itemIndex > 0 ? "、" : null}
                      <Link href={item.href}>{item.title}</Link>
                    </span>
                  ))}
                  {stop.hiddenPrerequisites > 0 ? (
                    <span>{stop.prerequisites.length > 0 ? "；" : null}另有 {stop.hiddenPrerequisites} 個尚未發布</span>
                  ) : null}
                </p>
                <p className="rel">
                  下一站：
                  {stop.next ? <Link href={stop.next.href}>{stop.next.title}</Link> : "這條主線的最後一站"}
                </p>
                <p className="stop-actions">
                  <Link className="btn btn-chalk btn-sm" href={stop.href}>讀這一站</Link>
                </p>
                {stop.id.startsWith("pm.estimate@") ? (
                  <div className="stop-tool">
                    <h4>三點估算</h4>
                    <Estimator />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        {path.colearn ? (
          <div className="path-colearn">
            <ColearnCard
              pathTitle={path.title}
              pathHref={path.href}
              colearn={path.colearn}
              questions={path.questions}
              scenario={path.scenario}
            />
          </div>
        ) : null}
        <p className="path-more">
          <Link className="btn btn-accent" href={path.href}>走整條主線</Link>
        </p>
      </div>
    </section>
  );
}

export function AboutInset() {
  return (
    <section className="sec paper" id="about" aria-labelledby="about-heading">
      <div className="wrap about-copy">
        <h2 id="about-heading" className="head">一位爸爸的學習實驗</h2>
        <p>Mido Learning 是 AI 教案、親子實驗，還有家庭計分板。知識城市把先備關係排成一座城：孩子看得到自己在哪一環，大人看得到兩個人是不是走在同一條路上。</p>
        <p>進度存在這台裝置，標示範例資料。授權仍是待定。</p>
        <p>
          <button type="button" className="btn btn-accent" onClick={() => window.dispatchEvent(new Event("mido-open-wish"))}>
            許一個學習願望
          </button>
        </p>
      </div>
    </section>
  );
}
