'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/auth/AuthProvider';
import { ComponentList, CategoryFilter } from '@/components/learning';
import { Pagination } from '@/components/ui/Pagination';
import { SortSelect, SortOption, defaultSortOptions } from '@/components/ui/SortSelect';
import { LearningComponent, ComponentListResponse } from '@/types/component';
import { getPublicComponents } from '@/lib/api/components';
import { recordPageView } from '@/lib/api/analytics';

const HeroIllustration = dynamic(() => import('./HeroIllustration'), { ssr: false });

const ITEMS_PER_PAGE = 8;
const SEARCH_DEBOUNCE_MS = 300;

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [components, setComponents] = useState<LearningComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOption, setSortOption] = useState<SortOption>(defaultSortOptions[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Record page view on mount
  useEffect(() => {
    recordPageView();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: ITEMS_PER_PAGE,
        sortBy: sortOption.sortBy,
        sortOrder: sortOption.sortOrder,
        ...(category !== 'all' && { category }),
        ...(debouncedSearch && { search: debouncedSearch }),
      };
      const response: ComponentListResponse = await getPublicComponents(params);
      setComponents(response.components || []);
      setTotalPages(Math.ceil((response.total || 0) / (response.limit || ITEMS_PER_PAGE)));
    } catch {
      setComponents([]);
    } finally {
      setLoading(false);
    }
  }, [page, category, sortOption, debouncedSearch]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort);
    setPage(1);
  };

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
                <Link href="/games">
                  <span className="inline-flex items-center gap-2 rounded-none px-5 py-3 text-sm font-semibold transition-all hover:bg-stone-100" style={{ background: 'transparent', color: '#2a2520', border: '2px solid #2a2520' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
                    技能村
                  </span>
                </Link>
                <Link href="/dashboard/achievements">
                  <span className="inline-flex items-center gap-2 rounded-none px-5 py-3 text-sm font-semibold transition-all hover:bg-stone-100" style={{ background: 'transparent', color: '#2a2520', border: '2px solid #c0bab2' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                    成就系統
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

      {/* ── Learning Components Section ── */}
      <section className="py-16" style={{ background: '#ffffff' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1a1614' }}>公開學習資源</h2>
              <p className="mt-1" style={{ color: '#8a847a' }}>探索精選的學習內容</p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
              {/* Search Input */}
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋教材..."
                  className="w-full rounded-none border py-2 pl-10 pr-4 text-sm focus:outline-none sm:w-48"
                  style={{ borderColor: '#c0bab2', background: '#faf9f7', color: '#2a2520' }}
                />
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#8a847a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#8a847a' }}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <CategoryFilter selected={category} onChange={handleCategoryChange} />
              <SortSelect value={sortOption} onChange={handleSortChange} />
            </div>
          </div>

          <ComponentList
            components={components}
            loading={loading}
            emptyMessage="目前沒有公開的學習教材"
            cardHrefPrefix="/materials"
          />

          {!loading && components.length > 0 && totalPages > 1 && (
            <div className="mt-8">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/categories" className="font-medium hover:underline" style={{ color: '#2a2520' }}>
              瀏覽所有類別 →
            </Link>
          </div>
        </div>
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
            {/* Card 1 */}
            <div className="group relative overflow-hidden p-8 transition-shadow hover:shadow-md" style={{ background: '#faf9f7', border: '1.5px solid #c0bab2' }}>
              <div className="mb-5 flex h-14 w-14 items-center justify-center" style={{ background: '#1a1614' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#faf9f7" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9 2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9 2.83-2.83"/></svg>
              </div>
              <h3 className="mb-2 text-xl font-bold" style={{ color: '#1a1614' }}>AI 生成教案</h3>
              <p className="leading-relaxed" style={{ color: '#5a534c' }}>嘗試用 AI 工具製作教學內容，探索 AI 輔助教育的可能性。</p>
            </div>
            {/* Card 2 */}
            <div className="group relative overflow-hidden p-8 transition-shadow hover:shadow-md" style={{ background: '#faf9f7', border: '1.5px solid #c0bab2' }}>
              <div className="mb-5 flex h-14 w-14 items-center justify-center" style={{ background: '#3d3830' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#faf9f7" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
              </div>
              <h3 className="mb-2 text-xl font-bold" style={{ color: '#1a1614' }}>技能村遊戲</h3>
              <p className="leading-relaxed" style={{ color: '#5a534c' }}>透過遊戲化學習，讓知識變得更有趣。完成挑戰，提升技能！</p>
            </div>
            {/* Card 3 */}
            <div className="group relative overflow-hidden p-8 transition-shadow hover:shadow-md" style={{ background: '#faf9f7', border: '1.5px solid #c0bab2' }}>
              <div className="mb-5 flex h-14 w-14 items-center justify-center" style={{ background: '#6b6560' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#faf9f7" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
              </div>
              <h3 className="mb-2 text-xl font-bold" style={{ color: '#1a1614' }}>成就系統</h3>
              <p className="leading-relaxed" style={{ color: '#5a534c' }}>累積學習成果，解鎖專屬成就。記錄你的學習歷程！</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
