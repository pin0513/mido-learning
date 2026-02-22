# 家庭計分板 (Family Scoreboard) — 功能需求規格書

**文件版本**：v2.0
**建立日期**：2026-02-18
**更新日期**：2026-02-22
**狀態**：M1–M14 全部完成 ✅
**主路由**：`/(scoreboard)/family-scoreboard`
**玩家端路由**：`/(player)/family-scoreboard/player`

---

## 1. 背景與目標

### 1.1 背景

家長希望建立一套能讓孩子與父母**共同協作**的積分系統，透過正向鼓勵（而非懲罰導向）培養良好習慣與品格。此功能作為 Mido Learning **獨立模組**加入，不與學習功能混合。

### 1.2 教育理論依據

| 理論 | 應用方式 |
|------|----------|
| **正增強 (Positive Reinforcement)** | 超出本分的善行 → 立即加分回饋，強化好行為 |
| **自我決定理論 (SDT)** | 兒童可看到自己的成長報表，培養自律動機 |
| **代幣制度 (Token Economy)** | 積分可兌換獎勵，形成行為→積分→兌換的正向循環 |
| **成長心態 (Growth Mindset)** | 連續成就 (Streak) 強調進步與堅持，非一次性結果 |
| **社會學習理論** | 家庭成員可互相觀摩，兄弟姊妹的良性競爭 |

### 1.3 核心哲學

> **「做好分內的事是應該的；超越本分，幫助他人，不求回報，才值得獎勵。」**

- ❌ 完成日常責任（吃飯、睡覺、上學）= 不加分（理所當然）
- ✅ 主動幫助家人 = 加分
- ✅ 對他人友善、不求回報 = 加分
- ✅ 突破成就、連續堅持 = 特殊獎勵

---

## 2. 使用者角色

| 角色 | 權限 | 說明 |
|------|------|------|
| **Admin（主管理員）** | 全部權限 | 建立家庭、加分/扣分、管理玩家/獎勵/任務/商城/事件、審核兌換、備份匯出、邀請 Co-Admin |
| **Co-Admin（共同家長）** | 同 Admin（除刪除家庭外） | 被邀請加入家庭的第二位家長，以 `?familyId=` 操作非自身的家庭 |
| **Player（孩子）** | 獨立登入 + 有限操作 | 透過家庭代碼 + 密碼登入，可查看積分、提交任務完成、申請兌換、下單商城 |
| **Super Admin** | 系統管理 | 列出所有家庭、封禁/解封/永久刪除家庭 |
| **Guest** | 無 | 未登入用戶看不到此功能入口 |

### 2.1 存取控制

- **Admin/Co-Admin**：透過 Firebase Auth JWT 登入，存取所有管理功能
- **Player 獨立登入**：透過 `displayCode`（家庭代碼）+ `playerId` + `password` 登入，取得 Player JWT
- **Super Admin**：需 `SuperAdminOnly` policy 授權
- **多家庭支援**：一位 Admin 可建立多個家庭，透過 `GET /my-families` 取得家庭清單並切換

### 2.2 新用戶流程

1. Admin 首次進入 → 看到歡迎畫面（建立新家庭 / 等待邀請）
2. 選擇「建立新家庭」→ 呼叫 `POST /initialize?familyId=` 建立家庭
3. 在設定頁產生 `displayCode` 供 Player 登入使用
4. 選擇「邀請共同家長」→ 以 email 查詢 UID → `POST /{familyId}/co-admins`

---

## 3. 功能範疇（Feature Scope）

### 3.1 核心功能列表

