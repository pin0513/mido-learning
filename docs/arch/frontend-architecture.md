# 前端架構設計（React + TypeScript）

**版本**: 1.0
**日期**: 2026-02-12
**審查者**: Software Architect

---

## 目錄結構

```
frontend/skill-village-web/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── assets/
│       ├── images/
│       │   ├── skills/           # 技能圖示
│       │   └── avatars/          # 角色頭像
│       └── sounds/               # 遊戲音效（可選）
│
├── src/
│   ├── main.tsx                  # 應用程式入口
│   ├── App.tsx                   # Root Component
│   ├── router.tsx                # 路由配置
│   │
│   ├── assets/                   # 靜態資源
│   │   ├── styles/
│   │   │   ├── global.css        # 全域樣式
│   │   │   └── variables.css     # CSS 變數（顏色、字體）
│   │   └── images/
│   │
│   ├── components/               # 共用元件
│   │   ├── layout/
│   │   │   ├── Header.tsx        # 頂部導覽列
│   │   │   ├── Footer.tsx        # 頁尾
│   │   │   └── Sidebar.tsx       # 側邊欄（管理員後台用）
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ProgressBar.tsx   # 經驗值進度條
│   │   │   └── LevelBadge.tsx    # 等級徽章
│   │   ├── character/
│   │   │   ├── CharacterCard.tsx # 角色卡片
│   │   │   └── CharacterInfo.tsx # 角色資訊顯示
│   │   ├── skill/
│   │   │   ├── SkillCard.tsx     # 技能卡片
│   │   │   └── SkillProgress.tsx # 技能進度顯示
│   │   └── game/
│   │       ├── GameHeader.tsx    # 遊戲頂部（計時器、分數）
│   │       ├── GameResult.tsx    # 遊戲結果畫面
│   │       └── LevelUpModal.tsx  # 升級通知
│   │
│   ├── pages/                    # 頁面元件
│   │   ├── public/               # 公開頁面
│   │   │   ├── LandingPage.tsx   # 首頁
│   │   │   ├── RegisterPage.tsx  # 註冊頁面
│   │   │   └── LoginPage.tsx     # 登入頁面
│   │   ├── auth/                 # 認證相關
│   │   │   ├── SelectCharacterPage.tsx  # 選擇角色
│   │   │   └── CreateCharacterPage.tsx  # 建立角色
│   │   ├── village/              # 技能村
│   │   │   └── SkillVillagePage.tsx     # 技能村首頁
│   │   ├── games/                # 遊戲頁面
│   │   │   ├── TypingGame/
│   │   │   │   ├── index.tsx     # 英打遊戲主頁
│   │   │   │   ├── TypingGame.tsx # 遊戲邏輯
│   │   │   │   └── components/
│   │   │   │       ├── WordDisplay.tsx
│   │   │   │       ├── InputArea.tsx
│   │   │   │       └── Timer.tsx
│   │   │   └── MathGame/         # 數學遊戲（未來）
│   │   ├── profile/              # 角色小後台
│   │   │   ├── SettingsPage.tsx  # 個人設定
│   │   │   ├── TrainingLogPage.tsx # 訓練記錄
│   │   │   ├── RewardsPage.tsx   # 獎勵歷史
│   │   │   ├── RedeemPage.tsx    # 兌換頁面
│   │   │   └── ContactPage.tsx   # 聯絡管理員
│   │   └── admin/                # 管理員後台
│   │       ├── DashboardPage.tsx
│   │       ├── CharactersPage.tsx
│   │       ├── SkillsPage.tsx
│   │       ├── MessagesPage.tsx
│   │       └── RewardsPage.tsx
│   │
│   ├── stores/                   # Zustand 狀態管理
│   │   ├── authStore.ts          # 認證狀態
│   │   ├── characterStore.ts     # 角色狀態
│   │   ├── skillsStore.ts        # 技能列表
│   │   ├── gameStore.ts          # 遊戲狀態
│   │   └── uiStore.ts            # UI 狀態（loading, modals）
│   │
│   ├── services/                 # API 服務層
│   │   ├── api.ts                # Axios 實例配置
│   │   ├── authService.ts        # 認證 API
│   │   ├── characterService.ts   # 角色 API
│   │   ├── gameService.ts        # 遊戲 API
│   │   ├── rewardService.ts      # 獎勵 API
│   │   └── firebaseService.ts    # Firestore 直讀服務
│   │
│   ├── hooks/                    # 自訂 Hooks
│   │   ├── useAuth.ts            # 認證狀態
│   │   ├── useCharacter.ts       # 角色資料
│   │   ├── useSkills.ts          # 技能列表
│   │   ├── useGameSession.ts     # 遊戲 Session
│   │   └── useFirestore.ts       # Firestore 即時訂閱
│   │
│   ├── utils/                    # 工具函式
│   │   ├── levelCalculator.ts    # 等級計算
│   │   ├── timeFormatter.ts      # 時間格式化
│   │   ├── validation.ts         # 表單驗證
│   │   └── storage.ts            # localStorage 封裝
│   │
│   ├── types/                    # TypeScript 類型定義
│   │   ├── character.ts
│   │   ├── skill.ts
│   │   ├── game.ts
│   │   ├── reward.ts
│   │   └── api.ts
│   │
│   └── config/
│       ├── firebase.ts           # Firebase 初始化
│       └── constants.ts          # 常數定義
│
├── .env.example                  # 環境變數範本
├── vite.config.ts                # Vite 配置
├── tsconfig.json                 # TypeScript 配置
├── tailwind.config.js            # Tailwind CSS 配置
└── package.json
```

