'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useFamilyScoreboard } from './hooks/useFamilyScoreboard';
import type { AddTransactionRequest, CreateRedemptionRequest, PlayerScoreDto, MyFamilyItemDto } from '@/types/family-scoreboard';
import { generateDisplayCode, getMyFamilies, leaveFamily, initializeFamily } from '@/lib/api/family-scoreboard';

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
  // ── 加分 ──────────────────────────────────────────────────────────────
  { id: 'exam_great',    label: '考試/作業優秀',    amount: 50,  emoji: '🏆', type: 'earn' },
  { id: 'exam_pass',     label: '考試進步',          amount: 20,  emoji: '📈', type: 'earn' },
  { id: 'chores',        label: '主動幫忙家事',      amount: 8,   emoji: '🏠', type: 'earn' },
  { id: 'kind',          label: '對人友善/關心人',   amount: 10,  emoji: '💝', type: 'earn' },
  { id: 'special',       label: '表現特別優秀',      amount: 30,  emoji: '⭐', type: 'earn' },
  { id: 'study',         label: '主動讀書學習',      amount: 15,  emoji: '📚', type: 'earn' },
  { id: 'sport',         label: '運動健身',          amount: 10,  emoji: '💪', type: 'earn' },
  { id: 'tidy',          label: '自動整理房間',      amount: 8,   emoji: '🧹', type: 'earn' },
  { id: 'brave',         label: '勇敢嘗試新事物',    amount: 15,  emoji: '🦁', type: 'earn' },
  { id: 'help_sibling',  label: '幫助弟弟/哥哥',     amount: 10,  emoji: '🤝', type: 'earn' },
  { id: 'sport_training',label: '完成運動訓練課表',  amount: 20,  emoji: '🏋️', type: 'earn' },
  // ── 扣分 ──────────────────────────────────────────────────────────────
  { id: 'fight',         label: '兄弟吵架',          amount: 20,  emoji: '😤', type: 'deduct' },
  { id: 'lie',           label: '不誠實/說謊',       amount: 40,  emoji: '🙈', type: 'deduct' },
  { id: 'rude',          label: '頂嘴/無禮',         amount: 15,  emoji: '😠', type: 'deduct' },
  { id: 'forgot',        label: '忘記完成任務',      amount: 10,  emoji: '😅', type: 'deduct' },
  { id: 'tantrum',       label: '亂發脾氣',          amount: 10,  emoji: '😡', type: 'deduct' },
  { id: 'messy',         label: '亂丟東西不整潔',    amount: 8,   emoji: '🗑️', type: 'deduct' },
  { id: 'screen',        label: '超時用螢幕',        amount: 15,  emoji: '📵', type: 'deduct' },
  { id: 'careless',      label: '考試粗心大意',      amount: 10,  emoji: '✏️', type: 'deduct' },
  { id: 'ugly_writing',  label: '聯絡本字太醜',      amount: 5,   emoji: '📓', type: 'deduct' },
  { id: 'no_toys',       label: '沒有收玩具',        amount: 8,   emoji: '🧸', type: 'deduct' },
  { id: 'no_room',       label: '沒有收房間',        amount: 10,  emoji: '🛏️', type: 'deduct' },
];

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'home',    label: '首頁',     emoji: '🏠' },
  { id: 'redeem',  label: '兌換',     emoji: '🎁' },
  { id: 'report',  label: '成就',     emoji: '🏆' },
  { id: 'history', label: '交易記錄', emoji: '📋' },
];

// ── Player Avatar ─────────────────────────────────────────────────────────────