| # | 功能模組 | 狀態 | 說明 |
|---|---------|------|------|
| F1 | 玩家計分儀表板 | ✅ | 首頁 Tab：玩家卡片、快速加減分 |
| F2 | 積分交易記錄 | ✅ | 記錄 Tab：所有加減分的歷史紀錄 |
| F3 | 雙軌積分系統 | ✅ | 成就分(累計) vs 可兌換分(扣除後) |
| F4 | 獎勵兌換系統 | ✅ | 獎勵清單、申請兌換、Admin 審核 |
| F5 | 報表儀表板 | ✅ | 報表 Tab：貼紙牆 + 個別玩家統計 |
| F6 | 玩家管理 | ✅ | 新增/編輯/刪除玩家，含 emoji、生日、密碼 |
| F7 | 任務系統 | ✅ | 任務 CRUD、週期設定、玩家提交、Admin 審核 |
| F8 | 零用金系統 | ✅ | 獨立帳本、收支記錄、餘額查詢 |
| F9 | 商城系統 | ✅ | 商品管理、玩家下單、Admin 審核、時效道具 |
| F10 | 事件日曆 | ✅ | 家庭活動紀錄、按月查詢 |
| F11 | 紀律系統（封印/處罰） | ✅ | 封印(seal)、處罰(penalty)、活躍效果(effect) |
| F12 | 多家庭支援 | ✅ | 建立多個家庭、家庭切換器、離開家庭 |
| F13 | Co-Admin 管理 | ✅ | 邀請/移除共同家長 |
| F14 | 玩家獨立登入 | ✅ | 家庭代碼 + 密碼登入、Player JWT |
| F15 | 家庭代碼管理 | ✅ | 自動生成/自訂/重新生成 displayCode |
| F16 | 備份/匯入匯出 | ✅ | 完整家庭資料備份與匯入 |
| F17 | 紀錄批次刪除 | ✅ | 批次刪除 transactions/redemptions |
| F18 | Super Admin 管理 | ✅ | 列出所有家庭、封禁/解封/刪除 |
| F19 | 任務範本 | ✅ | 預設任務集合，快速套用 |
| F20 | 玩家自主提報 | ✅ | 玩家提報加分事由，Admin 審核 |
| F21 | Admin 直接加分 | ✅ | 附帶封印/處罰效果的交易 |

### 3.2 未來功能（尚未實作）

| # | 功能模組 | 說明 |
|---|---------|------|
| F-future-1 | 習慣追蹤 (Habit Tracker) | 每日任務打卡、連續天數 Streak |
| F-future-2 | 成就徽章系統 | 連續達標解鎖成就徽章 |

---

## 4. 預設資料

### 4.1 預設玩家

```
玩家 1: 米豆
  - 角色：child
  - 頭像：🌽（預設，可改）
  - 初始積分：0

玩家 2: 毛豆
  - 角色：child
  - 頭像：🫘（預設，可改）
  - 初始積分：0
```

### 4.2 預設積分類別

| 類別名稱 | 分值 | 說明 | 加/扣 |
|---------|------|------|-------|
| 考試優秀 | +100 | 考100分 | 加 |
| 主動幫忙家事 | +5 | 自動幫忙（不是被叫到） | 加 |
| 對人友善 | +10 | 幫助他人、善待他人 | 加 |
| 表現特別優秀 | +20 | 特殊正向行為 | 加 |
| 兄弟吵架 | -20 | 雙方同時扣（可設定） | 扣 |
| 不誠實 | -30 | 說謊、欺騙 | 扣 |
| 自訂加分 | 自訂 | 自由輸入原因與分值 | 加 |
| 自訂扣分 | 自訂 | 自由輸入原因與分值 | 扣 |

### 4.3 預設獎勵清單

| 獎勵名稱 | 所需積分 | 說明 |
|---------|---------|------|
| 看一集卡通 | 50 | 額外看電視時間 |
| 選擇今晚晚餐 | 100 | 自己決定吃什麼 |
| 買一個小玩具 | 500 | 100元以下玩具 |
| 出遊一次 | 1000 | 選擇週末去哪玩 |

---

## 5. 核心業務邏輯

### 5.1 雙軌積分設計

| 積分軌道 | 說明 | 變動規則 |
|---------|------|---------|
| **成就分 (Achievement Points)** | 累計總得分，只增不減 | 賺到就加，永不扣除 |
| **可兌換分 (Redeemable Points)** | 目前可用餘額 | 賺到加，被懲罰扣，兌換時扣 |

```
初始狀態：成就分 0，可兌換分 0

+100（考試優秀）  → 成就分 100，可兌換分 100
+5（幫忙家事）    → 成就分 105，可兌換分 105
-20（兄弟吵架）   → 成就分 105，可兌換分 85  ← 成就分不變！
兌換獎勵 -50      → 成就分 105，可兌換分 35  ← 成就分不變！
```

### 5.2 兌換審核流程

```
玩家申請兌換（狀態：pending）
  → Admin 收到通知
  → Admin 核准 → 扣除可兌換分 → 狀態：approved
  → Admin 拒絕 → 分數不扣 → 狀態：rejected
```