---

## 狀態管理架構（Zustand）

### 1. Auth Store（認證狀態）

```typescript
// stores/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  // 狀態
  token: string | null;
  isAuthenticated: boolean;
  currentCharacterId: string | null;

  // 動作
  login: (token: string, characterId: string) => void;
  logout: () => void;
  switchCharacter: (characterId: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,
      currentCharacterId: null,

      login: (token, characterId) => set({
        token,
        isAuthenticated: true,
        currentCharacterId: characterId,
      }),

      logout: () => set({
        token: null,
        isAuthenticated: false,
        currentCharacterId: null,
      }),

      switchCharacter: (characterId) => set({ currentCharacterId: characterId }),
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        token: state.token,
        currentCharacterId: state.currentCharacterId,
      }),
    }
  )
);
```

### 2. Character Store（角色狀態）

```typescript
// stores/characterStore.ts

import { create } from 'zustand';
import { Character } from '@/types/character';
import { characterService } from '@/services/characterService';

interface CharacterState {
  // 狀態
  currentCharacter: Character | null;
  characters: Character[]; // 完整註冊帳號的所有角色
  isLoading: boolean;

  // 動作
  fetchCurrentCharacter: (id: string) => Promise<void>;
  fetchCharacters: () => Promise<void>;
  updateCharacter: (id: string, data: Partial<Character>) => Promise<void>;
  refreshCharacter: () => Promise<void>;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  currentCharacter: null,
  characters: [],
  isLoading: false,

  fetchCurrentCharacter: async (id: string) => {
    set({ isLoading: true });
    try {
      const character = await characterService.getById(id);
      set({ currentCharacter: character, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchCharacters: async () => {
    set({ isLoading: true });
    try {
      const characters = await characterService.getAll();
      set({ characters, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateCharacter: async (id: string, data: Partial<Character>) => {
    await characterService.update(id, data);
    await get().refreshCharacter();
  },

  refreshCharacter: async () => {
    const currentCharacterId = get().currentCharacter?.id;
    if (currentCharacterId) {
      await get().fetchCurrentCharacter(currentCharacterId);
    }
  },
}));
```

### 3. Skills Store（技能列表）

```typescript
// stores/skillsStore.ts

import { create } from 'zustand';
import { Skill } from '@/types/skill';
import { firebaseService } from '@/services/firebaseService';

interface SkillsState {
  skills: Skill[];
  lastFetch: number | null;
  isLoading: boolean;

  fetchSkills: () => Promise<void>;
  getSkillById: (id: string) => Skill | undefined;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘

export const useSkillsStore = create<SkillsState>((set, get) => ({
  skills: [],
  lastFetch: null,
  isLoading: false,

  fetchSkills: async () => {
    const { lastFetch } = get();
    const now = Date.now();

    // 檢查快取
    if (lastFetch && now - lastFetch < CACHE_TTL) {
      return; // 使用快取
    }

    set({ isLoading: true });
    try {
      const skills = await firebaseService.getSkills();
      set({ skills, lastFetch: now, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  getSkillById: (id: string) => {
    return get().skills.find(s => s.id === id);
  },
}));
```

### 4. Game Store（遊戲狀態）

