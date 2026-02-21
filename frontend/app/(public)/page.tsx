'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { ComponentList } from '@/components/learning';
import { LearningComponent } from '@/types/component';
import { getPublicComponents } from '@/lib/api/components';
import { recordPageView } from '@/lib/api/analytics';

const HeroIllustration = dynamic(() => import('./HeroIllustration'), { ssr: false });

const KNOWLEDGE_CATEGORIES = ['adult', 'Programming', 'Language', 'Science', 'Art', '商業思維', '運動'];

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [knowledgeComponents, setKnowledgeComponents] = useState<LearningComponent[]>([]);
  const [kidComponents, setKidComponents] = useState<LearningComponent[]>([]);
  const [gameComponents, setGameComponents] = useState<LearningComponent[]>([]);
  const [loading, setLoading] = useState(true);

  // Record page view on mount
  useEffect(() => {
    recordPageView();
  }, []);

  useEffect(() => {
    getPublicComponents({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .then((res) => {
        const all = res.components || [];
        setKnowledgeComponents(all.filter((c) => KNOWLEDGE_CATEGORIES.includes(c.category)).slice(0, 4));
        setKidComponents(all.filter((c) => c.category === 'kid').slice(0, 4));
        setGameComponents(all.filter((c) => c.category === 'game').slice(0, 4));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: '#faf9f7' }}>
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden" style={{ background: '#faf9f7', minHeight: '520px', borderBottom: '1.5px solid #e5e3de' }}>

        {/* ── Notebook dot-grid background texture ── */}
        <svg className="pointer-events-none absolute inset-0 w-full h-full" aria-hidden="true" style={{ opacity: 0.35 }}>
          <defs>
            <pattern id="dotGrid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#b0aaa0" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotGrid)" />
        </svg>

        {/* ── Hand-drawn SVG Artwork (client-only to avoid hydration mismatch) ── */}
        <HeroIllustration />

        {/* ── Hero Text Content ── */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="max-w-lg">
            {/* Handwritten-style label */}
            <span className="mb-5 inline-flex items-center gap-2 rounded-sm px-3 py-1 text-xs font-semibold tracking-widest uppercase" style={{ background: '#1a1614', color: '#faf9f7', letterSpacing: '0.12em' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9 2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9 2.83-2.83"/></svg>
              Mido Learning
            </span>

            <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-[4.2rem]" style={{ color: '#1a1614', lineHeight: '1.08' }}>
              AI 驅動的<br/>學習實驗室
            </h1>

            <p className="mt-5 text-base font-medium" style={{ color: '#5a534c' }}>
              AI 教案與投影片示範網站
            </p>

            <p className="mt-3 text-sm leading-relaxed" style={{ color: '#8a847a' }}>
              這裡沒有宏大的夢想，只有一位好奇爸爸用 AI 工具探索世界的小小實驗。
              希望有一天，能做出讓孩子看得懂、用得上、學得會的知識內容。
            </p>

            {!authLoading && (
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/components">
                  <span className="inline-flex items-center gap-2 rounded-none px-6 py-3 text-sm font-bold transition-all hover:opacity-80" style={{ background: '#1a1614', color: '#faf9f7', border: '2px solid #1a1614' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    瀏覽教材
                  </span>
                </Link>
                <Link href="/experiments">
                  <span className="inline-flex items-center gap-2 rounded-none px-5 py-3 text-sm font-semibold transition-all hover:bg-stone-100" style={{ background: 'transparent', color: '#2a2520', border: '2px solid #2a2520' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>
                    實驗場域
                  </span>
                </Link>
                <Link href="/experiments/family-scoreboard">
                  <span className="inline-flex items-center gap-2 rounded-none px-5 py-3 text-sm font-semibold transition-all hover:bg-stone-100" style={{ background: 'transparent', color: '#2a2520', border: '2px solid #c0bab2' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    親子教養
                  </span>
                </Link>
                {!user && (
                  <>
                    <Link href="/register">
                      <span className="inline-flex items-center gap-2 rounded-none px-5 py-3 text-sm font-semibold transition-all hover:bg-stone-100" style={{ background: 'transparent', color: '#5a534c', border: '2px solid #c0bab2' }}>
                        免費註冊
                      </span>
                    </Link>
                    <Link href="/login">
                      <span className="inline-flex items-center rounded-none px-5 py-3 text-sm font-medium transition-all hover:bg-stone-50" style={{ color: '#8a847a', border: '1.5px solid #d4cfc8' }}>
                        登入
                      </span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Knowledge Section ── */}
      <section className="py-14" style={{ background: '#ffffff' }} data-testid="section-knowledge">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1a1614' }}>知識學習</h2>
              <p className="mt-1 text-sm" style={{ color: '#8a847a' }}>程式、語言、科學、商業思維等</p>
            </div>
            <Link href="/components" className="text-sm font-medium hover:underline" style={{ color: '#5a534c' }}>
              查看全部 →
            </Link>
          </div>
          <ComponentList
            components={knowledgeComponents}
            loading={loading}
            emptyMessage="目前沒有知識學習教材"
            cardHrefPrefix="/materials"
          />
        </div>
      </section>

      {/* ── Kids Section ── */}
      <section className="py-14" style={{ background: '#faf9f7', borderTop: '1.5px solid #e5e3de' }} data-testid="section-kid">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1a1614' }}>小人學</h2>
              <p className="mt-1 text-sm" style={{ color: '#8a847a' }}>適合孩子的學習內容</p>
            </div>
            <Link href="/categories/kid" className="text-sm font-medium hover:underline" style={{ color: '#5a534c' }}>
              查看全部 →
            </Link>
          </div>
          <ComponentList
            components={kidComponents}
            loading={loading}
            emptyMessage="目前沒有小人學教材"
            cardHrefPrefix="/materials"
          />
        </div>
      </section>

      {/* ── Games Section ── */}
      <section className="py-14" style={{ background: '#ffffff', borderTop: '1.5px solid #e5e3de' }} data-testid="section-game">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1a1614' }}>遊戲類</h2>
              <p className="mt-1 text-sm" style={{ color: '#8a847a' }}>寓教於樂的互動遊戲</p>
            </div>
            <Link href="/categories/game" className="text-sm font-medium hover:underline" style={{ color: '#5a534c' }}>
              查看全部 →
            </Link>
          </div>
          <ComponentList
            components={gameComponents}
            loading={loading}
            emptyMessage="目前沒有遊戲類教材"
            cardHrefPrefix="/materials"
          />
        </div>
      </section>

      {/* ── Browse All CTA ── */}
      <section className="py-10 text-center" style={{ background: '#faf9f7', borderTop: '1.5px solid #e5e3de' }}>
        <Link href="/components">
          <span className="inline-flex items-center gap-2 rounded-none px-8 py-3 text-sm font-bold transition-all hover:opacity-80" style={{ background: '#1a1614', color: '#faf9f7', border: '2px solid #1a1614' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            瀏覽所有教材
          </span>
        </Link>
      </section>

      {/* ── Features Section ── */}
      <section className="py-16" style={{ background: '#f0ede8', borderTop: '1.5px solid #d4cfc8' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-2 text-center">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6b6560' }}>關於這個網站</span>
          </div>
          <h2 className="text-center text-3xl font-bold" style={{ color: '#1a1614' }}>
            這個網站在做什麼？
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Card 1: AI 教案 */}
            <div className="group relative overflow-hidden p-8 transition-shadow hover:shadow-md" style={{ background: '#faf9f7', border: '1.5px solid #c0bab2' }}>
              <div className="mb-5 flex h-14 w-14 items-center justify-center" style={{ background: '#1a1614' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#faf9f7" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9 2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9 2.83-2.83"/></svg>
              </div>
              <h3 className="mb-2 text-xl font-bold" style={{ color: '#1a1614' }}>AI 教案</h3>
              <p className="leading-relaxed" style={{ color: '#5a534c' }}>用 AI 工具製作互動式教學教案與投影片，讓學習內容更生動、更容易理解。</p>
            </div>
            {/* Card 2: 實驗場域 */}
            <div className="group relative overflow-hidden p-8 transition-shadow hover:shadow-md" style={{ background: '#faf9f7', border: '1.5px solid #c0bab2' }}>
              <div className="mb-5 flex h-14 w-14 items-center justify-center" style={{ background: '#3d3830' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#faf9f7" strokeWidth="2" strokeLinecap="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>
              </div>
              <h3 className="mb-2 text-xl font-bold" style={{ color: '#1a1614' }}>實驗場域</h3>
              <p className="leading-relaxed" style={{ color: '#5a534c' }}>各種好奇心驅動的小實驗，從遊戲化工具到互動應用，持續探索 AI 與教育的邊界。</p>
            </div>
            {/* Card 3: 親子教養 */}
            <div className="group relative overflow-hidden p-8 transition-shadow hover:shadow-md" style={{ background: '#faf9f7', border: '1.5px solid #c0bab2' }}>
              <div className="mb-5 flex h-14 w-14 items-center justify-center" style={{ background: '#6b6560' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#faf9f7" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3 className="mb-2 text-xl font-bold" style={{ color: '#1a1614' }}>親子教養</h3>
              <p className="leading-relaxed" style={{ color: '#5a534c' }}>家庭計分板、任務系統、零用金管理——用遊戲化方式陪伴孩子建立習慣與自律。</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