### 5.3 任務系統流程

```
Admin 建立任務（household/exam/activity, 週期: once/daily/weekly）
  → Player 查看可用任務
  → Player 提交完成回報（status: pending）
  → Admin 審核 → approve: 自動加分 → reject: 不加分
```

### 5.4 商城系統流程

```
Admin 建立商品（priceType: allowance/xp, 可設 dailyLimit/stock）
  → Player 下單（status: pending）
  → Admin 審核 → approve: 扣除對應積分/零用金，啟動效果 → reject: 退款
```

---

## 6. Firebase NoSQL 資料設計

### 6.1 Collection 架構

```
families/
  {familyId}/                          # 家庭根節點
    config/
      settings: {
        name: string,
        createdAt: Timestamp,
        adminUids: string[],           # 主管理員 UID（陣列）
        displayCode: string | null,    # 4-8 位家庭代碼
        displayCodeExpiry: Timestamp | null,
        isBanned: boolean              # Super Admin 封禁標記
      }

    players/
      {playerId}: {
        name: string,
        avatar: string,                # emoji 或 url
        emoji: string,                 # 顯示用 emoji
        role: "child" | "parent",
        color: string,
        birthday: string | null,       # "YYYY-MM-DD"
        password: string | null,       # 玩家登入密碼（hashed）
        isActive: boolean,
        createdAt: Timestamp
      }

    scores/
      {playerId}: {
        achievementPoints: number,
        redeemablePoints: number,
        totalEarned: number,
        totalDeducted: number,
        totalRedeemed: number,
        lastUpdated: Timestamp
      }

    transactions/
      {txId}: {
        playerId: string,
        playerIds: string[],
        type: "earn" | "deduct",
        amount: number,
        reason: string,
        categoryId: string | null,
        createdBy: string,
        createdAt: Timestamp,
        note: string | null
      }

    categories/
      {catId}: {
        name: string,
        defaultAmount: number,
        type: "earn" | "deduct",
        icon: string,
        isActive: boolean,
        order: number
      }

    rewards/
      {rewardId}: {
        name: string,
        cost: number,
        description: string,
        icon: string,
        isActive: boolean,
        stock: number | null
      }

    redemptions/
      {redemptionId}: {
        playerId: string,
        rewardId: string,
        rewardName: string,
        cost: number,
        status: "pending" | "approved" | "rejected",
        requestedAt: Timestamp,
        processedAt: Timestamp | null,
        processedBy: string | null,
        note: string | null
      }

    coAdmins/
      {uid}: {
        displayName: string | null,
        addedAt: Timestamp
      }

    tasks/
      {taskId}: {
        title: string,
        type: "household" | "exam" | "activity",
        difficulty: "easy" | "medium" | "hard" | "custom",
        xpReward: number,
        allowanceReward: number,
        description: string | null,
        isActive: boolean,
        periodType: "once" | "daily" | "weekly",
        weekDays: number[],
        assignedPlayerIds: string[],
        playerProposed: boolean
      }

    taskCompletions/
      {completionId}: {
        taskId: string,
        taskTitle: string,
        xpReward: number,
        playerId: string,
        note: string | null,
        status: "pending" | "approved" | "rejected",
        submittedAt: Timestamp,
        processedAt: Timestamp | null
      }

    playerSubmissions/
      {submissionId}: {
        playerId: string,
        type: "earn",
        amount: number,
        reason: string,
        categoryType: "household" | "exam" | "activity",
        note: string | null,
        status: "pending" | "approved" | "rejected",
        submittedAt: Timestamp,
        processedAt: Timestamp | null
      }

    allowance/
      {recordId}: {
        playerId: string,
        amount: number,
        reason: string,
        type: "earn" | "spend" | "adjust",
        createdBy: string,
        createdAt: Timestamp,
        note: string | null
      }

    shopItems/
      {itemId}: {
        name: string,
        description: string,
        price: number,
        type: "physical" | "activity" | "privilege" | "money",
        emoji: string,
        isActive: boolean,
        stock: number | null,
        priceType: "allowance" | "xp",
        dailyLimit: number | null,
        allowanceGiven: number,
        durationMinutes: number | null,
        effectType: "xp-multiplier" | "time-item" | null,
        effectValue: number | null
      }

    shopOrders/
      {orderId}: {
        playerId: string,
        itemId: string,
        itemName: string,
        price: number,
        status: "pending" | "approved" | "rejected",
        requestedAt: Timestamp,
        processedAt: Timestamp | null,
        processedBy: string | null,
        note: string | null
      }

    events/
      {eventId}: {
        title: string,
        type: "trip" | "sports" | "activity" | "other",
        startDate: string,
        endDate: string | null,
        description: string | null,
        emoji: string,
        color: string,
        createdBy: string,
        createdAt: Timestamp
      }

    taskTemplates/
      {templateId}: {
        name: string,
        description: string | null,
        taskIds: string[]
      }

    seals/
      {sealId}: {
        playerId: string,
        name: string,
        type: "no-tv" | "no-toys" | "no-games" | "no-sweets" | "custom",
        description: string | null,
        status: "active" | "lifted",
        createdBy: string,
        createdAt: Timestamp,
        liftedAt: Timestamp | null
      }

    penalties/
      {penaltyId}: {
        playerId: string,
        name: string,
        type: "罰站" | "罰寫" | "道歉" | "custom",
        description: string | null,
        status: "active" | "completed",
        createdBy: string,
        createdAt: Timestamp,
        completedAt: Timestamp | null
      }

    activeEffects/
      {effectId}: {
        playerId: string,
        name: string,
        type: "xp-multiplier" | "time-item" | "custom",
        multiplier: number | null,
        durationMinutes: number | null,
        description: string | null,
        status: "active" | "expired",
        source: "shop" | "admin",
        sourceId: string | null,
        createdAt: Timestamp,
        expiresAt: Timestamp | null,
        expiredAt: Timestamp | null
      }
```

