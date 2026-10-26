"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function Mark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="currentColor" />
      <circle cx="20" cy="20" r="14.5" fill="var(--board-3)" />
      <circle cx="20" cy="20" r="9.5" fill="currentColor" />
      <circle cx="20" cy="20" r="4.5" fill="var(--accent)" />
    </svg>
  );
}

export function KpFrame({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const root = document.querySelector(".kp-root");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = [...root.querySelectorAll(".rv")];
    const seen = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        seen.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    nodes.forEach((node, index) => {
      (node as HTMLElement).style.setProperty("--d", `${Math.min(index, 8) * 80}ms`);
      seen.observe(node);
    });
    root.classList.add("js");
    const timer = window.setTimeout(() => nodes.forEach((node) => node.classList.add("in")), 2600);
    return () => {
      seen.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const links = [
    { href: "/", label: "知識城市" },
    { href: "/#slides", label: "投影片教材" },
    { href: "/#about", label: "關於" },
    { href: "/kp", label: "知識地圖" },
  ];

  return (
    <>
      <a className="skip" href="#main">跳到主要內容</a>
      <header className="topbar">
        <div className="in wrap">
          <Link className="wordmark" href="/">
            <Mark />
            Mido Learning
          </Link>
          <nav className="nav" aria-label="主要">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>{link.label}</Link>
            ))}
          </nav>
          <Link className="btn btn-quiet btn-sm" href="/login">登入</Link>
          <Link className="btn btn-accent btn-sm" href="/register">註冊</Link>
          <details className="nav-drawer" open={open} onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}>
            <summary className="btn btn-quiet btn-sm menu-btn">選單</summary>
            <nav className="nav" aria-label="選單">
              {links.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>
              ))}
              <Link href="/login" onClick={() => setOpen(false)}>登入</Link>
              <Link href="/register" onClick={() => setOpen(false)}>註冊</Link>
            </nav>
          </details>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="foot board">
        <div className="bigmark" aria-hidden="true">
          <Mark />
          <span className="wm">Mido<br />Learning</span>
        </div>
        <div className="fcols">
          <div>
            <h2>知識城市</h2>
            <ul>
              <li><Link href="/kp/map">城市地圖</Link></li>
              <li><Link href="/kp/map?view=system">分層分段總圖</Link></li>
              <li><Link href="/kp/map?view=list">清單</Link></li>
              <li><Link href="/kp/path/pm.estimate">主線：拆解與估算</Link></li>
            </ul>
          </div>
          <div>
            <h2>教材</h2>
            <ul>
              <li><Link href="/#slides">知識學習（大人學）</Link></li>
              <li><Link href="/categories/kid">小人學</Link></li>
              <li><Link href="/categories/game">遊戲</Link></li>
            </ul>
          </div>
          <div>
            <h2>家庭</h2>
            <ul>
              <li><Link href="/family-scoreboard">家庭計分板</Link></li>
              <li><Link href="/family-scoreboard">任務系統</Link></li>
              <li><Link href="/family-scoreboard">零用金管理</Link></li>
            </ul>
          </div>
          <div>
            <h2>關於</h2>
            <ul>
              <li><Link href="/#about">這個網站</Link></li>
              <li><Link href="/kp">授權（待定）</Link></li>
              <li><Link href="/kp">知識地圖</Link></li>
            </ul>
          </div>
          <div className="contact">
            <h2>想學什麼？</h2>
            <p>把願望告訴 Wish Bot。下一輪蓋哪一棟，可能就是你決定的。</p>
            <p style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-accent" onClick={() => window.dispatchEvent(new Event("mido-open-wish"))}>
                許一個學習願望
              </button>
            </p>
          </div>
        </div>
        <div className="flast">
          <span>© {new Date().getFullYear()} Mido Learning</span>
          <a className="btn btn-quiet btn-sm" href="#main">回到頂端</a>
        </div>
        <p className="credits">
          圖片：
          <a href="https://commons.wikimedia.org/wiki/File:Garden_City_diagram.jpg">“Garden City diagram”</a>
          ，Ebenezer Howard（1898），
          <a href="https://creativecommons.org/publicdomain/mark/1.0/">公眾領域</a>
          ，Wikimedia Commons；
          <a href="https://commons.wikimedia.org/wiki/File:Diagram_No.2_(Howard,_Ebenezer,_To-morrow.).jpg">“Diagram No.2 (Howard, Ebenezer, To-morrow.)”</a>
          ，Ebenezer Howard，
          <a href="https://creativecommons.org/publicdomain/mark/1.0/">公眾領域</a>
          ，Wikimedia Commons；
          <a href="https://www.rawpixel.com/image/13775160/image-paper-cartoon-art">“Plattegrond van de vesting Palmanova”</a>
          ，Rijksmuseum，
          <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>
          ，rawpixel；
          <a href="https://www.rawpixel.com/image/13768142/image-paper-face-person">“Gezicht op Palmanova vogelvluchtperspectief (1693)”</a>
          ，Rijksmuseum，
          <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>
          ，rawpixel。
        </p>
      </footer>
    </>
  );
}
