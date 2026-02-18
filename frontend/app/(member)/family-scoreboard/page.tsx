'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { useFamilyScoreboard } from './hooks/useFamilyScoreboard';
import type { AddTransactionRequest, CreateRedemptionRequest } from '@/types/family-scoreboard';

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'home' | 'history' | 'redeem' | 'report';
type SheetStep = 'select-type' | 'select-category' | 'confirm';

interface Category {
  id: string;
  label: string;
  amount: number;
  emoji: string;
  type: 'earn' | 'deduct';
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 'exam',    label: '考試優秀',     amount: 100, emoji: '🏆', type: 'earn' },
  { id: 'chores',  label: '主動幫忙家事', amount: 5,   emoji: '🏠', type: 'earn' },
  { id: 'kind',    label: '對人友善',     amount: 10,  emoji: '😊', type: 'earn' },
  { id: 'special', label: '表現特別優秀', amount: 20,  emoji: '⭐', type: 'earn' },
  { id: 'fight',   label: '兄弟吵架',     amount: 20,  emoji: '😤', type: 'deduct' },
  { id: 'lie',     label: '不誠實',       amount: 30,  emoji: '🙈', type: 'deduct' },
];

const TABS = [
  { id: 'home'    as Tab, label: '首頁', emoji: '🏠' },
  { id: 'history' as Tab, label: '記錄', emoji: '📋' },
  { id: 'redeem'  as Tab, label: '兌換', emoji: '🎁' },
  { id: 'report'  as Tab, label: '報表', emoji: '📊' },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function FamilyScoreboardPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const familyId = uid ? `family_${uid}` : '';

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) setUid(user.uid);
  }, []);

  const {
    scores,
    transactions,
    rewards,
    redemptions,
    loading,
    error,
    initialize,
    submitTransaction,
    submitRedemption,
    handleRedemption,
    refresh,
  } = useFamilyScoreboard(familyId);

  // ── UI state ────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<Tab>('home');

  // Bottom Sheet
  const [sheetOpen, setSheetOpen]         = useState(false);
  const [sheetPlayerId, setSheetPlayerId] = useState<string | null>(null);
  const [sheetStep, setSheetStep]         = useState<SheetStep>('select-type');
  const [txType, setTxType]               = useState<'earn' | 'deduct'>('earn');
  const [selectedCat, setSelectedCat]     = useState<Category | null>(null);
  const [customAmount, setCustomAmount]   = useState('');
  const [customReason, setCustomReason]   = useState('');
  const [submitting, setSubmitting]       = useState(false);

  // Score bounce animation
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());

  // Redeem
  const [selectedRewardId, setSelectedRewardId]   = useState('');
  const [redeemPlayerId, setRedeemPlayerId]         = useState('');
  const [redeemSubmitting, setRedeemSubmitting] = useState(false);

  // History filter
  const [historyFilter, setHistoryFilter] = useState<string>('all');

  const sheetPlayer = scores.find((p) => p.playerId === sheetPlayerId) ?? null;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function getPlayerName(playerId: string): string {
    return scores.find((p) => p.playerId === playerId)?.name ?? playerId;
  }

  // ── Sheet handlers ──────────────────────────────────────────────────────────

  function openSheet(playerId: string) {
    setSheetPlayerId(playerId);
    setSheetStep('select-type');
    setSelectedCat(null);
    setCustomAmount('');
    setCustomReason('');
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setTimeout(() => {
      setSheetPlayerId(null);
      setSheetStep('select-type');
      setSelectedCat(null);
      setCustomAmount('');
      setCustomReason('');
    }, 300);
  }

  function handleSelectType(type: 'earn' | 'deduct') {
    setTxType(type);
    setSelectedCat(null);
    setSheetStep('select-category');
  }

  function handleSelectCategory(cat: Category | 'custom') {
    if (cat === 'custom') {
      setSelectedCat(null);
      setCustomAmount('');
      setCustomReason('');
    } else {
      setSelectedCat(cat);
      setCustomAmount(String(cat.amount));
      setCustomReason(cat.label);
    }
    setSheetStep('confirm');
  }

  async function handleConfirm() {
    if (!sheetPlayerId) return;
    const amount = Number(customAmount);
    if (!amount || !customReason.trim()) return;

    setSubmitting(true);
    const req: AddTransactionRequest = {
      playerIds: [sheetPlayerId],
      type: txType,
      amount,
      reason: customReason,
      categoryId: selectedCat?.id,
    };
    await submitTransaction(req);

    // Bounce animation on the card
    setAnimatingIds((prev) => new Set(prev).add(sheetPlayerId));
    setTimeout(() => {
      setAnimatingIds((prev) => {
        const next = new Set(prev);
        next.delete(sheetPlayerId);
        return next;
      });
    }, 800);

    setSubmitting(false);
    closeSheet();
  }

  async function handleCreateRedemption() {
    if (!selectedRewardId) return;
    const req: CreateRedemptionRequest = {
      rewardId: selectedRewardId,
      ...(redeemPlayerId ? { playerId: redeemPlayerId } : {}),
    } as CreateRedemptionRequest;
    setRedeemSubmitting(true);
    await submitRedemption(req);
    setSelectedRewardId('');
    setRedeemPlayerId('');
    setRedeemSubmitting(false);
  }

  // ── Computed ────────────────────────────────────────────────────────────────

  const filteredCategories = CATEGORIES.filter((c) => c.type === txType);

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const filteredTransactions =
    historyFilter === 'all'
      ? sortedTransactions
      : sortedTransactions.filter((tx) => tx.playerIds.includes(historyFilter));

  // ── Login guard ─────────────────────────────────────────────────────────────

  if (!uid) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-6xl">⭐</div>
          <p className="text-amber-700 font-semibold">請先登入</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">

      {/* ─────────────────── Header ─────────────────── */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⭐</span>
          <h1 className="text-lg font-bold text-amber-800">家庭積分板</h1>
        </div>
        <div className="flex gap-2">
          {scores.length === 0 && (
            <button
              onClick={initialize}
              disabled={loading}
              className="px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-full font-medium hover:bg-amber-200 disabled:opacity-50 min-h-[44px]"
            >
              初始化
            </button>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 disabled:opacity-50 min-h-[44px]"
          >
            重整
          </button>
          <button
            onClick={() => router.push('/family-scoreboard/admin')}
            className="px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200 min-h-[44px]"
            aria-label="管理後台"
          >
            ⚙️ 管理
          </button>
        </div>
      </header>

      {/* ─────────────────── Error ─────────────────── */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* ─────────────────── Content ─────────────────── */}
      <main className="flex-1 overflow-y-auto pb-20">

        {/* ── Tab: Home ── */}
        {activeTab === 'home' && (
          <div className="p-4 space-y-4">
            {loading && scores.length === 0 && (
              <div className="text-center py-16 text-amber-400">
                <div className="text-4xl mb-3 animate-spin inline-block">⭐</div>
                <p className="text-sm">載入中…</p>
              </div>
            )}

            {!loading && scores.length === 0 && (
              <div className="text-center py-16 space-y-3">
                <div className="text-6xl">🏠</div>
                <p className="text-amber-700 font-semibold">尚無積分資料</p>
                <p className="text-amber-400 text-sm">點擊右上角「初始化」來建立玩家</p>
              </div>
            )}

            {scores.length > 0 && (
              <>
                <p className="text-xs text-amber-500 px-1">
                  點擊玩家卡片加減分 👇
                </p>

                {/* Player Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {scores.map((player) => (
                    <button
                      key={player.playerId}
                      onClick={() => openSheet(player.playerId)}
                      className={`
                        relative bg-white rounded-2xl shadow-md p-4 flex flex-col items-center gap-2.5
                        active:scale-95 transition-transform text-left w-full
                        ${animatingIds.has(player.playerId) ? 'animate-bounce' : ''}
                      `}
                      style={{ borderTop: `4px solid ${player.color}` }}
                    >
                      {/* Avatar */}
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white shadow"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.name.charAt(0)}
                      </div>

                      {/* Name */}
                      <span className="font-bold text-gray-800 text-base">{player.name}</span>

                      {/* Achievement Points */}
                      <div className="text-center">
                        <p
                          className="text-4xl font-black tabular-nums transition-all duration-500"
                          style={{ color: player.color }}
                        >
                          {player.achievementPoints}
                        </p>
                        <p className="text-xs text-gray-400">成就點數</p>
                      </div>

                      {/* Redeemable badge */}
                      <div className="w-full bg-emerald-50 rounded-xl px-2 py-1.5 text-center">
                        <p className="text-sm font-bold text-emerald-600">{player.redeemablePoints}</p>
                        <p className="text-xs text-emerald-400">可兌換</p>
                      </div>

                      {/* Edit icon */}
                      <span
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                        style={{ backgroundColor: player.color + '25', color: player.color }}
                      >
                        ✎
                      </span>
                    </button>
                  ))}
                </div>

                {/* Summary row */}
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">累計統計</p>
                  <div className="space-y-2">
                    {scores.map((p) => (
                      <div key={p.playerId} className="flex items-center gap-2 text-sm">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-gray-600 font-medium">{p.name}</span>
                        <span className="ml-auto text-emerald-600 font-bold">+{p.totalEarned}</span>
                        <span className="text-red-400 font-bold">−{p.totalDeducted}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Tab: History ── */}
        {activeTab === 'history' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-700">交易紀錄</h2>
              <span className="text-xs text-gray-400">{filteredTransactions.length} 筆</span>
            </div>

            {/* Player filter */}
            {scores.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[32px] ${
                    historyFilter === 'all'
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  全部
                </button>
                {scores.map((p) => (
                  <button
                    key={p.playerId}
                    onClick={() => setHistoryFilter(p.playerId)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[32px] ${
                      historyFilter === p.playerId
                        ? 'text-white'
                        : 'bg-white text-gray-500 border border-gray-200'
                    }`}
                    style={historyFilter === p.playerId ? { backgroundColor: p.color } : {}}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {filteredTransactions.length === 0 ? (
              <p className="text-center text-gray-300 py-12 text-sm">尚無紀錄</p>
            ) : (
              filteredTransactions.map((tx) => {
                const playerName = tx.playerIds.map(getPlayerName).join('、');
                const playerScore = scores.find((p) => p.playerId === tx.playerIds[0]);
                return (
                  <div key={tx.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
                    {/* Player color dot */}
                    <div
                      className="w-2 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: playerScore?.color ?? '#d1d5db' }}
                    />
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0 text-sm ${
                        tx.type === 'earn' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                      }`}
                    >
                      {tx.type === 'earn' ? '✨' : '😤'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{tx.reason}</p>
                      <p className="text-xs text-gray-400">
                        {playerName} · {new Date(tx.createdAt).toLocaleDateString('zh-TW', {
                          month: 'numeric', day: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className={`text-base font-black shrink-0 tabular-nums ${tx.type === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.type === 'earn' ? '+' : '−'}{tx.amount}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Tab: Redeem ── */}
        {activeTab === 'redeem' && (
          <div className="p-4 space-y-4">
            <h2 className="text-base font-bold text-gray-700">兌換獎勵</h2>

            {rewards.length === 0 ? (
              <p className="text-center text-gray-300 py-12 text-sm">尚無獎勵</p>
            ) : (
              <>
                {/* Reward list */}
                <div className="space-y-2">
                  {rewards.map((r) => (
                    <div key={r.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                      <span className="text-2xl shrink-0">{r.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800">{r.name}</p>
                        <p className="text-xs text-gray-400">{r.description}</p>
                      </div>
                      <span className="font-bold text-emerald-600 shrink-0">{r.cost} pt</span>
                    </div>
                  ))}
                </div>

                {/* Redeem form */}
                <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-600">申請兌換</p>

                  {/* Player selector */}
                  {scores.length > 1 && (
                    <div className="flex gap-2">
                      {scores.map((p) => (
                        <button
                          key={p.playerId}
                          onClick={() => setRedeemPlayerId(p.playerId)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-colors min-h-[44px] ${
                            redeemPlayerId === p.playerId
                              ? 'text-white border-transparent'
                              : 'bg-white text-gray-500 border-gray-100'
                          }`}
                          style={redeemPlayerId === p.playerId ? { backgroundColor: p.color, borderColor: p.color } : {}}
                        >
                          <span className="block text-base">{p.name.charAt(0)}</span>
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <select
                    value={selectedRewardId}
                    onChange={(e) => setSelectedRewardId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white outline-none focus:border-amber-400"
                  >
                    <option value="">選擇獎勵…</option>
                    {rewards.map((r) => (
                      <option key={r.id} value={r.id}>{r.icon} {r.name} ({r.cost} pt)</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCreateRedemption}
                    disabled={redeemSubmitting || !selectedRewardId}
                    className="w-full py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 disabled:opacity-40 min-h-[44px] transition-colors"
                  >
                    {redeemSubmitting ? '提交中…' : '🎁 申請兌換'}
                  </button>
                </div>

                {/* Pending redemptions */}
                {redemptions.some((r) => r.status === 'pending') && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-500">⏳ 待審核申請</p>
                    {redemptions.filter((r) => r.status === 'pending').map((r) => {
                      const pScore = scores.find((p) => p.playerId === r.playerId);
                      return (
                        <div
                          key={r.id}
                          className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            {pScore && (
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                                style={{ backgroundColor: pScore.color }}
                              >
                                {pScore.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{r.rewardName}</p>
                              <p className="text-xs text-gray-400">{getPlayerName(r.playerId)} · {r.cost} pt</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => handleRedemption(r.id, { action: 'approve' })}
                              className="px-3 py-2 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 min-h-[44px]"
                            >
                              ✓ 核准
                            </button>
                            <button
                              onClick={() => handleRedemption(r.id, { action: 'reject' })}
                              className="px-3 py-2 bg-red-400 text-white rounded-lg text-xs font-medium hover:bg-red-500 min-h-[44px]"
                            >
                              ✕ 拒絕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Tab: Report ── */}
        {activeTab === 'report' && (
          <div className="p-4 space-y-4">
            <h2 className="text-base font-bold text-gray-700">統計報表</h2>
            {scores.map((p) => (
              <div key={p.playerId} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <span className="font-bold text-gray-800 text-base">{p.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  <div className="bg-amber-50 rounded-xl p-2.5">
                    <p className="text-xl font-black tabular-nums" style={{ color: p.color }}>{p.achievementPoints}</p>
                    <p className="text-xs text-gray-400 mt-0.5">成就點</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-2.5">
                    <p className="text-xl font-black text-emerald-600 tabular-nums">{p.redeemablePoints}</p>
                    <p className="text-xs text-gray-400 mt-0.5">可兌換</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2.5">
                    <p className="text-xl font-black text-blue-500 tabular-nums">{p.totalRedeemed}</p>
                    <p className="text-xs text-gray-400 mt-0.5">已兌換</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-green-50 rounded-xl p-2">
                    <p className="text-sm font-bold text-green-600">+{p.totalEarned}</p>
                    <p className="text-xs text-gray-400">累計獲得</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-2">
                    <p className="text-sm font-bold text-red-500">−{p.totalDeducted}</p>
                    <p className="text-xs text-gray-400">累計扣除</p>
                  </div>
                </div>
              </div>
            ))}
            {scores.length === 0 && (
              <p className="text-center text-gray-300 py-12 text-sm">尚無資料</p>
            )}
          </div>
        )}

      </main>

      {/* ─────────────────── Bottom Tab Bar ─────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-30">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 flex flex-col items-center gap-0.5 min-h-[56px] transition-colors ${
                activeTab === tab.id ? 'text-amber-600' : 'text-gray-300'
              }`}
            >
              <span className="text-xl">{tab.emoji}</span>
              <span className={`text-xs font-medium ${activeTab === tab.id ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* ─────────────────── Bottom Sheet Backdrop ─────────────────── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-40" onClick={closeSheet}>
          <div className="absolute inset-0 bg-black/40 transition-opacity" />
        </div>
      )}

      {/* ─────────────────── Bottom Sheet ─────────────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          sheetOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pb-10 max-h-[85vh] overflow-y-auto">

          {/* Sheet Header */}
          <div className="flex items-center justify-between mb-5 mt-1">
            <div className="flex items-center gap-3">
              {sheetPlayer && (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black text-white"
                  style={{ backgroundColor: sheetPlayer.color }}
                >
                  {sheetPlayer.name.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-gray-800">{sheetPlayer?.name ?? ''}</h2>
                {sheetStep !== 'select-type' && (
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                      txType === 'earn'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-500'
                    }`}
                  >
                    {txType === 'earn' ? '+ 加分' : '− 扣分'}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={closeSheet}
              className="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-gray-500 rounded-full hover:bg-gray-100 text-lg"
            >
              ✕
            </button>
          </div>

          {/* ── Step 1: Select Type ── */}
          {sheetStep === 'select-type' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSelectType('earn')}
                className="py-6 rounded-2xl bg-green-50 border-2 border-green-200 flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <span className="text-4xl">✨</span>
                <span className="font-bold text-green-600 text-lg">加分</span>
                <span className="text-xs text-green-400">表揚好行為</span>
              </button>
              <button
                onClick={() => handleSelectType('deduct')}
                className="py-6 rounded-2xl bg-red-50 border-2 border-red-200 flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <span className="text-4xl">😤</span>
                <span className="font-bold text-red-500 text-lg">扣分</span>
                <span className="text-xs text-red-300">提醒改正</span>
              </button>
            </div>
          )}

          {/* ── Step 2: Select Category ── */}
          {sheetStep === 'select-category' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">選擇類別或自訂</p>
              <div className="grid grid-cols-2 gap-2">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat)}
                    className={`py-3 px-3 rounded-xl flex items-center gap-2.5 text-left min-h-[64px] active:scale-95 transition-transform ${
                      txType === 'earn'
                        ? 'bg-green-50 hover:bg-green-100'
                        : 'bg-red-50 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl shrink-0">{cat.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 leading-tight">{cat.label}</p>
                      <p className={`text-base font-black tabular-nums ${txType === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
                        {txType === 'earn' ? '+' : '−'}{cat.amount}
                      </p>
                    </div>
                  </button>
                ))}

                {/* Custom */}
                <button
                  onClick={() => handleSelectCategory('custom')}
                  className="py-3 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center gap-2.5 text-left min-h-[64px] active:scale-95 transition-transform"
                >
                  <span className="text-2xl shrink-0">✏️</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">自訂</p>
                    <p className="text-base font-black text-gray-300">自行填寫</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setSheetStep('select-type')}
                className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← 返回
              </button>
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {sheetStep === 'confirm' && (
            <div className="space-y-4">

              {/* Amount input */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                  {txType === 'earn' ? '加' : '扣'}分數量
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full border-2 border-gray-200 focus:border-amber-400 rounded-2xl px-4 py-3 text-3xl font-black text-center outline-none transition-colors tabular-nums"
                />
              </div>

              {/* Reason input */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">原因</label>
                <input
                  type="text"
                  placeholder="說明原因…"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full border-2 border-gray-200 focus:border-amber-400 rounded-2xl px-4 py-3 text-sm outline-none transition-colors"
                />
              </div>

              {/* Preview card */}
              {sheetPlayer && customAmount && customReason.trim() && (
                <div
                  className={`rounded-2xl p-4 text-center border ${
                    txType === 'earn'
                      ? 'bg-green-50 border-green-100'
                      : 'bg-red-50 border-red-100'
                  }`}
                >
                  <p className="text-sm text-gray-600">
                    給{' '}
                    <span className="font-bold" style={{ color: sheetPlayer.color }}>
                      {sheetPlayer.name}
                    </span>
                    {' '}
                    <span
                      className={`text-xl font-black tabular-nums ${
                        txType === 'earn' ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {txType === 'earn' ? '+' : '−'}{customAmount}
                    </span>
                    {' '}分
                  </p>
                  <p className="text-xs text-gray-400 mt-1">因為：{customReason}</p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleConfirm}
                disabled={submitting || !customAmount || !customReason.trim()}
                className={`w-full py-4 rounded-2xl font-bold text-white text-base min-h-[56px] disabled:opacity-40 active:scale-95 transition-all ${
                  txType === 'earn'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {submitting
                  ? '提交中…'
                  : txType === 'earn'
                  ? '✨ 確認加分'
                  : '確認扣分'}
              </button>

              <button
                onClick={() => setSheetStep('select-category')}
                className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← 返回
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