### 6.2 資料讀取策略

| 操作 | Collection | 策略 |
|------|-----------|------|
| 顯示目前積分 | `scores/{playerId}` | REST API 查詢 |
| 加減分 | scores + transactions | Firestore Transaction (原子寫入) |
| 交易記錄 | `transactions` | 分頁 + 最新優先 |
| 兌換申請 | `redemptions` | 按 status 過濾 |
| 報表資料 | `transactions` | 時間範圍 query |
| 多家庭查詢 | `config/settings` + `coAdmins` | collectionGroup query |

---

## 7. UI/UX 設計規格

### 7.1 路由結構

```
frontend/app/
  (scoreboard)/
    layout.tsx                           # Scoreboard Layout
    family-scoreboard/
      page.tsx                           # 主頁面（含 Tabs: 首頁/記錄/任務/報表/商城）
      hooks/useFamilyScoreboard.ts       # 主 hook
      admin/page.tsx                     # Admin 管理設定
      super-admin/page.tsx               # Super Admin 家庭管理

  (player)/
    layout.tsx                           # Player Layout
    family-scoreboard/
      player/page.tsx                    # 玩家獨立登入端
```

### 7.2 主頁面 Tabs

| Tab | 功能 |
|-----|------|
| **首頁 (home)** | 玩家卡片、快速加減分、家庭切換器 |
| **記錄 (history)** | 交易紀錄列表、玩家篩選 |
| **任務 (quest)** | 任務列表、任務完成審核、玩家提報審核 |
| **報表 (report)** | 貼紙牆、個別玩家統計（今日/本週/本月 + 成就點/可兌換） |
| **商城 (shop)** | 商品列表、下單/審核、零用金管理 |

### 7.3 家庭切換器

- **Desktop**：Header 區域永遠顯示家庭選擇器 + 「+ 新增家庭」按鈕
- **Mobile**：Header 下方 sticky bar 顯示當前家庭名稱 + 切換按鈕
- localStorage 記住上次選擇的家庭
- 新用戶（無家庭）→ 顯示歡迎畫面（建立新家庭 / 等待邀請）

### 7.4 手機優先設計

- **底部導航列**（Tab Bar）：首頁 | 記錄 | 任務 | 報表 | 商城
- **加減分操作**：Bottom Sheet（從下方滑出），拇指可操作
- **觸控目標**：≥ 44px
- **數字輸入**：`inputMode="numeric"`

### 7.5 視覺風格

