'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayerContext } from '@/app/(player)/layout';
import {
  getScores,
  getAvailableTasks,
  submitTaskCompletion,
  submitPlayerSubmission,
  getMyHistory,
  getPlayerShopItems,
  createPlayerShopOrder,
  getPlayerAllowanceBalance,
  getPlayerEvents,
  getPlayerAllowanceLedger,
  getMyStatus,
} from '@/lib/api/family-scoreboard';
import { clearPlayerToken } from '@/lib/playerAuth';
import type {
  PlayerScoreDto,
  TaskDto,
  TransactionDto,
  ShopItemDto,
  AllowanceBalanceDto,
  EventDto,
  AllowanceLedgerDto,
  PlayerStatusDto,
} from '@/types/family-scoreboard';

type PlayerTab = 'score' | 'tasks' | 'shop' | 'history' | 'report';

// 難度設定
const DIFFICULTY_CONFIG = {
  easy:   { label: '簡單', color: 'bg-green-100 text-green-700', xp: 5 },
  medium: { label: '中等', color: 'bg-amber-100 text-amber-700', xp: 15 },
  hard:   { label: '困難', color: 'bg-red-100 text-red-700', xp: 30 },
} as const;

// 任務類型設定
const TYPE_CONFIG = {
  household: { label: '家事',      emoji: '🏠' },
  exam:      { label: '考試',      emoji: '📚' },
  activity:  { label: '自主活動',  emoji: '🌟' },
} as const;

// 週期任務標籤
const PERIOD_LABELS: Record<string, string> = {
  daily:  '每日',
  weekly: '本週',
  once:   '單次',
};

const WEEKDAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

// 自主回報預設（家事）
const HOUSEHOLD_PRESETS = [
  { reason: '主動打掃房間', amount: 10, allowance: 5,  emoji: '🧹' },
  { reason: '洗碗',         amount: 5,  allowance: 5,  emoji: '🍽️' },
  { reason: '整理玩具',     amount: 5,  allowance: 3,  emoji: '🧸' },
  { reason: '倒垃圾',       amount: 5,  allowance: 3,  emoji: '🗑️' },
  { reason: '澆花',         amount: 5,  allowance: 3,  emoji: '🌱' },
  { reason: '整理書包',     amount: 3,  allowance: 2,  emoji: '🎒' },
];

// 考試科目
const EXAM_SUBJECTS = ['國語', '英語', '數學', '自然', '社會', '體育', '其他'];

// 考試分數範圍
const EXAM_SCORE_RANGES = [
  { label: '100分',    xp: 50,  allowance: 30, emoji: '🏆' },
  { label: '90-99分',  xp: 30,  allowance: 20, emoji: '⭐' },
  { label: '80-89分',  xp: 20,  allowance: 15, emoji: '😊' },
  { label: '70-79分',  xp: 15,  allowance: 10, emoji: '👍' },
  { label: '60-69分',  xp: 10,  allowance: 5,  emoji: '📝' },
  { label: '60分以下', xp: 5,   allowance: 0,  emoji: '💪' },
];

// 閱讀/訓練預設
const ACTIVITY_PRESETS = [
  { reason: '自主閱讀30分鐘', amount: 15, allowance: 10, emoji: '📖' },
  { reason: '運動30分鐘',     amount: 10, allowance: 8,  emoji: '⚽' },
  { reason: '練琴',           amount: 10, allowance: 8,  emoji: '🎹' },
  { reason: '畫畫/創作',      amount: 10, allowance: 5,  emoji: '🎨' },
  { reason: '學習新技能',     amount: 15, allowance: 10, emoji: '💡' },
  { reason: '幫助他人',       amount: 10, allowance: 5,  emoji: '🤝' },
];

// 商城商品類型圖示
const SHOP_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  physical:  { label: '實體商品', color: 'bg-blue-100 text-blue-700' },
  activity:  { label: '活動',     color: 'bg-green-100 text-green-700' },
  privilege: { label: '特權',     color: 'bg-purple-100 text-purple-700' },
  money:     { label: '零用金',   color: 'bg-amber-100 text-amber-700' },
};

