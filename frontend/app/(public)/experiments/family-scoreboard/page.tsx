'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

// ── Demo data for non-logged-in users ────────────────────────────────────────

const DEMO_PLAYERS = [
  { playerId: 'playerA', name: 'Ian 祤恩', emoji: '🌟', color: '#4CAF50', score: 320, role: '哥哥' },
  { playerId: 'playerB', name: 'Justin 祤杰', emoji: '🚀', color: '#2196F3', score: 275, role: '弟弟' },
];

const DEMO_HISTORY = [
  { playerId: 'playerA', label: '考試優秀', amount: 100, type: 'earn' as const, date: '02/19' },
  { playerId: 'playerA', label: '對人友善', amount: 10, type: 'earn' as const, date: '02/18' },
  { playerId: 'playerB', label: '主動幫忙家事', amount: 5, type: 'earn' as const, date: '02/19' },
  { playerId: 'playerB', label: '表現特別優秀', amount: 20, type: 'earn' as const, date: '02/17' },
  { playerId: 'playerA', label: '兄弟吵架', amount: -20, type: 'deduct' as const, date: '02/16' },
];

// ── Components ────────────────────────────────────────────────────────────────

function ScoreCard({ player }: { player: typeof DEMO_PLAYERS[0] }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white p-6 shadow-md ring-1 ring-black/5">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-md mb-3"
        style={{ backgroundColor: player.color }}
      >
        {player.emoji}
      </div>
      <h3 className="text-lg font-bold text-gray-900">{player.name}</h3>
      <span className="mt-1 mb-3 rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: player.color }}>
        {player.role}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-orange-500">{player.score}</span>
        <span className="text-sm text-gray-400">積分</span>
      </div>
      {/* Simple progress bar */}
      <div className="mt-4 w-full">
        <div className="h-2 w-full rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all"
            style={{ width: `${Math.min((player.score / 500) * 100, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-gray-400">{player.score} / 500</p>
      </div>
    </div>
  );
}

function HistoryRow({ item }: { item: typeof DEMO_HISTORY[0] }) {
  const player = DEMO_PLAYERS.find((p) => p.playerId === item.playerId);
  const isEarn = item.type === 'earn';
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-lg">{player?.emoji}</span>
        <div>
          <p className="text-sm font-medium text-gray-800">{item.label}</p>
          <p className="text-xs text-gray-400">{player?.name} · {item.date}</p>
        </div>
      </div>
      <span className={`text-sm font-bold ${isEarn ? 'text-green-600' : 'text-red-500'}`}>
        {isEarn ? '+' : ''}{item.amount}
      </span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FamilyScoreboardExperimentPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        // 登入後直接跳轉到完整管理系統
        router.replace('/family-scoreboard');
      } else {
        setIsLoggedIn(false);
        setAuthChecked(true);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 等待 auth 確認
  if (!authChecked && !isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-orange-50">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
          <p className="text-sm">載入中...</p>
        </div>
      </main>
    );
  }

  // 未登入：只顯示積分表（示範模式）
  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-sm font-semibold text-orange-700">
            🏆 家長積分系統
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            積分排行榜
          </h1>
          <p className="mt-3 text-base text-gray-500">
            即時追蹤孩子的日常表現與成長進度
          </p>
        </div>

        {/* 登入提示 Banner */}
        <div className="mb-8 flex flex-col items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-5 text-center sm:flex-row sm:text-left">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-xl">
            🔒
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">預覽模式</p>
            <p className="text-xs text-orange-600 mt-0.5">以下為示範資料。登入後可管理積分、查看完整記錄、設定獎勵兌換。</p>
          </div>
          <Link
            href="/login"
            className="flex-shrink-0 rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 transition-colors"
          >
            登入管理
          </Link>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {DEMO_PLAYERS.map((player) => (
            <ScoreCard key={player.playerId} player={player} />
          ))}
        </div>

        {/* Recent History */}
        <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-black/5">
          <h2 className="mb-4 text-base font-bold text-gray-800">最近記錄</h2>
          <div>
            {DEMO_HISTORY.map((item, i) => (
              <HistoryRow key={i} item={item} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/experiments"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← 返回試驗功能
          </Link>
        </div>
      </div>
    </main>
  );
}