- **色調**：溫暖、有活力（區別於 Mido Learning 的學術風格）
- **主色**：橙色/琥珀色系
- **玩家顏色**：米豆 = 金黃色 🌽，毛豆 = 綠色 🫘
- **字體**：圓體感，友善親切

---

## 8. 後端架構

### 8.0 架構決策

```
Browser (Next.js)
    │
    │  REST API（JWT Auth）
    ▼
.NET API（ASP.NET Core Minimal API）
    │
    │  Firebase Admin SDK（Server-side）
    ▼
Firebase Firestore
```

- **前端**：Next.js，純 REST 呼叫（不使用 Firebase client SDK）
- **API 層**：ASP.NET Core Minimal API（`MapGet`/`MapPost` pattern）
- **Firebase 存取**：Firebase Admin SDK（server-side），Service Account 不暴露到 client
- **認證**：Firebase Auth JWT（Admin/Co-Admin）+ 自簽 Player JWT（玩家端）

### 8.1 API 端點定義

所有端點 prefix 為 `/api/family-scoreboard`。

#### 公開端點（無需 Auth）

| Method | Endpoint | 說明 |
|--------|----------|------|
| `GET` | `/lookup?code=xxx` | 以家庭代碼查詢家庭資訊 |
| `POST` | `/player-login` | 玩家登入（familyCode + playerId + password → Player JWT） |

#### Admin 端點（FamilyAdmin policy）

**家庭管理**

| Method | Endpoint | 說明 |
|--------|----------|------|
| `POST` | `/initialize?familyId=xxx` | 初始化家庭（建立預設玩家/獎勵） |
| `GET` | `/my-family` | 取得目前使用者所屬家庭 |
| `GET` | `/my-families` | 取得使用者所有家庭清單 |
| `POST` | `/{familyId}/leave` | 離開家庭 |
| `GET` | `/lookup-user?email=xxx` | 以 email 查詢帳號 UID |

**家庭代碼**

| Method | Endpoint | 說明 |
|--------|----------|------|
| `POST` | `/generate-code?familyId=xxx` | 取得/首次生成家庭代碼 |
| `POST` | `/set-code?familyId=xxx` | 自訂家庭代碼 |
| `POST` | `/regenerate-code?familyId=xxx` | 強制重新生成代碼 |

**積分交易**

| Method | Endpoint | 說明 |
|--------|----------|------|
| `POST` | `/transactions?familyId=xxx` | 新增加分/扣分 |
| `POST` | `/{familyId}/transactions-with-effects` | 附帶封印/處罰的交易 |
| `DELETE` | `/{familyId}/transactions` | 批次刪除交易紀錄 |

**兌換管理**

| Method | Endpoint | 說明 |
|--------|----------|------|
| `POST` | `/redemptions/{id}/process?familyId=xxx` | 審核兌換申請 |
| `DELETE` | `/{familyId}/redemptions` | 批次刪除兌換紀錄 |

**玩家管理**

| Method | Endpoint | 說明 |
|--------|----------|------|
| `POST` | `/{familyId}/players` | 新增玩家 |
| `PUT` | `/{familyId}/players/{playerId}` | 編輯玩家 |
| `DELETE` | `/{familyId}/players/{playerId}` | 刪除玩家 |
| `PUT` | `/{familyId}/players/{playerId}/password` | 設定玩家登入密碼 |
| `GET` | `/{familyId}/players/{playerId}/status` | 取得玩家狀態（封印/處罰/效果） |

**Co-Admin 管理**

| Method | Endpoint | 說明 |
|--------|----------|------|
| `GET` | `/{familyId}/co-admins` | 取得共同家長清單 |
| `POST` | `/{familyId}/co-admins` | 新增共同家長 |
| `DELETE` | `/{familyId}/co-admins/{coAdminUid}` | 移除共同家長 |

**任務系統**

| Method | Endpoint | 說明 |
|--------|----------|------|
| `GET` | `/{familyId}/tasks` | 取得任務列表 |
| `POST` | `/{familyId}/tasks` | 建立任務 |
| `PUT` | `/{familyId}/tasks/{taskId}` | 編輯任務 |
| `DELETE` | `/{familyId}/tasks/{taskId}` | 停用任務 |
| `GET` | `/{familyId}/task-completions?status=xxx` | 取得任務完成申請 |
| `POST` | `/{familyId}/task-completions/{id}/process` | 審核任務完成 |
| `GET` | `/{familyId}/player-submissions?status=xxx` | 取得玩家自主提報 |
| `POST` | `/{familyId}/player-submissions/{id}/process` | 審核玩家提報 |

