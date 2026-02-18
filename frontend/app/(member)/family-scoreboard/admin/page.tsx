'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { useFamilyScoreboard } from '../hooks/useFamilyScoreboard';

type AdminTab = 'players' | 'rewards';

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

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-amber-500 text-white px-4 py-3 flex items-center gap-3 shadow">
        <button
          onClick={() => router.push('/family-scoreboard')}
          className="p-1 rounded-lg hover:bg-amber-600 transition-colors"
          aria-label="返回"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">管理後台</h1>
      </header>

      {/* Tab Bar */}
      <div className="flex border-b border-amber-200 bg-white">
        {([
          { id: 'players' as AdminTab, label: '玩家管理', emoji: '👤' },
          { id: 'rewards' as AdminTab, label: '獎勵管理', emoji: '🎁' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-amber-600 border-b-2 border-amber-500'
                : 'text-gray-500 hover:text-amber-500'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
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
            <p className="text-xs text-gray-400 px-1">共 {scores.length} 位玩家</p>
            {scores.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">👤</div>
                <p className="text-sm">尚無玩家資料</p>
                <p className="text-xs mt-1">請點選下方「重新初始化」</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {scores.map((player) => (
                  <li
                    key={player.playerId}
                    className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4"
                  >
                    {/* Color avatar */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.name.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{player.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">ID: {player.playerId}</p>
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
                ))}
              </ul>
            )}
          </>
        )}

        {!loading && activeTab === 'rewards' && (
          <>
            <p className="text-xs text-gray-400 px-1">共 {rewards.length} 項獎勵</p>
            {rewards.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">🎁</div>
                <p className="text-sm">尚無獎勵資料</p>
                <p className="text-xs mt-1">請點選下方「重新初始化」</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {rewards.map((reward) => (
                  <li
                    key={reward.id}
                    className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4"
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl flex-shrink-0">
                      {reward.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 truncate">{reward.name}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            reward.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {reward.isActive ? '啟用' : '停用'}
                        </span>
                      </div>
                      {reward.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{reward.description}</p>
                      )}
                      {reward.stock !== null && (
                        <p className="text-xs text-orange-500 mt-0.5">
                          庫存：{reward.stock}
                        </p>
                      )}
                    </div>

                    {/* Cost */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-amber-600">{reward.cost}</p>
                      <p className="text-xs text-gray-400">點數</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Bottom: Re-initialize */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg">
        {reinitConfirm ? (
          <div className="space-y-2">
            <p className="text-sm text-center text-red-600 font-medium">
              ⚠️ 確定重新初始化？這將重置所有資料！
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setReinitConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm"
              >
                取消
              </button>
              <button
                onClick={handleReinit}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium text-sm disabled:opacity-50"
              >
                {loading ? '執行中...' : '確定重置'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleReinit}
            disabled={loading || !familyId}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold shadow-md disabled:opacity-50"
          >
            🔄 重新初始化家庭資料
          </button>
        )}
      </div>

      {/* Spacer for fixed bottom bar */}
      <div className="h-24" />
    </div>
  );
}
