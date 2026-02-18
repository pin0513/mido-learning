'use client';

import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useFamilyScoreboard } from './hooks/useFamilyScoreboard';
import type { AddTransactionRequest, CreateRedemptionRequest } from '@/types/family-scoreboard';

export default function FamilyScoreboardPage() {
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

  // ── Transaction form state ─────────────────────────────────────────────────

  const [txType, setTxType] = useState<'earn' | 'deduct'>('earn');
  const [txAmount, setTxAmount] = useState('');
  const [txReason, setTxReason] = useState('');
  const [txPlayerIds, setTxPlayerIds] = useState<string[]>([]);
  const [txSubmitting, setTxSubmitting] = useState(false);

  async function handleAddTransaction() {
    if (!txAmount || !txReason || txPlayerIds.length === 0) return;
    const req: AddTransactionRequest = {
      playerIds: txPlayerIds,
      type: txType,
      amount: Number(txAmount),
      reason: txReason,
    };
    setTxSubmitting(true);
    await submitTransaction(req);
    setTxAmount('');
    setTxReason('');
    setTxPlayerIds([]);
    setTxSubmitting(false);
  }

  // ── Redemption form state ──────────────────────────────────────────────────

  const [selectedRewardId, setSelectedRewardId] = useState('');
  const [redeemSubmitting, setRedeemSubmitting] = useState(false);

  async function handleCreateRedemption() {
    if (!selectedRewardId) return;
    const req: CreateRedemptionRequest = { rewardId: selectedRewardId };
    setRedeemSubmitting(true);
    await submitRedemption(req);
    setSelectedRewardId('');
    setRedeemSubmitting(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!uid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">請先登入</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-800">家庭積分板</h1>
          <div className="flex gap-2">
            <button
              onClick={initialize}
              disabled={loading}
              className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
            >
              初始化
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              重新整理
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {loading && (
          <div className="mb-4 text-center text-gray-500 text-sm">載入中…</div>
        )}

        {/* Scoreboard */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">積分排行</h2>
          {scores.length === 0 ? (
            <p className="text-gray-400 text-sm">尚無積分資料（請先初始化）</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {scores.map((p) => (
                <div
                  key={p.playerId}
                  className="bg-white rounded-xl shadow-sm p-4 border-l-4"
                  style={{ borderColor: p.color }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-gray-800">{p.name}</span>
                    <span className="text-xs text-gray-400">{p.playerId}</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">成就點</p>
                      <p className="font-bold text-gray-800">{p.achievementPoints}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">可兌換</p>
                      <p className="font-bold text-green-600">{p.redeemablePoints}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">累計獲得</p>
                      <p className="font-medium text-gray-600">{p.totalEarned}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add Transaction (Admin) */}
        <section className="mb-8 bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">新增積分交易</h2>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setTxType('earn')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  txType === 'earn'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                + 加分
              </button>
              <button
                onClick={() => setTxType('deduct')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  txType === 'deduct'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                − 扣分
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">選擇玩家</label>
              <div className="flex flex-wrap gap-2">
                {scores.map((p) => (
                  <button
                    key={p.playerId}
                    onClick={() =>
                      setTxPlayerIds((prev) =>
                        prev.includes(p.playerId)
                          ? prev.filter((id) => id !== p.playerId)
                          : [...prev, p.playerId]
                      )
                    }
                    className={`px-3 py-1 rounded-full text-sm ${
                      txPlayerIds.includes(p.playerId)
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                    style={
                      txPlayerIds.includes(p.playerId)
                        ? { backgroundColor: p.color }
                        : undefined
                    }
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              placeholder="積分數量"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="原因（如：完成作業）"
              value={txReason}
              onChange={(e) => setTxReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleAddTransaction}
              disabled={txSubmitting || txPlayerIds.length === 0 || !txAmount || !txReason}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {txSubmitting ? '提交中…' : '確認'}
            </button>
          </div>
        </section>

        {/* Rewards & Redeem */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">可兌換獎勵</h2>
          {rewards.length === 0 ? (
            <p className="text-gray-400 text-sm">尚無獎勵項目</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {rewards.map((r) => (
                  <div key={r.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                    <span className="text-2xl">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{r.name}</p>
                      <p className="text-xs text-gray-500">{r.description}</p>
                    </div>
                    <span className="font-bold text-green-600 shrink-0">{r.cost} pt</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 flex gap-2">
                <select
                  value={selectedRewardId}
                  onChange={(e) => setSelectedRewardId(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">選擇要兌換的獎勵…</option>
                  {rewards.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.icon} {r.name} ({r.cost} pt)
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCreateRedemption}
                  disabled={redeemSubmitting || !selectedRewardId}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {redeemSubmitting ? '提交中…' : '申請兌換'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Redemption Requests */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">兌換申請</h2>
          {redemptions.length === 0 ? (
            <p className="text-gray-400 text-sm">尚無兌換申請</p>
          ) : (
            <div className="space-y-2">
              {redemptions.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{r.rewardName}</p>
                    <p className="text-xs text-gray-500">
                      {r.playerId} · {r.cost} pt ·{' '}
                      {new Date(r.requestedAt).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        r.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : r.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {r.status === 'pending'
                        ? '待審核'
                        : r.status === 'approved'
                        ? '已核准'
                        : '已拒絕'}
                    </span>
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRedemption(r.id, { action: 'approve' })}
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          核准
                        </button>
                        <button
                          onClick={() => handleRedemption(r.id, { action: 'reject' })}
                          className="px-2 py-1 bg-red-400 text-white rounded text-xs hover:bg-red-500"
                        >
                          拒絕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Transaction History */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">交易紀錄</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-sm">尚無交易紀錄</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3"
                >
                  <span
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      tx.type === 'earn'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {tx.type === 'earn' ? '+' : '−'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{tx.reason}</p>
                    <p className="text-xs text-gray-400">
                      {tx.playerIds.join(', ')} ·{' '}
                      {new Date(tx.createdAt).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                  <span
                    className={`font-bold shrink-0 ${
                      tx.type === 'earn' ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {tx.type === 'earn' ? '+' : '−'}
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
