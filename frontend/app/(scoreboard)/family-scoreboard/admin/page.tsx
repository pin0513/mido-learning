'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { useFamilyScoreboard } from '../hooks/useFamilyScoreboard';
import {
  generateDisplayCode,
  regenerateDisplayCode,
  setDisplayCode as setDisplayCodeApi,
  createPlayer,
  updatePlayer,
  setPlayerPassword,
  getTasks,
  createTask,
  updateTask,
  deactivateTask,
  getTaskCompletions,
  processTaskCompletion,
  getPlayerSubmissions,
  processPlayerSubmission,
  getAllowanceBalance,
  adjustAllowance,
  getShopItems,
  createShopItem,
  updateShopItem,
  deactivateShopItem,
  getShopOrders,
  processShopOrder,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  exportFamilyBackup,
  importFamilyBackup,
  addAdminTransaction,
  getSeals,
  liftSeal,
  getPenalties,
  createPenalty,
  completePenalty,
  getActiveEffects,
  expireEffect,
  addTransactionWithEffects,
  deletePlayer,
  getCoAdmins,
  addCoAdmin,
  removeCoAdmin,
  getMyFamily,
  lookupUserByEmail,
} from '@/lib/api/family-scoreboard';
import type {
  PlayerScoreDto,
  TaskDto,
  TaskCompletionDto,
  PlayerSubmissionDto,
  CreateTaskRequest,
  CreatePlayerRequest,
  UpdatePlayerRequest,
  AllowanceBalanceDto,
  ShopItemDto,
  ShopOrderDto,
  EventDto,
  CreateShopItemRequest,
  CreateEventRequest,
  AdjustAllowanceRequest,
  FamilyBackupDto,
  SealDto,
  PenaltyDto,
  CreatePenaltyRequest,
  CoAdminDto,
} from '@/types/family-scoreboard';

type AdminTab = 'code' | 'players' | 'tasks' | 'pending' | 'allowance' | 'shop' | 'events' | 'discipline' | 'backup';
type PlayerModal =
  | { type: 'add' }
  | { type: 'edit'; player: PlayerScoreDto }
  | { type: 'password'; player: PlayerScoreDto }
  | null;

const PLAYER_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e',
  '#06b6d4','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f43f5e',
];
const PLAYER_EMOJIS = ['😊','🦁','🐯','🐼','🦊','🐸','🦋','⭐','🌈','🎯','🚀','🎸'];
const DIFFICULTY_CONFIG = {
  easy:   { label: '簡單', color: 'bg-green-100 text-green-700', xp: 20,  allowance: 0  },
  medium: { label: '中等', color: 'bg-amber-100 text-amber-700', xp: 50,  allowance: 10 },
  hard:   { label: '困難', color: 'bg-red-100 text-red-700',    xp: 100, allowance: 30 },
  custom: { label: '自訂', color: 'bg-purple-100 text-purple-700', xp: 0, allowance: 0 },
} as const;
const TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
  household: { label: '家事',      emoji: '🏠' },
  exam:      { label: '考試/學習', emoji: '📚' },
  activity:  { label: '自主活動',  emoji: '🌟' },
};
const SHOP_TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
  physical:  { label: '實體物品', emoji: '🎁' },
  activity:  { label: '活動體驗', emoji: '🎡' },
  privilege: { label: '特權免除', emoji: '👑' },
  money:     { label: '現金/零用', emoji: '💰' },
};
const EVENT_TYPE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  trip:     { label: '出遊',     emoji: '🏕️', color: '#22c55e' },
  sports:   { label: '運動賽事', emoji: '⚽', color: '#3b82f6' },
  activity: { label: '家庭活動', emoji: '🎉', color: '#f97316' },
  other:    { label: '其他',     emoji: '📅', color: '#8b5cf6' },
};
const WEEKDAY_LABELS = ['日','一','二','三','四','五','六'];