```typescript
// stores/gameStore.ts

import { create } from 'zustand';
import { GameSession, GamePerformance } from '@/types/game';

interface GameState {
  currentSession: GameSession | null;
  isPlaying: boolean;
  startTime: number | null;
  performance: GamePerformance;

  startGame: (skillId: string, levelId: string) => void;
  updatePerformance: (data: Partial<GamePerformance>) => void;
  endGame: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentSession: null,
  isPlaying: false,
  startTime: null,
  performance: {
    playTime: 0,
    accuracy: 0,
    wpm: 0,
  },

  startGame: (skillId, levelId) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    set({
      currentSession: { sessionId, skillId, levelId },
      isPlaying: true,
      startTime: Date.now(),
      performance: { playTime: 0, accuracy: 0, wpm: 0 },
    });
  },

  updatePerformance: (data) => set((state) => ({
    performance: { ...state.performance, ...data },
  })),

  endGame: () => set({ isPlaying: false }),

  resetGame: () => set({
    currentSession: null,
    isPlaying: false,
    startTime: null,
    performance: { playTime: 0, accuracy: 0, wpm: 0 },
  }),
}));
```

---

## 路由設計（React Router v6）

```typescript
// router.tsx

import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  // 公開路由
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },

  // 需登入路由
  {
    path: '/village',
    element: (
      <ProtectedRoute>
        <SkillVillagePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/games/typing',
    element: (
      <ProtectedRoute>
        <TypingGame />
      </ProtectedRoute>
    ),
  },

  // 角色小後台
  {
    path: '/profile',
    element: <ProtectedRoute><ProfileLayout /></ProtectedRoute>,
    children: [
      { path: 'settings', element: <SettingsPage /> },
      { path: 'training', element: <TrainingLogPage /> },
      { path: 'rewards', element: <RewardsPage /> },
      { path: 'redeem', element: <RedeemPage /> },
      { path: 'contact', element: <ContactPage /> },
    ],
  },

  // 管理員後台
  {
    path: '/admin',
    element: <ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>,
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'characters', element: <CharactersPage /> },
      { path: 'skills', element: <SkillsPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'rewards', element: <RewardsPage /> },
    ],
  },
]);
```

### Protected Route 實作

```typescript
// components/ProtectedRoute.tsx

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useCharacterStore } from '@/stores/characterStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { isAuthenticated } = useAuthStore();
  const { currentCharacter } = useCharacterStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !currentCharacter?.isAdmin) {
    return <Navigate to="/village" replace />;
  }

  return <>{children}</>;
};
```

---

## API 服務層

### Axios 實例配置

```typescript
// services/api.ts

import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
});

// 請求攔截器：加入 JWT Token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 回應攔截器：統一錯誤處理
api.interceptors.response.use(
  (response) => response.data, // 提取 data
  (error) => {
    if (error.response?.status === 401) {
      // Token 過期，自動登出
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Auth Service

```typescript
// services/authService.ts

import { api } from './api';
import { ApiResponse } from '@/types/api';
import { Character } from '@/types/character';

interface LoginResponse {
  token: string;
  characters: Character[];
}

export const authService = {
  registerSimple: async (data: {
    username: string;
    password: string;
    characterName: string;
  }): Promise<ApiResponse<{ token: string; character: Character }>> => {
    return api.post('/api/auth/register-simple', data);
  },

  registerFull: async (data: {
    email: string;
    password: string;
    characterName: string;
  }): Promise<ApiResponse<{ token: string; character: Character }>> => {
    return api.post('/api/auth/register-full', data);
  },

  login: async (data: {
    identifier: string;
    password: string;
  }): Promise<ApiResponse<LoginResponse>> => {
    return api.post('/api/auth/login', data);
  },

  googleLogin: async (idToken: string): Promise<ApiResponse<LoginResponse>> => {
    return api.post('/api/auth/google-login', { idToken });
  },
};
```

### Game Service

```typescript
// services/gameService.ts

import { api } from './api';
import { GameCompleteRequest, GameResult } from '@/types/game';
import { ApiResponse } from '@/types/api';

export const gameService = {
  completeGame: async (data: GameCompleteRequest): Promise<ApiResponse<GameResult>> => {
    return api.post('/api/game/complete', data);
  },
};
```

---

## 自訂 Hooks

### useAuth Hook

```typescript
// hooks/useAuth.ts