function PlayerAvatar({ player, size = 'md' }: { player: PlayerScoreDto; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'w-9 h-9 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl',
  }[size];
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-black text-white shadow-md shrink-0`}
      style={{ backgroundColor: player.color }}
    >
      {player.emoji ?? (player.name?.charAt(0) ?? '?')}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function FamilyScoreboardPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Multi-family support
  const [families, setFamilies] = useState<MyFamilyItemDto[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [familyLoading, setFamilyLoading] = useState(true);

  const familyId = selectedFamilyId;

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user ? user.uid : null);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid) return;
    setFamilyLoading(true);
    getMyFamilies()
      .then((result) => {
        setFamilies(result);
        if (result.length === 1) {
          setSelectedFamilyId(result[0].familyId);
        } else if (result.length > 1) {
          const saved = localStorage.getItem('defaultFamilyId');
          const match = result.find(f => f.familyId === saved);
          setSelectedFamilyId(match ? match.familyId : result[0].familyId);
        }
        // result.length === 0: 新用戶，不設 familyId
      })
      .catch(() => setSelectedFamilyId(`family_${uid}`))
      .finally(() => setFamilyLoading(false));
  }, [uid]);

  useEffect(() => {
    if (!familyId) return;
    generateDisplayCode(familyId)
      .then((data) => setDisplayCode(data.displayCode))
      .catch(() => {
        // silently ignore if endpoint not available
      });
  }, [familyId]);

  async function copyCode() {
    if (!displayCode) return;
    try {
      await navigator.clipboard.writeText(displayCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  }

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
  const [txCurrency, setTxCurrency]       = useState<'xp' | 'allowance'>('xp');
  const [submitting, setSubmitting]       = useState(false);

  // Score bounce animation
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());

  // Display code for players
  const [displayCode, setDisplayCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Redeem
  const [selectedRewardId, setSelectedRewardId] = useState('');
  const [redeemPlayerId, setRedeemPlayerId]       = useState('');
  const [redeemSubmitting, setRedeemSubmitting]   = useState(false);

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
      setTxCurrency('xp');
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
      currency: txCurrency,
    };
    await submitTransaction(req);

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

  // ── Auth loading ────────────────────────────────────────────────────────────

  if (!authReady) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⭐</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
        </div>
      </div>
    );
  }

  // ── Login guard ─────────────────────────────────────────────────────────────

  if (!uid) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <div className="text-7xl mb-3">⭐</div>
            <h1 className="text-2xl font-black text-amber-800">家庭計分板</h1>
            <p className="text-amber-500 text-sm mt-1">請選擇登入方式</p>
          </div>

          <div className="space-y-3">
            {/* 小孩登入 */}
            <button
              onClick={() => router.push('/family-login')}
              className="w-full min-h-[72px] bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-3xl flex items-center gap-4 px-6 shadow-lg transition-all"
            >
              <span className="text-4xl">🧒</span>
              <div className="text-left">
                <p className="font-black text-lg">小孩登入</p>
                <p className="text-xs text-amber-100">輸入家庭代碼與密碼</p>
              </div>
            </button>

            {/* 家長登入 */}
            <button
              onClick={() => router.push('/login')}
              className="w-full min-h-[72px] bg-white hover:bg-gray-50 active:scale-95 text-gray-700 rounded-3xl flex items-center gap-4 px-6 shadow border border-gray-100 transition-all"
            >
              <span className="text-4xl">👨‍👩‍👧</span>
              <div className="text-left">
                <p className="font-black text-lg text-gray-800">家長登入</p>
                <p className="text-xs text-gray-400">使用 Mido Learning 帳號</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 新用戶歡迎畫面（無家庭） ───────────────────────────────────────────────
  if (!familyLoading && families.length === 0 && uid) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <div className="text-7xl mb-3">⭐</div>
            <h1 className="text-2xl font-black text-amber-800">歡迎使用家庭計分板</h1>
            <p className="text-amber-500 text-sm mt-1">選擇以下操作開始</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={async () => {
                try {
                  await initializeFamily();
                  const result = await getMyFamilies();
                  setFamilies(result);
                  if (result.length > 0) setSelectedFamilyId(result[0].familyId);
                } catch { /* ignore */ }
              }}
              className="w-full min-h-[72px] bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-3xl flex items-center gap-4 px-6 shadow-lg transition-all"
            >
              <span className="text-4xl">🏠</span>
              <div className="text-left">
                <p className="font-black text-lg">建立新家庭</p>
                <p className="text-xs text-amber-100">建立家庭並新增孩子</p>
              </div>
            </button>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-left">
              <p className="text-sm text-gray-600">已被邀請為共同家長？</p>
              <p className="text-xs text-gray-400 mt-1">請聯繫主要家長在管理後台將您加入。加入後重新整理此頁面即可看到家庭。</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium min-h-[44px]"
              >
                🔄 重新整理
              </button>
            </div>
            <button
              onClick={() => router.push('/family-login')}
              className="w-full min-h-[60px] bg-white hover:bg-gray-50 active:scale-95 text-gray-700 rounded-3xl flex items-center gap-4 px-6 shadow border border-gray-100 transition-all"
            >
              <span className="text-3xl">🧒</span>
              <div className="text-left">
                <p className="font-black">小孩登入</p>
                <p className="text-xs text-gray-400">輸入家庭代碼與密碼</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Family loading ────────────────────────────────────────────────────────
  if (familyLoading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">⭐</div>
          <p className="text-amber-600 font-medium">載入中...</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  // RWD strategy:
  //   mobile       → full-width, bottom tab bar (fixed)
  //   sm/md        → max-w-lg centered, same bottom bar
  //   lg+          → left sidebar 256px + right content, no bottom bar

  return (
    <div className="min-h-screen bg-amber-50 lg:flex">

      {/* ─────────────── Desktop Sidebar ─────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 bg-white border-r border-gray-100 shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⭐</span>
            <h1 className="text-lg font-bold text-amber-800">家庭計分板</h1>
          </div>
          <select
            value={selectedFamilyId}
            onChange={(e) => {
              setSelectedFamilyId(e.target.value);
              localStorage.setItem('defaultFamilyId', e.target.value);
            }}
            className="mt-1 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-amber-50 text-amber-700 font-medium"
          >
            {families.map((f) => (
              <option key={f.familyId} value={f.familyId}>
                {f.displayCode ?? f.familyId.slice(0, 12)} {f.isPrimaryAdmin ? '(主管理者)' : '(共同家長)'}
              </option>
            ))}
          </select>
          <button
            onClick={async () => {
              try {
                await initializeFamily();
                const result = await getMyFamilies();
                setFamilies(result);
                if (result.length > 0) {
                  const newest = result[result.length - 1];
                  setSelectedFamilyId(newest.familyId);
                  localStorage.setItem('defaultFamilyId', newest.familyId);
                }
              } catch (e) {
                alert(e instanceof Error ? e.message : '建立家庭失敗');
              }
            }}
            className="mt-1.5 w-full py-1.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg font-medium transition-colors min-h-[36px]"
          >
            + 新增家庭
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors min-h-[52px] ${
                activeTab === tab.id
                  ? 'bg-amber-50 text-amber-700 font-bold'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-6 space-y-2">
          {displayCode && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">玩家登入代碼</p>
                <p className="text-sm font-mono font-black text-amber-600 tracking-widest">{displayCode}</p>
              </div>
              <button
                onClick={copyCode}
                className="text-xs text-amber-500 hover:text-amber-700 min-h-[44px] px-2 shrink-0"
              >
                {codeCopied ? '已複製' : '複製'}
              </button>
            </div>
          )}
          <button
            onClick={() => router.push('/family-login')}
            className="w-full py-2.5 text-sm bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 min-h-[48px] font-medium"
          >
            👤 玩家登入頁
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="w-full py-2.5 text-sm bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 disabled:opacity-50 min-h-[48px]"
          >
            🔄 重新整理
          </button>
          <button
            onClick={() => router.push('/family-scoreboard/admin')}
            className="w-full py-2.5 text-sm bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 min-h-[48px]"
          >
            ⚙️ 管理後台
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 min-h-[48px]"
          >
            ← 返回 Mido Learning
          </button>
          {families.length > 0 && (() => {
            const currentFamily = families.find(f => f.familyId === selectedFamilyId);
            if (!currentFamily) return null;
            const isPrimary = currentFamily.isPrimaryAdmin;
            return (
              <button
                onClick={async () => {
                  const msg = isPrimary
                    ? '確定要刪除此家庭嗎？（需先移除所有玩家）'
                    : '確定要離開此家庭嗎？';
                  if (!confirm(msg)) return;
                  try {
                    await leaveFamily(selectedFamilyId);
                    const result = await getMyFamilies();
                    setFamilies(result);
                    if (result.length > 0) {
                      setSelectedFamilyId(result[0].familyId);
                      localStorage.setItem('defaultFamilyId', result[0].familyId);
                    } else {
                      setSelectedFamilyId('');
                    }
                  } catch (e) {
                    alert(e instanceof Error ? e.message : (isPrimary ? '刪除家庭失敗' : '離開家庭失敗'));
                  }
                }}
                className="w-full py-2.5 text-sm text-red-400 hover:text-red-600 rounded-xl hover:bg-red-50 min-h-[48px]"
              >
                {isPrimary ? '🗑️ 刪除此家庭' : '離開此家庭'}
              </button>
            );
          })()}
        </div>
      </aside>

      {/* ─────────────────── Main Area ─────────────────── */}
      <div className="flex-1 flex flex-col">

        {/* Mobile Header */}
        <header className="lg:hidden bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-lg"
              aria-label="返回主頁"
            >
              ←
            </button>
            <span className="text-xl">⭐</span>
            <h1 className="text-base font-bold text-amber-800">家庭計分板</h1>
          </div>
          <div className="flex gap-1.5 items-center">
            {displayCode && (
              <button
                onClick={copyCode}
                className="px-3 py-2 text-xs bg-amber-100 text-amber-700 rounded-full font-mono font-bold min-h-[44px] flex items-center gap-1"
              >
                {displayCode}
                <span className="text-[10px] opacity-60">{codeCopied ? '✓' : '複製'}</span>
              </button>
            )}
            {scores.length === 0 && (
              <button
                onClick={initialize}
                disabled={loading}
                className="px-3 py-2 text-xs bg-amber-100 text-amber-700 rounded-full font-medium hover:bg-amber-200 disabled:opacity-50 min-h-[44px]"
              >
                初始化
              </button>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
              aria-label="重整"
            >
              🔄
            </button>
            <button
              onClick={() => router.push('/family-scoreboard/admin')}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200"
              aria-label="管理後台"
            >
              ⚙️
            </button>
          </div>
        </header>

        {/* Mobile Family Switcher Bar */}
        {families.length > 0 && (
          <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 sticky top-[52px] z-10">
            <select
              value={selectedFamilyId}
              onChange={(e) => {
                setSelectedFamilyId(e.target.value);
                localStorage.setItem('defaultFamilyId', e.target.value);
              }}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-amber-50 text-amber-700 font-medium min-h-[36px]"
            >
              {families.map((f) => (
                <option key={f.familyId} value={f.familyId}>
                  {f.displayCode ?? f.familyId.slice(0, 12)} {f.isPrimaryAdmin ? '(主管理者)' : '(共同家長)'}
                </option>
              ))}
            </select>
            <button
              onClick={async () => {
                try {
                  await initializeFamily();
                  const result = await getMyFamilies();
                  setFamilies(result);
                  if (result.length > 0) {
                    const newest = result[result.length - 1];
                    setSelectedFamilyId(newest.familyId);
                    localStorage.setItem('defaultFamilyId', newest.familyId);
                  }
                } catch (e) {
                  alert(e instanceof Error ? e.message : '建立家庭失敗');
                }
              }}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 text-sm font-bold"
              aria-label="新增家庭"
            >
              +
            </button>
          </div>
        )}

        {/* Desktop page title */}
        <header className="hidden lg:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">
            {TABS.find((t) => t.id === activeTab)?.emoji}{' '}
            {TABS.find((t) => t.id === activeTab)?.label}
          </h2>
        </header>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* ─────────────────── Content ─────────────────── */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="max-w-2xl mx-auto lg:px-8">

            {/* ── Tab: Home ── */}
            {activeTab === 'home' && (
              <div className="p-4 lg:py-6 space-y-4">
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
                    <p className="text-amber-400 text-sm">請至管理後台初始化家庭資料</p>
                  </div>
                )}

                {scores.length > 0 && (
                  <>
                    <p className="text-xs text-amber-500 px-1">
                      點擊玩家卡片加減分 👇
                    </p>

                    {/* Player Cards — 2-up grid */}
                    <div className="grid grid-cols-2 gap-4 lg:gap-6">
                      {scores.map((player) => (
                        <button
                          key={player.playerId}
                          onClick={() => openSheet(player.playerId)}
                          className={`
                            relative bg-white rounded-2xl shadow-md p-4 lg:p-6
                            flex flex-col items-center gap-3
                            active:scale-95 hover:-translate-y-0.5 hover:shadow-lg
                            transition-all duration-200 text-left w-full
                            ${animatingIds.has(player.playerId) ? 'animate-bounce' : ''}
                          `}
                          style={{ borderTop: `4px solid ${player.color}` }}
                        >
                          {/* Avatar */}
                          <PlayerAvatar player={player} size="lg" />

                          {/* Name + role */}
                          <div className="text-center">
                            <span className="font-bold text-gray-800 text-base lg:text-lg block leading-tight">
                              {player.name}
                            </span>
                            {player.role && (
                              <span
                                className="inline-block mt-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold text-white"
                                style={{ backgroundColor: player.color + 'cc' }}
                              >
                                {player.role}
                              </span>
                            )}
                          </div>

                          {/* Achievement Points */}
                          <div className="text-center">
                            <p
                              className="text-4xl lg:text-5xl font-black tabular-nums transition-all duration-500"
                              style={{ color: player.color }}
                            >
                              {player.achievementPoints}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">成就點數（經驗值）</p>
                          </div>

                          {/* Redeemable XP + Allowance NT$ */}
                          <div className="w-full grid grid-cols-2 gap-1.5">
                            <div className="bg-amber-50 rounded-xl px-2 py-2 text-center">
                              <p className="text-base font-bold text-amber-600 tabular-nums">{player.redeemablePoints}</p>
                              <p className="text-[10px] text-amber-400">⭐ 可兌換 XP</p>
                            </div>
                            <div className="bg-emerald-50 rounded-xl px-2 py-2 text-center">
                              <p className="text-base font-bold text-emerald-600 tabular-nums">{player.allowanceBalance ?? 0}</p>
                              <p className="text-[10px] text-emerald-400">💰 零用金 NT$</p>
                            </div>
                          </div>

                          {/* Edit hint */}
                          <span
                            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: player.color + '20', color: player.color }}
                          >
                            ✎
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="bg-white rounded-2xl shadow-sm p-4 lg:p-5">
                      <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">累計統計</p>
                      <div className="space-y-3">
                        {scores.map((p) => (
                          <div key={p.playerId} className="flex items-center gap-3 text-sm">
                            <PlayerAvatar player={p} size="sm" />
                            <div>
                              <span className="text-gray-700 font-medium block leading-tight">{p.name}</span>
                              {p.role && <span className="text-xs text-gray-400">{p.role}</span>}
                            </div>
                            <div className="ml-auto flex flex-wrap justify-end gap-x-3 gap-y-1 text-sm font-bold tabular-nums">
                              <span className="text-emerald-600">+{p.totalEarned}</span>
                              <span className="text-red-400">−{p.totalDeducted}</span>
                              <span className="text-blue-500">{p.redeemablePoints} 可用</span>
                              <span className="text-emerald-600">💰 {p.allowanceBalance ?? 0} 零用金</span>
                            </div>
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
              <div className="p-4 lg:py-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-700">交易紀錄</h2>
                  <span className="text-xs text-gray-400">{filteredTransactions.length} 筆</span>
                </div>

                {/* Filter chips */}
                {scores.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
                    <button
                      onClick={() => setHistoryFilter('all')}
                      className={`px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] shrink-0 ${
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
                        className={`px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] shrink-0 flex items-center gap-1.5 ${
                          historyFilter === p.playerId ? 'text-white' : 'bg-white text-gray-500 border border-gray-200'
                        }`}
                        style={historyFilter === p.playerId ? { backgroundColor: p.color } : {}}
                      >
                        <span>{p.emoji ?? p.name?.charAt(0) ?? '?'}</span>
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
                      <div key={tx.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                        <div
                          className="w-1.5 h-12 rounded-full shrink-0"
                          style={{ backgroundColor: playerScore?.color ?? '#d1d5db' }}
                        />
                        <span
                          className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 ${
                            tx.type === 'earn' ? 'bg-green-100' : 'bg-red-100'
                          }`}
                        >
                          {tx.type === 'earn' ? '✨' : '😤'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium truncate">{tx.reason}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {playerScore?.emoji ?? ''} {playerName} · {new Date(tx.createdAt).toLocaleDateString('zh-TW', {
                              month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <span className={`text-lg font-black shrink-0 tabular-nums ${tx.type === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
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
              <div className="p-4 lg:py-6 space-y-4">
                <h2 className="text-base font-bold text-gray-700">兌換獎勵</h2>

                {rewards.length === 0 ? (
                  <p className="text-center text-gray-300 py-12 text-sm">尚無獎勵</p>
                ) : (
                  <>
                    {/* Reward cards */}
                    <div className="space-y-2">
                      {rewards.map((r) => (
                        <div key={r.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                          <span className="text-3xl shrink-0">{r.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800">{r.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>
                          </div>
                          <span className="font-bold text-emerald-600 shrink-0 text-base">零用金 {r.cost}</span>
                        </div>
                      ))}
                    </div>

                    {/* Redeem form */}
                    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
                      <p className="text-sm font-semibold text-gray-600">申請兌換</p>

                      {/* Player selector — big touch targets */}
                      {scores.length > 1 && (
                        <div className="grid grid-cols-2 gap-3">
                          {scores.map((p) => (
                            <button
                              key={p.playerId}
                              onClick={() => setRedeemPlayerId(p.playerId)}
                              className={`py-4 rounded-2xl flex flex-col items-center gap-1.5 border-2 transition-all min-h-[88px] ${
                                redeemPlayerId === p.playerId
                                  ? 'text-white border-transparent shadow-md scale-[1.02]'
                                  : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
                              }`}
                              style={redeemPlayerId === p.playerId ? { backgroundColor: p.color, borderColor: p.color } : {}}
                            >
                              <span className="text-3xl">{p.emoji ?? p.name?.charAt(0) ?? '?'}</span>
                              <span className="text-sm font-bold">{p.name}</span>
                              {p.role && <span className="text-xs opacity-75">{p.role}</span>}
                            </button>
                          ))}
                        </div>
                      )}

                      <select
                        value={selectedRewardId}
                        onChange={(e) => setSelectedRewardId(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-4 text-sm bg-white outline-none focus:border-amber-400 min-h-[56px]"
                      >
                        <option value="">選擇獎勵…</option>
                        {rewards.map((r) => (
                          <option key={r.id} value={r.id}>{r.icon} {r.name}（零用金 {r.cost}）</option>
                        ))}
                      </select>

                      <button
                        onClick={handleCreateRedemption}
                        disabled={redeemSubmitting || !selectedRewardId}
                        className="w-full py-4 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 disabled:opacity-40 min-h-[60px] transition-colors active:scale-95 text-base"
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
                              className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0 flex items-center gap-3">
                                {pScore && <PlayerAvatar player={pScore} size="sm" />}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{r.rewardName}</p>
                                  <p className="text-xs text-gray-400">{getPlayerName(r.playerId)} · 零用金 {r.cost}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={() => handleRedemption(r.id, { action: 'approve' })}
                                  className="px-4 py-3 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 min-h-[52px] active:scale-95 transition-all"
                                >
                                  ✓ 核准
                                </button>
                                <button
                                  onClick={() => handleRedemption(r.id, { action: 'reject' })}
                                  className="px-4 py-3 bg-red-400 text-white rounded-xl text-sm font-semibold hover:bg-red-500 min-h-[52px] active:scale-95 transition-all"
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
            {activeTab === 'report' && (() => {
              const now = new Date();
              const todayStr = now.toISOString().slice(0, 10);
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() - now.getDay());
              weekStart.setHours(0, 0, 0, 0);
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

              const statsMap = scores.reduce<Record<string, { today: number; week: number; month: number }>>((acc, p) => {
                const mine = transactions.filter((t) => t.playerIds.includes(p.playerId));
                acc[p.playerId] = {
                  today: mine.filter((t) => t.type === 'earn' && t.createdAt.slice(0, 10) === todayStr).reduce((s, t) => s + t.amount, 0),
                  week:  mine.filter((t) => t.type === 'earn' && new Date(t.createdAt) >= weekStart).reduce((s, t) => s + t.amount, 0),
                  month: mine.filter((t) => t.type === 'earn' && new Date(t.createdAt) >= monthStart).reduce((s, t) => s + t.amount, 0),
                };
                return acc;
              }, {});

              const catEmojiMap: Record<string, string> = Object.fromEntries(
                CATEGORIES.map((c) => [c.id, c.emoji])
              );

              const weekEarnsMap = scores.reduce<Record<string, string[]>>((acc, p) => {
                const mine = transactions.filter(
                  (t) =>
                    t.playerIds.includes(p.playerId) &&
                    t.type === 'earn' &&
                    new Date(t.createdAt) >= weekStart
                );
                acc[p.playerId] = mine.map(
                  (t) => (t.categoryId ? (catEmojiMap[t.categoryId] ?? '⭐') : '⭐')
                );
                return acc;
              }, {});

              return (
                <div className="p-4 lg:py-6 space-y-4">
                  <h2 className="text-base font-bold text-gray-700">成就</h2>

                  {/* ── 本週貼紙牆比較 ── */}
                  {scores.length > 1 && (
                    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
                      <p className="text-sm font-bold text-gray-600">🎫 本週貼紙牆</p>
                      <p className="text-xs text-gray-400">每筆加分行為 = 1 張貼紙，目標每週集滿 10 張</p>
                      {[...scores]
                        .sort((a, b) => (weekEarnsMap[b.playerId]?.length ?? 0) - (weekEarnsMap[a.playerId]?.length ?? 0))
                        .map((p) => {
                          const stickers = weekEarnsMap[p.playerId] ?? [];
                          const emptyCount = Math.max(0, 10 - stickers.length);
                          return (
                            <div key={p.playerId}>
                              <div className="flex items-center gap-2 mb-2">
                                <PlayerAvatar player={p} size="sm" />
                                <span className="text-sm font-semibold text-gray-700">{p.name}</span>
                                <span className="ml-auto text-xs font-bold tabular-nums" style={{ color: p.color }}>
                                  +{statsMap[p.playerId]?.week ?? 0} xp
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {stickers.map((emoji, i) => (
                                  <span
                                    key={i}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl text-xl"
                                    style={{ backgroundColor: p.color + '20' }}
                                  >
                                    {emoji}
                                  </span>
                                ))}
                                {Array.from({ length: emptyCount }).map((_, i) => (
                                  <span
                                    key={`empty-${i}`}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-200 bg-gray-50 text-xl"
                                  >
                                    ○
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-gray-400 mt-1.5">
                                {stickers.length >= 10
                                  ? `🎉 已集 ${stickers.length} 張，達標！`
                                  : `已集 ${stickers.length} 張 / 目標 10 張`}
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* ── 個別玩家詳情 ── */}
                  {scores.map((p) => {
                    const st = statsMap[p.playerId] ?? { today: 0, week: 0, month: 0 };
                    return (
                      <div key={p.playerId} className="bg-white rounded-2xl shadow-sm p-5">
                        <div className="flex items-center gap-4 mb-4">
                          <PlayerAvatar player={p} size="md" />
                          <div>
                            <span className="font-bold text-gray-800 text-lg block">{p.name}</span>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {p.role && (
                                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold text-white" style={{ backgroundColor: p.color + 'cc' }}>
                                  {p.role}
                                </span>
                              )}
                              {p.birthday && (
                                <span className="text-xs text-gray-400">
                                  🎂 {new Date(p.birthday).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 本週貼紙 */}
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-400 mb-1">🎫 本週貼紙收集</p>
                          <p className="text-[10px] text-gray-300 mb-2">每個好行為獲得一張 · 集滿 10 張代表本週超棒！</p>
                          <div className="flex flex-wrap gap-1">
                            {(weekEarnsMap[p.playerId] ?? []).map((emoji, i) => (
                              <span
                                key={i}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-lg"
                                style={{ backgroundColor: p.color + '20' }}
                              >
                                {emoji}
                              </span>
                            ))}
                            {Array.from({ length: Math.max(0, 10 - (weekEarnsMap[p.playerId]?.length ?? 0)) }).map((_, i) => (
                              <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-200 text-lg">
                                ○
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {(weekEarnsMap[p.playerId]?.length ?? 0) >= 10
                              ? '🎉 本週達標！'
                              : `${weekEarnsMap[p.playerId]?.length ?? 0} / 10 張`}
                          </p>
                        </div>

                        {/* 緊湊數字 - 今日/本週/本月 */}
                        <div className="grid grid-cols-3 gap-1.5 text-center mb-1.5">
                          <div className="rounded-xl p-2 bg-amber-50">
                            <p className="text-sm font-black text-amber-700 tabular-nums">+{st.today}</p>
                            <p className="text-[10px] text-amber-500">今日</p>
                          </div>
                          <div className="rounded-xl p-2 bg-emerald-50">
                            <p className="text-sm font-black text-emerald-700 tabular-nums">+{st.week}</p>
                            <p className="text-[10px] text-emerald-500">本週</p>
                          </div>
                          <div className="rounded-xl p-2 bg-blue-50">
                            <p className="text-sm font-black text-blue-700 tabular-nums">+{st.month}</p>
                            <p className="text-[10px] text-blue-500">本月</p>
                          </div>
                        </div>

                        {/* 成就點 / 可兌換 XP / 零用金 */}
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div className="bg-amber-50 rounded-xl p-2">
                            <p className="text-sm font-black tabular-nums" style={{ color: p.color }}>{p.achievementPoints}</p>
                            <p className="text-[10px] text-gray-400">成就點</p>
                          </div>
                          <div className="bg-amber-50 rounded-xl p-2">
                            <p className="text-sm font-black text-amber-600 tabular-nums">{p.redeemablePoints}</p>
                            <p className="text-[10px] text-gray-400">⭐ 可兌換 XP</p>
                          </div>
                          <div className="bg-emerald-50 rounded-xl p-2">
                            <p className="text-sm font-black text-emerald-600 tabular-nums">{p.allowanceBalance ?? 0}</p>
                            <p className="text-[10px] text-gray-400">💰 零用金</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {scores.length === 0 && (
                    <p className="text-center text-gray-300 py-12 text-sm">尚無資料</p>
                  )}
                </div>
              );
            })()}

          </div>
        </main>

        {/* ─────────────────── Mobile Bottom Tab Bar ─────────────────── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-xl z-30">
          <div className="flex max-w-2xl mx-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 min-h-[60px] transition-colors ${
                  activeTab === tab.id ? 'text-amber-600' : 'text-gray-300'
                }`}
              >
                <span className="text-2xl">{tab.emoji}</span>
                <span className={`text-xs ${activeTab === tab.id ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </nav>

      </div>{/* /Main Area */}

      {/* ─────────────────── Sheet Backdrop ─────────────────── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-40" onClick={closeSheet}>
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* ─────────────────── Bottom Sheet / Modal ─────────────────── */}
      {/* Mobile: full-width bottom sheet
          lg+: centered modal overlay */}
      <div
        className={`
          fixed z-50 bg-white shadow-2xl transition-all duration-300 ease-out
          bottom-0 left-0 right-0 rounded-t-3xl
          lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:right-auto
          lg:w-full lg:max-w-md lg:rounded-2xl
          ${sheetOpen
            ? 'translate-y-0 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:opacity-100'
            : 'translate-y-full lg:translate-y-[-40%] lg:-translate-x-1/2 lg:opacity-0 lg:pointer-events-none'}
        `}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pb-10 lg:pb-6 pt-2 lg:pt-5 max-h-[90vh] lg:max-h-[80vh] overflow-y-auto">

          {/* Sheet Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {sheetPlayer && <PlayerAvatar player={sheetPlayer} size="md" />}
              <div>
                <h2 className="text-lg font-bold text-gray-800 leading-tight">
                  {sheetPlayer?.name ?? ''}
                </h2>
                {sheetPlayer?.role && (
                  <span className="text-xs text-gray-400">{sheetPlayer.role}</span>
                )}
                {sheetStep !== 'select-type' && (
                  <span
                    className={`block mt-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit ${
                      txType === 'earn' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                    }`}
                  >
                    {txType === 'earn' ? '+ 加分' : '− 扣分'}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={closeSheet}
              className="w-11 h-11 flex items-center justify-center text-gray-300 hover:text-gray-500 rounded-full hover:bg-gray-100 text-xl"
            >
              ✕
            </button>
          </div>

          {/* ── Step 1: Select Type ── */}
          {sheetStep === 'select-type' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSelectType('earn')}
                className="py-8 rounded-2xl bg-green-50 border-2 border-green-200 flex flex-col items-center gap-2 active:scale-95 transition-transform min-h-[140px]"
              >
                <span className="text-5xl">✨</span>
                <span className="font-bold text-green-600 text-xl">加分</span>
                <span className="text-xs text-green-400">表揚好行為</span>
              </button>
              <button
                onClick={() => handleSelectType('deduct')}
                className="py-8 rounded-2xl bg-red-50 border-2 border-red-200 flex flex-col items-center gap-2 active:scale-95 transition-transform min-h-[140px]"
              >
                <span className="text-5xl">😤</span>
                <span className="font-bold text-red-500 text-xl">扣分</span>
                <span className="text-xs text-red-300">提醒改正</span>
              </button>
            </div>
          )}

          {/* ── Step 2: Select Category ── */}
          {sheetStep === 'select-category' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">選擇類別或自訂</p>
              <div className="grid grid-cols-2 gap-2.5">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat)}
                    className={`py-4 px-3 rounded-xl flex items-center gap-2.5 text-left min-h-[72px] active:scale-95 transition-transform ${
                      txType === 'earn' ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-3xl shrink-0">{cat.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 leading-tight">{cat.label}</p>
                      <p className={`text-xl font-black tabular-nums mt-0.5 ${txType === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
                        {txType === 'earn' ? '+' : '−'}{cat.amount}
                      </p>
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => handleSelectCategory('custom')}
                  className="py-4 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center gap-2.5 text-left min-h-[72px] active:scale-95 transition-transform"
                >
                  <span className="text-3xl shrink-0">✏️</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">自訂</p>
                    <p className="text-xl font-black text-gray-300 mt-0.5">自行填寫</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setSheetStep('select-type')}
                className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors min-h-[44px]"
              >
                ← 返回
              </button>
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {sheetStep === 'confirm' && (
            <div className="space-y-4">

              <div>
                <label className="block text-xs text-gray-400 mb-2 font-medium">幣別</label>
                <div className="flex gap-2">
                  <button onClick={() => setTxCurrency('xp')}
                    className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all ${txCurrency === 'xp' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    ⭐ 經驗值 XP
                  </button>
                  <button onClick={() => setTxCurrency('allowance')}
                    className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all ${txCurrency === 'allowance' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    💰 零用金
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2 font-medium">
                  {txType === 'earn' ? '加' : '扣'}{txCurrency === 'xp' ? '分' : '零用金'}數量
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full border-2 border-gray-200 focus:border-amber-400 rounded-2xl px-4 py-4 text-4xl font-black text-center outline-none transition-colors tabular-nums min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2 font-medium">原因</label>
                <input
                  type="text"
                  placeholder="說明原因…"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full border-2 border-gray-200 focus:border-amber-400 rounded-2xl px-4 py-4 text-base outline-none transition-colors min-h-[60px]"
                />
              </div>

              {sheetPlayer && customAmount && customReason.trim() && (
                <div
                  className={`rounded-2xl p-4 text-center border ${
                    txType === 'earn' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                  }`}
                >
                  <p className="text-sm text-gray-600">
                    給{' '}
                    <span className="font-bold" style={{ color: sheetPlayer.color }}>
                      {sheetPlayer.emoji ?? ''} {sheetPlayer.name}
                    </span>
                    {' '}
                    <span className={`text-2xl font-black tabular-nums ${txType === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
                      {txType === 'earn' ? '+' : '−'}{customAmount}
                    </span>
                    {' '}{txCurrency === 'xp' ? '⭐ XP' : '💰 NT$'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5">因為：{customReason}</p>
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={submitting || !customAmount || !customReason.trim()}
                className={`w-full py-5 rounded-2xl font-bold text-white text-lg min-h-[64px] disabled:opacity-40 active:scale-95 transition-all ${
                  txType === 'earn' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {submitting ? '提交中…' : txType === 'earn' ? '✨ 確認加分' : '確認扣分'}
              </button>

              <button
                onClick={() => setSheetStep('select-category')}
                className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors min-h-[44px]"
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