const TABS: { id: PlayerTab; label: string; emoji: string }[] = [
  { id: 'score',   label: '積分',  emoji: '⭐' },
  { id: 'tasks',   label: '任務',  emoji: '✅' },
  { id: 'shop',    label: '商城',  emoji: '🛒' },
  { id: 'history', label: '記錄',  emoji: '📋' },
  { id: 'report',  label: '回報',  emoji: '📝' },
];

export default function PlayerPage() {
  const router = useRouter();
  const { playerId, playerName, familyId } = usePlayerContext();
  const [activeTab, setActiveTab] = useState<PlayerTab>('score');

  // Data
  const [allScores, setAllScores]   = useState<PlayerScoreDto[]>([]);
  const [myScore, setMyScore]       = useState<PlayerScoreDto | null>(null);
  const [allowance, setAllowance]   = useState<AllowanceBalanceDto | null>(null);
  const [tasks, setTasks]           = useState<TaskDto[]>([]);
  const [history, setHistory]       = useState<TransactionDto[]>([]);
  const [shopItems, setShopItems]   = useState<ShopItemDto[]>([]);
  const [events, setEvents]         = useState<EventDto[]>([]);
  const [ledger, setLedger]         = useState<AllowanceLedgerDto[]>([]);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatusDto | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Task state
  const [taskFilter, setTaskFilter]         = useState<'all' | 'daily' | 'weekly' | 'once'>('all');
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [taskSubmitted, setTaskSubmitted]   = useState<Set<string>>(new Set());

  // Report state
  const [reportCategory, setReportCategory] = useState<'household' | 'exam' | 'activity' | null>(null);
  const [examSubject, setExamSubject]       = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submitting, setSubmitting]         = useState(false);

  // Shop state
  const [orderingItemId, setOrderingItemId] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess]     = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const loadData = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);
    setError(null);
    try {
      const [scoresData, tasksData, historyData, shopData, eventsData, allowanceData, ledgerData, statusData] = await Promise.all([
        getScores(familyId),
        getAvailableTasks(familyId),
        getMyHistory(familyId),
        getPlayerShopItems(familyId).catch(() => [] as ShopItemDto[]),
        getPlayerEvents(familyId, currentMonth).catch(() => [] as EventDto[]),
        getPlayerAllowanceBalance(familyId).catch(() => null),
        getPlayerAllowanceLedger(familyId).catch(() => [] as AllowanceLedgerDto[]),
        getMyStatus(familyId).catch(() => null),
      ]);
      setAllScores(scoresData);
      setMyScore(scoresData.find((s) => s.playerId === playerId) ?? null);
      setTasks(tasksData);
      setHistory(historyData);
      setShopItems(shopData);
      setEvents(eventsData);
      setAllowance(allowanceData);
      setLedger(ledgerData);
      setPlayerStatus(statusData);
    } catch {
      setError('載入失敗，請重試');
    } finally {
      setLoading(false);
    }
  }, [familyId, playerId, currentMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  const todayWeekday = new Date().getDay();

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'daily')  return t.periodType === 'daily';
    if (taskFilter === 'weekly') return t.periodType === 'weekly' && t.weekDays.includes(todayWeekday);
    if (taskFilter === 'once')   return t.periodType === 'once';
    return true;
  });

  async function handleSubmitTask(task: TaskDto) {
    setSubmittingTaskId(task.taskId);
    try {
      await submitTaskCompletion(familyId, { taskId: task.taskId });
      setTaskSubmitted((prev) => new Set(prev).add(task.taskId));
    } catch {
      setError('提交失敗，請重試');
    } finally {
      setSubmittingTaskId(null);
    }
  }

  async function handleSubmitPreset(preset: { reason: string; amount: number }, categoryType: 'household' | 'activity') {
    setSubmitting(true);
    try {
      await submitPlayerSubmission(familyId, { categoryType, reason: preset.reason, amount: preset.amount });
      setSubmissionSuccess(true);
      setReportCategory(null);
      setTimeout(() => setSubmissionSuccess(false), 3000);
    } catch {
      setError('提交失敗');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitExam(subject: string, scoreRange: { label: string; xp: number }) {
    setSubmitting(true);
    try {
      await submitPlayerSubmission(familyId, {
        categoryType: 'exam',
        reason: `${subject} ${scoreRange.label}`,
        amount: scoreRange.xp,
      });
      setSubmissionSuccess(true);
      setReportCategory(null);
      setExamSubject(null);
      setTimeout(() => setSubmissionSuccess(false), 3000);
    } catch {
      setError('提交失敗');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShopOrder(item: ShopItemDto) {
    setOrderingItemId(item.itemId);
    try {
      await createPlayerShopOrder(familyId, { itemId: item.itemId });
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch {
      setError('申請失敗，請重試');
    } finally {
      setOrderingItemId(null);
    }
  }

  function handleLogout() {
    clearPlayerToken();
    router.push('/family-login');
  }

  const rankedScores = [...allScores].sort((a, b) => b.achievementPoints - a.achievementPoints);
  const myRank = rankedScores.findIndex((s) => s.playerId === playerId) + 1;

  // ── Time-based stats ──────────────────────────────────────────────────────
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayXp = history
    .filter((t) => t.type === 'earn' && t.createdAt.slice(0, 10) === todayStr)
    .reduce((s, t) => s + t.amount, 0);
  const weekXp = history
    .filter((t) => t.type === 'earn' && new Date(t.createdAt) >= weekStart)
    .reduce((s, t) => s + t.amount, 0);
  const monthXp = history
    .filter((t) => t.type === 'earn' && new Date(t.createdAt) >= monthStart)
    .reduce((s, t) => s + t.amount, 0);

  const weekAllowanceIn = ledger
    .filter((l) => l.amount > 0 && new Date(l.createdAt) >= weekStart)
    .reduce((s, l) => s + l.amount, 0);
  const weekAllowanceOut = ledger
    .filter((l) => l.amount < 0 && new Date(l.createdAt) >= weekStart)
    .reduce((s, l) => s + Math.abs(l.amount), 0);

  return (
    <div className="min-h-screen bg-amber-50 lg:flex">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-amber-100 shadow-sm">
        <div className="px-6 py-5 border-b border-amber-100">
          {myScore && (
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black text-white shadow"
                style={{ backgroundColor: myScore.color }}
              >
                {myScore.emoji ?? playerName.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-gray-800">{playerName}</p>
                <p className="text-xs text-amber-500">#{myRank} 排名</p>
              </div>
            </div>
          )}
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left min-h-[48px] ${
                activeTab === tab.id ? 'bg-amber-50 text-amber-700 font-bold' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-6">
          <button
            onClick={handleLogout}
            className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 min-h-[44px]"
          >
            登出
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden bg-amber-500 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow">
          <div className="flex items-center gap-2">
            {myScore && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-black text-white shadow"
                style={{ backgroundColor: myScore.color + 'cc' }}
              >
                {myScore.emoji ?? playerName.charAt(0)}
              </div>
            )}
            <span className="font-bold">{playerName}</span>
          </div>
          <button onClick={handleLogout} className="text-xs text-amber-100 min-h-[44px] px-3">登出</button>
        </header>

        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm text-center">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-400">✕</button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="max-w-2xl mx-auto">

            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="text-amber-400 text-3xl animate-spin">⭐</div>
              </div>
            )}

            {/* ── Tab: Score Dashboard ── */}
            {!loading && activeTab === 'score' && (
              <div className="p-4 lg:p-6 space-y-4">
                {myScore && (
                  <div className="rounded-3xl p-6 text-white shadow-xl" style={{ backgroundColor: myScore.color }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">{myScore.emoji ?? '⭐'}</div>
                      <div className="text-right">
                        <p className="text-xs opacity-75">排名</p>
                        <p className="text-2xl font-black">#{myRank}</p>
                      </div>
                    </div>
                    <p className="font-bold opacity-90 mb-1">{myScore.name}</p>
                    <p className="text-5xl font-black tabular-nums">{myScore.achievementPoints}</p>
                    <p className="text-sm opacity-75 mt-1">成就點數 XP</p>
                  </div>
                )}

                {myScore && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                      <p className="text-2xl font-black text-emerald-600 tabular-nums">{myScore.redeemablePoints}</p>
                      <p className="text-xs text-gray-400 mt-1">可兌換點數</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                      <p className="text-2xl font-black text-amber-500 tabular-nums">{allowance?.balance ?? '–'}</p>
                      <p className="text-xs text-gray-400 mt-1">零用金餘額</p>
                    </div>
                  </div>
                )}

                {/* ── 時間統計 ── */}
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <p className="text-sm font-bold text-gray-600 mb-3">⭐ 經驗值統計</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl p-3" style={{ backgroundColor: '#fef3c7' }}>
                      <p className="text-xl font-black text-amber-700 tabular-nums">+{todayXp}</p>
                      <p className="text-[11px] text-amber-600 mt-0.5 font-medium">今日</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ backgroundColor: '#d1fae5' }}>
                      <p className="text-xl font-black text-emerald-700 tabular-nums">+{weekXp}</p>
                      <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">本週</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ backgroundColor: '#dbeafe' }}>
                      <p className="text-xl font-black text-blue-700 tabular-nums">+{monthXp}</p>
                      <p className="text-[11px] text-blue-600 mt-0.5 font-medium">本月</p>
                    </div>
                  </div>
                </div>

                {/* ── 本週零用金 ── */}
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <p className="text-sm font-bold text-gray-600 mb-3">💰 本週零用金</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#d1fae5' }}>
                      <p className="text-xl font-black text-emerald-700 tabular-nums">+{weekAllowanceIn}</p>
                      <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">本週入金</p>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#fee2e2' }}>
                      <p className="text-xl font-black text-red-600 tabular-nums">-{weekAllowanceOut}</p>
                      <p className="text-[11px] text-red-500 mt-0.5 font-medium">本週出金</p>
                    </div>
                  </div>
                  {(weekAllowanceIn > 0 || weekAllowanceOut > 0) && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                        <span>入金比例</span>
                        <span>淨值 {weekAllowanceIn - weekAllowanceOut >= 0 ? '+' : ''}{weekAllowanceIn - weekAllowanceOut}</span>
                      </div>
                      <div className="h-2.5 bg-red-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                          style={{ width: `${weekAllowanceIn + weekAllowanceOut === 0 ? 0 : Math.round((weekAllowanceIn / (weekAllowanceIn + weekAllowanceOut)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 封印警告 ── */}
                {playerStatus && playerStatus.activeSeals.length > 0 && (
                  <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 space-y-2">
                    <p className="text-sm font-bold text-red-600 flex items-center gap-1.5">
                      🔒 目前封印中
                    </p>
                    {playerStatus.activeSeals.map((seal) => (
                      <div key={seal.sealId} className="flex items-center gap-2 bg-white rounded-xl p-3">
                        <span className="text-xl">🔒</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-red-700">{seal.name}</p>
                          {seal.description && (
                            <p className="text-xs text-red-400">{seal.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── 處罰警告 ── */}
                {playerStatus && playerStatus.activePenalties.length > 0 && (
                  <div className="rounded-2xl border-2 border-orange-300 bg-orange-50 p-4 space-y-2">
                    <p className="text-sm font-bold text-orange-600 flex items-center gap-1.5">
                      ⚠️ 待完成處罰
                    </p>
                    {playerStatus.activePenalties.map((penalty) => (
                      <div key={penalty.penaltyId} className="flex items-center gap-2 bg-white rounded-xl p-3">
                        <span className="text-xl">⚠️</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-orange-700">{penalty.name}</p>
                          {penalty.description && (
                            <p className="text-xs text-orange-400">{penalty.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── 道具箱（活躍效果） ── */}
                {playerStatus && playerStatus.activeEffects.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
                    <p className="text-sm font-bold text-gray-600 mb-1">🎒 道具箱</p>
                    {playerStatus.activeEffects.map((effect) => {
                      const isMultiplier = effect.type === 'xp-multiplier';
                      const expiresAt = effect.expiresAt ? new Date(effect.expiresAt) : null;
                      const minutesLeft = expiresAt
                        ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000))
                        : null;
                      return (
                        <div key={effect.effectId} className="flex items-center gap-3 bg-purple-50 rounded-xl p-3">
                          <span className="text-2xl">{isMultiplier ? '⚡' : '✨'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-purple-700">{effect.name}</p>
                            {isMultiplier && effect.multiplier && (
                              <p className="text-xs text-purple-500">XP 倍率 ×{effect.multiplier}</p>
                            )}
                            {minutesLeft !== null && (
                              <p className="text-xs text-purple-400">
                                剩餘 {minutesLeft >= 60
                                  ? `${Math.floor(minutesLeft / 60)}小時${minutesLeft % 60}分`
                                  : `${minutesLeft}分鐘`}
                              </p>
                            )}
                          </div>
                          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full font-medium">生效中</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {events.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm p-4">
                    <p className="text-sm font-bold text-gray-600 mb-3">📅 本月活動</p>
                    <div className="space-y-2">
                      {events.slice(0, 3).map((ev) => (
                        <div key={ev.eventId} className="flex items-center gap-3">
                          <span className="text-xl">{ev.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{ev.title}</p>
                            <p className="text-xs text-gray-400">
                              {ev.startDate}{ev.endDate ? ` ~ ${ev.endDate}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {allScores.length > 1 && (
                  <div className="bg-white rounded-2xl shadow-sm p-4">
                    <p className="text-sm font-bold text-gray-600 mb-3">🏆 家庭排行榜</p>
                    <div className="space-y-2">
                      {rankedScores.map((p, i) => (
                        <div
                          key={p.playerId}
                          className={`flex items-center gap-3 p-2 rounded-xl ${p.playerId === playerId ? 'bg-amber-50' : ''}`}
                        >
                          <span className="text-lg w-6 text-center">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                          </span>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-base font-black text-white shrink-0"
                            style={{ backgroundColor: p.color }}
                          >
                            {p.emoji ?? p.name.charAt(0)}
                          </div>
                          <span className="flex-1 text-sm font-medium text-gray-700">{p.name}</span>
                          <span className="font-black tabular-nums" style={{ color: p.color }}>
                            {p.achievementPoints}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Tasks ── */}
            {!loading && activeTab === 'tasks' && (
              <div className="p-4 lg:p-6 space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(['all', 'daily', 'weekly', 'once'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTaskFilter(f)}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[44px] shrink-0 ${
                        taskFilter === f
                          ? 'bg-amber-500 text-white'
                          : 'bg-white text-gray-500 border border-gray-200'
                      }`}
                    >
                      {f === 'all' ? '全部' : f === 'daily' ? '每日' : f === 'weekly' ? '本週' : '單次'}
                    </button>
                  ))}
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="text-center py-16 text-gray-300">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-sm">目前沒有任務</p>
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const diff      = DIFFICULTY_CONFIG[task.difficulty];
                    const typeConf  = TYPE_CONFIG[task.type];
                    const submitted = taskSubmitted.has(task.taskId);
                    return (
                      <div key={task.taskId} className={`bg-white rounded-2xl shadow-sm p-4 space-y-3 ${submitted ? 'opacity-60' : ''}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-2xl mt-0.5">{typeConf.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-800">{task.title}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.color}`}>{diff.label}</span>
                              {task.periodType !== 'once' && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                  {PERIOD_LABELS[task.periodType]}
                                </span>
                              )}
                            </div>
                            {task.periodType === 'weekly' && task.weekDays.length > 0 && (
                              <p className="text-xs text-gray-400">
                                {task.weekDays.map((d) => WEEKDAY_LABELS[d]).join('、')}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-black text-amber-500">+{task.xpReward} XP</p>
                            {task.allowanceReward > 0 && (
                              <p className="text-xs text-emerald-600 font-bold">+${task.allowanceReward}</p>
                            )}
                          </div>
                        </div>
                        {!submitted ? (
                          <button
                            onClick={() => handleSubmitTask(task)}
                            disabled={submittingTaskId === task.taskId}
                            className="w-full min-h-[48px] rounded-xl bg-amber-500 text-white font-bold text-sm disabled:opacity-50 hover:bg-amber-600 active:scale-95 transition-all"
                          >
                            {submittingTaskId === task.taskId ? '提交中...' : '✓ 我完成了！'}
                          </button>
                        ) : (
                          <div className="w-full min-h-[48px] rounded-xl bg-green-50 text-green-600 font-bold text-sm flex items-center justify-center">
                            ✓ 已提交，等待家長審核
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Tab: Shop ── */}
            {!loading && activeTab === 'shop' && (
              <div className="p-4 lg:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-700">商城</h2>
                  {allowance && (
                    <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full">
                      <span className="text-xs text-amber-600">零用金</span>
                      <span className="font-black text-amber-700">NT${allowance.balance}</span>
                    </div>
                  )}
                </div>

                {orderSuccess && (
                  <div className="p-3 bg-green-50 border border-green-100 text-green-600 text-sm rounded-xl text-center">
                    ✓ 已申請，等待家長確認
                  </div>
                )}

                {shopItems.length === 0 ? (
                  <div className="text-center py-16 text-gray-300">
                    <div className="text-4xl mb-2">🛒</div>
                    <p className="text-sm">商城暫無商品</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shopItems.map((item) => {
                      const typeConf = SHOP_TYPE_CONFIG[item.type] ?? { label: item.type, color: 'bg-gray-100 text-gray-700' };
                      const isXp = item.priceType === 'xp';
                      const playerXp = myScore?.achievementPoints ?? 0;
                      const canAfford = isXp ? playerXp >= item.price : (allowance?.balance ?? 0) >= item.price;
                      return (
                        <div key={item.itemId} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
                          <span className="text-4xl shrink-0">{item.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-semibold text-gray-800">{item.name}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeConf.color}`}>
                                {typeConf.label}
                              </span>
                              {item.dailyLimit && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                                  每日{item.dailyLimit}次
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">{item.description}</p>
                            {item.stock != null && (
                              <p className="text-xs text-orange-500 mt-0.5">庫存：{item.stock}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-right space-y-2">
                            <p className="font-black text-amber-600">
                              {isXp ? `${item.price} ⭐ XP` : `NT$${item.price}`}
                            </p>
                            {!canAfford && (
                              <p className="text-xs text-red-400">{isXp ? 'XP 不足' : '零用金不足'}</p>
                            )}
                            <button
                              onClick={() => handleShopOrder(item)}
                              disabled={orderingItemId === item.itemId || !canAfford}
                              className="min-h-[44px] px-4 bg-amber-500 text-white text-sm font-bold rounded-xl disabled:opacity-50 hover:bg-amber-600 active:scale-95 transition-all"
                            >
                              {orderingItemId === item.itemId ? '...' : '兌換'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: History ── */}
            {!loading && activeTab === 'history' && (
              <div className="p-4 lg:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-700">積分記錄</h2>
                  <span className="text-xs text-gray-400">{history.length} 筆</span>
                </div>
                {history.length === 0 ? (
                  <div className="text-center py-16 text-gray-300">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-sm">尚無記錄</p>
                  </div>
                ) : (
                  history.map((tx) => (
                    <div key={tx.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${
                        tx.type === 'earn' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {tx.type === 'earn' ? '✨' : '😤'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{tx.reason}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(tx.createdAt).toLocaleDateString('zh-TW', {
                            month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className={`text-lg font-black tabular-nums shrink-0 ${
                        tx.type === 'earn' ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {tx.type === 'earn' ? '+' : '−'}{tx.amount}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Tab: Report ── */}
            {!loading && activeTab === 'report' && (
              <div className="p-4 lg:p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-gray-700">自主回報</h2>
                  <p className="text-xs text-gray-400 mt-0.5">選擇類型，家長審核後自動加分</p>
                </div>

                {submissionSuccess && (
                  <div className="p-3 bg-green-50 border border-green-100 text-green-600 text-sm rounded-xl text-center">
                    ✓ 已送出，等待家長審核
                  </div>
                )}

                {/* Step 1: 選類型 */}
                {!reportCategory && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'household' as const, label: '家事勞務',  emoji: '🏠' },
                      { key: 'exam'      as const, label: '考試成績',  emoji: '📚' },
                      { key: 'activity'  as const, label: '閱讀訓練',  emoji: '🌟' },
                    ].map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setReportCategory(cat.key)}
                        className="min-h-[100px] bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-all hover:shadow-md"
                      >
                        <span className="text-4xl">{cat.emoji}</span>
                        <p className="text-xs font-semibold text-gray-700 text-center leading-tight">{cat.label}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* 家事 */}
                {reportCategory === 'household' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setReportCategory(null)} className="text-amber-500 text-sm min-h-[44px] px-2">
                        ← 返回
                      </button>
                      <h3 className="font-bold text-gray-700">🏠 家事勞務</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {HOUSEHOLD_PRESETS.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => handleSubmitPreset(p, 'household')}
                          disabled={submitting}
                          className="min-h-[90px] bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all hover:shadow-md disabled:opacity-50 p-3 text-center"
                        >
                          <span className="text-3xl">{p.emoji}</span>
                          <p className="text-xs font-semibold text-gray-700 leading-tight">{p.reason}</p>
                          <p className="text-xs text-amber-500 font-bold">+{p.amount} XP</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 考試 - Step 1: 選科目 */}
                {reportCategory === 'exam' && !examSubject && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setReportCategory(null)} className="text-amber-500 text-sm min-h-[44px] px-2">
                        ← 返回
                      </button>
                      <h3 className="font-bold text-gray-700">📚 選擇科目</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {EXAM_SUBJECTS.map((subj) => (
                        <button
                          key={subj}
                          onClick={() => setExamSubject(subj)}
                          className="min-h-[60px] bg-white rounded-2xl shadow-sm font-semibold text-gray-700 text-sm active:scale-95 transition-all hover:shadow-md hover:bg-amber-50"
                        >
                          {subj}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 考試 - Step 2: 選分數範圍 */}
                {reportCategory === 'exam' && examSubject && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setExamSubject(null)} className="text-amber-500 text-sm min-h-[44px] px-2">
                        ← 返回
                      </button>
                      <h3 className="font-bold text-gray-700">📚 {examSubject} 分數</h3>
                    </div>
                    <div className="space-y-2">
                      {EXAM_SCORE_RANGES.map((range, i) => (
                        <button
                          key={i}
                          onClick={() => handleSubmitExam(examSubject, range)}
                          disabled={submitting}
                          className="w-full min-h-[64px] bg-white rounded-2xl shadow-sm flex items-center gap-4 px-5 active:scale-95 transition-all hover:shadow-md disabled:opacity-50"
                        >
                          <span className="text-3xl">{range.emoji}</span>
                          <span className="flex-1 text-left font-semibold text-gray-800 text-base">{range.label}</span>
                          <span className="text-amber-500 font-black">+{range.xp} XP</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 閱讀/訓練 */}
                {reportCategory === 'activity' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setReportCategory(null)} className="text-amber-500 text-sm min-h-[44px] px-2">
                        ← 返回
                      </button>
                      <h3 className="font-bold text-gray-700">🌟 閱讀 / 訓練</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {ACTIVITY_PRESETS.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => handleSubmitPreset(p, 'activity')}
                          disabled={submitting}
                          className="min-h-[90px] bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all hover:shadow-md disabled:opacity-50 p-3 text-center"
                        >
                          <span className="text-3xl">{p.emoji}</span>
                          <p className="text-xs font-semibold text-gray-700 leading-tight">{p.reason}</p>
                          <p className="text-xs text-amber-500 font-bold">+{p.amount} XP</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-xl z-30">
          <div className="flex max-w-2xl mx-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 flex flex-col items-center gap-0.5 min-h-[56px] transition-colors ${
                  activeTab === tab.id ? 'text-amber-600' : 'text-gray-300'
                }`}
              >
                <span className="text-xl">{tab.emoji}</span>
                <span className={`text-xs ${activeTab === tab.id ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