import { useAuthStore } from '@/stores/authStore';
import { useCharacterStore } from '@/stores/characterStore';
import { authService } from '@/services/authService';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, login, logout } = useAuthStore();
  const { fetchCurrentCharacter } = useCharacterStore();

  const handleLogin = async (identifier: string, password: string) => {
    const response = await authService.login({ identifier, password });

    if (response.success && response.data) {
      const { token, characters } = response.data;

      if (characters.length === 1) {
        // 只有一個角色，直接登入
        login(token, characters[0].id);
        await fetchCurrentCharacter(characters[0].id);
        navigate('/village');
      } else {
        // 多個角色，導向選擇頁面
        login(token, '');
        navigate('/select-character');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return {
    token,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
  };
};
```

### useGameSession Hook

```typescript
// hooks/useGameSession.ts

import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useCharacterStore } from '@/stores/characterStore';
import { gameService } from '@/services/gameService';

export const useGameSession = (skillId: string, levelId: string) => {
  const {
    currentSession,
    isPlaying,
    startTime,
    performance,
    startGame,
    updatePerformance,
    endGame,
    resetGame,
  } = useGameStore();

  const { currentCharacter, refreshCharacter } = useCharacterStore();
  const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null);

  // 開始遊戲
  const handleStartGame = useCallback(() => {
    startGame(skillId, levelId);
  }, [skillId, levelId, startGame]);

  // 閒置偵測
  const resetIdleTimer = useCallback(() => {
    if (idleTimer) clearTimeout(idleTimer);

    const timer = setTimeout(() => {
      if (isPlaying) {
        handleEndGame(true); // 閒置結束，不計分
      }
    }, 5 * 60 * 1000); // 5 分鐘

    setIdleTimer(timer);
  }, [idleTimer, isPlaying]);

  // 結束遊戲
  const handleEndGame = useCallback(async (idle: boolean = false) => {
    if (!currentSession || !currentCharacter || !startTime) return;

    endGame();

    if (idle) {
      // 閒置結束，不提交結果
      alert('閒置時間過長，本次練習不計入經驗值');
      resetGame();
      return;
    }

    // 提交遊戲結果
    try {
      const result = await gameService.completeGame({
        characterId: currentCharacter.id,
        skillId: currentSession.skillId,
        levelId: currentSession.levelId,
        performance: {
          ...performance,
          playTime: (Date.now() - startTime) / 60000, // 分鐘
        },
        metadata: {
          ip: '', // 後端取得
          userAgent: navigator.userAgent,
          sessionId: currentSession.sessionId,
          startTime,
          endTime: Date.now(),
        },
      });

      // 更新角色資料
      await refreshCharacter();

      // 顯示結果畫面
      return result.data?.result;
    } catch (error) {
      console.error('提交遊戲結果失敗', error);
      throw error;
    }
  }, [currentSession, currentCharacter, startTime, performance, endGame, resetGame, refreshCharacter]);

  // 監聽使用者活動
  useEffect(() => {
    if (!isPlaying) return;

    const handleActivity = () => resetIdleTimer();

    document.addEventListener('keydown', handleActivity);
    document.addEventListener('mousemove', handleActivity);

    return () => {
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('mousemove', handleActivity);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [isPlaying, resetIdleTimer]);

  return {
    isPlaying,
    performance,
    startGame: handleStartGame,
    updatePerformance,
    endGame: handleEndGame,
  };
};
```

---

## 核心元件範例

### SkillCard（技能卡片）

```typescript
// components/skill/SkillCard.tsx

import { Skill } from '@/types/skill';
import { useCharacterStore } from '@/stores/characterStore';
import { ProgressBar } from '../ui/ProgressBar';
import { LevelBadge } from '../ui/LevelBadge';

interface SkillCardProps {
  skill: Skill;
  onClick: () => void;
}

export const SkillCard: React.FC<SkillCardProps> = ({ skill, onClick }) => {
  const { currentCharacter } = useCharacterStore();
  const progress = currentCharacter?.skillProgress[skill.id];

  const isUnlocked = skill.levels[0].unlockCondition.characterLevel
    ? currentCharacter!.level >= skill.levels[0].unlockCondition.characterLevel
    : true;

  return (
    <div
      className={`skill-card ${!isUnlocked && 'locked'}`}
      onClick={isUnlocked ? onClick : undefined}
    >
      <div className="skill-icon">{skill.icon}</div>
      <h3 className="skill-name">{skill.name}</h3>

      {isUnlocked ? (
        <>
          <LevelBadge level={progress?.skillLevel || 1} />
          <ProgressBar
            current={progress?.skillExp || 0}
            max={1000} // TODO: 計算技能升級所需經驗
          />
          <div className="skill-stats">
            <span>遊玩 {progress?.playCount || 0} 次</span>
            {progress?.bestScore?.wpm && (
              <span>最佳: {progress.bestScore.wpm} WPM</span>
            )}
          </div>
          <button className="btn-primary">開始練習</button>
        </>
      ) : (
        <div className="unlock-info">
          Lv {skill.levels[0].unlockCondition.characterLevel} 解鎖
        </div>
      )}
    </div>
  );
};
```

### GameResult（遊戲結果畫面）

```typescript
// components/game/GameResult.tsx

import { GameResult as IGameResult } from '@/types/game';
import { LevelUpModal } from './LevelUpModal';

interface GameResultProps {
  result: IGameResult;
  onPlayAgain: () => void;
  onBackToVillage: () => void;
}

export const GameResult: React.FC<GameResultProps> = ({
  result,
  onPlayAgain,
  onBackToVillage,
}) => {
  return (
    <>
      {result.levelUp && <LevelUpModal newLevel={result.newLevel} />}

      <div className="game-result">
        <h2>🎉 練習完成！</h2>

        <div className="result-card">
          <h3>成績報告</h3>
          {/* 根據 performance 顯示 */}
        </div>

        <div className="reward-card">
          <h3>獎勵</h3>
          <p>✨ 獲得經驗值: +{result.expGained} EXP</p>
          {result.rewardEarned > 0 && (
            <p>💰 獲得獎勵: +{result.rewardEarned} 米豆幣</p>
          )}
        </div>

        <div className="actions">
          <button onClick={onPlayAgain}>再玩一次</button>
          <button onClick={onBackToVillage}>返回技能村</button>
        </div>
      </div>
    </>
  );
};
```

---

## 效能優化策略

### 1. Code Splitting（路由懶載入）

```typescript
import { lazy, Suspense } from 'react';

const TypingGame = lazy(() => import('./pages/games/TypingGame'));
const AdminDashboard = lazy(() => import('./pages/admin/DashboardPage'));

// 使用時包裹 Suspense
<Suspense fallback={<Loading />}>
  <TypingGame />
</Suspense>
```

### 2. React.memo 避免不必要的重渲染

```typescript
export const SkillCard = React.memo<SkillCardProps>(({ skill, onClick }) => {
  // ...
}, (prevProps, nextProps) => {
  // 自訂比較邏輯
  return prevProps.skill.id === nextProps.skill.id &&
         prevProps.skill.status === nextProps.skill.status;
});
```

### 3. 虛擬滾動（大量資料列表）

```typescript
import { FixedSizeList } from 'react-window';

// 訓練記錄頁面
<FixedSizeList
  height={600}
  itemCount={sessions.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <SessionRow session={sessions[index]} />
    </div>
  )}
</FixedSizeList>
```

---

## 開發建議

### 1. 開發順序

```
UI 元件庫（Button, Input, Card）
    ↓
Zustand Stores（Auth, Character）
    ↓
API Services（Auth, Character）
    ↓
註冊登入頁面
    ↓
技能村首頁
    ↓
英打遊戲
    ↓
角色小後台
    ↓
管理員後台
```

### 2. 測試策略

```typescript
// __tests__/components/SkillCard.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { SkillCard } from '@/components/skill/SkillCard';

describe('SkillCard', () => {
  it('should display skill name', () => {
    const skill = { id: 'typing', name: '英打練習', ... };
    render(<SkillCard skill={skill} onClick={() => {}} />);

    expect(screen.getByText('英打練習')).toBeInTheDocument();
  });

  it('should call onClick when unlocked', () => {
    const handleClick = jest.fn();
    render(<SkillCard skill={unlockedSkill} onClick={handleClick} />);

    fireEvent.click(screen.getByText('開始練習'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

---

## 總結

✅ **目錄結構清晰，職責分明**
✅ **Zustand 狀態管理簡潔有效**
✅ **自訂 Hooks 封裝邏輯，可重用性高**
✅ **Protected Route 確保路由安全**
✅ **Code Splitting 優化載入效能**

⚠️ **需注意事項**：
- 遊戲邏輯需獨立測試（英打遊戲的 WPM 計算、正確率計算）
- 訪客模式的 localStorage 需定期清理
- Firestore 訂閱需正確取消，避免記憶體洩漏
