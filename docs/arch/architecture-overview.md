# 技能村系統架構總覽

**版本**: 1.0
**日期**: 2026-02-12
**審查者**: Software Architect
**狀態**: ✅ **APPROVED** (with warnings)

---

## 審查結果總結

### ✅ 通過項目

1. **技術棧選擇合理**：NestJS + React + Firestore 適合快速開發與迭代
2. **規則引擎設計優秀**：標準化介面設計具有極佳的擴展性
3. **職責分工清晰**：前端直讀 Firestore，寫入透過後端，符合安全性原則
4. **等級系統設計完整**：Lv 1-1000 的經驗值公式明確且可實作

### ⚠️ 警告項目（需要調整）

1. **Firestore 讀寫次數未優化**：訓練記錄頁面可能產生大量讀取
2. **缺少 Rate Limiting 設計**：防作弊機制僅在後端驗證，前端無限制
3. **訪客模式資料遷移複雜**：localStorage 到 Firestore 需要額外邏輯
4. **密碼安全性不足**：遊戲註冊允許 4-8 字元密碼過於寬鬆

### ❌ 嚴重問題（需要重新設計）

**無嚴重問題**，規格可進入開發階段。

---

## 整體架構圖

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React + TypeScript)              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │ Public Pages   │  │ Game Interface │  │ Character      │       │
│  │ - Landing      │  │ - Typing Game  │  │ Dashboard      │       │
│  │ - Register     │  │ - Math (Future)│  │ - Training Log │       │
│  │ - Login        │  └────────────────┘  │ - Rewards      │       │
│  └────────────────┘                      └────────────────┘       │
│  ┌────────────────┐                      ┌────────────────┐       │
│  │ Admin Panel    │                      │ State Mgmt     │       │
│  │ - Characters   │                      │ (Zustand)      │       │
│  │ - Skills Mgmt  │                      │ - Auth Store   │       │
│  │ - Messages     │                      │ - Char Store   │       │
│  └────────────────┘                      └────────────────┘       │
└───────────┬──────────────────────────────────────┬─────────────────┘
            │                                      │
            │ REST API (Write)                     │ Firestore SDK (Read)
            │                                      │
            ↓                                      ↓
┌──────────────────────────┐         ┌───────────────────────────────┐
│  Backend (NestJS)        │         │   Firestore Database          │
│  ┌────────────────────┐  │         │  ┌─────────────────────────┐ │
│  │ Auth Module        │←─┼─────────┼─→│ characters              │ │
│  │ - Simple Auth      │  │         │  │ - accountType           │ │
│  │ - Full Auth        │  │         │  │ - level, exp            │ │
│  │ - JWT Token        │  │         │  │ - skillProgress         │ │
│  └────────────────────┘  │         │  │ - rewards               │ │
│  ┌────────────────────┐  │         │  └─────────────────────────┘ │
│  │ Character Module   │  │         │  ┌─────────────────────────┐ │
│  │ - CRUD             │←─┼─────────┼─→│ skills                  │ │
│  │ - Password Reset   │  │         │  │ - levels                │ │
│  └────────────────────┘  │         │  │ - expRules              │ │
│  ┌────────────────────┐  │         │  │ - rewardRules           │ │
│  │ Game Engine        │  │         │  │ - gameConfig            │ │
│  │ - Exp Calculator   │←─┼─────────┼─→└─────────────────────────┘ │
│  │ - Reward System    │  │         │  ┌─────────────────────────┐ │
│  │ - Anti-Cheat       │  │         │  │ game_sessions           │ │
│  │ - Level Up         │  │         │  │ - characterId           │ │
│  └────────────────────┘  │         │  │ - performance           │ │
│  ┌────────────────────┐  │         │  │ - result                │ │
│  │ Admin Module       │  │         │  │ - metadata              │ │
│  │ - Characters Mgmt  │←─┼─────────┼─→└─────────────────────────┘ │
│  │ - Skills Config    │  │         │  ┌─────────────────────────┐ │
│  │ - Messages         │  │         │  │ rewards                 │ │
│  │ - Rewards Mgmt     │  │         │  │ - type, amount          │ │
│  └────────────────────┘  │         │  │ - source                │ │
│                          │         │  └─────────────────────────┘ │
│  ┌────────────────────┐  │         │  ┌─────────────────────────┐ │
│  │ Middleware         │  │         │  │ messages                │ │
│  │ - JWT Validation   │  │         │  │ - status, reply         │ │
│  │ - Rate Limiting    │  │         │  └─────────────────────────┘ │
│  │ - Logging          │  │         │                               │
│  └────────────────────┘  │         └───────────────────────────────┘
└──────────────────────────┘
            ↓
