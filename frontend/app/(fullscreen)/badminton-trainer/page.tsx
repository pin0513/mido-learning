/**
 * 羽球訓練中心
 * - 米字步訓練：6個位置隨機亮燈，訓練腳步移位
 * - 戰術板：Canvas 戰術繪製與亮燈訓練
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PageTab = 'trainer' | 'tactical';
type TrainingMode = 'basic' | 'tactics';
type PositionId = 1 | 2 | 3 | 4 | 5 | 6;
type ShotType = '挑球' | '過渡球' | '抽球' | '殺球' | '切球';

interface Position {
  id: PositionId;
  label: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAYER_POSITIONS: Position[] = [
  { id: 1, label: '前左' },
  { id: 2, label: '前右' },
  { id: 3, label: '中左' },
  { id: 4, label: '中右' },
  { id: 5, label: '後左' },
  { id: 6, label: '後右' },
];

const OPPONENT_LABELS: Record<PositionId, string> = {
  1: '對方前左',
  2: '對方前右',
  3: '對方中左',
  4: '對方中右',
  5: '對方後左',
  6: '對方後右',
};

const SHOT_TYPES: ShotType[] = ['挑球', '過渡球', '抽球', '殺球', '切球'];

const SHOT_TYPE_CONFIG: Record<ShotType, { bg: string; emoji: string; desc: string }> = {
  挑球:  { bg: 'bg-sky-500 text-white',     emoji: '🔼', desc: '高遠球，打到對方底線' },
  過渡球: { bg: 'bg-emerald-500 text-white', emoji: '↗️', desc: '平高球，中距離過渡' },
  抽球:  { bg: 'bg-amber-500 text-black',   emoji: '↔️', desc: '平抽，快速拉線球' },
  殺球:  { bg: 'bg-red-600 text-white',     emoji: '💥', desc: '扣殺，向下猛擊' },
  切球:  { bg: 'bg-violet-500 text-white',  emoji: '📐', desc: '切吊，輕放網前' },
};

/** 重心破壞原理：我方站位 → 對方最佳落點（80% 最佳，20% 次佳）*/
const TACTICS_MAP: Record<PositionId, PositionId[]> = {
  1: [6, 5],
  2: [5, 6],
  3: [6, 2],
  4: [5, 1],
  5: [2, 1],
  6: [1, 2],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomPositionId(): PositionId {
  return (Math.floor(Math.random() * 6) + 1) as PositionId;
}

function randomShotType(): ShotType {
  return SHOT_TYPES[Math.floor(Math.random() * SHOT_TYPES.length)];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BadmintonPage() {
  const [tab, setTab] = useState<PageTab>('trainer');

  // trainer state
  const [mode, setMode] = useState<TrainingMode>('basic');
  const [isRunning, setIsRunning] = useState(false);
  const [activePos, setActivePos] = useState<PositionId | null>(null);
  const [targetPos, setTargetPos] = useState<PositionId | null>(null);
  const [shotType, setShotType] = useState<ShotType | null>(null);
  const [intervalSec, setIntervalSec] = useState(2);
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modeRef = useRef(mode);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  // 切到戰術板時暫停訓練
  useEffect(() => {
    if (tab === 'tactical' && isRunning) {
      setIsRunning(false);
    }
  }, [tab, isRunning]);

  // ── trainer logic ─────────────────────────────────────────────────────────

  const triggerNext = useCallback(() => {
    const newPos = randomPositionId();
    setActivePos(newPos);
    setCount((prev) => prev + 1);
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    if (modeRef.current === 'tactics') {
      const tactics = TACTICS_MAP[newPos];
      const targetId = Math.random() < 0.8 ? tactics[0] : tactics[1];
      setTargetPos(targetId);
      setShotType(randomShotType());
    } else {
      setTargetPos(null);
      setShotType(null);
    }
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(triggerNext, intervalSec * 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, intervalSec, triggerNext]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleStart = () => { triggerNext(); setIsRunning(true); };
  const handleStop  = () => { setIsRunning(false); };
  const handleReset = () => {
    setIsRunning(false);
    setActivePos(null);
    setTargetPos(null);
    setShotType(null);
    setCount(0);
  };
  const handleModeChange = (newMode: TrainingMode) => {
    handleReset();
    setMode(newMode);
  };

  // ── styling ───────────────────────────────────────────────────────────────

  const playerCellClass = (id: PositionId) => {
    const base = 'h-14 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200 select-none';
    return activePos === id
      ? `${base} bg-green-400 text-white ring-4 ring-green-300 scale-105 shadow-lg shadow-green-500/50`
      : `${base} bg-gray-200 text-gray-500`;
  };

  const opponentCellClass = (id: PositionId) => {
    const base = 'h-12 rounded-xl flex items-center justify-center text-xs font-medium transition-all duration-200 select-none';
    return targetPos === id
      ? `${base} bg-orange-400 text-white ring-4 ring-orange-300 scale-105 shadow-lg shadow-orange-400/50`
      : `${base} bg-gray-100 text-gray-400 border border-gray-200`;
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* ── Tab Bar ── */}
      <div className="flex border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setTab('trainer')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            tab === 'trainer'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚡ 米字步訓練
        </button>
        <button
          onClick={() => setTab('tactical')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            tab === 'tactical'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🎯 戰術板
        </button>
      </div>

      {/* ── 戰術板 Tab ── */}
      {tab === 'tactical' && (
        <iframe
          src="/badminton-tactical-board.html"
          className="flex-1 border-none"
          title="羽球戰術板"
        />
      )}

      {/* ── 訓練器 Tab ── */}
      {tab === 'trainer' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-md mx-auto">

            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">🏸 羽球米字步訓練</h1>
              <p className="text-gray-500 text-sm mt-1">
                {mode === 'basic'
                  ? '移動到亮起的位置，訓練六個方向的步伐'
                  : '移動後依指示打出對應球種，訓練戰術反應'}
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-5 shadow-sm">
              <button
                onClick={() => handleModeChange('basic')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  mode === 'basic'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                ⚡ 基本模式
              </button>
              <button
                onClick={() => handleModeChange('tactics')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  mode === 'tactics'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                🎯 戰術模式
              </button>
            </div>

            {/* Court */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">

              {/* Opponent's half (tactics only) */}
              {mode === 'tactics' && (
                <div className="mb-3">
                  <div className="text-center text-xs text-gray-400 font-medium mb-2 tracking-wide">
                    ─── 對方半場 ───
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {([5, 6] as PositionId[]).map((id) => (
                      <div key={`opp-${id}`} className={opponentCellClass(id)}>
                        {OPPONENT_LABELS[id]}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {([3, 4] as PositionId[]).map((id) => (
                      <div key={`opp-${id}`} className={opponentCellClass(id)}>
                        {OPPONENT_LABELS[id]}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {([1, 2] as PositionId[]).map((id) => (
                      <div key={`opp-${id}`} className={opponentCellClass(id)}>
                        {OPPONENT_LABELS[id]}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Net */}
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-xs text-gray-400 font-medium shrink-0">🏸 網</span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>

              {/* Player's half */}
              <div>
                <div className="text-center text-xs text-gray-400 font-medium mb-2 tracking-wide">
                  ─── 你的半場 ───
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {([1, 2] as PositionId[]).map((id) => (
                    <div key={`player-${id}`} className={playerCellClass(id)}>
                      {PLAYER_POSITIONS[id - 1].label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {([3, 4] as PositionId[]).map((id) => (
                    <div key={`player-${id}`} className={playerCellClass(id)}>
                      {PLAYER_POSITIONS[id - 1].label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([5, 6] as PositionId[]).map((id) => (
                    <div key={`player-${id}`} className={playerCellClass(id)}>
                      {PLAYER_POSITIONS[id - 1].label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tactics Info Card */}
            {mode === 'tactics' && (
              <div
                className={`bg-white rounded-2xl border shadow-sm p-4 mb-4 transition-all duration-200 ${
                  flash ? 'border-orange-300 shadow-orange-100' : 'border-gray-200'
                }`}
              >
                {activePos && shotType && targetPos ? (
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-3">
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">移動到</div>
                        <div className="text-xl font-bold text-green-500">
                          {PLAYER_POSITIONS[activePos - 1].label}
                        </div>
                      </div>
                      <div className="text-gray-300 text-2xl">→</div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">打</div>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${SHOT_TYPE_CONFIG[shotType].bg}`}>
                          {SHOT_TYPE_CONFIG[shotType].emoji} {shotType}
                        </span>
                      </div>
                      <div className="text-gray-300 text-2xl">→</div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">目標</div>
                        <div className="text-base font-bold text-orange-500">
                          {OPPONENT_LABELS[targetPos]}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                      {SHOT_TYPE_CONFIG[shotType].desc}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 text-sm py-2">
                    按「開始」進入戰術訓練模式
                  </div>
                )}
              </div>
            )}

            {/* Count */}
            {count > 0 && (
              <div className="text-center mb-4">
                <span className="text-gray-500 text-sm">已完成 </span>
                <span className="text-gray-800 font-bold text-lg">{count}</span>
                <span className="text-gray-500 text-sm"> 次</span>
              </div>
            )}

            {/* Speed Control */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">切換間隔</span>
                <span className="text-sm font-bold text-gray-800">{intervalSec} 秒</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={intervalSec}
                onChange={(e) => setIntervalSec(parseFloat(e.target.value))}
                disabled={isRunning}
                className="w-full accent-blue-500 disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>快 (1秒)</span>
                <span>慢 (5秒)</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  className="col-span-2 bg-green-500 hover:bg-green-600 active:scale-95 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-sm shadow-green-200"
                >
                  ▶ 開始
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="col-span-2 bg-red-500 hover:bg-red-600 active:scale-95 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-sm shadow-red-200"
                >
                  ⏸ 暫停
                </button>
              )}
              <button
                onClick={handleReset}
                className="bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 py-4 rounded-xl font-semibold transition-all"
              >
                ↺ 重置
              </button>
            </div>

            {/* Legend */}
            {mode === 'tactics' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
                <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                  球種說明
                </div>
                <div className="space-y-2">
                  {SHOT_TYPES.map((shot) => (
                    <div key={shot} className="flex items-center gap-3">
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${SHOT_TYPE_CONFIG[shot].bg}`}>
                        {SHOT_TYPE_CONFIG[shot].emoji} {shot}
                      </span>
                      <span className="text-xs text-gray-500">{SHOT_TYPE_CONFIG[shot].desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
