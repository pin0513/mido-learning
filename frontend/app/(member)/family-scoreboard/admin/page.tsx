'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { useFamilyScoreboard } from '../hooks/useFamilyScoreboard';
import type { PlayerScoreDto, RewardDto } from '@/types/family-scoreboard';

type AdminTab = 'players' | 'rewards';

// ── Sub-components ─────────────────────────────────────────────────────────

function PlayerCard({ player }: { player: PlayerScoreDto }) {
  return (
    <li className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white flex-shrink-0 shadow"
        style={{ backgroundColor: player.color }}
      >
        {player.emoji ?? player.name.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-800 truncate">{player.name}</p>
          {player.role && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
              style={{ backgroundColor: player.color }}
            >
              {player.role}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">ID: {player.playerId}</p>
        {player.birthday && (
          <p className="text-xs text-gray-400">
            生日：{new Date(player.birthday).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
          </p>
        )}
      </div>

      {/* Points */}
      <div className="text-right flex-shrink-0 space-y-1">
        <div className="flex items-center gap-1 justify-end">
          <span className="text-xs text-gray-400">成就</span>
          <span className="font-bold text-amber-600">{player.achievementPoints}</span>
        </div>
        <div className="flex items-center gap-1 justify-end">
          <span className="text-xs text-gray-400">可用</span>
          <span className="font-bold text-emerald-600">{player.redeemablePoints}</span>
        </div>
      </div>
    </li>
  );
}

function RewardCard({ reward }: { reward: RewardDto }) {
  return (
    <li className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl flex-shrink-0">
        {reward.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-800 truncate">{reward.name}</p>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              reward.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {reward.isActive ? '啟用' : '停用'}
          </span>
        </div>
        {reward.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{reward.description}</p>
        )}
        {reward.stock !== null && (
          <p className="text-xs text-orange-500 mt-0.5">庫存：{reward.stock}</p>
        )}
      </div>

      {/* Cost */}
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-amber-600">{reward.cost}</p>
        <p className="text-xs text-gray-400">點數</p>
      </div>
    </li>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function FamilyScoreboardAdminPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const familyId = uid ? `family_${uid}` : '';
  const [activeTab, setActiveTab] = useState<AdminTab>('players');
  const [reinitConfirm, setReinitConfirm] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) setUid(user.uid);
  }, []);

  const { scores, rewards, loading, error, initialize } = useFamilyScoreboard(familyId);

  async function handleReinit() {
    if (!reinitConfirm) {
      setReinitConfirm(true);
      return;
    }
    setReinitConfirm(false);
    await initialize();
  }

  const TABS: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'players', label: '玩家管理', icon: '👤' },
    { id: 'rewards', label: '獎勵管理', icon: '🎁' },
  ];

  return (
    <div className="min-h-screen bg-amber-50 lg:flex">
      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 bg-white border-r border-amber-100 shadow-sm">
        {/* Sidebar Header */}
        <div className="px-5 py-5 border-b border-amber-100">
          <button
            onClick={() => router.push('/family-scoreboard')}
            className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium text-sm mb-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回積分板
          </button>
          <h1 className="text-xl font-bold text-gray-800">管理後台</h1>
          <p className="text-xs text-gray-400 mt-1">家庭積分系統</p>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${
                activeTab === tab.id
                  ? 'bg-amber-50 text-amber-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Sidebar Reinit Button */}
        <div className="px-4 py-4 border-t border-amber-100">
          {reinitConfirm ? (
            <div className="space-y-2">
              <p className="text-xs text-red-600 font-medium text-center">⚠️ 確定重置所有資料？</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setReinitConfirm(false)}
                  className="flex-1 min-h-[44px] rounded-xl border border-gray-300 text-gray-700 font-medium text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleReinit}
                  disabled={loading}
                  className="flex-1 min-h-[44px] rounded-xl bg-red-500 text-white font-medium text-sm disabled:opacity-50"
                >
                  {loading ? '執行中...' : '確定'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleReinit}
              disabled={loading || !familyId}
              className="w-full min-h-[44px] rounded-xl bg-amber-500 text-white font-semibold text-sm shadow-md disabled:opacity-50 hover:bg-amber-600 transition-colors"
            >
              🔄 重新初始化
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile Header ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        <header className="lg:hidden bg-amber-500 text-white px-4 py-3 flex items-center gap-3 shadow sticky top-0 z-10">
          <button
            onClick={() => router.push('/family-scoreboard')}
            className="p-2 rounded-lg hover:bg-amber-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="返回"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold flex-1">管理後台</h1>
        </header>

        {/* ── Desktop Page Header ─────────────────────────────────────── */}
        <div className="hidden lg:block px-8 py-6 border-b border-amber-100 bg-white">
          <h2 className="text-2xl font-bold text-gray-800">
            {TABS.find((t) => t.id === activeTab)?.icon} {TABS.find((t) => t.id === activeTab)?.label}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'players' ? `共 ${scores.length} 位玩家` : `共 ${rewards.length} 項獎勵`}
          </p>
        </div>

        {/* ── Mobile Tab Bar ──────────────────────────────────────────── */}
        <div className="lg:hidden flex border-b border-amber-200 bg-white sticky top-[56px] z-10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-h-[48px] text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-amber-600 border-b-2 border-amber-500'
                  : 'text-gray-500 hover:text-amber-500'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto pb-32 lg:pb-8">
          <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-3">
            {loading && (
              <div className="text-center py-12 text-amber-500">
                <div className="text-3xl mb-2">⏳</div>
                <p className="text-sm">載入中...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                ⚠️ {error}
              </div>
            )}

            {!loading && activeTab === 'players' && (
              <>
                <p className="text-xs text-gray-400 px-1 lg:hidden">共 {scores.length} 位玩家</p>
                {scores.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-2">👤</div>
                    <p className="text-sm">尚無玩家資料</p>
                    <p className="text-xs mt-1">請點選下方「重新初始化」</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {scores.map((player) => (
                      <PlayerCard key={player.playerId} player={player} />
                    ))}
                  </ul>
                )}
              </>
            )}

            {!loading && activeTab === 'rewards' && (
              <>
                <p className="text-xs text-gray-400 px-1 lg:hidden">共 {rewards.length} 項獎勵</p>
                {rewards.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-2">🎁</div>
                    <p className="text-sm">尚無獎勵資料</p>
                    <p className="text-xs mt-1">請點選下方「重新初始化」</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {rewards.map((reward) => (
                      <RewardCard key={reward.id} reward={reward} />
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </main>

        {/* ── Mobile Bottom: Re-initialize ────────────────────────────── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg">
          {reinitConfirm ? (
            <div className="space-y-2">
              <p className="text-sm text-center text-red-600 font-medium">
                ⚠️ 確定重新初始化？這將重置所有資料！
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setReinitConfirm(false)}
                  className="flex-1 min-h-[52px] rounded-xl border border-gray-300 text-gray-700 font-medium text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleReinit}
                  disabled={loading}
                  className="flex-1 min-h-[52px] rounded-xl bg-red-500 text-white font-medium text-sm disabled:opacity-50"
                >
                  {loading ? '執行中...' : '確定重置'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleReinit}
              disabled={loading || !familyId}
              className="w-full min-h-[56px] rounded-xl bg-amber-500 text-white font-semibold shadow-md disabled:opacity-50 hover:bg-amber-600 transition-colors"
            >
              🔄 重新初始化家庭資料
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