┌──────────────────────────┐
│  External Services       │
│  ┌────────────────────┐  │
│  │ Firebase Auth      │  │ (Google OAuth)
│  └────────────────────┘  │
└──────────────────────────┘
```

---

## 技術棧選擇理由

### 前端: React 18 + TypeScript

**選擇理由**：
- ✅ **成熟生態系**：豐富的 UI 元件庫（Ant Design）
- ✅ **類型安全**：TypeScript 減少執行時錯誤
- ✅ **團隊熟悉度**：與 Mido Learning 現有專案一致
- ✅ **適合遊戲化 UI**：React 的虛擬 DOM 適合頻繁更新的遊戲介面

**替代方案考慮**：
- ❌ Vue 3：團隊經驗不足
- ❌ Svelte：生態系不如 React 成熟
- ⚠️ Next.js：目前規格未提及 SSR 需求，暫不採用（未來可升級）

### 狀態管理: Zustand

**選擇理由**：
- ✅ **輕量**：比 Redux 簡單，學習曲線低
- ✅ **TypeScript 友善**：類型推導優秀
- ✅ **效能佳**：只重渲染訂閱的元件

**替代方案考慮**：
- ❌ Redux Toolkit：過於複雜，本專案不需要時間旅行除錯
- ❌ Recoil：學習成本高，社群支援度不如 Zustand
- ⚠️ 直接用 React Context：效能不佳，不適合遊戲狀態頻繁更新

### 後端: NestJS + TypeScript

**選擇理由**：
- ✅ **架構清晰**：內建模組化設計，適合規則引擎開發
- ✅ **裝飾器語法**：API 端點定義清楚
- ✅ **DI 容器**：方便測試與擴展
- ✅ **與前端共用語言**：TypeScript 減少溝通成本

**替代方案考慮**：
- ❌ Express：缺少內建架構，需手動組織
- ❌ .NET 8：與現有 Mido Learning 後端不同技術，增加維護成本
- ⚠️ Serverless Functions (Cloud Functions)：本專案規則引擎複雜，不適合 FaaS

### 資料庫: Firestore

**選擇理由**：
- ✅ **即時同步**：前端可直接監聽資料變化（未來可用於即時排行榜）
- ✅ **無伺服器**：減少維運成本
- ✅ **內建 Security Rules**：保護使用者資料
- ✅ **自動 Scaling**：應付流量高峰

**警告**：
- ⚠️ **讀寫計費**：需優化查詢次數（詳見 database-design.md）
- ⚠️ **查詢限制**：不支援複雜 JOIN，需手動組合資料
- ⚠️ **事務限制**：單一事務最多 500 個文件

**替代方案考慮**：
- ❌ PostgreSQL：需自行維護，增加成本
- ❌ MongoDB：沒有 Firestore 的即時同步優勢
- ⚠️ Cloud Spanner：成本過高，不適合早期專案

---

## 架構設計原則

### 1. 關注點分離 (Separation of Concerns)

**前端職責**：
- UI 渲染與使用者互動
- 表單驗證（客戶端驗證）
- 遊戲邏輯（打字遊戲、數學測驗等）
- 直接讀取 Firestore（僅限自己的資料）

**後端職責**：
- 所有寫入操作（建立角色、遊戲完成、發送訊息）
- 規則引擎計算（經驗值、獎勵、升級）
- 權限驗證與防作弊
- 管理員操作

**Firestore 職責**：
- 資料持久化
- Security Rules 保護資料
- 提供即時訂閱（未來功能）

### 2. 安全性優先 (Security First)

```
所有寫入必須經過後端驗證
        ↓
防止前端直接修改 Firestore（透過 Security Rules）
        ↓