**任務範本**

| Method | Endpoint | 說明 |
|--------|----------|------|
| `GET` | `/{familyId}/task-templates` | 取得任務範本 |
| `POST` | `/{familyId}/task-templates` | 建立任務範本 |
| `DELETE` | `/{familyId}/task-templates/{templateId}` | 刪除任務範本 |

**零用金**

| Method | Endpoint | 說明 |
|--------|----------|------|
| `GET` | `/{familyId}/allowance?playerId=xxx` | 取得零用金帳本 |
| `GET` | `/{familyId}/allowance/{playerId}/balance` | 取得玩家零用金餘額 |
| `POST` | `/{familyId}/allowance` | 調整零用金 |

**商城管理**

| Method | Endpoint | 說明 |
|--------|----------|------|
| `POST` | `/{familyId}/shop-items` | 建立商品 |
| `PUT` | `/{familyId}/shop-items/{itemId}` | 編輯商品 |
| `DELETE` | `/{familyId}/shop-items/{itemId}` | 停用商品 |
| `GET` | `/{familyId}/shop-orders?status=xxx` | 取得商城訂單 |
| `POST` | `/{familyId}/shop-orders/{orderId}/process` | 審核訂單 |

**事件日曆**

| Method | Endpoint | 說明 |
|--------|----------|------|
| `POST` | `/{familyId}/events` | 建立事件 |
| `PUT` | `/{familyId}/events/{eventId}` | 編輯事件 |
| `DELETE` | `/{familyId}/events/{eventId}` | 刪除事件 |

**紀律系統（封印/處罰/效果）**

| Method | Endpoint | 說明 |
|--------|----------|------|
| `GET` | `/{familyId}/seals?playerId=&status=` | 取得封印列表 |
| `POST` | `/{familyId}/seals` | 建立封印 |
| `POST` | `/{familyId}/seals/{sealId}/lift` | 解除封印 |
| `GET` | `/{familyId}/penalties?playerId=&status=` | 取得處罰列表 |
| `POST` | `/{familyId}/penalties` | 建立處罰 |
| `POST` | `/{familyId}/penalties/{penaltyId}/complete` | 完成處罰 |
| `GET` | `/{familyId}/active-effects?playerId=` | 取得活躍效果列表 |
| `POST` | `/{familyId}/active-effects` | 建立效果 |
| `POST` | `/{familyId}/active-effects/{effectId}/expire` | 使效果過期 |

**備份**

| Method | Endpoint | 說明 |
|--------|----------|------|
| `GET` | `/{familyId}/backup` | 匯出家庭備份 |
| `POST` | `/{familyId}/backup/import` | 匯入家庭備份 |

#### 已登入端點（AuthenticatedOnly policy）

| Method | Endpoint | 說明 |
|--------|----------|------|
| `GET` | `/{familyId}/scores` | 查看積分排行 |
| `GET` | `/{familyId}/transactions?playerId=xxx` | 查看交易記錄 |
| `GET` | `/{familyId}/rewards` | 查看獎勵清單 |
| `GET` | `/{familyId}/redemptions?status=xxx` | 查看兌換申請 |
| `POST` | `/{familyId}/redemptions` | 提交兌換申請 |
| `GET` | `/{familyId}/shop-items` | 查看商品列表 |
| `GET` | `/{familyId}/events?month=xxx` | 查看事件日曆 |

#### Player 端點（PlayerOnly policy）

| Method | Endpoint | 說明 |
|--------|----------|------|
| `GET` | `/{familyId}/tasks/available` | 查看可用任務 |
| `POST` | `/{familyId}/task-completions` | 提交任務完成 |
| `POST` | `/{familyId}/player-submissions` | 提交自主加分申請 |
| `GET` | `/{familyId}/my-history` | 查看自己的交易記錄 |
| `POST` | `/{familyId}/shop-orders` | 下單商城商品 |
| `GET` | `/{familyId}/allowance/balance` | 查看零用金餘額 |
| `GET` | `/{familyId}/allowance/ledger` | 查看零用金帳本 |
| `GET` | `/{familyId}/my-status` | 查看自己的封印/處罰/效果 |
| `GET` | `/{familyId}/my-effects` | 查看自己的活躍效果（道具箱） |

