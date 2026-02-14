# 技能村遊戲化學習系統 - 前端開發指南

## 快速開始

### 安裝依賴

```bash
cd frontend
npm install
```

### 環境變數設定

確認 `.env.local` 包含以下變數：

```env
# Firebase 配置
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mido-learning
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# API URL（技能村後端）
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 啟動開發伺服器

```bash
npm run dev
```

開發伺服器將在 http://localhost:3000 啟動。

---

## 技能村系統路由

### 公開頁面（無需登入）

| 路由 | 說明 | 檔案位置 |
|------|------|----------|
| `/about-skill-village` | 技能村介紹頁面 | `app/(public)/about-skill-village/page.tsx` |
| `/register/simple` | 遊戲註冊（使用者名稱 + 密碼） | `app/(auth)/register/simple/page.tsx` |
| `/skill-village-login` | 登入頁面 | `app/(auth)/skill-village-login/page.tsx` |

### 會員頁面（需登入）

| 路由 | 說明 | 檔案位置 |
|------|------|----------|
| `/characters` | 角色選擇與建立 | `app/(member)/characters/page.tsx` |
| `/skill-village` | 技能村首頁 | `app/(member)/skill-village/page.tsx` |
| `/skill-village/[skillId]` | 選擇遊戲難度 | `app/(member)/skill-village/[skillId]/page.tsx` |

### 待實作頁面

- `/register/full` - 完整註冊（Email + Google OAuth）
- `/games/typing` - 英打遊戲畫面
- `/profile/*` - 角色小後台
- `/admin/*` - 管理員後台

---

## 核心技術棧

- **框架**: Next.js 16 (App Router)
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **狀態管理**: Zustand
- **HTTP Client**: Axios
- **資料庫**: Firebase Firestore
- **認證**: Firebase Auth

---

## 專案結構

```
frontend/
├── app/                      # Next.js App Router 頁面
│   ├── (public)/             # 公開頁面
│   ├── (auth)/               # 認證相關頁面
│   ├── (member)/             # 會員專用頁面
│   └── (admin)/              # 管理員後台
├── components/               # 共用元件
│   └── skill-village/
│       ├── ui/               # 基礎 UI 元件
│       ├── skill/            # 技能相關元件
│       └── game/             # 遊戲相關元件
├── stores/                   # Zustand 狀態管理
│   ├── authStore.ts
│   ├── characterStore.ts
│   ├── skillsStore.ts
│   └── gameStore.ts
├── types/                    # TypeScript 類型定義
│   └── skill-village/
├── utils/                    # 工具函式
│   └── skill-village/
└── lib/                      # 第三方服務配置
    ├── firebase.ts
    └── api-client.ts
```

---

## 開發流程

### 1. 建立新頁面

```bash
# 在適當的路由群組下建立頁面
# 例如：會員專用頁面
mkdir -p app/\(member\)/your-page
touch app/\(member\)/your-page/page.tsx
```

### 2. 建立新元件

```bash
# 在 components/skill-village 下建立
mkdir -p components/skill-village/your-component
touch components/skill-village/your-component/YourComponent.tsx
```

### 3. 新增狀態管理

```typescript
// stores/yourStore.ts
import { create } from 'zustand';

interface YourState {
  // 狀態定義
}

export const useYourStore = create<YourState>((set) => ({
  // 實作
}));
```

---

## 常用指令

```bash
# 啟動開發伺服器
npm run dev

# 建置專案
npm run build

# 執行 Lint
npm run lint

# 類型檢查
npm run type-check
```

---

## 注意事項

### 1. 路由命名規則

- 公開頁面：使用 `(public)` 群組
- 認證頁面：使用 `(auth)` 群組
- 會員頁面：使用 `(member)` 群組
- 管理員頁面：使用 `(admin)` 群組

### 2. 狀態管理原則

- 使用 Zustand 管理全域狀態
- 使用 `persist` middleware 持久化重要狀態（如認證）
- 避免在元件內直接修改 store 狀態

### 3. API 呼叫

- 統一使用 `lib/api-client.ts` 的 `skillVillageApi` 實例
- 所有 API 請求會自動帶上 JWT Token
- 401 錯誤會自動登出並導向登入頁

### 4. Firebase 使用

- 讀取 Firestore：直接使用 Firebase Client SDK
- 寫入操作：透過後端 API（確保資料一致性）

---

## 疑難排解

### 問題：開發伺服器啟動失敗

**可能原因**：
- 端口 3000 被佔用
- Node.js 版本不符（需要 18+）

**解決方式**：
```bash
# 檢查端口佔用
lsof -i :3000

# 使用其他端口
npm run dev -- -p 3001
```

### 問題：Firebase 初始化錯誤

**可能原因**：
- `.env.local` 配置錯誤
- Firebase 專案設定不正確

**解決方式**：
- 確認所有環境變數都已設定
- 檢查 Firebase Console 的專案設定

### 問題：Zustand persist 不生效

**可能原因**：
- SSR 環境下的 localStorage 不可用

**解決方式**：
- 確保在 Client Component 中使用（`'use client'`）
- 使用 `useEffect` 延遲讀取 store

---

## 相關文件

- [產品規格文件](../docs/specs/20260211-01-skill-village.md)
- [前端架構設計](../docs/arch/frontend-architecture.md)
- [技術債文件](../docs/TECH_DEBT.md)
- [開發進度](./SKILL_VILLAGE_PROGRESS.md)

---

**最後更新**: 2026-02-12
