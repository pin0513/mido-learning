'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getVisitorLeaderboard, playerLogin } from '@/lib/api/family-scoreboard';
import { saveFamilyCode } from '@/lib/familyCodeCookie';
import { savePlayerToken } from '@/lib/playerAuth';
import type { VisitorLeaderboardDto, VisitorPlayerDto } from '@/types/family-scoreboard';

export default function VisitorLeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [leaderboard, setLeaderboard] = useState<VisitorLeaderboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedPlayer, setSelectedPlayer] = useState<VisitorPlayerDto | null>(null);
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await getVisitorLeaderboard(code);
      setLeaderboard(data);
      saveFamilyCode(code);
    } catch {
      setError('找不到此家庭代碼');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  function handlePlayerClick(player: VisitorPlayerDto) {
    setSelectedPlayer(player);
    setPassword('');
    setLoginError(null);
  }

  function closeModal() {
    setSelectedPlayer(null);
    setPassword('');
    setLoginError(null);
  }

  async function handleLogin() {
    if (!selectedPlayer) return;

    if (!selectedPlayer.hasPassword) {
      setLoginError('此玩家尚未設定密碼，請家長先在後台設定密碼');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);
    try {
      const result = await playerLogin({
        familyCode: code,
        playerId: selectedPlayer.playerId,
        password,
      });
      savePlayerToken(result.token);
      router.push('/family-scoreboard/player');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setLoginError(
        msg.includes('not set')
          ? '此玩家尚未設定密碼，請家長先在後台設定密碼'
          : '密碼錯誤，請重試'
      );
      setLoginLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-amber-400 text-lg">載入排行榜中...</div>
      </div>
    );
  }

  if (error || !leaderboard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-4">😢</div>
        <p className="text-gray-600 mb-4">{error ?? '找不到此家庭'}</p>
        <a
          href="/family-login"
          className="text-amber-600 font-semibold hover:underline"
        >
          前往小朋友登入
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 min-h-screen">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">⭐</div>
          <div className="inline-block bg-amber-100 text-amber-700 font-mono font-bold text-sm px-3 py-1 rounded-full mb-2">
            {leaderboard.familyCode}
          </div>
          <h1 className="text-2xl font-black text-amber-800">排行榜</h1>
        </div>

        {/* Leaderboard */}
        <div className="space-y-3">
          {leaderboard.players.map((player, index) => {
            const isFirst = index === 0 && player.achievementPoints > 0;
            return (
              <button
                key={player.playerId}
                onClick={() => handlePlayerClick(player)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98] ${
                  isFirst
                    ? 'bg-gradient-to-r from-amber-100 to-yellow-50 border-2 border-amber-300 shadow-md'
                    : 'bg-white border border-gray-100 shadow-sm hover:border-amber-200'
                }`}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                  isFirst
                    ? 'bg-amber-400 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {isFirst ? '👑' : index + 1}
                </div>

                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: player.color }}
                >
                  {player.emoji ?? player.name?.charAt(0) ?? '?'}
                </div>

                {/* Info */}
                <div className="flex-1 text-left">
                  <div className="font-bold text-gray-800">{player.name}</div>
                  <div className="text-xs text-gray-400">點擊登入</div>
                </div>

                {/* Points & Allowance */}
                <div className="text-right">
                  <div className={`text-lg font-black ${isFirst ? 'text-amber-600' : 'text-gray-700'}`}>
                    {player.achievementPoints}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">成就點</div>
                  <div className="text-sm font-bold text-emerald-600 mt-0.5">
                    ${player.allowanceBalance}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">零用金</div>
                </div>
              </button>
            );
          })}
        </div>

        {leaderboard.players.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🏠</div>
            <p className="text-gray-500">這個家庭還沒有成員</p>
          </div>
        )}

        {/* Bottom links */}
        <div className="mt-8 text-center space-y-3">
          <a
            href={`/family-login?code=${code}`}
            className="block text-amber-600 font-semibold text-sm hover:underline"
          >
            小朋友登入
          </a>
          <a
            href="/login"
            className="block text-gray-400 text-xs hover:text-gray-600"
          >
            家長登入
          </a>
        </div>
      </div>

      {/* Login Modal */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            {/* Player avatar */}
            <div className="text-center mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-4xl font-black text-white mx-auto mb-3 shadow-md"
                style={{ backgroundColor: selectedPlayer.color }}
              >
                {selectedPlayer.emoji ?? selectedPlayer.name?.charAt(0) ?? '?'}
              </div>
              <p className="font-bold text-gray-800 text-lg">{selectedPlayer.name}</p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center">
                {loginError}
              </div>
            )}

            {!selectedPlayer.hasPassword ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-amber-50 rounded-xl">
                  <p className="text-amber-700 text-sm">
                    此玩家尚未設定密碼，請家長先在後台設定密碼
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 min-h-[44px]"
                >
                  關閉
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 text-center mb-3">請輸入你的密碼</p>
                  <input
                    type="password"
                    placeholder="密碼"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="w-full border-2 border-amber-200 focus:border-amber-400 rounded-2xl px-4 py-4 text-center text-xl outline-none transition-colors min-h-[60px]"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loginLoading || !password}
                  className="w-full min-h-[56px] font-bold text-lg rounded-2xl text-white disabled:opacity-40 active:scale-95 transition-all"
                  style={{ backgroundColor: selectedPlayer.color }}
                >
                  {loginLoading ? '登入中...' : '確認登入'}
                </button>
                <button
                  onClick={closeModal}
                  className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 min-h-[44px]"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