後端驗證：
- JWT Token 有效性
- 操作權限（是否為自己的角色）
- 資料合理性（遊玩時間、經驗值）
- Rate Limiting（防止暴力刷經驗）
```

### 3. 擴展性設計 (Extensibility)

**規則引擎標準化**：
```typescript
// 任何新遊戲只需實作此介面
interface GameCompleteRequest {
  characterId: string;
  skillId: string;
  levelId: string;
  performance: GamePerformance; // 彈性欄位
  metadata: GameMetadata;
}

// 後端自動處理
POST /api/game/complete
→ 讀取 Skill 配置
→ 套用經驗值規則
→ 套用獎勵規則
→ 更新角色資料
→ 回傳結果
```

**新增技能遊戲流程**：
1. 在 Firestore `skills` collection 新增配置（可透過管理員後台）
2. 前端實作遊戲邏輯（打字、數學、記憶遊戲）
3. 呼叫 `/api/game/complete` API
4. **無需修改後端程式碼**

### 4. 效能優化 (Performance)

**前端快取策略**：
```typescript
// Zustand Store 快取 Skills
const useSkillsStore = create((set) => ({
  skills: [],
  lastFetch: null,

  fetchSkills: async () => {
    const now = Date.now();
    const TTL = 5 * 60 * 1000; // 5 分鐘

    if (lastFetch && now - lastFetch < TTL) {
      return; // 使用快取
    }

    // 重新從 Firestore 讀取
    const snapshot = await db.collection('skills').get();
    set({ skills: snapshot.docs.map(d => d.data()), lastFetch: now });
  }
}));
```

**Firestore 讀取優化**：
- 使用複合索引（composite indexes）
- 限制單次查詢數量（pagination）
- 快取熱門資料（skills, 等級經驗值表）

---

## 部署架構

```
┌───────────────────────────────────────────────────────────┐
│                  Google Cloud Platform                    │
│  ┌─────────────────┐          ┌─────────────────┐        │
│  │  Cloud Run      │          │  Cloud Run      │        │
│  │  (Frontend)     │          │  (Backend API)  │        │
│  │  - React Build  │          │  - NestJS       │        │
│  │  - Nginx        │          │  - Node 20      │        │
│  │  - Port 8080    │          │  - Port 8080    │        │
│  └────────┬────────┘          └────────┬────────┘        │
│           │                            │                 │
│           │                            │                 │
│           ↓                            ↓                 │
│  ┌──────────────────────────────────────────────┐       │
│  │          Firebase (Firestore + Auth)         │       │
│  │  - Firestore Database                        │       │
│  │  - Firebase Authentication                   │       │
│  │  - Security Rules                            │       │
│  └──────────────────────────────────────────────┘       │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │          Cloud Monitoring                    │       │
│  │  - Logs (Frontend + Backend)                 │       │
│  │  - Metrics (API Latency, Error Rate)         │       │
│  │  - Alerts (Error Spike, High Latency)        │       │
│  └──────────────────────────────────────────────┘       │
└───────────────────────────────────────────────────────────┘
```

**部署流程**：
```
GitHub Push
    ↓
GitHub Actions Trigger
    ↓
