'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

// 家長 allowlist：只有這兩個 email 登入時才看得到「家庭看板」外顯入口。
// 這是純 UI 隱藏（非安全邊界）：/family-kanban 頁面本身不卡登入，只有頁內「某些卡」才需權限。
const PARENT_ALLOWLIST = ['pin0513@gmail.com', 'daisy9928@gmail.com'];

type Experiment = {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  external: boolean;
  color: string;
  badge: string;
  // 導向 rewrite 到完整獨立靜態 HTML 的頁面（如 /family-kanban）時需整頁導航，
  // 不能用 client-side Link（Next 會試著當 app route render）。
  hardNav?: boolean;
  // 只對家長 allowlist 顯示外顯入口（例：家庭看板）。
  parentOnly?: boolean;
};

const experiments: Experiment[] = [
  {
    id: 'badminton',
    title: '羽球戰術板',
    description: '在虛擬場地上佈置球員位置、設計戰術路線，視覺化分析羽球比賽策略。',
    icon: '🏸',
    href: '/badminton-board',
    external: false,
    color: 'from-green-400 to-teal-500',
    badge: '互動工具',
  },
  {
    id: 'music-producer',
    title: '音樂製作家',
    description: '上傳錄音，AI 分析音調與節拍，自動生成配樂作品，體驗 AI 輔助音樂創作。',
    icon: '🎵',
    href: '/music-producer',
    external: false,
    color: 'from-purple-500 to-indigo-600',
    badge: 'AI 生成',
  },
  {
    id: 'family-scoreboard',
    title: '家庭計分板',
    description: '紀錄孩子的日常表現，累積積分可兌換獎勵。登入後即可管理米豆與毛豆的計分帳戶。',
    icon: '🏆',
    href: '/experiments/family-scoreboard',
    external: false,
    color: 'from-yellow-400 to-orange-500',
    badge: '家庭工具',
  },
  {
    id: 'family-kanban',
    title: '家庭看板',
    description: '全家的節奏一站看：成員介紹、每週行事曆、每日報報，並連動家庭計分板。',
    icon: '📋',
    href: '/family-kanban',
    external: false,
    color: 'from-rose-400 to-pink-500',
    badge: '家庭工具',
    hardNav: true,
    parentOnly: true,
  },
  {
    id: 'badminton-trainer',
    title: '米字步訓練器',
    description: '互動式羽球步伐訓練工具，跟著節奏練習米字步移動，提升場上步法靈活度。',
    icon: '👟',
    href: '/badminton-trainer',
    external: false,
    color: 'from-cyan-400 to-blue-500',
    badge: '運動訓練',
  },
];

export default function ExperimentsPage() {
  const { user } = useAuth();
  const email = user?.email?.toLowerCase() ?? '';
  const isParent = PARENT_ALLOWLIST.includes(email);
  // 家長才看得到「家庭看板」入口；其餘卡片一律顯示。
  const visibleExperiments = experiments.filter((item) => !item.parentOnly || isParent);
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-700">
            🧪 試驗功能
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            實驗性工具
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            探索我們正在測試的互動功能，體驗學習的更多可能。
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid gap-8 sm:grid-cols-2">
          {visibleExperiments.map((item) => {
            const cardContent = (
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                {/* Gradient top bar */}
                <div className={`h-2 w-full bg-gradient-to-r ${item.color}`} />

                <div className="flex flex-1 flex-col p-8">
                  {/* Icon */}
                  <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-5xl shadow-lg`}>
                    {item.icon}
                  </div>

                  {/* Badge */}
                  <span className="mb-3 inline-block w-fit rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-600">
                    {item.badge}
                  </span>

                  {/* Title */}
                  <h2 className="mb-3 text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h2>

                  {/* Description */}
                  <p className="flex-1 text-base leading-relaxed text-gray-500">
                    {item.description}
                  </p>

                  {/* CTA */}
                  <div className={`mt-8 flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                    立即體驗
                    <svg className="h-4 w-4 translate-x-0 transition-transform group-hover:translate-x-1" style={{ stroke: 'currentColor' }} fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                    {item.external && (
                      <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );

            return item.external ? (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full"
              >
                {cardContent}
              </a>
            ) : item.hardNav ? (
              // 整頁導航到 rewrite 的靜態 HTML（/family-kanban），非 client-side Link
              <a key={item.id} href={item.href} className="block h-full">
                {cardContent}
              </a>
            ) : (
              <Link key={item.id} href={item.href} className="block h-full">
                {cardContent}
              </Link>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="mt-12 text-center text-sm text-gray-400">
          試驗功能持續更新中，歡迎提供使用意見。
        </p>
      </div>
    </main>
  );
}