#### Super Admin 端點（SuperAdminOnly policy）

| Method | Endpoint | 說明 |
|--------|----------|------|
| `GET` | `/super-admin/families` | 列出所有家庭 |
| `POST` | `/super-admin/families/{familyId}/ban` | 封禁家庭 |
| `POST` | `/super-admin/families/{familyId}/unban` | 解封家庭 |
| `DELETE` | `/super-admin/families/{familyId}` | 永久刪除家庭 |

#### Dev 端點（僅 Development 環境）

定義於 `DevEndpoints.cs`，用於 E2E 測試。

| Method | Endpoint | 說明 |
|--------|----------|------|
| `POST` | `/api/dev/player-token` | 產生 Player JWT（免密碼） |

### 8.2 關鍵程式碼路徑

| 層次 | 路徑 |
|------|------|
| Endpoints | `backend/MidoLearning.Api/Endpoints/FamilyScoreboardEndpoints.cs` |
| Dev Endpoints | `backend/MidoLearning.Api/Endpoints/DevEndpoints.cs` |
| Service Interface | `backend/MidoLearning.Api/Services/FamilyScoreboard/IFamilyScoreboardService.cs` |
| Service Impl | `backend/MidoLearning.Api/Services/FamilyScoreboard/FirebaseScoreboardService.cs` |
| DTOs | `backend/MidoLearning.Api/Models/FamilyScoreboard/Dtos.cs` |
| Frontend Types | `frontend/types/family-scoreboard.ts` |
| Frontend API | `frontend/lib/api/family-scoreboard.ts` |
| Frontend Page | `frontend/app/(scoreboard)/family-scoreboard/page.tsx` |
| Frontend Hook | `frontend/app/(scoreboard)/family-scoreboard/hooks/useFamilyScoreboard.ts` |
| Admin Page | `frontend/app/(scoreboard)/family-scoreboard/admin/page.tsx` |
| Super Admin | `frontend/app/(scoreboard)/family-scoreboard/super-admin/page.tsx` |
| Player Page | `frontend/app/(player)/family-scoreboard/player/page.tsx` |

---

## 9. 驗收條件（Acceptance Criteria）

### AC1：多家庭管理
- Given Admin 已登入
- When 呼叫 `GET /my-families`
- Then 回傳使用者所有家庭（primary admin + co-admin）

### AC2：家庭初始化
- Given Admin 首次建立家庭
- When 呼叫 `POST /initialize?familyId=xxx`
- Then 建立預設玩家（米豆、毛豆）、預設類別、預設獎勵

### AC3：雙軌積分
- Given 玩家有成就分 100，可兌換分 100
- When Admin 扣分 -20
- Then 成就分維持 100，可兌換分變為 80

### AC4：玩家獨立登入
- Given Admin 已設定 displayCode 與玩家密碼
- When 玩家在 Player 端輸入 familyCode + playerId + password
- Then 取得 Player JWT，進入玩家介面

### AC5：任務系統
- Given Admin 建立任務「整理房間」，xpReward: 10
- When Player 提交完成，Admin 核准
- Then Player 成就分 +10，可兌換分 +10

### AC6：商城購買
- Given 商品「看卡通30分鐘」price: 50，priceType: xp
- When Player 下單，Admin 核准
- Then Player 可兌換分 -50

### AC7：紀律系統
- Given Admin 對 Player 建立封印「no-tv」
- When 查看 Player 狀態
- Then 顯示 active 封印
- When Admin 解除封印
- Then 狀態變為 lifted

### AC8：Co-Admin 管理
- Given Admin 邀請 Co-Admin（以 email 查 UID）
- When Co-Admin 以 `?familyId=xxx` 操作
- Then 與主 Admin 擁有相同管理權限

### AC9：E2E 測試
- 56 個 Playwright API 測試全部通過
- 覆蓋 STEP 1-14（初始化→積分→任務→零用金→商城→封印處罰→事件→道具→摘要→清理）

---

## 10. 非功能需求