┌──────────────────┐    ┌──────────────────┐
│ Frontend Build   │    │ Backend Build    │
│ - npm install    │    │ - npm install    │
│ - npm run build  │    │ - npm run build  │
│ - Docker Build   │    │ - Docker Build   │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         ↓                       ↓
┌──────────────────┐    ┌──────────────────┐
│ Deploy to        │    │ Deploy to        │
│ Cloud Run        │    │ Cloud Run        │
│ (Frontend)       │    │ (Backend)        │
└──────────────────┘    └──────────────────┘
```

---

## 關鍵設計決策

### 決策 1: 為何不用 Next.js SSR？

**原因**：
- 本專案為 SPA（Single Page Application），登入後所有操作都是客戶端路由
- Firestore 已提供即時資料，不需要 SSR 來預載資料
- 遊戲介面需要高頻率互動，SSR 無法帶來效能提升

**未來考慮**：
- 若需要 SEO（如首頁、遊戲介紹頁），可改用 Next.js App Router

### 決策 2: 為何 Firestore 而非 PostgreSQL？

**原因**：
- 資料結構彈性：skillProgress 是動態欄位（未來可能新增數十種技能）
- 即時同步：未來排行榜可即時更新
- 無伺服器：減少維運成本

**劣勢**：
- 讀寫計費：需仔細設計查詢邏輯（詳見 database-design.md）
- 無法複雜查詢：如「找出所有經驗值 > 1000 且正確率 > 90% 的角色」

### 決策 3: 為何前端可直讀 Firestore？

**原因**：
- 減少 API 請求：技能列表、訓練記錄等資料不需要經過後端
- 降低後端負擔：讀取不涉及計算邏輯
- 即時更新：未來可用 `onSnapshot` 監聽資料變化

**安全性保證**：
- Firestore Security Rules 限制只能讀取自己的資料
- 所有寫入必須透過後端 API

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 角色資料：只能讀取自己的
    match /characters/{characterId} {
      allow read: if request.auth.uid != null &&
                     resource.data.userId == request.auth.uid;
      allow write: if false; // 禁止前端直接寫入
    }

    // Skills：所有人可讀
    match /skills/{skillId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

---

## 風險評估與緩解策略

### 風險 1: Firestore 讀取成本過高

**風險等級**: ⚠️ 中

**場景**：
- 訓練記錄頁面每次載入讀取 100 筆 game_sessions
- 1000 名使用者每天查看 3 次 = 300,000 次讀取/天
- 月讀取量 = 9,000,000 次（超過免費額度 50,000 次）

**緩解策略**：
1. **分頁載入**：預設只載入最近 10 筆，需要時才載入更多
2. **前端快取**：已載入的資料存在 Zustand，減少重複讀取
3. **定期匯總**：每週將歷史記錄匯總，減少查詢範圍

### 風險 2: 作弊問題

**風險等級**: ⚠️ 中

**攻擊場景**：
- 修改前端 JavaScript，直接呼叫 API 並偽造遊玩時間
- 使用自動化腳本刷經驗值

**緩解策略**：
1. **後端驗證時間合理性**（已在規格中）
2. **Rate Limiting**：每個 IP 每分鐘最多 10 次 game complete 請求
3. **異常偵測**：若 1 小時內獲得超過 1000 經驗，標記為可疑
4. **Session ID 驗證**：確保每個遊戲 session 只能提交一次結果

### 風險 3: 訪客資料遷移複雜

**風險等級**: ⚠️ 中

**場景**：
- 訪客在 localStorage 存了 100 筆遊戲記錄
- 註冊後需要全部轉移到 Firestore

**緩解策略**：
1. **簡化匯入**：只匯入等級、經驗值、最佳成績，不匯入歷史記錄
2. **UI 提示**：明確告知訪客哪些資料會保留
3. **限制訪客資料量**：localStorage 最多存 50 筆記錄

---

## 下一步行動

1. **閱讀詳細架構文件**：
   - `backend-architecture.md` - NestJS 模組設計
   - `frontend-architecture.md` - React 目錄結構
   - `database-design.md` - Firestore Collections 設計
   - `infrastructure.md` - 部署與 CI/CD
   - `security-considerations.md` - 防作弊與權限控制

2. **Phase 1 開發順序**：
   1. 建立 Firestore Collections 與 Security Rules
   2. 後端 Auth Module（遊戲註冊、完整註冊、登入）
   3. 後端 Character Module（建立角色、CRUD）
   4. 後端 Game Engine（規則引擎、經驗值計算）
   5. 前端註冊登入頁面
   6. 前端技能村首頁
   7. 前端英打練習遊戲
   8. 後端管理員 API
   9. 前端管理員後台
   10. E2E 測試與部署

3. **團隊分工建議**：
   - Backend Developer: NestJS 模組開發（3 人週）
   - Frontend Developer: React 頁面與遊戲（4 人週）
   - QA: E2E 測試案例設計（與開發並行）
   - DevOps: Cloud Run 部署配置（1 人週）

---

## 總結

✅ **本規格技術上可行，架構設計合理，可進入開發階段。**

⚠️ **建議調整項目**：
1. 加強 Rate Limiting 設計
2. 優化 Firestore 讀取邏輯
3. 簡化訪客資料遷移流程
4. 提高遊戲註冊密碼強度（建議改為 6-12 字元）

**預估開發時間**: 6-8 週（2 名後端 + 2 名前端 + 1 名 QA）
