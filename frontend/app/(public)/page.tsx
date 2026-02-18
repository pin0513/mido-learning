'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/auth/AuthProvider';
import { ComponentList, CategoryFilter } from '@/components/learning';
import { Pagination } from '@/components/ui/Pagination';
import { SortSelect, SortOption, defaultSortOptions } from '@/components/ui/SortSelect';
import { LearningComponent, ComponentListResponse } from '@/types/component';
import { getPublicComponents } from '@/lib/api/components';
import { recordPageView } from '@/lib/api/analytics';

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

        {/* ── Hand-drawn SVG Artwork ── */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-end" aria-hidden="true">
          <svg
            viewBox="0 0 720 520"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-auto max-w-[58%] lg:max-w-[54%]"
          >
            <defs>
              {/* Hand-drawn wobble filter */}
              <filter id="sketch" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="4" seed="7" result="noise"/>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
              </filter>
              <filter id="sketchLight" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="3" seed="2" result="noise"/>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G"/>
              </filter>
              {/* Hatching pattern for gear fill */}
              <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#c8c3ba" strokeWidth="0.8"/>
              </pattern>
              <pattern id="hatchDark" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" stroke="#8a847a" strokeWidth="1"/>
              </pattern>
            </defs>

            {/* ── Large Background Gear (faint, bg) ── */}
            <g transform="translate(200, 300)" filter="url(#sketchLight)" opacity="0.22">
              <circle cx="0" cy="0" r="118" fill="none" stroke="#6b6560" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="0" cy="0" r="82" fill="none" stroke="#6b6560" strokeWidth="1.5"/>
              <circle cx="0" cy="0" r="30" fill="url(#hatch)" stroke="#6b6560" strokeWidth="2"/>
              {Array.from({length: 12}, (_,i) => {
                const a = (i/12)*Math.PI*2;
                const inner = 82, outer = 118, w = 0.19;
                const x1=Math.cos(a-w)*inner, y1=Math.sin(a-w)*inner;
                const x2=Math.cos(a-w)*outer, y2=Math.sin(a-w)*outer;
                const x3=Math.cos(a+w)*outer, y3=Math.sin(a+w)*outer;
                const x4=Math.cos(a+w)*inner, y4=Math.sin(a+w)*inner;
                return <polygon key={i} points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`} fill="url(#hatch)" stroke="#6b6560" strokeWidth="1.8" strokeLinejoin="round"/>;
              })}
            </g>

            {/* ── Main Gear (dark, prominent) ── */}
            <g transform="translate(430, 270)" filter="url(#sketch)">
              <circle cx="0" cy="0" r="98" fill="url(#hatch)" stroke="#2a2520" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="0" cy="0" r="66" fill="#faf9f7" stroke="#2a2520" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="0" cy="0" r="26" fill="url(#hatchDark)" stroke="#1a1614" strokeWidth="3"/>
              <circle cx="0" cy="0" r="10" fill="#2a2520"/>
              {Array.from({length: 10}, (_,i) => {
                const a = (i/10)*Math.PI*2;
                const inner = 66, outer = 98, w = 0.23;
                const x1=Math.cos(a-w)*inner, y1=Math.sin(a-w)*inner;
                const x2=Math.cos(a-w)*outer, y2=Math.sin(a-w)*outer;
                const x3=Math.cos(a+w)*outer, y3=Math.sin(a+w)*outer;
                const x4=Math.cos(a+w)*inner, y4=Math.sin(a+w)*inner;
                return <polygon key={i} points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`} fill="url(#hatch)" stroke="#2a2520" strokeWidth="2" strokeLinejoin="round"/>;
              })}
              {/* Spokes */}
              {Array.from({length: 6}, (_,i) => {
                const a = (i/6)*Math.PI*2;
                return <line key={i} x1={Math.cos(a)*11} y1={Math.sin(a)*11} x2={Math.cos(a)*24} y2={Math.sin(a)*24} stroke="#1a1614" strokeWidth="2.5" strokeLinecap="round"/>;
              })}
            </g>

            {/* ── Small Gear (upper-right) ── */}
            <g transform="translate(558, 158)" filter="url(#sketch)">
              <circle cx="0" cy="0" r="54" fill="#f0ede8" stroke="#3d3830" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="0" cy="0" r="36" fill="#faf9f7" stroke="#3d3830" strokeWidth="1.5"/>
              <circle cx="0" cy="0" r="14" fill="url(#hatch)" stroke="#2a2520" strokeWidth="2.5"/>
              {Array.from({length: 8}, (_,i) => {
                const a = (i/8)*Math.PI*2;
                const inner = 36, outer = 54, w = 0.27;
                const x1=Math.cos(a-w)*inner, y1=Math.sin(a-w)*inner;
                const x2=Math.cos(a-w)*outer, y2=Math.sin(a-w)*outer;
                const x3=Math.cos(a+w)*outer, y3=Math.sin(a+w)*outer;
                const x4=Math.cos(a+w)*inner, y4=Math.sin(a+w)*inner;
                return <polygon key={i} points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`} fill="#f0ede8" stroke="#3d3830" strokeWidth="1.5" strokeLinejoin="round"/>;
              })}
            </g>

            {/* ── Tiny Gear (lower-right) ── */}
            <g transform="translate(610, 400)" filter="url(#sketchLight)">
              <circle cx="0" cy="0" r="38" fill="#e8e4de" stroke="#5a534c" strokeWidth="1.8"/>
              <circle cx="0" cy="0" r="24" fill="#faf9f7" stroke="#5a534c" strokeWidth="1.3"/>
              <circle cx="0" cy="0" r="9" fill="url(#hatch)" stroke="#3d3830" strokeWidth="2"/>
              {Array.from({length: 7}, (_,i) => {
                const a = (i/7)*Math.PI*2;
                const inner = 24, outer = 38, w = 0.29;
                const x1=Math.cos(a-w)*inner, y1=Math.sin(a-w)*inner;
                const x2=Math.cos(a-w)*outer, y2=Math.sin(a-w)*outer;
                const x3=Math.cos(a+w)*outer, y3=Math.sin(a+w)*outer;
                const x4=Math.cos(a+w)*inner, y4=Math.sin(a+w)*inner;
                return <polygon key={i} points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`} fill="#e8e4de" stroke="#5a534c" strokeWidth="1.3" strokeLinejoin="round"/>;
              })}
            </g>

            {/* Gear linkage lines (dashed, sketchy) */}
            <line x1="332" y1="220" x2="496" y2="215" stroke="#6b6560" strokeWidth="1.2" strokeDasharray="5,5" strokeLinecap="round" filter="url(#sketchLight)" opacity="0.6"/>
            <line x1="484" y1="173" x2="504" y2="215" stroke="#6b6560" strokeWidth="1.2" strokeDasharray="4,4" strokeLinecap="round" filter="url(#sketchLight)" opacity="0.6"/>
            <line x1="528" y1="312" x2="572" y2="362" stroke="#6b6560" strokeWidth="1" strokeDasharray="3,5" strokeLinecap="round" opacity="0.5"/>

            {/* ── Pencil / Pen tool (AI writing metaphor) ── */}
            <g transform="translate(290, 145) rotate(-30)" filter="url(#sketchLight)">
              {/* Body */}
              <rect x="-7" y="-48" width="14" height="72" rx="2" fill="#e8e4de" stroke="#2a2520" strokeWidth="2"/>
              {/* Tip */}
              <polygon points="-7,24 7,24 0,44" fill="#c8c3ba" stroke="#2a2520" strokeWidth="1.8" strokeLinejoin="round"/>
              {/* Eraser */}
              <rect x="-7" y="-56" width="14" height="12" rx="2" fill="#c8c3ba" stroke="#2a2520" strokeWidth="1.8"/>
              {/* Metal band */}
              <rect x="-7" y="-48" width="14" height="5" fill="#8a847a" stroke="#2a2520" strokeWidth="1"/>
              {/* Center line */}
              <line x1="0" y1="-42" x2="0" y2="22" stroke="#8a847a" strokeWidth="1" strokeDasharray="3,3" opacity="0.7"/>
            </g>

            {/* ── Floating book ── */}
            <g transform="translate(295, 395) rotate(-10)" filter="url(#sketch)">
              <rect x="-26" y="-20" width="52" height="38" rx="3" fill="#e8e4de" stroke="#2a2520" strokeWidth="2.2" strokeLinejoin="round"/>
              <rect x="-24" y="-18" width="22" height="34" rx="2" fill="#d4cfc8" stroke="#2a2520" strokeWidth="1.5"/>
              <line x1="-24" y1="-18" x2="-24" y2="16" stroke="#2a2520" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="-20" y1="-10" x2="22" y2="-10" stroke="#8a847a" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
              <line x1="-20" y1="-4" x2="22" y2="-4" stroke="#8a847a" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
              <line x1="-20" y1="2" x2="18" y2="2" stroke="#8a847a" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
              <line x1="-20" y1="8" x2="20" y2="8" stroke="#8a847a" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
            </g>

            {/* ── Second floating book ── */}
            <g transform="translate(660, 345) rotate(7)" filter="url(#sketchLight)">
              <rect x="-20" y="-15" width="40" height="30" rx="2" fill="#d4cfc8" stroke="#3d3830" strokeWidth="2" strokeLinejoin="round"/>
              <rect x="-18" y="-13" width="17" height="26" rx="1.5" fill="#c0bab2" stroke="#3d3830" strokeWidth="1.3"/>
              <line x1="-18" y1="-13" x2="-18" y2="13" stroke="#3d3830" strokeWidth="2" strokeLinecap="round"/>
              <line x1="-15" y1="-7" x2="17" y2="-7" stroke="#8a847a" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
              <line x1="-15" y1="-2" x2="17" y2="-2" stroke="#8a847a" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
              <line x1="-15" y1="3" x2="14" y2="3" stroke="#8a847a" strokeWidth="0.9" strokeLinecap="round" opacity="0.5"/>
            </g>

            {/* ── Sketch stars / sparkles ── */}
            {([[100,60],[220,35],[490,30],[600,55],[680,90],[70,200],[710,230],[650,410],[90,370],[580,480]] as [number,number][]).map(([x,y],i) => (
              <g key={i} opacity={0.45 + (i%3)*0.15} filter="url(#sketchLight)">
                <line x1={x} y1={y-7} x2={x} y2={y+7} stroke="#2a2520" strokeWidth={i%2===0?1.5:1} strokeLinecap="round"/>
                <line x1={x-7} y1={y} x2={x+7} y2={y} stroke="#2a2520" strokeWidth={i%2===0?1.5:1} strokeLinecap="round"/>
                <line x1={x-5} y1={y-5} x2={x+5} y2={y+5} stroke="#2a2520" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
                <line x1={x+5} y1={y-5} x2={x-5} y2={y+5} stroke="#2a2520" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
              </g>
            ))}

            {/* ── Orbit / circle sketch lines ── */}
            <ellipse cx="420" cy="275" rx="205" ry="92" fill="none" stroke="#8a847a" strokeWidth="1" strokeDasharray="7,9" strokeLinecap="round" opacity="0.3" transform="rotate(-14 420 275)" filter="url(#sketchLight)"/>
            <ellipse cx="400" cy="300" rx="275" ry="135" fill="none" stroke="#6b6560" strokeWidth="0.7" strokeDasharray="5,14" strokeLinecap="round" opacity="0.2" transform="rotate(-9 400 300)"/>

            {/* ── Childlike figure sitting on gear ── */}
            <g transform="translate(432, 177)" filter="url(#sketch)">
              {/* Body */}
              <ellipse cx="0" cy="8" rx="10" ry="13" fill="#e8e4de" stroke="#1a1614" strokeWidth="2"/>
              {/* Head */}
              <circle cx="0" cy="-12" r="12" fill="#f0ede8" stroke="#1a1614" strokeWidth="2.2"/>
              {/* Eyes */}
              <circle cx="-4.5" cy="-13" r="2.8" fill="#1a1614"/>
              <circle cx="4.5" cy="-13" r="2.8" fill="#1a1614"/>
              <circle cx="-3.5" cy="-14" r="1" fill="white"/>
              <circle cx="5.5" cy="-14" r="1" fill="white"/>
              {/* Smile */}
              <path d="M -4.5 -7 Q 0 -4 4.5 -7" fill="none" stroke="#1a1614" strokeWidth="1.8" strokeLinecap="round"/>
              {/* Arms */}
              <line x1="-10" y1="3" x2="-20" y2="-6" stroke="#1a1614" strokeWidth="3.5" strokeLinecap="round"/>
              <line x1="10" y1="3" x2="22" y2="-4" stroke="#1a1614" strokeWidth="3.5" strokeLinecap="round"/>
              {/* Legs dangling */}
              <line x1="-5" y1="21" x2="-9" y2="36" stroke="#1a1614" strokeWidth="3.5" strokeLinecap="round"/>
              <line x1="5" y1="21" x2="9" y2="36" stroke="#1a1614" strokeWidth="3.5" strokeLinecap="round"/>
              {/* Feet */}
              <ellipse cx="-11" cy="38" rx="6" ry="3.5" fill="#2a2520" stroke="#1a1614" strokeWidth="1.5"/>
              <ellipse cx="11" cy="38" rx="6" ry="3.5" fill="#2a2520" stroke="#1a1614" strokeWidth="1.5"/>
              {/* Pencil wand */}
              <line x1="22" y1="-4" x2="38" y2="-18" stroke="#1a1614" strokeWidth="2.5" strokeLinecap="round"/>
              <polygon points="38,-26 40,-18 46,-18 41,-14 43,-6 38,-10 33,-6 35,-14 30,-18 36,-18" fill="#e8e4de" stroke="#1a1614" strokeWidth="1.2"/>
            </g>

            {/* ── Floating small circles/dots ── */}
            {([[370,205],[490,330],[355,370],[590,240],[260,315],[700,430],[160,440],[500,470]] as [number,number][]).map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r={i%3===0?4:i%3===1?3:2.5} fill="none" stroke="#6b6560" strokeWidth="1.2" opacity={0.3+i%3*0.1} filter="url(#sketchLight)"/>
            ))}
          </svg>
        </div>

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