| 項目 | 規格 |
|------|------|
| **效能** | 積分更新在 500ms 內反映到畫面 |
| **安全性** | Admin JWT + Player JWT 雙認證體系 |
| **多家庭** | 一位 Admin 可管理多個家庭 |
| **資料保護** | 兒童資料不對外公開，僅家庭成員可讀 |
| **備份** | 支援完整家庭資料匯出/匯入 |

---

## 11. 開發里程碑

| 里程碑 | 內容 | 狀態 |
|--------|------|------|
| M1 | Firebase 資料設計 + 初始化邏輯 + 基礎型別 | ✅ 完成 |
| M2 | 主儀表板 + 玩家卡片 + 加減分 Bottom Sheet | ✅ 完成 |
| M3 | 雙軌積分邏輯 + 交易記錄頁 | ✅ 完成 |
| M4 | 獎勵清單 + 兌換申請 + Admin 核准 | ✅ 完成 |
| M5 | 報表儀表板（貼紙牆 + 個別統計） | ✅ 完成 |
| M6 | Admin 管理頁 + 玩家管理 + 獎勵管理 | ✅ 完成 |
| M7 | 整合測試 + 手機 UX 調整 | ✅ 完成 |
| M8 | 玩家獨立登入（displayCode + password + Player JWT） | ✅ 完成 |
| M9 | 任務系統（CRUD + 完成回報 + 審核 + 玩家自主提報） | ✅ 完成 |
| M10 | 零用金系統（帳本 + 餘額 + 調整） | ✅ 完成 |
| M11 | 商城系統（商品 CRUD + 下單 + 審核 + 時效道具） | ✅ 完成 |
| M12 | 紀律系統（封印/處罰/活躍效果 + 附帶效果交易） | ✅ 完成 |
| M13 | 事件日曆 + 任務範本 + 備份匯出匯入 + 紀錄批次刪除 | ✅ 完成 |
| M14 | 多家庭支援 + Co-Admin + Super Admin + 家庭切換器 | ✅ 完成 |

---

## 12. E2E 測試

- **測試檔案**：`frontend/e2e/family-scoreboard.spec.ts`
- **測試數量**：56 個測試
- **認證方式**：`X-API-Key` auth + dev endpoints 繞過 Firebase Auth
- **隔離策略**：每次建立獨立 `family_test{datetime}` 家庭
- **覆蓋範圍**：STEP 1-14（API 層與核心業務流程）
- **不覆蓋**：報表 Tab 視覺呈現（需人工驗證貼紙牆顯示）

### 執行方式

```bash
cd frontend && npx playwright test e2e/family-scoreboard.spec.ts --reporter=list
```

---

## 13. UI 設計決策紀錄

| 日期 | 區塊 | 決策 |
|------|------|------|
| 2026-02-21 | 報表 Tab - 比較卡片 | 移除本週/本月 XP 長條圖，改為「本週貼紙牆」：每筆加分用 categoryId 對應 emoji 呈現，空格顯示 ○，目標 10 張，童趣風格優先於數字密度 |
| 2026-02-21 | 報表 Tab - 個別玩家 | 從 8 格大數字縮減為「貼紙牆 + 5 格小數字」（今日/本週/本月 + 成就點/可兌換），移除「已兌換/累計獲得/累計扣除」以降低資訊過載 |
| 2026-02-22 | 家庭選擇器 | 永遠顯示（不再需要 >1 家庭），Desktop + Mobile 都有「+ 新增家庭」按鈕 |
| 2026-02-22 | Mobile 家庭切換 | 新增 sticky 家庭切換 bar（header 下方） |
| 2026-02-22 | 家庭管理 | 主管理員可「刪除此家庭」（需先清玩家），共同家長「離開此家庭」 |

---

**規格書版本歷史**

| 版本 | 日期 | 說明 |
|------|------|------|
| v1.0 | 2026-02-18 | 初版，整合用戶所有需求說明 |
| v1.2 | 2026-02-18 | M1-M7 全部完成，更新里程碑狀態 |
| v2.0 | 2026-02-22 | 大幅更新：新增 M8-M14 功能（玩家登入、任務、零用金、商城、紀律、多家庭、Co-Admin、Super Admin）；更新路由（`/(scoreboard)` + `/(player)`）；新增角色（Co-Admin、Super Admin、Player 獨立登入）；重寫 API 端點表（60+ 端點）；補齊資料模型（15+ sub-collections）；移除過時 Controller pattern code samples |