function ShareLoginLink({ displayCode }: { displayCode: string }) {
  const [copied, setCopied] = useState(false);
  function handleShare() {
    const url = `${window.location.origin}/family-login?code=${displayCode}`;
    if (navigator.share) {
      navigator.share({ title: '家庭積分板登入', url }).catch(() => null);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }
  return (
    <button
      onClick={handleShare}
      className="w-full min-h-[48px] bg-white border-2 border-amber-200 text-amber-700 font-semibold rounded-2xl hover:bg-amber-50 active:scale-95 transition-all text-sm"
    >
      {copied ? '✓ 連結已複製！' : '🔗 分享登入連結（帶代碼）'}
    </button>
  );
}

function PlayerFormModal({ modal, familyId, onClose, onSaved }: {
  modal: PlayerModal; familyId: string; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName]             = useState('');
  const [color, setColor]           = useState(PLAYER_COLORS[0]);
  const [emoji, setEmoji]           = useState('');
  const [playerId, setPlayerId]     = useState('');
  const [role, setRole]             = useState('');
  const [birthday, setBirthday]     = useState('');
  const [initAp, setInitAp]         = useState('');
  const [initRp, setInitRp]         = useState('');
  const [password, setPassword]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState<string | null>(null);

  useEffect(() => {
    if (!modal) return;
    if (modal.type === 'edit') {
      setName(modal.player.name ?? '');
      setColor(modal.player.color);
      setEmoji(modal.player.emoji ?? '');
      setPlayerId(modal.player.playerId);
      setRole(modal.player.role ?? '');
      setBirthday(modal.player.birthday ?? '');
      setInitAp(String(modal.player.achievementPoints ?? 0));
      setInitRp(String(modal.player.redeemablePoints ?? 0));
    } else if (modal.type === 'password') {
      setPassword('');
    } else {
      setName(''); setColor(PLAYER_COLORS[0]); setEmoji(''); setPlayerId('');
      setRole(''); setBirthday(''); setInitAp('0'); setInitRp('0');
    }
    setErr(null);
  }, [modal]);

  if (!modal) return null;
  const cm = modal;

  async function handleSave() {
    if (!familyId) return;
    setSaving(true); setErr(null);
    try {
      if (cm.type === 'add') {
        if (!name.trim() || !playerId.trim()) { setErr('請填寫玩家 ID 和名稱'); setSaving(false); return; }
        await createPlayer(familyId, {
          playerId: playerId.trim().toLowerCase(),
          name: name.trim(),
          color,
          emoji: emoji || undefined,
          role: role.trim() || undefined,
          birthday: birthday || undefined,
          initialAchievementPoints: initAp !== '' ? Number(initAp) : undefined,
          initialRedeemablePoints: initRp !== '' ? Number(initRp) : undefined,
        } as CreatePlayerRequest);
      } else if (cm.type === 'edit') {
        await updatePlayer(familyId, cm.player.playerId, {
          name: name.trim(),
          color,
          emoji: emoji || undefined,
          role: role.trim() || undefined,
          birthday: birthday || undefined,
          achievementPoints: initAp !== '' ? Number(initAp) : undefined,
          redeemablePoints: initRp !== '' ? Number(initRp) : undefined,
        } as UpdatePlayerRequest);
      } else if (cm.type === 'password') {
        if (!password) { setErr('請輸入密碼'); setSaving(false); return; }
        await setPlayerPassword(familyId, cm.player.playerId, { password });
      }
      onSaved(); onClose();
    } catch { setErr('操作失敗，請重試'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-t-3xl lg:rounded-2xl shadow-2xl p-6 space-y-5 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">{{ add: '新增玩家', edit: '編輯玩家', password: '設定密碼' }[modal.type]}</h3>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 text-xl">✕</button>
        </div>
        {err && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{err}</div>}
        {(modal.type === 'add' || modal.type === 'edit') && (
          <>
            {modal.type === 'add' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">玩家 ID（英數字，唯一識別）</label>
                <input type="text" placeholder="例如：ian、justin" value={playerId} onChange={(e) => setPlayerId(e.target.value)}
                  className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[52px]" />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">名稱</label>
              <input type="text" placeholder="玩家名字" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[52px]" autoFocus={modal.type === 'add'} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">顏色</label>
              <div className="flex flex-wrap gap-2">
                {PLAYER_COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-10 h-10 rounded-full transition-all ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">頭像 Emoji（選填）</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setEmoji('')}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs text-gray-400 transition-all ${!emoji ? 'border-amber-400 bg-amber-50' : 'border-gray-100 hover:border-gray-300'}`}>無</button>
                {PLAYER_EMOJIS.map((em) => (
                  <button key={em} onClick={() => setEmoji(em)}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-2xl transition-all ${emoji === em ? 'border-amber-400 bg-amber-50 scale-110' : 'border-gray-100 hover:border-gray-300'}`}>{em}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">角色（選填，例如：哥哥、妹妹）</label>
              <input type="text" placeholder="角色" value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[52px]" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">生日（選填）</label>
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)}
                className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[52px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">成就積分（XP）</label>
                <input type="number" min="0" value={initAp} onChange={(e) => setInitAp(e.target.value)}
                  className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[52px]" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">可兌換積分</label>
                <input type="number" min="0" value={initRp} onChange={(e) => setInitRp(e.target.value)}
                  className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[52px]" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-md" style={{ backgroundColor: color }}>
                {emoji || name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="font-bold text-gray-800">{name || '名稱預覽'}</p>
                <p className="text-xs text-gray-400">玩家預覽</p>
              </div>
            </div>
          </>
        )}
        {modal.type === 'password' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-md" style={{ backgroundColor: modal.player.color }}>
                {modal.player.emoji ?? modal.player.name?.charAt(0) ?? '?'}
              </div>
              <div><p className="font-bold text-gray-800">{modal.player.name}</p><p className="text-xs text-gray-400">設定登入密碼</p></div>
            </div>
            <input type="password" placeholder="輸入新密碼" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-lg text-center outline-none min-h-[56px]" autoFocus />
          </div>
        )}
        <button onClick={handleSave} disabled={saving}
          className="w-full min-h-[56px] bg-amber-500 text-white font-bold rounded-2xl disabled:opacity-40 hover:bg-amber-600 active:scale-95 transition-all text-base">
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>
    </div>
  );
}

export default function FamilyScoreboardAdminPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState('');
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('code');
  const [reinitConfirm, setReinitConfirm] = useState(false);

  const [displayCode, setDisplayCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeCopied, setCodeCopied]   = useState(false);
  const [regenConfirm, setRegenConfirm] = useState(false);
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [playerModal, setPlayerModal] = useState<PlayerModal>(null);
  const [deleteConfirmPlayerId, setDeleteConfirmPlayerId] = useState<string | null>(null);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);

  // Co-admin state
  const [coAdmins, setCoAdmins] = useState<CoAdminDto[]>([]);
  const [coAdminsLoading, setCoAdminsLoading] = useState(false);
  const [coAdminEmailInput, setCoAdminEmailInput] = useState('');
  const [coAdminLookupResult, setCoAdminLookupResult] = useState<{ uid: string; email: string; displayName: string | null } | null>(null);
  const [coAdminLookupState, setCoAdminLookupState] = useState<'idle' | 'searching' | 'found' | 'notfound'>('idle');
  const [coAdminAdding, setCoAdminAdding] = useState(false);
  const [coAdminErr, setCoAdminErr] = useState<string | null>(null);
  const [removingCoAdminUid, setRemovingCoAdminUid] = useState<string | null>(null);

  const [tasks, setTasks]           = useState<TaskDto[]>([]);
  const [completions, setCompletions] = useState<TaskCompletionDto[]>([]);
  const [submissions, setSubmissions] = useState<PlayerSubmissionDto[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError]     = useState<string | null>(null);

  const [taskTitle, setTaskTitle]           = useState('');
  const [taskType, setTaskType]             = useState<'household' | 'exam' | 'activity'>('household');
  const [taskDifficulty, setTaskDifficulty] = useState<'easy' | 'medium' | 'hard' | 'custom'>('easy');
  const [taskCustomXp, setTaskCustomXp]           = useState(0);
  const [taskCustomAllowance, setTaskCustomAllowance] = useState(0);
  const [taskPeriod, setTaskPeriod]         = useState<'once' | 'daily' | 'weekly'>('once');
  const [taskWeekDays, setTaskWeekDays]     = useState<number[]>([]);
  const [taskAssigned, setTaskAssigned]     = useState<string[]>([]);
  const [taskCreating, setTaskCreating]     = useState(false);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const [allowanceBalances, setAllowanceBalances] = useState<Record<string, AllowanceBalanceDto>>({});
  const [allowanceLoading, setAllowanceLoading]   = useState(false);
  const [allowanceErr, setAllowanceErr]           = useState<string | null>(null);
  const [adjustingPlayerId, setAdjustingPlayerId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount]           = useState(10);
  const [adjustReason, setAdjustReason]           = useState('');
  const [adjustSaving, setAdjustSaving]           = useState(false);

  const [shopItems, setShopItems]       = useState<ShopItemDto[]>([]);
  const [shopOrders, setShopOrders]     = useState<ShopOrderDto[]>([]);
  const [shopLoading, setShopLoading]   = useState(false);
  const [shopErr, setShopErr]           = useState<string | null>(null);
  const [showShopForm, setShowShopForm] = useState(false);
  const [shopName, setShopName]         = useState('');
  const [shopDesc, setShopDesc]         = useState('');
  const [shopPrice, setShopPrice]       = useState(50);
  const [shopType, setShopType]         = useState<'physical' | 'activity' | 'privilege' | 'money'>('physical');
  const [shopEmoji, setShopEmoji]       = useState('🎁');
  const [shopCreating, setShopCreating] = useState(false);

  const [events, setEvents]               = useState<EventDto[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsErr, setEventsErr]         = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle]       = useState('');
  const [eventType, setEventType]         = useState<'trip' | 'sports' | 'activity' | 'other'>('activity');
  const [eventStart, setEventStart]       = useState('');
  const [eventEnd, setEventEnd]           = useState('');
  const [eventDesc, setEventDesc]         = useState('');
  const [eventCreating, setEventCreating] = useState(false);
  const [currentMonth, setCurrentMonth]   = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Phase 4: Set score state
  const [setScorePlayerId, setSetScorePlayerId] = useState<string | null>(null);
  const [setScoreTarget, setSetScoreTarget]     = useState(0);
  const [setScoreSaving, setSetScoreSaving]     = useState(false);

  // Phase 4: Allowance adjust mode state
  const [adjustMode, setAdjustMode]             = useState<'adjust' | 'set'>('adjust');
  const [setBalanceTarget, setSetBalanceTarget] = useState(0);

  // Phase 4: Shop extended state
  const [shopPriceType, setShopPriceType]           = useState<'allowance' | 'xp'>('allowance');
  const [shopAllowanceGiven, setShopAllowanceGiven] = useState(10);
  const [shopDailyLimit, setShopDailyLimit]         = useState<number | null>(null);

  // Phase 4: Backup state
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupErr, setBackupErr]         = useState<string | null>(null);
  const [importFile, setImportFile]       = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Task edit state
  const [editingTask, setEditingTask]     = useState<TaskDto | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskXp, setEditTaskXp]       = useState(0);
  const [editTaskSaving, setEditTaskSaving] = useState(false);

  // Shop item edit state
  const [editingShopItem, setEditingShopItem] = useState<ShopItemDto | null>(null);
  const [editShopName, setEditShopName]       = useState('');
  const [editShopDesc, setEditShopDesc]       = useState('');
  const [editShopPrice, setEditShopPrice]     = useState(0);
  const [editShopEmoji, setEditShopEmoji]     = useState('🎁');
  const [editShopSaving, setEditShopSaving]   = useState(false);

  // Event edit state
  const [editingEvent, setEditingEvent]   = useState<EventDto | null>(null);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventStart, setEditEventStart] = useState('');
  const [editEventEnd, setEditEventEnd]     = useState('');
  const [editEventSaving, setEditEventSaving] = useState(false);

  // Discipline (封印/處罰) state
  const [seals, setSeals]           = useState<SealDto[]>([]);
  const [penalties, setPenalties]   = useState<PenaltyDto[]>([]);
  const [discLoading, setDiscLoading] = useState(false);
  const [discErr, setDiscErr]         = useState<string | null>(null);
  const [discPlayerId, setDiscPlayerId] = useState('');
  const [discDeductAmount, setDiscDeductAmount] = useState(50);
  const [discReason, setDiscReason] = useState('');
  const [discNote, setDiscNote]     = useState('');
  const [discPenaltyName, setDiscPenaltyName] = useState('');
  const [discPenaltyType, setDiscPenaltyType] = useState<'罰站' | '罰寫' | '道歉' | 'custom'>('罰站');
  const [discSealName, setDiscSealName] = useState('');
  const [discSealType, setDiscSealType] = useState<'no-tv' | 'no-toys' | 'no-games' | 'no-sweets' | 'custom'>('no-tv');
  const [discAddSeal, setDiscAddSeal]       = useState(false);
  const [discAddPenalty, setDiscAddPenalty] = useState(false);
  const [discSaving, setDiscSaving] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    setUid(user.uid);
    // Resolve familyId: primary admin uses family_{uid}, co-admin uses getMyFamily()
    const primaryId = `family_${user.uid}`;
    getMyFamily()
      .then((result) => {
        if (result) {
          setFamilyId(result.familyId);
          setIsPrimaryAdmin(result.isPrimaryAdmin);
        } else {
          setFamilyId(primaryId);
          setIsPrimaryAdmin(true);
        }
      })
      .catch(() => {
        setFamilyId(primaryId);
        setIsPrimaryAdmin(true);
      });
  }, []);

  const { scores, loading, error, initialize, refresh } = useFamilyScoreboard(familyId);

  useEffect(() => {
    if (!familyId || displayCode) return;
    generateDisplayCode().then((d) => setDisplayCode(d.displayCode)).catch(() => {});
  }, [familyId, displayCode]);

  const loadTaskData = useCallback(async () => {
    if (!familyId) return;
    setTasksLoading(true); setTasksError(null);
    try {
      const [tasksData, completionsData, submissionsData] = await Promise.all([
        getTasks(familyId), getTaskCompletions(familyId, 'pending'), getPlayerSubmissions(familyId, 'pending'),
      ]);
      setTasks(tasksData); setCompletions(completionsData); setSubmissions(submissionsData);
    } catch { setTasksError('載入任務資料失敗'); }
    finally { setTasksLoading(false); }
  }, [familyId]);

  const loadAllowanceData = useCallback(async () => {
    if (!familyId || scores.length === 0) return;
    setAllowanceLoading(true); setAllowanceErr(null);
    try {
      const results = await Promise.all(scores.map((p) => getAllowanceBalance(familyId, p.playerId).catch(() => null)));
      const map: Record<string, AllowanceBalanceDto> = {};
      scores.forEach((p, i) => { if (results[i]) map[p.playerId] = results[i]!; });
      setAllowanceBalances(map);
    } catch { setAllowanceErr('載入零用金資料失敗'); }
    finally { setAllowanceLoading(false); }
  }, [familyId, scores]);

  const loadShopData = useCallback(async () => {
    if (!familyId) return;
    setShopLoading(true); setShopErr(null);
    try {
      const [itemsData, ordersData] = await Promise.all([getShopItems(familyId), getShopOrders(familyId, 'pending')]);
      setShopItems(itemsData); setShopOrders(ordersData);
    } catch { setShopErr('載入商城資料失敗'); }
    finally { setShopLoading(false); }
  }, [familyId]);

  const loadEventsData = useCallback(async () => {
    if (!familyId) return;
    setEventsLoading(true); setEventsErr(null);
    try { const data = await getEvents(familyId, currentMonth); setEvents(data); }
    catch { setEventsErr('載入行事曆失敗'); }
    finally { setEventsLoading(false); }
  }, [familyId, currentMonth]);

  const loadDisciplineData = useCallback(async () => {
    if (!familyId) return;
    setDiscLoading(true); setDiscErr(null);
    try {
      const [sealsData, penaltiesData] = await Promise.all([
        getSeals(familyId, undefined, 'active'),
        getPenalties(familyId, undefined, 'active'),
      ]);
      setSeals(sealsData); setPenalties(penaltiesData);
    } catch { setDiscErr('載入處罰資料失敗'); }
    finally { setDiscLoading(false); }
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    if (activeTab === 'tasks' || activeTab === 'pending') loadTaskData();
    else if (activeTab === 'allowance') loadAllowanceData();
    else if (activeTab === 'shop') loadShopData();
    else if (activeTab === 'events') loadEventsData();
    else if (activeTab === 'discipline') loadDisciplineData();
  }, [familyId, activeTab, loadTaskData, loadAllowanceData, loadShopData, loadEventsData, loadDisciplineData]);

  useEffect(() => {
    if (!familyId || activeTab !== 'players') return;
    refresh();
    setCoAdminsLoading(true);
    getCoAdmins(familyId)
      .then(setCoAdmins)
      .catch(() => {})
      .finally(() => setCoAdminsLoading(false));
  }, [familyId, activeTab, refresh]);

  async function handleDeletePlayer(playerId: string) {
    if (!familyId) return;
    setDeletingPlayerId(playerId);
    try {
      await deletePlayer(familyId, playerId);
      setDeleteConfirmPlayerId(null);
      refresh();
    } catch { /* ignore */ }
    finally { setDeletingPlayerId(null); }
  }

  async function handleLookupCoAdmin() {
    if (!coAdminEmailInput.trim()) return;
    setCoAdminLookupState('searching'); setCoAdminErr(null); setCoAdminLookupResult(null);
    try {
      const result = await lookupUserByEmail(coAdminEmailInput.trim());
      if (result) {
        setCoAdminLookupResult(result);
        setCoAdminLookupState('found');
      } else {
        setCoAdminLookupState('notfound');
      }
    } catch { setCoAdminLookupState('idle'); setCoAdminErr('查詢失敗，請重試'); }
  }

  async function handleAddCoAdmin() {
    if (!familyId || !coAdminLookupResult) return;
    setCoAdminAdding(true); setCoAdminErr(null);
    try {
      const dto = await addCoAdmin(familyId, {
        coAdminUid: coAdminLookupResult.uid,
        displayName: coAdminLookupResult.displayName ?? coAdminLookupResult.email,
      });
      setCoAdmins((prev) => [...prev, dto]);
      setCoAdminEmailInput(''); setCoAdminLookupResult(null); setCoAdminLookupState('idle');
    } catch { setCoAdminErr('新增失敗，請重試'); }
    finally { setCoAdminAdding(false); }
  }

  async function handleRemoveCoAdmin(coAdminUid: string) {
    if (!familyId) return;
    setRemovingCoAdminUid(coAdminUid);
    try {
      await removeCoAdmin(familyId, coAdminUid);
      setCoAdmins((prev) => prev.filter((a) => a.uid !== coAdminUid));
    } catch { /* ignore */ }
    finally { setRemovingCoAdminUid(null); }
  }

  async function handleReinit() {
    if (!reinitConfirm) { setReinitConfirm(true); return; }
    setReinitConfirm(false); await initialize(); refresh();
  }

  async function handleRegenCode() {
    if (!regenConfirm) { setRegenConfirm(true); return; }
    setRegenConfirm(false); setCodeLoading(true);
    try { const d = await regenerateDisplayCode(); setDisplayCode(d.displayCode); }
    catch { /* silent */ } finally { setCodeLoading(false); }
  }

  async function copyCode() {
    if (!displayCode) return;
    await navigator.clipboard.writeText(displayCode).catch(() => {});
    setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000);
  }

  async function handleCreateTask() {
    if (!taskTitle.trim() || !familyId) return;
    setTaskCreating(true); setTasksError(null);
    try {
      const xp  = taskDifficulty === 'custom' ? taskCustomXp       : DIFFICULTY_CONFIG[taskDifficulty].xp;
      const all = taskDifficulty === 'custom' ? taskCustomAllowance : DIFFICULTY_CONFIG[taskDifficulty].allowance;
      const req: CreateTaskRequest = {
        title: taskTitle.trim(), type: taskType, difficulty: taskDifficulty,
        xpReward: xp, allowanceReward: all,
        periodType: taskPeriod, weekDays: taskPeriod === 'weekly' ? taskWeekDays : undefined,
        assignedPlayerIds: taskAssigned.length > 0 ? taskAssigned : undefined,
      };
      const newTask = await createTask(familyId, req);
      setTasks((prev) => [...prev, newTask]);
      setTaskTitle(''); setTaskAssigned([]); setTaskWeekDays([]);
    } catch { setTasksError('建立任務失敗'); } finally { setTaskCreating(false); }
  }

  async function handleDeactivateTask(taskId: string) {
    if (!familyId) return;
    try { await deactivateTask(familyId, taskId); setTasks((prev) => prev.filter((t) => t.taskId !== taskId)); }
    catch { setTasksError('停用任務失敗'); }
  }

  async function handleProcessCompletion(id: string, action: 'approve' | 'reject') {
    if (!familyId) return;
    setProcessingId(id);
    try { await processTaskCompletion(familyId, id, { action }); setCompletions((prev) => prev.filter((c) => c.completionId !== id)); }
    catch { setTasksError('處理失敗'); } finally { setProcessingId(null); }
  }

  async function handleProcessSubmission(id: string, action: 'approve' | 'reject') {
    if (!familyId) return;
    setProcessingId(id);
    try { await processPlayerSubmission(familyId, id, { action }); setSubmissions((prev) => prev.filter((s) => s.submissionId !== id)); }
    catch { setTasksError('處理失敗'); } finally { setProcessingId(null); }
  }

  async function handleProcessShopOrder(id: string, action: 'approve' | 'reject') {
    if (!familyId) return;
    setProcessingId(id);
    try { await processShopOrder(familyId, id, { action }); setShopOrders((prev) => prev.filter((o) => o.orderId !== id)); }
    catch { setShopErr('處理失敗'); } finally { setProcessingId(null); }
  }

  async function handleAdjustAllowance() {
    if (!familyId || !adjustingPlayerId || !adjustReason.trim() || adjustAmount === 0) return;
    setAdjustSaving(true);
    try {
      const req: AdjustAllowanceRequest = { playerId: adjustingPlayerId, amount: adjustAmount, reason: adjustReason.trim() };
      await adjustAllowance(familyId, req);
      setAdjustingPlayerId(null); setAdjustAmount(10); setAdjustReason('');
      await loadAllowanceData();
    } catch { setAllowanceErr('調整失敗，請重試'); } finally { setAdjustSaving(false); }
  }

  async function handleDeactivateShopItem(itemId: string) {
    if (!familyId) return;
    try { await deactivateShopItem(familyId, itemId); setShopItems((prev) => prev.filter((i) => i.itemId !== itemId)); }
    catch { setShopErr('停用商品失敗'); }
  }

  async function handleCreateShopItem() {
    if (!shopName.trim() || !familyId) return;
    setShopCreating(true); setShopErr(null);
    try {
      const req: CreateShopItemRequest = {
        name: shopName.trim(), description: shopDesc.trim(), price: shopPrice,
        type: shopType, emoji: shopEmoji,
        priceType: shopPriceType,
        allowanceGiven: shopPriceType === 'xp' ? shopAllowanceGiven : 0,
        dailyLimit: shopDailyLimit ?? undefined,
      };
      const item = await createShopItem(familyId, req);
      setShopItems((prev) => [...prev, item]);
      setShowShopForm(false); setShopName(''); setShopDesc(''); setShopPrice(50);
      setShopPriceType('allowance'); setShopAllowanceGiven(10); setShopDailyLimit(null);
    } catch { setShopErr('建立商品失敗'); } finally { setShopCreating(false); }
  }

  async function handleCreateEvent() {
    if (!eventTitle.trim() || !eventStart || !familyId) return;
    setEventCreating(true); setEventsErr(null);
    try {
      const typeInfo = EVENT_TYPE_CONFIG[eventType];
      const req: CreateEventRequest = {
        title: eventTitle.trim(), type: eventType, startDate: eventStart,
        endDate: eventEnd || undefined, description: eventDesc.trim() || undefined,
        emoji: typeInfo.emoji, color: typeInfo.color,
      };
      const ev = await createEvent(familyId, req);
      setEvents((prev) => [...prev, ev].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setShowEventForm(false); setEventTitle(''); setEventStart(''); setEventEnd(''); setEventDesc('');
    } catch { setEventsErr('建立活動失敗'); } finally { setEventCreating(false); }
  }

  function toggleAssignedPlayer(pid: string) {
    setTaskAssigned((prev) => prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]);
  }
  function toggleWeekDay(day: number) {
    setTaskWeekDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  }

  const pendingCount = completions.length + submissions.length + shopOrders.length;
  const TABS: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'code',      label: '家庭代碼',                                               icon: '🔑' },
    { id: 'players',   label: '玩家管理',                                               icon: '👤' },
    { id: 'tasks',     label: '任務管理',                                               icon: '✅' },
    { id: 'pending',   label: `待審核${pendingCount > 0 ? ` (${pendingCount})` : ''}`,  icon: '⏳' },
    { id: 'allowance', label: '零用金',                                                 icon: '💰' },
    { id: 'shop',      label: '商城管理',                                               icon: '🛒' },
    { id: 'events',     label: '行事曆',                                                 icon: '📅' },
    { id: 'discipline', label: '封印/處罰',                                              icon: '🔒' },
    { id: 'backup',     label: '備份',                                                   icon: '💾' },
  ];

  return (
    <div className="min-h-screen bg-amber-50 lg:flex">
      <PlayerFormModal modal={playerModal} familyId={familyId} onClose={() => setPlayerModal(null)} onSaved={() => refresh()} />

      {/* ── Task Edit Modal ── */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingTask(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl lg:rounded-2xl shadow-2xl p-6 space-y-4 z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">編輯任務</h3>
              <button onClick={() => setEditingTask(null)} className="w-9 h-9 flex items-center justify-center text-gray-400 text-xl rounded-full hover:bg-gray-100">✕</button>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">任務名稱</label>
              <input type="text" value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)}
                className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[52px]" autoFocus />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">經驗值 (XP)</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {[50, 100, 150, 200, 300, 500].map((v) => (
                  <button key={v} onClick={() => setEditTaskXp(v)} className={`min-h-[40px] px-3 rounded-lg text-sm font-bold transition-all ${editTaskXp === v ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-amber-100'}`}>{v}</button>
                ))}
              </div>
              <input type="number" value={editTaskXp} onChange={(e) => setEditTaskXp(Number(e.target.value))}
                className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-center font-bold outline-none min-h-[48px]" />
            </div>
            <button
              disabled={editTaskSaving || !editTaskTitle.trim()}
              onClick={async () => {
                if (!familyId || !editingTask || !editTaskTitle.trim()) return;
                setEditTaskSaving(true);
                try {
                  const updated = await updateTask(familyId, editingTask.taskId, {
                    title: editTaskTitle.trim(), type: editingTask.type, difficulty: editingTask.difficulty,
                    xpReward: editTaskXp, allowanceReward: editingTask.allowanceReward,
                    periodType: editingTask.periodType, weekDays: editingTask.weekDays,
                    assignedPlayerIds: editingTask.assignedPlayerIds,
                  });
                  setTasks((prev) => prev.map((t) => t.taskId === updated.taskId ? updated : t));
                  setEditingTask(null);
                } catch { setTasksError('更新失敗'); }
                finally { setEditTaskSaving(false); }
              }}
              className="w-full min-h-[56px] bg-amber-500 text-white font-bold rounded-2xl disabled:opacity-40 hover:bg-amber-600 active:scale-95 transition-all">
              {editTaskSaving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      )}

      {/* ── Shop Item Edit Modal ── */}
      {editingShopItem && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingShopItem(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl lg:rounded-2xl shadow-2xl p-6 space-y-4 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">編輯商品</h3>
              <button onClick={() => setEditingShopItem(null)} className="w-9 h-9 flex items-center justify-center text-gray-400 text-xl rounded-full hover:bg-gray-100">✕</button>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">商品名稱</label>
              <input type="text" value={editShopName} onChange={(e) => setEditShopName(e.target.value)}
                className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[52px]" autoFocus />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">描述</label>
              <input type="text" value={editShopDesc} onChange={(e) => setEditShopDesc(e.target.value)}
                className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[52px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">價格</label>
                <input type="number" value={editShopPrice} onChange={(e) => setEditShopPrice(Number(e.target.value))}
                  className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-3 py-3 text-center font-bold outline-none min-h-[48px]" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Emoji</label>
                <input type="text" value={editShopEmoji} onChange={(e) => setEditShopEmoji(e.target.value)}
                  className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-3 py-3 text-center text-2xl outline-none min-h-[48px]" />
              </div>
            </div>
            <button
              disabled={editShopSaving || !editShopName.trim()}
              onClick={async () => {
                if (!familyId || !editingShopItem || !editShopName.trim()) return;
                setEditShopSaving(true);
                try {
                  const updated = await updateShopItem(familyId, editingShopItem.itemId, {
                    name: editShopName.trim(), description: editShopDesc.trim(), price: editShopPrice,
                    type: editingShopItem.type, emoji: editShopEmoji || '🎁',
                    priceType: editingShopItem.priceType, allowanceGiven: editingShopItem.allowanceGiven,
                    dailyLimit: editingShopItem.dailyLimit ?? undefined, stock: editingShopItem.stock ?? undefined,
                  });
                  setShopItems((prev) => prev.map((i) => i.itemId === updated.itemId ? updated : i));
                  setEditingShopItem(null);
                } catch { setShopErr('更新失敗'); }
                finally { setEditShopSaving(false); }
              }}
              className="w-full min-h-[56px] bg-amber-500 text-white font-bold rounded-2xl disabled:opacity-40 hover:bg-amber-600 active:scale-95 transition-all">
              {editShopSaving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-amber-100 shadow-sm">
        <div className="px-5 py-5 border-b border-amber-100">
          <button onClick={() => router.push('/family-scoreboard')} className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium text-sm mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            返回積分板
          </button>
          <h1 className="text-xl font-bold text-gray-800">管理後台</h1>
          <p className="text-xs text-gray-400 mt-1">家庭積分系統</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${activeTab === tab.id ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}`}>
              <span className="text-base">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-amber-100">
          {reinitConfirm ? (
            <div className="space-y-2">
              <p className="text-xs text-red-600 font-medium text-center">⚠️ 確定重置所有資料？</p>
              <div className="flex gap-2">
                <button onClick={() => setReinitConfirm(false)} className="flex-1 min-h-[44px] rounded-xl border border-gray-300 text-gray-700 font-medium text-sm">取消</button>
                <button onClick={handleReinit} disabled={loading} className="flex-1 min-h-[44px] rounded-xl bg-red-500 text-white font-medium text-sm disabled:opacity-50">{loading ? '執行中...' : '確定'}</button>
              </div>
            </div>
          ) : (
            <button onClick={handleReinit} disabled={loading || !familyId} className="w-full min-h-[44px] rounded-xl bg-amber-500 text-white font-semibold text-sm shadow-md disabled:opacity-50 hover:bg-amber-600 transition-colors">🔄 重新初始化</button>
          )}
          <button onClick={() => router.push('/')} className="w-full min-h-[44px] rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 text-sm transition-colors">← 返回 Mido Learning</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="lg:hidden bg-amber-500 text-white px-4 py-3 flex items-center gap-3 shadow sticky top-0 z-10">
          <button onClick={() => router.push('/family-scoreboard')} className="p-2 rounded-lg hover:bg-amber-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-bold flex-1">管理後台</h1>
        </header>

        <div className="lg:hidden flex border-b border-amber-200 bg-white sticky top-[56px] z-10 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3 min-h-[48px] text-xs font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-amber-600 border-b-2 border-amber-500' : 'text-gray-500 hover:text-amber-500'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto pb-32 lg:pb-8">
          <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>}
            {tasksError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {tasksError}</div>}

            {/* ── Code Tab ── */}
            {activeTab === 'code' && (
              <div className="space-y-4">
                <div className="bg-white rounded-3xl shadow-sm p-6 text-center space-y-4">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">家庭登入代碼</p>
                  {displayCode ? (
                    <>
                      <p className="text-5xl font-black text-amber-600 tracking-widest font-mono">{displayCode}</p>
                      <p className="text-xs text-gray-400">小朋友在登入頁輸入此代碼即可進入家庭</p>
                      <button onClick={copyCode} className="w-full min-h-[56px] bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 active:scale-95 transition-all text-base">
                        {codeCopied ? '✓ 已複製！' : '複製代碼'}
                      </button>
                      <ShareLoginLink displayCode={displayCode} />
                    </>
                  ) : <div className="text-gray-300 text-3xl py-4">---</div>}
                </div>
                <button onClick={() => router.push(`/family-login?code=${displayCode}`)} className="w-full min-h-[52px] bg-amber-50 text-amber-700 font-semibold rounded-2xl hover:bg-amber-100 transition-colors">👤 前往玩家登入頁</button>
                <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-600">自訂代碼</p>
                  <p className="text-xs text-gray-400">4-12 個英文字母或數字，家庭間不可重複，設定後不自動改變</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="例如：HUANG、PIN2025"
                      value={customCodeInput}
                      onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      className="flex-1 border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm font-mono font-bold outline-none min-h-[48px] tracking-widest"
                    />
                    <button
                      onClick={async () => {
                        if (!customCodeInput.trim() || !familyId) return;
                        setCodeLoading(true); setCodeErr(null);
                        try {
                          const d = await setDisplayCodeApi(customCodeInput.trim());
                          setDisplayCode(d.displayCode);
                          setCustomCodeInput('');
                        } catch (e: unknown) {
                          setCodeErr(e instanceof Error ? e.message : '設定失敗');
                        } finally { setCodeLoading(false); }
                      }}
                      disabled={codeLoading || customCodeInput.length < 4 || !familyId}
                      className="min-h-[48px] px-5 bg-amber-500 text-white font-bold rounded-xl disabled:opacity-40 hover:bg-amber-600 active:scale-95 transition-all text-sm shrink-0"
                    >
                      {codeLoading ? '...' : '套用'}
                    </button>
                  </div>
                  {codeErr && <p className="text-xs text-red-500">{codeErr}</p>}
                </div>
              </div>
            )}

            {/* ── Players Tab ── */}
            {activeTab === 'players' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-700">玩家列表（{scores.length} 位）</p>
                  <button onClick={() => setPlayerModal({ type: 'add' })} className="min-h-[44px] px-4 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 active:scale-95 transition-all">+ 新增玩家</button>
                </div>
                {loading && <div className="text-center py-8 text-amber-500 text-sm">載入中...</div>}
                {!loading && scores.length === 0 && (
                  <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-2">👤</div><p className="text-sm">尚無玩家資料</p></div>
                )}
                {scores.map((player) => (
                  <div key={player.playerId} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-md" style={{ backgroundColor: player.color }}>
                        {player.emoji ?? player.name?.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-800">{player.name}</p>
                          {player.role && <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: player.color }}>{player.role}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">ID: {player.playerId}</p>
                        <div className="flex gap-3 mt-1 text-xs">
                          <span className="text-amber-600 font-bold">{player.achievementPoints} XP</span>
                          <span className="text-emerald-600 font-bold">{player.redeemablePoints} 可用</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setPlayerModal({ type: 'edit', player })} className="flex-1 min-h-[44px] border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 active:scale-95 transition-all">編輯</button>
                      <button onClick={() => setPlayerModal({ type: 'password', player })} className="flex-1 min-h-[44px] border border-amber-200 text-amber-600 rounded-xl text-sm font-medium hover:bg-amber-50 active:scale-95 transition-all">設定密碼</button>
                      <button
                        onClick={() => {
                          setSetScorePlayerId(player.playerId);
                          setSetScoreTarget(player.achievementPoints);
                        }}
                        className="flex-1 min-h-[44px] border border-blue-200 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 active:scale-95 transition-all"
                      >
                        設定積分
                      </button>
                      <button
                        onClick={() => setDeleteConfirmPlayerId(player.playerId)}
                        className="min-h-[44px] px-3 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 active:scale-95 transition-all"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                ))}

                {/* ── 刪除玩家確認 dialog ── */}
                {deleteConfirmPlayerId && (() => {
                  const player = scores.find((p) => p.playerId === deleteConfirmPlayerId);
                  return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirmPlayerId(null)} />
                      <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4 space-y-4 z-10">
                        <div className="text-center">
                          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white mx-auto mb-3 shadow-md"
                            style={{ backgroundColor: player?.color ?? '#ef4444' }}>
                            {player?.emoji ?? player?.name?.charAt(0) ?? '?'}
                          </div>
                          <h3 className="text-lg font-bold text-gray-800 mb-1">確認刪除玩家？</h3>
                          <p className="text-sm text-gray-500">刪除 <span className="font-bold text-gray-800">{player?.name}</span> 後無法復原，所有積分與紀錄將一併移除。</p>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => setDeleteConfirmPlayerId(null)}
                            className="flex-1 min-h-[48px] border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-all">取消</button>
                          <button onClick={() => handleDeletePlayer(deleteConfirmPlayerId)}
                            disabled={deletingPlayerId === deleteConfirmPlayerId}
                            className="flex-1 min-h-[48px] bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 active:scale-95 transition-all disabled:opacity-40">
                            {deletingPlayerId === deleteConfirmPlayerId ? '刪除中...' : '確認刪除'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── 共同家長（Co-Admin）管理 ── */}
                {isPrimaryAdmin && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-gray-100" />
                      <p className="text-xs font-bold text-gray-400 px-2">共同家長管理</p>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                      <p className="text-sm font-bold text-gray-700">共同家長（{coAdmins.length} 位）</p>
                      {coAdminsLoading && <p className="text-xs text-gray-400">載入中...</p>}
                      {!coAdminsLoading && coAdmins.length === 0 && (
                        <p className="text-xs text-gray-400">尚未新增共同家長</p>
                      )}
                      {coAdmins.map((admin) => (
                        <div key={admin.uid} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm shrink-0">
                            {admin.displayName?.charAt(0) ?? admin.uid.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{admin.displayName || '（未命名）'}</p>
                            <p className="text-xs text-gray-400 truncate">UID: {admin.uid}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveCoAdmin(admin.uid)}
                            disabled={removingCoAdminUid === admin.uid}
                            className="min-h-[36px] px-3 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-all disabled:opacity-40 shrink-0"
                          >
                            {removingCoAdminUid === admin.uid ? '移除中' : '解除'}
                          </button>
                        </div>
                      ))}
                      <div className="border-t border-gray-100 pt-3 space-y-2">
                        <p className="text-xs font-medium text-gray-500">新增共同家長</p>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            placeholder="輸入帳號 Email"
                            value={coAdminEmailInput}
                            onChange={(e) => { setCoAdminEmailInput(e.target.value); setCoAdminLookupState('idle'); setCoAdminLookupResult(null); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleLookupCoAdmin()}
                            className="flex-1 border-2 border-gray-100 focus:border-indigo-300 rounded-xl px-4 py-2.5 text-sm outline-none"
                          />
                          <button
                            onClick={handleLookupCoAdmin}
                            disabled={coAdminLookupState === 'searching' || !coAdminEmailInput.trim()}
                            className="min-h-[44px] px-4 border-2 border-indigo-200 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-all disabled:opacity-40 shrink-0"
                          >
                            {coAdminLookupState === 'searching' ? '查詢中...' : '查詢'}
                          </button>
                        </div>
                        {coAdminLookupState === 'notfound' && (
                          <p className="text-xs text-amber-600">找不到此 Email 對應的帳號</p>
                        )}
                        {coAdminLookupState === 'found' && coAdminLookupResult && (
                          <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                            <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0">
                              {(coAdminLookupResult.displayName ?? coAdminLookupResult.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 text-sm">{coAdminLookupResult.displayName ?? '（未設定名稱）'}</p>
                              <p className="text-xs text-gray-500">{coAdminLookupResult.email}</p>
                            </div>
                            <button
                              onClick={handleAddCoAdmin}
                              disabled={coAdminAdding}
                              className="min-h-[36px] px-3 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 transition-all disabled:opacity-40 shrink-0"
                            >
                              {coAdminAdding ? '新增中' : '新增'}
                            </button>
                          </div>
                        )}
                        {coAdminErr && <p className="text-xs text-red-500">{coAdminErr}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {setScorePlayerId && (() => {
              const player = scores.find((p) => p.playerId === setScorePlayerId);
              const currentXp = player?.achievementPoints ?? 0;
              const delta = setScoreTarget - currentXp;
              return (
                <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setSetScorePlayerId(null)} />
                  <div className="relative bg-white w-full max-w-sm rounded-t-3xl lg:rounded-2xl shadow-2xl p-6 space-y-4 z-10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-800">設定積分</h3>
                      <button onClick={() => setSetScorePlayerId(null)} className="w-9 h-9 flex items-center justify-center text-gray-400 rounded-full text-xl">✕</button>
                    </div>
                    {player && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-black text-white" style={{ backgroundColor: player.color }}>
                          {player.emoji ?? player.name?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{player.name}</p>
                          <p className="text-xs text-gray-400">目前：{currentXp} XP</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-400 mb-2">目標積分</p>
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {[100, 200, 500, 1000].map((v) => (
                          <button key={v} onClick={() => setSetScoreTarget(v)}
                            className={`min-h-[48px] rounded-xl text-sm font-bold transition-all active:scale-95 ${setScoreTarget === v ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-amber-100'}`}>
                            {v}
                          </button>
                        ))}
                      </div>
                      <input type="number" value={setScoreTarget}
                        onChange={(e) => setSetScoreTarget(Number(e.target.value))}
                        className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-lg text-center outline-none min-h-[52px]" />
                    </div>
                    <div className="text-center bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">調整量</p>
                      <p className={`text-xl font-black ${delta >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                        {delta >= 0 ? '+' : ''}{delta} XP
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!familyId || !setScorePlayerId || delta === 0) return;
                        setSetScoreSaving(true);
                        try {
                          await addAdminTransaction(familyId, {
                            playerIds: [setScorePlayerId],
                            type: delta > 0 ? 'earn' : 'deduct',
                            amount: Math.abs(delta),
                            reason: '管理員手動設定積分',
                          });
                          setSetScorePlayerId(null);
                          refresh();
                        } catch { /* silent */ }
                        finally { setSetScoreSaving(false); }
                      }}
                      disabled={setScoreSaving || delta === 0}
                      className="w-full min-h-[56px] bg-amber-500 text-white font-bold rounded-2xl disabled:opacity-40 hover:bg-amber-600 active:scale-95 transition-all text-base"
                    >
                      {setScoreSaving ? '設定中...' : `確認設定為 ${setScoreTarget} XP`}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Tasks Tab ── */}
            {activeTab === 'tasks' && (
              <>
                {tasksLoading && <div className="text-center py-8 text-amber-500 text-sm">載入中...</div>}
                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                  <p className="text-sm font-bold text-gray-700">新增任務</p>
                  <div>
                    <p className="text-xs text-gray-400 mb-2">任務類型</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['household', 'exam', 'activity'] as const).map((t) => (
                        <button key={t} onClick={() => setTaskType(t)}
                          className={`min-h-[80px] rounded-2xl flex flex-col items-center justify-center gap-1.5 border-2 transition-all active:scale-95 ${taskType === t ? 'border-amber-400 bg-amber-50' : 'border-gray-100 bg-white hover:border-amber-200'}`}>
                          <span className="text-2xl">{TYPE_CONFIG[t].emoji}</span>
                          <span className={`text-xs font-semibold ${taskType === t ? 'text-amber-700' : 'text-gray-500'}`}>{TYPE_CONFIG[t].label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-2">難度</p>
                    <div className="flex rounded-xl overflow-hidden border border-gray-100">
                      {(['easy', 'medium', 'hard', 'custom'] as const).map((d) => {
                        const active = taskDifficulty === d;
                        const activeBg = d === 'easy' ? 'bg-green-500' : d === 'medium' ? 'bg-amber-500' : d === 'hard' ? 'bg-red-500' : 'bg-purple-500';
                        return (
                          <button key={d} onClick={() => setTaskDifficulty(d)}
                            className={`flex-1 min-h-[52px] flex flex-col items-center justify-center transition-colors ${active ? `${activeBg} text-white` : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                            <span className="text-xs font-bold">{DIFFICULTY_CONFIG[d].label}</span>
                            {d !== 'custom' && <span className="text-xs opacity-75">+{DIFFICULTY_CONFIG[d].xp}XP/{DIFFICULTY_CONFIG[d].allowance}💰</span>}
                            {d === 'custom' && <span className="text-xs opacity-75">自訂獎勵</span>}
                          </button>
                        );
                      })}
                    </div>
                    {taskDifficulty === 'custom' && (
                      <div className="flex gap-3 mt-3">
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 mb-1.5">XP 獎勵</p>
                          <input type="number" min={0} value={taskCustomXp} onChange={(e) => setTaskCustomXp(Number(e.target.value))}
                            className="w-full border-2 border-purple-200 focus:border-purple-400 rounded-xl px-3 py-2 text-sm font-bold text-center outline-none min-h-[44px]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 mb-1.5">零用金 💰</p>
                          <input type="number" min={0} value={taskCustomAllowance} onChange={(e) => setTaskCustomAllowance(Number(e.target.value))}
                            className="w-full border-2 border-purple-200 focus:border-purple-400 rounded-xl px-3 py-2 text-sm font-bold text-center outline-none min-h-[44px]" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-2">頻率</p>
                    <div className="flex rounded-xl overflow-hidden border border-gray-100">
                      {([{ id: 'once', label: '1次' }, { id: 'daily', label: '每天' }, { id: 'weekly', label: '每週' }] as const).map(({ id, label }) => (
                        <button key={id} onClick={() => setTaskPeriod(id)}
                          className={`flex-1 min-h-[48px] text-xs font-bold transition-colors ${taskPeriod === id ? 'bg-amber-500 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {taskPeriod === 'weekly' && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">選擇星期</p>
                      <div className="flex gap-2">
                        {WEEKDAY_LABELS.map((label, i) => (
                          <button key={i} onClick={() => toggleWeekDay(i)}
                            className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all ${taskWeekDays.includes(i) ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-amber-100'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {scores.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">指定玩家 <span className="text-amber-500">{taskAssigned.length === 0 ? '（不選 = 所有人）' : `（已選 ${taskAssigned.length} 位）`}</span></p>
                      <div className="flex flex-wrap gap-2">
                        {scores.map((p) => {
                          const selected = taskAssigned.includes(p.playerId);
                          return (
                            <button key={p.playerId} onClick={() => toggleAssignedPlayer(p.playerId)}
                              className={`flex items-center gap-2 px-3 min-h-[48px] rounded-xl border-2 transition-all active:scale-95 ${selected ? 'border-transparent text-white' : 'border-gray-100 bg-white text-gray-600 hover:border-amber-200'}`}
                              style={selected ? { backgroundColor: p.color } : {}}>
                              <span className="text-xl">{p.emoji ?? p.name?.charAt(0) ?? '?'}</span>
                              <span className="text-sm font-medium">{p.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">任務標題</p>
                    <input type="text" placeholder="例如：整理房間、完成數學作業..." value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                      className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none transition-colors min-h-[52px]" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
                    <span>獎勵預覽</span>
                    <span className="font-black text-amber-500">
                      +{taskDifficulty === 'custom' ? taskCustomXp : DIFFICULTY_CONFIG[taskDifficulty].xp} XP
                      ＋ {taskDifficulty === 'custom' ? taskCustomAllowance : DIFFICULTY_CONFIG[taskDifficulty].allowance} 💰
                    </span>
                  </div>
                  <button onClick={handleCreateTask} disabled={taskCreating || !taskTitle.trim()}
                    className="w-full min-h-[52px] bg-amber-500 text-white font-bold rounded-xl disabled:opacity-40 hover:bg-amber-600 active:scale-95 transition-all">
                    {taskCreating ? '建立中...' : '+ 新增任務'}
                  </button>
                </div>
                {!tasksLoading && tasks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 px-1">現有任務（{tasks.length}）</p>
                    {tasks.map((task) => {
                      const diff = DIFFICULTY_CONFIG[task.difficulty as keyof typeof DIFFICULTY_CONFIG] ?? DIFFICULTY_CONFIG.custom; const type = TYPE_CONFIG[task.type];
                      const weekLabel = task.periodType === 'weekly' && task.weekDays.length > 0 ? task.weekDays.map((d) => WEEKDAY_LABELS[d]).join('、') : '';
                      return (
                        <div key={task.taskId} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                          <span className="text-xl shrink-0">{type.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-800">{task.title}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${diff.color}`}>{diff.label}</span>
                              {task.periodType !== 'once' && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{task.periodType === 'daily' ? '每天' : weekLabel}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-amber-500 font-bold">+{task.xpReward} XP</p>
                              {task.allowanceReward > 0 && <p className="text-xs text-green-600 font-bold">+{task.allowanceReward} 💰</p>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => { setEditingTask(task); setEditTaskTitle(task.title); setEditTaskXp(task.xpReward); }} className="text-xs text-blue-400 hover:text-blue-600 min-h-[36px] px-2">編輯</button>
                            <button onClick={() => handleDeactivateTask(task.taskId)} className="text-xs text-red-400 hover:text-red-600 min-h-[36px] px-2">停用</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!tasksLoading && tasks.length === 0 && <div className="text-center py-8 text-gray-300"><div className="text-3xl mb-2">✅</div><p className="text-sm">尚無任務</p></div>}
              </>
            )}

            {/* ── Pending Tab ── */}
            {activeTab === 'pending' && (
              <>
                {tasksLoading && <div className="text-center py-8 text-amber-500 text-sm">載入中...</div>}
                {!tasksLoading && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between"><p className="text-sm font-bold text-gray-700">任務完成申請</p><span className="text-xs text-gray-400">{completions.length} 筆</span></div>
                    {completions.length === 0
                      ? <div className="text-center py-6 text-gray-300 text-sm bg-white rounded-xl">無待審核</div>
                      : completions.map((c) => {
                          const pName = scores.find((s) => s.playerId === c.playerId)?.name ?? c.playerId;
                          const pColor = scores.find((s) => s.playerId === c.playerId)?.color ?? '#d1d5db';
                          return (
                            <div key={c.completionId} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                              <div className="flex items-start gap-3">
                                <span className="text-xl mt-0.5 shrink-0">✅</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800">{c.taskTitle}</p>
                                  <div className="flex items-center gap-2 mt-0.5"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pColor }} /><p className="text-xs text-gray-400">{pName} · {new Date(c.submittedAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
                                  {c.note && <p className="text-xs text-gray-500 mt-1">備註：{c.note}</p>}
                                </div>
                                <span className="text-base font-black text-amber-500 shrink-0">+{c.xpReward} XP</span>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleProcessCompletion(c.completionId, 'approve')} disabled={processingId === c.completionId} className="flex-1 min-h-[52px] bg-green-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-green-600 active:scale-95 transition-all">✓ 核准</button>
                                <button onClick={() => handleProcessCompletion(c.completionId, 'reject')} disabled={processingId === c.completionId} className="min-h-[52px] px-4 bg-red-100 text-red-600 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-red-200 active:scale-95 transition-all">✕</button>
                              </div>
                            </div>
                          );
                        })
                    }
                    <div className="flex items-center justify-between pt-2"><p className="text-sm font-bold text-gray-700">自主回報申請</p><span className="text-xs text-gray-400">{submissions.length} 筆</span></div>
                    {submissions.length === 0
                      ? <div className="text-center py-6 text-gray-300 text-sm bg-white rounded-xl">無待審核</div>
                      : submissions.map((s) => {
                          const typeInfo = TYPE_CONFIG[s.categoryType];
                          const pName = scores.find((p) => p.playerId === s.playerId)?.name ?? s.playerId;
                          const pColor = scores.find((p) => p.playerId === s.playerId)?.color ?? '#d1d5db';
                          return (
                            <div key={s.submissionId} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                              <div className="flex items-start gap-3">
                                <span className="text-xl mt-0.5 shrink-0">{typeInfo?.emoji ?? '📝'}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800">{s.reason}</p>
                                  <div className="flex items-center gap-2 mt-0.5"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pColor }} /><p className="text-xs text-gray-400">{pName} · {new Date(s.submittedAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
                                  {s.note && <p className="text-xs text-gray-500 mt-1">備註：{s.note}</p>}
                                </div>
                                <span className="text-base font-black text-amber-500 shrink-0">+{s.amount} XP</span>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleProcessSubmission(s.submissionId, 'approve')} disabled={processingId === s.submissionId} className="flex-1 min-h-[52px] bg-green-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-green-600 active:scale-95 transition-all">✓ 核准</button>
                                <button onClick={() => handleProcessSubmission(s.submissionId, 'reject')} disabled={processingId === s.submissionId} className="min-h-[52px] px-4 bg-red-100 text-red-600 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-red-200 active:scale-95 transition-all">✕</button>
                              </div>
                            </div>
                          );
                        })
                    }
                    <div className="flex items-center justify-between pt-2"><p className="text-sm font-bold text-gray-700">商城兌換申請</p><span className="text-xs text-gray-400">{shopOrders.length} 筆</span></div>
                    {shopOrders.length === 0
                      ? <div className="text-center py-6 text-gray-300 text-sm bg-white rounded-xl">無待審核</div>
                      : shopOrders.map((o) => {
                          const pName = scores.find((p) => p.playerId === o.playerId)?.name ?? o.playerId;
                          const pColor = scores.find((p) => p.playerId === o.playerId)?.color ?? '#d1d5db';
                          return (
                            <div key={o.orderId} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                              <div className="flex items-start gap-3">
                                <span className="text-xl mt-0.5 shrink-0">🛒</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800">{o.itemName}</p>
                                  <div className="flex items-center gap-2 mt-0.5"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pColor }} /><p className="text-xs text-gray-400">{pName} · {new Date(o.requestedAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
                                </div>
                                <span className="text-base font-black text-red-500 shrink-0">-{o.price} 💰</span>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleProcessShopOrder(o.orderId, 'approve')} disabled={processingId === o.orderId} className="flex-1 min-h-[52px] bg-green-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-green-600 active:scale-95 transition-all">✓ 核准</button>
                                <button onClick={() => handleProcessShopOrder(o.orderId, 'reject')} disabled={processingId === o.orderId} className="min-h-[52px] px-4 bg-red-100 text-red-600 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-red-200 active:scale-95 transition-all">✕</button>
                              </div>
                            </div>
                          );
                        })
                    }
                  </div>
                )}
              </>
            )}

            {/* ── Allowance Tab ── */}
            {activeTab === 'allowance' && (
              <div className="space-y-4">
                {allowanceErr && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {allowanceErr}</div>}
                {allowanceLoading && <div className="text-center py-8 text-amber-500 text-sm">載入中...</div>}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-gray-400 mb-3">💰 點選 +/− 進行零用金調整</p>
                  <div className="space-y-3">
                    {scores.map((player) => {
                      const bal = allowanceBalances[player.playerId];
                      return (
                        <div key={player.playerId} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white shrink-0" style={{ backgroundColor: player.color }}>
                            {player.emoji ?? player.name?.charAt(0) ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm">{player.name}</p>
                            {bal
                              ? <div className="flex gap-3 text-xs mt-0.5"><span className="text-green-600 font-bold">餘額 {bal.balance} 💰</span><span className="text-gray-400">入{bal.totalEarned}</span><span className="text-gray-400">出{bal.totalSpent}</span></div>
                              : <p className="text-xs text-gray-400">載入中...</p>
                            }
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => { setAdjustingPlayerId(player.playerId); setAdjustAmount(10); setAdjustReason(''); }} className="min-h-[44px] w-11 bg-green-100 text-green-700 rounded-xl text-sm font-bold hover:bg-green-200 active:scale-95 transition-all">+</button>
                            <button onClick={() => { setAdjustingPlayerId(player.playerId); setAdjustAmount(-10); setAdjustReason(''); }} className="min-h-[44px] w-11 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 active:scale-95 transition-all">−</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {adjustingPlayerId && (() => {
                  const player = scores.find((p) => p.playerId === adjustingPlayerId);
                  return (
                    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
                      <div className="absolute inset-0 bg-black/40" onClick={() => { setAdjustingPlayerId(null); setAdjustMode('adjust'); setSetBalanceTarget(0); }} />
                      <div className="relative bg-white w-full max-w-sm rounded-t-3xl lg:rounded-2xl shadow-2xl p-6 space-y-4 z-10 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-gray-800">調整零用金</h3>
                          <button onClick={() => { setAdjustingPlayerId(null); setAdjustMode('adjust'); setSetBalanceTarget(0); }} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full text-xl">✕</button>
                        </div>
                        {player && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-black text-white" style={{ backgroundColor: player.color }}>{player.emoji ?? player.name?.charAt(0) ?? '?'}</div>
                            <p className="font-bold text-gray-800">{player.name}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => setAdjustMode('adjust')} className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold ${adjustMode === 'adjust' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>調整增減</button>
                          <button onClick={() => setAdjustMode('set')} className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold ${adjustMode === 'set' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>設定餘額</button>
                        </div>
                        {adjustMode === 'adjust' && (
                          <div>
                            <p className="text-xs text-gray-400 mb-2">金額</p>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              {[10, 20, 50, 100].map((amt) => (
                                <button key={amt} onClick={() => setAdjustAmount(adjustAmount >= 0 ? amt : -amt)}
                                  className={`min-h-[48px] rounded-xl text-sm font-bold transition-all active:scale-95 ${Math.abs(adjustAmount) === amt ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-amber-100'}`}>
                                  {amt}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setAdjustAmount(Math.abs(adjustAmount))} className={`flex-1 min-h-[48px] rounded-xl text-sm font-bold transition-all ${adjustAmount > 0 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-100'}`}>+ 增加</button>
                              <button onClick={() => setAdjustAmount(-Math.abs(adjustAmount))} className={`flex-1 min-h-[48px] rounded-xl text-sm font-bold transition-all ${adjustAmount < 0 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-100'}`}>− 扣除</button>
                            </div>
                            <div className="text-center text-2xl font-black mt-3 py-2 bg-gray-50 rounded-xl">
                              <span className={adjustAmount >= 0 ? 'text-green-600' : 'text-red-500'}>{adjustAmount >= 0 ? '+' : ''}{adjustAmount} 💰</span>
                            </div>
                          </div>
                        )}
                        {adjustMode === 'set' && (
                          <div>
                            <p className="text-xs text-gray-400 mb-2">目標餘額</p>
                            <div className="grid grid-cols-4 gap-2 mb-2">
                              {[100, 200, 500, 1000].map((v) => (
                                <button key={v} onClick={() => setSetBalanceTarget(v)}
                                  className={`min-h-[48px] rounded-xl text-sm font-bold transition-all active:scale-95 ${setBalanceTarget === v ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-amber-100'}`}>
                                  {v}
                                </button>
                              ))}
                            </div>
                            <input type="number" value={setBalanceTarget}
                              onChange={(e) => setSetBalanceTarget(Number(e.target.value))}
                              className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-lg text-center outline-none min-h-[52px]" />
                            <div className="text-center bg-gray-50 rounded-xl p-3 mt-2">
                              {(() => {
                                const bal = allowanceBalances[adjustingPlayerId]?.balance ?? 0;
                                const d = setBalanceTarget - bal;
                                return <p className={`text-xl font-black ${d >= 0 ? 'text-green-600' : 'text-red-500'}`}>{d >= 0 ? '+' : ''}{d} 💰</p>;
                              })()}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-400 mb-2">原因</p>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {['週零用金', '獎勵', '代購物品', '罰款'].map((reason) => (
                              <button key={reason} onClick={() => setAdjustReason(reason)}
                                className={`min-h-[44px] rounded-xl text-sm font-medium transition-all active:scale-95 ${adjustReason === reason ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-amber-100'}`}>
                                {reason}
                              </button>
                            ))}
                          </div>
                          <input type="text" placeholder="或自行填寫原因..." value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}
                            className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]" />
                        </div>
                        <button
                          onClick={async () => {
                            if (adjustMode === 'set') {
                              const bal = allowanceBalances[adjustingPlayerId]?.balance ?? 0;
                              const d = setBalanceTarget - bal;
                              if (d === 0 || !adjustReason.trim()) return;
                              setAdjustSaving(true);
                              try {
                                await adjustAllowance(familyId, { playerId: adjustingPlayerId, amount: d, reason: adjustReason.trim() });
                                setAdjustingPlayerId(null); setAdjustMode('adjust'); setSetBalanceTarget(0);
                                await loadAllowanceData();
                              } catch { setAllowanceErr('設定失敗'); }
                              finally { setAdjustSaving(false); }
                            } else {
                              await handleAdjustAllowance();
                            }
                          }}
                          disabled={adjustSaving || !adjustReason.trim() || (adjustMode === 'adjust' ? adjustAmount === 0 : (() => { const bal = allowanceBalances[adjustingPlayerId]?.balance ?? 0; return setBalanceTarget - bal === 0; })())}
                          className="w-full min-h-[56px] bg-amber-500 text-white font-bold rounded-2xl disabled:opacity-40 hover:bg-amber-600 active:scale-95 transition-all text-base">
                          {adjustSaving ? '調整中...' : adjustMode === 'set' ? `確認設定為 ${setBalanceTarget} 💰` : `確認 ${adjustAmount >= 0 ? '+' : ''}${adjustAmount} 💰`}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── Shop Tab ── */}
            {activeTab === 'shop' && (
              <div className="space-y-4">
                {shopErr && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {shopErr}</div>}
                {shopLoading && <div className="text-center py-8 text-amber-500 text-sm">載入中...</div>}
                <button onClick={() => setShowShopForm(true)} className="w-full min-h-[52px] bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 active:scale-95 transition-all">+ 新增商城商品</button>

                {showShopForm && (
                  <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowShopForm(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-t-3xl lg:rounded-2xl shadow-2xl p-6 space-y-4 z-10 max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800">新增商品</h3>
                        <button onClick={() => setShowShopForm(false)} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full text-xl">✕</button>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-2">商品類型</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(Object.entries(SHOP_TYPE_CONFIG) as [string, { label: string; emoji: string }][]).map(([key, cfg]) => (
                            <button key={key} onClick={() => { setShopType(key as typeof shopType); setShopEmoji(cfg.emoji); }}
                              className={`min-h-[72px] rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95 ${shopType === key ? 'border-amber-400 bg-amber-50' : 'border-gray-100 bg-white hover:border-amber-200'}`}>
                              <span className="text-2xl">{cfg.emoji}</span>
                              <span className={`text-xs font-semibold ${shopType === key ? 'text-amber-700' : 'text-gray-500'}`}>{cfg.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-2">付款方式</p>
                        <div className="flex gap-2">
                          <button onClick={() => setShopPriceType('allowance')}
                            className={`flex-1 min-h-[48px] rounded-xl text-sm font-bold transition-all ${shopPriceType === 'allowance' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            💰 零用金
                          </button>
                          <button onClick={() => setShopPriceType('xp')}
                            className={`flex-1 min-h-[48px] rounded-xl text-sm font-bold transition-all ${shopPriceType === 'xp' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            ⭐ 經驗值 XP
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-2">價格（{shopPriceType === 'xp' ? 'XP ⭐' : '零用金 💰'}）</p>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {[20, 50, 100, 200].map((p) => (
                            <button key={p} onClick={() => setShopPrice(p)}
                              className={`min-h-[48px] rounded-xl text-sm font-bold transition-all active:scale-95 ${shopPrice === p ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-amber-100'}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                        <input type="number" placeholder="自訂價格" value={shopPrice} onChange={(e) => setShopPrice(Number(e.target.value))}
                          className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]" />
                      </div>
                      {shopPriceType === 'xp' && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">給予零用金 💰</p>
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            {[5, 10, 20, 50].map((v) => (
                              <button key={v} onClick={() => setShopAllowanceGiven(v)}
                                className={`min-h-[48px] rounded-xl text-sm font-bold transition-all active:scale-95 ${shopAllowanceGiven === v ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-amber-100'}`}>
                                {v}
                              </button>
                            ))}
                          </div>
                          <input type="number" value={shopAllowanceGiven}
                            onChange={(e) => setShopAllowanceGiven(Number(e.target.value))}
                            className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-400 mb-2">每日限制</p>
                        <div className="flex gap-2">
                          {[{ label: '無限制', value: null }, { label: '每日1次', value: 1 }, { label: '每日3次', value: 3 }].map(({ label, value }) => (
                            <button key={label} onClick={() => setShopDailyLimit(value)}
                              className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all active:scale-95 ${shopDailyLimit === value ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-amber-100'}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-2">商品名稱</p>
                        <input type="text" placeholder="例如：玩30分鐘平板、點心一份..." value={shopName} onChange={(e) => setShopName(e.target.value)}
                          className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[52px]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-2">說明（選填）</p>
                        <input type="text" placeholder="額外說明..." value={shopDesc} onChange={(e) => setShopDesc(e.target.value)}
                          className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]" />
                      </div>
                      <button onClick={handleCreateShopItem} disabled={shopCreating || !shopName.trim()}
                        className="w-full min-h-[56px] bg-amber-500 text-white font-bold rounded-2xl disabled:opacity-40 hover:bg-amber-600 active:scale-95 transition-all text-base">
                        {shopCreating ? '建立中...' : '新增商品'}
                      </button>
                    </div>
                  </div>
                )}

                {!shopLoading && shopItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 px-1">商城商品（{shopItems.length}）</p>
                    {shopItems.map((item) => (
                      <div key={item.itemId} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                        <span className="text-2xl shrink-0">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                          {item.description && <p className="text-xs text-gray-400 truncate">{item.description}</p>}
                          <p className="text-xs text-amber-600 font-bold mt-0.5">{SHOP_TYPE_CONFIG[item.type]?.label ?? item.type}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-red-500">
                            {item.price} {item.priceType === 'xp' ? '⭐ XP' : '💰'}
                          </p>
                          {item.stock !== null && item.stock !== undefined && <p className="text-xs text-orange-500">庫存：{item.stock}</p>}
                          {item.dailyLimit && <p className="text-xs text-blue-500">每日{item.dailyLimit}次</p>}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => { setEditingShopItem(item); setEditShopName(item.name); setEditShopDesc(item.description); setEditShopPrice(item.price); setEditShopEmoji(item.emoji); }} className="text-xs text-blue-400 hover:text-blue-600 min-h-[36px] px-2">編輯</button>
                          <button onClick={() => handleDeactivateShopItem(item.itemId)} className="text-xs text-red-400 hover:text-red-600 min-h-[36px] px-2">停用</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!shopLoading && shopItems.length === 0 && <div className="text-center py-8 text-gray-300"><div className="text-3xl mb-2">🛒</div><p className="text-sm">尚無商品</p></div>}
              </div>
            )}

            {/* ── Events Tab ── */}
            {activeTab === 'events' && (
              <div className="space-y-4">
                {eventsErr && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {eventsErr}</div>}
                {eventsLoading && <div className="text-center py-8 text-amber-500 text-sm">載入中...</div>}

                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <button onClick={() => { const [y, m] = currentMonth.split('-').map(Number); const prev = new Date(y, m - 2, 1); setCurrentMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`); }} className="min-h-[44px] px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-lg">‹</button>
                  <p className="font-bold text-gray-800">{currentMonth.replace('-', ' 年 ')} 月</p>
                  <button onClick={() => { const [y, m] = currentMonth.split('-').map(Number); const next = new Date(y, m, 1); setCurrentMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`); }} className="min-h-[44px] px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-lg">›</button>
                </div>

                <button onClick={() => setShowEventForm(true)} className="w-full min-h-[52px] bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 active:scale-95 transition-all">+ 新增家庭活動</button>

                {showEventForm && (
                  <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowEventForm(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-t-3xl lg:rounded-2xl shadow-2xl p-6 space-y-4 z-10 max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800">新增家庭活動</h3>
                        <button onClick={() => setShowEventForm(false)} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full text-xl">✕</button>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-2">活動類型</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(Object.entries(EVENT_TYPE_CONFIG) as [string, { label: string; emoji: string; color: string }][]).map(([key, cfg]) => (
                            <button key={key} onClick={() => setEventType(key as typeof eventType)}
                              className={`min-h-[72px] rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95 ${eventType === key ? 'border-amber-400 bg-amber-50' : 'border-gray-100 bg-white hover:border-amber-200'}`}>
                              <span className="text-2xl">{cfg.emoji}</span>
                              <span className={`text-xs font-semibold ${eventType === key ? 'text-amber-700' : 'text-gray-500'}`}>{cfg.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">開始日期</p>
                          <input type="date" value={eventStart} onChange={(e) => setEventStart(e.target.value)} className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-3 py-3 text-sm outline-none min-h-[52px]" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">結束日期（選填）</p>
                          <input type="date" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-3 py-3 text-sm outline-none min-h-[52px]" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">活動名稱</p>
                        <input type="text" placeholder="例如：溪頭露營、學校運動會..." value={eventTitle} onChange={(e) => setEventTitle(e.target.value)}
                          className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[52px]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">說明（選填）</p>
                        <input type="text" placeholder="額外說明..." value={eventDesc} onChange={(e) => setEventDesc(e.target.value)} className="w-full border-2 border-gray-100 focus:border-amber-300 rounded-xl px-4 py-3 text-sm outline-none min-h-[48px]" />
                      </div>
                      <button onClick={handleCreateEvent} disabled={eventCreating || !eventTitle.trim() || !eventStart}
                        className="w-full min-h-[56px] bg-amber-500 text-white font-bold rounded-2xl disabled:opacity-40 hover:bg-amber-600 active:scale-95 transition-all text-base">
                        {eventCreating ? '建立中...' : '新增活動'}
                      </button>
                    </div>
                  </div>
                )}

                {!eventsLoading && events.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 px-1">{events.length} 個活動</p>
                    {events.map((ev) => {
                      const typeInfo = EVENT_TYPE_CONFIG[ev.type];
                      return (
                        <div key={ev.eventId} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: `${ev.color}20` }}>{ev.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{ev.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{ev.startDate}{ev.endDate && ev.endDate !== ev.startDate ? ` ～ ${ev.endDate}` : ''}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block" style={{ backgroundColor: `${ev.color}20`, color: ev.color }}>{typeInfo?.label ?? ev.type}</span>
                          </div>
                          <button onClick={() => deleteEvent(familyId, ev.eventId).then(() => setEvents((prev) => prev.filter((e) => e.eventId !== ev.eventId))).catch(() => setEventsErr('刪除失敗'))}
                            className="text-xs text-red-400 hover:text-red-600 min-h-[44px] px-3 shrink-0">刪除</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!eventsLoading && events.length === 0 && <div className="text-center py-8 text-gray-300"><div className="text-3xl mb-2">📅</div><p className="text-sm">本月尚無家庭活動</p></div>}
              </div>
            )}

            {/* ── Discipline Tab（封印/處罰管理） ── */}
            {activeTab === 'discipline' && (
              <div className="space-y-4">
                {discErr && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{discErr}</div>}

                {/* 新增處罰事件（扣分 + 可選封印/處罰） */}
                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                  <p className="text-sm font-bold text-gray-700">🚨 新增處罰事件</p>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">對象玩家</label>
                    <div className="flex flex-wrap gap-2">
                      {scores.map((p) => (
                        <button key={p.playerId} onClick={() => setDiscPlayerId(p.playerId)}
                          className={`min-h-[44px] px-4 rounded-xl text-sm font-medium transition-all border-2 ${discPlayerId === p.playerId ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-100 text-gray-600 hover:border-gray-300'}`}>
                          {p.emoji ?? ''} {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">扣除 XP</label>
                      <input type="number" min={0} value={discDeductAmount} onChange={(e) => setDiscDeductAmount(Number(e.target.value))}
                        className="w-full border-2 border-gray-100 focus:border-red-300 rounded-xl px-3 py-3 text-center font-bold outline-none min-h-[48px]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">原因</label>
                      <input type="text" placeholder="說明處罰原因" value={discReason} onChange={(e) => setDiscReason(e.target.value)}
                        className="w-full border-2 border-gray-100 focus:border-red-300 rounded-xl px-3 py-3 text-sm outline-none min-h-[48px]" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={discAddSeal} onChange={(e) => setDiscAddSeal(e.target.checked)} className="w-4 h-4 rounded" />
                      加封印
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={discAddPenalty} onChange={(e) => setDiscAddPenalty(e.target.checked)} className="w-4 h-4 rounded" />
                      加處罰項目
                    </label>
                  </div>
                  {discAddSeal && (
                    <div className="border border-red-100 rounded-xl p-3 space-y-2">
                      <p className="text-xs text-red-500 font-medium">封印內容</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([['no-tv','📺 不能看電視'],['no-toys','🧸 不能玩玩具'],['no-games','🎮 不能玩遊戲'],['no-sweets','🍬 不能吃零食'],['custom','自訂']] as const).map(([v,l]) => (
                          <button key={v} onClick={() => setDiscSealType(v)}
                            className={`min-h-[40px] rounded-lg text-xs font-medium border-2 transition-all ${discSealType === v ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-100 text-gray-500'}`}>{l}</button>
                        ))}
                      </div>
                      <input type="text" placeholder="封印名稱" value={discSealName} onChange={(e) => setDiscSealName(e.target.value)}
                        className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-sm outline-none min-h-[44px]" />
                    </div>
                  )}
                  {discAddPenalty && (
                    <div className="border border-orange-100 rounded-xl p-3 space-y-2">
                      <p className="text-xs text-orange-500 font-medium">處罰項目</p>
                      <div className="flex gap-2 flex-wrap">
                        {(['罰站','罰寫','道歉','custom'] as const).map((v) => (
                          <button key={v} onClick={() => setDiscPenaltyType(v)}
                            className={`min-h-[40px] px-3 rounded-lg text-xs font-medium border-2 transition-all ${discPenaltyType === v ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-500'}`}>{v}</button>
                        ))}
                      </div>
                      <input type="text" placeholder="處罰項目名稱" value={discPenaltyName} onChange={(e) => setDiscPenaltyName(e.target.value)}
                        className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-sm outline-none min-h-[44px]" />
                    </div>
                  )}
                  <button
                    disabled={discSaving || !discPlayerId || !discReason.trim()}
                    onClick={async () => {
                      if (!familyId || !discPlayerId || !discReason.trim()) return;
                      setDiscSaving(true); setDiscErr(null);
                      try {
                        await addTransactionWithEffects(familyId, {
                          playerIds: [discPlayerId],
                          type: 'deduct',
                          amount: discDeductAmount,
                          reason: discReason.trim(),
                          seals: discAddSeal && discSealName.trim() ? [{ playerId: discPlayerId, name: discSealName.trim(), type: discSealType }] : undefined,
                          penalties: discAddPenalty && discPenaltyName.trim() ? [{ playerId: discPlayerId, name: discPenaltyName.trim(), type: discPenaltyType }] : undefined,
                        });
                        setDiscReason(''); setDiscSealName(''); setDiscPenaltyName(''); setDiscAddSeal(false); setDiscAddPenalty(false);
                        await Promise.all([loadDisciplineData(), refresh()]);
                      } catch { setDiscErr('執行失敗，請重試'); }
                      finally { setDiscSaving(false); }
                    }}
                    className="w-full min-h-[52px] bg-red-500 text-white font-bold rounded-2xl disabled:opacity-40 hover:bg-red-600 active:scale-95 transition-all">
                    {discSaving ? '處理中...' : '🚨 執行處罰'}
                  </button>
                </div>

                {/* 活躍封印列表 */}
                {discLoading ? <div className="text-center py-6 text-gray-400 text-sm">載入中...</div> : (
                  <>
                    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                      <p className="text-sm font-bold text-gray-700">🔒 活躍封印（{seals.length}）</p>
                      {seals.length === 0 && <p className="text-xs text-gray-400 py-2">目前無封印</p>}
                      {seals.map((seal) => {
                        const player = scores.find((p) => p.playerId === seal.playerId);
                        return (
                          <div key={seal.sealId} className="flex items-center justify-between gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-red-500">🔒</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800">{seal.name}</p>
                                <p className="text-xs text-gray-400">{player?.name ?? seal.playerId} · {seal.type}</p>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                if (!familyId) return;
                                try { await liftSeal(familyId, seal.sealId); setSeals((prev) => prev.filter((s) => s.sealId !== seal.sealId)); }
                                catch { setDiscErr('解封失敗'); }
                              }}
                              className="shrink-0 min-h-[40px] px-3 bg-white border border-red-300 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 active:scale-95 transition-all">
                              解封
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                      <p className="text-sm font-bold text-gray-700">⚠️ 進行中處罰（{penalties.length}）</p>
                      {penalties.length === 0 && <p className="text-xs text-gray-400 py-2">目前無處罰</p>}
                      {penalties.map((penalty) => {
                        const player = scores.find((p) => p.playerId === penalty.playerId);
                        return (
                          <div key={penalty.penaltyId} className="flex items-center justify-between gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-orange-500">⚠️</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800">{penalty.name}</p>
                                <p className="text-xs text-gray-400">{player?.name ?? penalty.playerId} · {penalty.type}</p>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                if (!familyId) return;
                                try { await completePenalty(familyId, penalty.penaltyId); setPenalties((prev) => prev.filter((p) => p.penaltyId !== penalty.penaltyId)); }
                                catch { setDiscErr('完成失敗'); }
                              }}
                              className="shrink-0 min-h-[40px] px-3 bg-white border border-orange-300 text-orange-600 text-xs font-medium rounded-lg hover:bg-orange-50 active:scale-95 transition-all">
                              完成
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Backup Tab ── */}
            {activeTab === 'backup' && (
              <div className="space-y-4">
                {backupErr && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {backupErr}</div>}
                {importSuccess && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">✓ 匯入成功！</div>}

                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                  <p className="text-sm font-bold text-gray-700">📤 匯出備份</p>
                  <p className="text-xs text-gray-400">將所有家庭資料（玩家、任務、商城、活動、零用金紀錄）匯出為 JSON 檔案</p>
                  <button
                    onClick={async () => {
                      if (!familyId) return;
                      setBackupLoading(true); setBackupErr(null);
                      try {
                        const data = await exportFamilyBackup(familyId);
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `family-backup-${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch { setBackupErr('匯出失敗，請重試'); }
                      finally { setBackupLoading(false); }
                    }}
                    disabled={backupLoading || !familyId}
                    className="w-full min-h-[56px] bg-amber-500 text-white font-bold rounded-2xl disabled:opacity-40 hover:bg-amber-600 active:scale-95 transition-all text-base"
                  >
                    {backupLoading ? '匯出中...' : '📥 下載備份檔案'}
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                  <p className="text-sm font-bold text-gray-700">📥 匯入備份</p>
                  <p className="text-xs text-red-400 font-medium">⚠️ 匯入將覆蓋現有任務、商品、活動等資料</p>
                  <label className="w-full min-h-[56px] border-2 border-dashed border-amber-300 rounded-2xl flex items-center justify-center gap-2 text-amber-600 font-medium cursor-pointer hover:bg-amber-50 transition-colors">
                    <input type="file" accept=".json" className="hidden"
                      onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
                    {importFile ? `已選擇：${importFile.name}` : '選擇備份 JSON 檔案'}
                  </label>
                  <button
                    onClick={async () => {
                      if (!importFile || !familyId) return;
                      setImportLoading(true); setBackupErr(null); setImportSuccess(false);
                      try {
                        const text = await importFile.text();
                        const data = JSON.parse(text) as FamilyBackupDto;
                        await importFamilyBackup(familyId, data);
                        setImportSuccess(true); setImportFile(null);
                        await loadTaskData();
                      } catch { setBackupErr('匯入失敗，請確認檔案格式正確'); }
                      finally { setImportLoading(false); }
                    }}
                    disabled={!importFile || importLoading || !familyId}
                    className="w-full min-h-[56px] bg-red-500 text-white font-bold rounded-2xl disabled:opacity-40 hover:bg-red-600 active:scale-95 transition-all text-base"
                  >
                    {importLoading ? '匯入中...' : '🔄 確認匯入（覆蓋資料）'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg z-20">
          {reinitConfirm ? (
            <div className="space-y-2">
              <p className="text-sm text-center text-red-600 font-medium">⚠️ 確定重新初始化？這將重置所有資料！</p>
              <div className="flex gap-2">
                <button onClick={() => setReinitConfirm(false)} className="flex-1 min-h-[52px] rounded-xl border border-gray-300 text-gray-700 font-medium text-sm">取消</button>
                <button onClick={handleReinit} disabled={loading} className="flex-1 min-h-[52px] rounded-xl bg-red-500 text-white font-medium text-sm disabled:opacity-50">{loading ? '執行中...' : '確定重置'}</button>
              </div>
            </div>
          ) : (
            <button onClick={handleReinit} disabled={loading || !familyId} className="w-full min-h-[56px] rounded-xl bg-amber-500 text-white font-semibold shadow-md disabled:opacity-50 hover:bg-amber-600 transition-colors">🔄 重新初始化家庭資料</button>
          )}
        </div>
      </div>
    </div>
  );
}
