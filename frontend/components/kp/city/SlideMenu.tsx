"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPublicComponents } from "@/lib/api/components";
import { stripEmoji } from "@/lib/kp/text";
import type { LearningComponent } from "@/types/component";

const KNOWLEDGE_CATEGORIES = ["adult", "Programming", "Language", "Science", "Art", "商業思維", "運動"];

function Group({
  testId,
  title,
  href,
  items,
}: {
  testId: string;
  title: string;
  href: string;
  items: LearningComponent[];
}) {
  return (
    <section data-testid={testId}>
      <div className="menu-cat">
        <h3>{title}</h3>
        <Link href={href}>查看全部 {items.length} 份</Link>
      </div>
      <ul className="menu rv">
        {items.length === 0 ? (
          <li>
            <div>
              <p className="nm">教材庫暫時沒有回應</p>
              <p className="ds">稍後再看，或直接前往教材庫。</p>
            </div>
          </li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <div>
                <p className="nm">
                  <Link href={`/materials/${item.id}`}>{stripEmoji(item.title)}</Link>
                  {item.subject ? <span>{item.subject}</span> : null}
                </p>
                {item.description ? <p className="ds">{stripEmoji(item.description)}</p> : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

/** 舊首頁的三組教材，只在城市首頁用文字列呈現，不放縮圖。 */
export function SlideMenu() {
  const [knowledge, setKnowledge] = useState<LearningComponent[]>([]);
  const [kid, setKid] = useState<LearningComponent[]>([]);
  const [game, setGame] = useState<LearningComponent[]>([]);

  useEffect(() => {
    getPublicComponents({ limit: 100, sortBy: "createdAt", sortOrder: "desc" })
      .then((res) => {
        const all = res.components || [];
        setKnowledge(all.filter((item) => KNOWLEDGE_CATEGORIES.includes(item.category)).slice(0, 4));
        setKid(all.filter((item) => item.category === "kid").slice(0, 4));
        setGame(all.filter((item) => item.category === "game").slice(0, 4));
      })
      .catch(() => {
        setKnowledge([]);
        setKid([]);
        setGame([]);
      });
  }, []);

  return (
    <section className="sec paper" id="slides" aria-labelledby="slides-heading">
      <div className="wrap">
        <div className="intro2 rv">
          <h2 id="slides-heading" className="head">投影片教材也在城裡</h2>
          <p>原本的投影片教材照舊開放。一份一份會接到對應的知識點，這一頁先不放縮圖。</p>
        </div>
        <Group testId="section-knowledge" title="知識學習（大人學）" href="/materials" items={knowledge} />
        <Group testId="section-kid" title="小人學" href="/categories/kid" items={kid} />
        <Group testId="section-game" title="遊戲" href="/categories/game" items={game} />
      </div>
    </section>
  );
}
