'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { lookupFamilyByCode, playerLogin } from '@/lib/api/family-scoreboard';
import { savePlayerToken } from '@/lib/playerAuth';
import type { FamilyLookupDto, PlayerSummaryDto } from '@/types/family-scoreboard';

type Step = 'enter-code' | 'select-player' | 'enter-password';

const STEPS: Step[] = ['enter-code', 'select-player', 'enter-password'];

function FamilyLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('enter-code');
  const [code, setCode] = useState('');
  const [family, setFamily] = useState<FamilyLookupDto | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSummaryDto | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 支援 ?code=XXXX 直接跳到選玩家步驟
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (!codeParam) return;
    const trimmed = codeParam.trim().toUpperCase();
    setCode(trimmed);
    setLoading(true);
    lookupFamilyByCode(trimmed)
      .then((result) => { setFamily(result); setStep('select-player'); })
      .catch(() => setError('找不到此家庭代碼，請確認代碼是否正確'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1: 查詢家庭
  async function handleLookup() {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) return;
    setLoading(true);
    setError(null);
    try {
      const result = await lookupFamilyByCode(trimmedCode);
      setFamily(result);
      setStep('select-player');
    } catch {
      setError('找不到此家庭代碼，請確認代碼是否正確');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: 選擇玩家（永遠需要密碼）
  function handleSelectPlayer(player: PlayerSummaryDto) {
    setSelectedPlayer(player);
    setPassword('');
    setError(null);
    setStep('enter-password');
  }

  // Step 3: 登入
  async function handleLogin(player: PlayerSummaryDto, pwd: string) {
    if (!family) return;
    setLoading(true);
    setError(null);
    try {
      const result = await playerLogin({
        familyCode: family.familyCode,
        playerId: player.playerId,
        password: pwd,
      });
      savePlayerToken(result.token);
      router.push('/family-scoreboard/player');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg.includes('not set') ? '此玩家尚未設定密碼，請家長先在後台設定密碼' : '密碼錯誤，請重試');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">⭐</div>
          <h1 className="text-2xl font-black text-amber-800">家庭計分板</h1>
          <p className="text-amber-500 text-sm mt-1">小朋友登入</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-amber-500 text-white' :
                STEPS.indexOf(step) > i
                  ? 'bg-amber-200 text-amber-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {i + 1}
              </div>
              {i < 2 && <div className={`w-8 h-0.5 ${
                STEPS.indexOf(step) > i ? 'bg-amber-300' : 'bg-gray-200'
              }`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          {/* Step 1: Enter Code */}
          {step === 'enter-code' && (
            <div className="space-y-4">
              <div>
                <p className="text-center text-gray-500 text-sm mb-4">輸入家庭代碼</p>
                <p className="text-center text-xs text-gray-400 mb-3">（向爸爸媽媽詢問代碼）</p>
                <input
                  type="text"
                  placeholder="例如：MIDO2376"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  className="w-full border-2 border-amber-200 focus:border-amber-400 rounded-2xl px-4 py-4 text-center text-2xl font-black tracking-widest outline-none transition-colors uppercase min-h-[64px]"
                  autoFocus
                />
              </div>
              <button
                onClick={handleLookup}
                disabled={loading || !code.trim()}
                className="w-full min-h-[56px] bg-amber-500 text-white font-bold text-lg rounded-2xl disabled:opacity-40 hover:bg-amber-600 transition-colors active:scale-95"
              >
                {loading ? '查詢中...' : '進入家庭 →'}
              </button>
            </div>
          )}

          {/* Step 2: Select Player */}
          {step === 'select-player' && family && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-gray-500 text-sm">選擇你的角色</p>
                <p className="text-xs text-amber-500 font-semibold mt-1">{family.familyCode}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {family.players.map((player) => (
                  <button
                    key={player.playerId}
                    onClick={() => handleSelectPlayer(player)}
                    disabled={loading}
                    className="min-h-[120px] rounded-2xl border-2 border-transparent flex flex-col items-center justify-center gap-2 p-4 active:scale-95 transition-all hover:border-amber-300 disabled:opacity-50"
                    style={{ backgroundColor: player.color + '15', borderColor: player.color + '40' }}
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-md"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.emoji ?? player.name?.charAt(0) ?? '?'}
                    </div>
                    <span className="font-bold text-gray-800 text-sm text-center leading-tight">{player.name}</span>
                    <span className="text-xs text-gray-400">需要密碼</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setStep('enter-code'); setFamily(null); }}
                className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 min-h-[44px]"
              >
                ← 重新輸入代碼
              </button>
            </div>
          )}

          {/* Step 3: Enter Password */}
          {step === 'enter-password' && selectedPlayer && (
            <div className="space-y-4">
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-4xl font-black text-white mx-auto mb-3 shadow-md"
                  style={{ backgroundColor: selectedPlayer.color }}
                >
                  {selectedPlayer.emoji ?? selectedPlayer.name?.charAt(0) ?? '?'}
                </div>
                <p className="font-bold text-gray-800">{selectedPlayer.name}</p>
                <p className="text-sm text-gray-400 mt-1">請輸入你的密碼</p>
              </div>
              <input
                type="password"
                placeholder="密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && selectedPlayer && handleLogin(selectedPlayer, password)}
                className="w-full border-2 border-amber-200 focus:border-amber-400 rounded-2xl px-4 py-4 text-center text-xl outline-none transition-colors min-h-[60px]"
                autoFocus
              />
              <button
                onClick={() => handleLogin(selectedPlayer, password)}
                disabled={loading || !password}
                className="w-full min-h-[56px] font-bold text-lg rounded-2xl text-white disabled:opacity-40 active:scale-95 transition-all"
                style={{ backgroundColor: selectedPlayer.color }}
              >
                {loading ? '登入中...' : '確認登入'}
              </button>
              <button
                onClick={() => { setStep('select-player'); setPassword(''); setError(null); }}
                className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 min-h-[44px]"
              >
                ← 重新選擇玩家
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FamilyLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-400 text-lg">載入中...</div>
      </div>
    }>
      <FamilyLoginContent />
    </Suspense>
  );
}
