# 家庭計分板 (Family Scoreboard) — 功能需求規格書

**文件版本**：v1.0
**建立日期**：2026-02-18
**狀態**：待開發人員確認
**負責模組**：`/experiments/family-scoreboard`（前端獨立模組）

---

## 1. 背景與目標

### 1.1 背景

家長希望建立一套能讓孩子與父母**共同協作**的積分系統，透過正向鼓勵（而非懲罰導向）培養良好習慣與品格。此功能作為 Mido Learning **實驗功能**加入，獨立模組設計，不與學習功能混合。

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
| **Admin（父母）** | 全部權限 | 加分、扣分、設定玩家、管理獎勵、查看報表 |
| **Player（孩子）** | 唯讀 + 兌換 | 查看自己積分、查看報表、申請兌換獎勵 |
| **Guest** | 無 | 看不到此功能入口 |

### 2.1 存取控制

- **實驗功能首頁**：所有人可見入口
- **家庭計分板入口卡片**：**僅 Admin 登入後顯示**（其他人看不到此卡片）
- **計分板內部**：Admin 全功能；Player 唯讀+兌換申請
- **直接網址存取**：未登入 → 導向登入頁

---

## 3. 功能範疇（Feature Scope）

### 3.1 核心功能列表

| # | 功能模組 | 優先級 | 說明 |
|---|---------|--------|------|
| F1 | 玩家計分儀表板 | P0 | 快速加減分、查看目前積分 |
| F2 | 積分交易記錄 | P0 | 每筆加減分的歷史紀錄 |
| F3 | 雙軌積分系統 | P0 | 成就分(累計) vs 可兌換分(扣除後) |
| F4 | 獎勵兌換系統 | P1 | 獎勵清單、申請兌換、核准流程 |
| F5 | 習慣追蹤 | P1 | 每日任務、連續天數 Streak |
| F6 | 成就系統 | P1 | 連續達標解鎖成就徽章 |
| F7 | 報表儀表板 | P1 | 趨勢圖、排行榜、成長報告 |
| F8 | 玩家管理 | P2 | 新增/編輯/停用玩家資料 |
| F9 | 積分類別管理 | P2 | 自訂加分項目與分值 |

### 3.2 本期範疇（MVP）

**包含**：F1, F2, F3, F4（基本版）, F7（簡版）, F8
**不包含（未來）**：F5 習慣追蹤、F6 成就系統、F9 類別管理

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

## 5. 詳細功能規格

### 5.1 F1 — 玩家計分儀表板（主頁面）

**手機操作優先（Mobile-First）**

**顯示內容**：
- 所有玩家的卡片（並排，可水平滑動）
- 每張卡片顯示：
  - 玩家名字 + 頭像
  - 📊 成就分（累計總得分，只增不減）
  - 🎁 可兌換分（可用於兌換獎勵的餘額）
  - 最近一筆交易摘要

**Admin 操作**：
- 點擊任一玩家卡片 → 展開加減分快速操作面板
- 快速加分按鈕：預設類別（一鍵套用）
- 自訂輸入：輸入分值 + 原因文字
- 確認前顯示：「給 [玩家名字] [+/-分] 因為 [原因]」
- 支援**同時對多位玩家操作**（如兄弟吵架同時扣分）

**互動流程**：
```
Admin 點擊玩家卡片
  → 展開底部抽屜 (Bottom Sheet)
  → 選擇類別 或 自訂
  → 輸入備註（可選）
  → 點擊確認
  → 積分立即更新 + 動畫效果
  → 自動關閉抽屜
```

### 5.2 F3 — 雙軌積分設計（核心設計）

> 兌獎後，績分跟能變獎勵的分數應該分軌計算

| 積分軌道 | 說明 | 變動規則 |
|---------|------|---------|
| **成就分 (Achievement Points)** | 累計總得分，只增不減，顯示人生成就 | 賺到就加，永不扣除（扣分事件不影響此數字的「總賺取量」）|
| **可兌換分 (Redeemable Points)** | 目前可用餘額，兌換後扣除 | 賺到加，被懲罰扣，兌換時扣 |

**舉例說明**：
```
初始狀態：成就分 0，可兌換分 0

+100（考試優秀）  → 成就分 100，可兌換分 100
+5（幫忙家事）    → 成就分 105，可兌換分 105
-20（兄弟吵架）   → 成就分 105，可兌換分 85  ← 成就分不變！
兌換獎勵 -50      → 成就分 105，可兌換分 35  ← 成就分不變！
```

**設計意圖**：成就分代表孩子的「人生成就累積」，絕不因懲罰或兌換而減少，保護孩子的成就感與自信心。

### 5.3 F4 — 獎勵兌換系統

**流程**：
```
玩家查看獎勵清單
  → 點擊想兌換的獎勵
  → 系統確認「可兌換分」是否足夠
  → 足夠：提交兌換申請（狀態：pending）
  → Admin 收到通知
  → Admin 核准 → 扣除可兌換分 → 兌換記錄完成
  → Admin 拒絕 → 分數不扣 → 通知玩家
```

**兌換申請狀態**：`pending` → `approved` / `rejected`

### 5.4 F5 — 習慣追蹤（第二期）

> 日常習慣追蹤，要有連續天數 Streak，養成習慣才算值得計分

**規則設計**：
- 習慣任務設定（如：每天練琴30分鐘）
- 每日打卡確認完成
- Streak 計算：連續天數不中斷
- 積分規則：
  - 完成當日任務：+基礎分（如+2）
  - 連續3天：+額外獎勵分（如+10）
  - 連續7天：成就徽章 + 大量獎勵分
  - 連續30天：超級成就 + 特殊獎勵
- 中斷 Streak：不扣分，但 Streak 歸零重來

**注意**：此功能**與遊戲成就系統脫勾**，獨立運作。

### 5.5 F7 — 報表儀表板

**報表類型**：

1. **積分趨勢圖**（折線圖）
   - 時間軸：過去7天 / 30天 / 90天
   - 顯示可兌換分的變化曲線
   - 各玩家不同顏色

2. **行為分類圓餅圖**
   - 本月加分來源比例（哪類行為賺最多分）
   - 有助家長了解孩子行為模式

3. **成就總覽**
   - 成就分排行（家庭排行榜，正向比較，不是競爭）
   - 最近獲得的成就徽章

4. **月度成長報告**
   - 本月總得分 / 總扣分
   - 最常見的加分行為
   - Streak 最高記錄

---

## 6. Firebase NoSQL 資料設計

### 6.1 Collection 架構

```
families/
  {familyId}/                          # 家庭根節點
    config/
      settings: {                      # 家庭設定
        name: string,
        createdAt: Timestamp,
        adminUids: string[]            # 可以操作的 Firebase UID
      }

    players/
      {playerId}: {                    # 玩家資料
        name: string,                  # "米豆"
        avatar: string,                # emoji 或 url
        role: "child" | "parent",
        color: string,                 # 個人主題色
        isActive: boolean,
        createdAt: Timestamp
      }

    scores/
      {playerId}: {                    # 即時積分（快速讀取）
        achievementPoints: number,    # 成就分（只增不減）
        redeemablePoints: number,     # 可兌換分（可扣）
        totalEarned: number,          # 總賺取（統計用）
        totalDeducted: number,        # 總扣分（統計用）
        totalRedeemed: number,        # 總兌換（統計用）
        lastUpdated: Timestamp
      }

    transactions/
      {txId}: {                       # 每筆積分交易
        playerId: string,             # 受影響玩家
        playerIds: string[],          # 支援多玩家（如兄弟同時扣分）
        type: "earn" | "deduct",
        amount: number,               # 絕對值（正數）
        reason: string,               # 原因文字
        categoryId: string | null,    # 類別 ID（可空）
        createdBy: string,            # admin UID
        createdAt: Timestamp,
        note: string | null           # 額外備註
      }

    categories/
      {catId}: {                      # 積分類別
        name: string,
        defaultAmount: number,        # 預設分值（正數）
        type: "earn" | "deduct",
        icon: string,                 # emoji
        isActive: boolean,
        order: number                 # 顯示順序
      }

    rewards/
      {rewardId}: {                   # 獎勵清單
        name: string,
        cost: number,                 # 所需可兌換分
        description: string,
        icon: string,
        isActive: boolean,
        stock: number | null          # null = 無限
      }

    redemptions/
      {redemptionId}: {               # 兌換申請
        playerId: string,
        rewardId: string,
        rewardName: string,           # 快照（防止獎勵被修改後失真）
        cost: number,                 # 快照
        status: "pending" | "approved" | "rejected",
        requestedAt: Timestamp,
        processedAt: Timestamp | null,
        processedBy: string | null,   # admin UID
        note: string | null
      }

    habits/                          # 第二期
      {habitId}: {
        name: string,
        description: string,
        basePoints: number,           # 每日完成基礎分
        streakBonus: {               # Streak 獎勵設定
          days: number,
          bonusPoints: number
        }[],
        targetPlayerIds: string[],    # 適用哪些玩家
        isActive: boolean
      }

    habitLogs/                       # 第二期
      {logId}: {
        habitId: string,
        playerId: string,
        date: string,                 # "YYYY-MM-DD"
        completed: boolean,
        currentStreak: number,        # 打卡時的連續天數
        pointsEarned: number
      }
```

### 6.2 Firestore Security Rules（草稿）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /families/{familyId}/{document=**} {
      // Admin 可讀寫全部
      allow read, write: if isAdmin(familyId);
      // Player 唯讀（兌換申請例外）
      allow read: if isFamilyMember(familyId);
      // 兌換申請：Player 可自行建立
      match /redemptions/{redemptionId} {
        allow create: if isFamilyMember(familyId)
                      && request.resource.data.status == "pending";
      }
    }

    function isAdmin(familyId) {
      return request.auth != null &&
             request.auth.uid in get(/databases/$(database)/documents/
               families/$(familyId)/config/settings).data.adminUids;
    }

    function isFamilyMember(familyId) {
      return request.auth != null;  // 暫定：已登入即可
    }
  }
}
```

### 6.3 資料讀取策略

| 操作 | Collection | 策略 |
|------|-----------|------|
| 顯示目前積分 | `scores/{playerId}` | 即時監聽 (onSnapshot) |
| 加減分 | Transaction: scores + transactions | Atomic write |
| 交易記錄 | `transactions` | 分頁 + 最新20筆 |
| 兌換申請 | `redemptions` | 監聽 pending 數量 |
| 報表資料 | `transactions` | 時間範圍 query |

---

## 7. UI/UX 設計規格

### 7.1 頁面結構

```
/experiments/family-scoreboard            # 主頁（儀表板）
  /experiments/family-scoreboard/player/[id]  # 玩家詳細記錄
  /experiments/family-scoreboard/rewards       # 獎勵兌換中心
  /experiments/family-scoreboard/reports      # 報表儀表板
  /experiments/family-scoreboard/admin        # Admin 管理設定
    /admin/players                           # 玩家管理
    /admin/categories                        # 積分類別管理
    /admin/rewards-manage                    # 獎勵管理
```

### 7.2 手機優先設計規格

- **底部導航列**（Tab Bar）：🏠首頁 | 📋記錄 | 🎁兌換 | 📊報表
- **加減分操作**：Bottom Sheet（從下方滑出），拇指可輕鬆操作
- **玩家卡片**：大圓角、大字體，手指觸碰面積 ≥ 44px
- **確認按鈕**：底部固定，方便拇指點擊
- **數字輸入**：優先觸發數字鍵盤 (`inputMode="numeric"`)
- **動畫**：積分更新時有彈跳動畫（正面反饋）

### 7.3 視覺風格

- **色調**：溫暖、有活力（區別於 Mido Learning 的學術風格）
- **主色**：橙色/琥珀色系（代表活力與成就）
- **玩家顏色**：米豆 = 金黃色 🌽，毛豆 = 綠色 🫘
- **成就徽章**：圓形，有光暈效果
- **字體**：圓體感，友善親切

---

## 8. 後端架構規格（.NET 隔離層）

### 8.0 後端架構決策

**本功能採用 .NET API 作為 Firebase 隔離層，與現有 mido-learning 後端架構一致。**

```
Browser (Next.js)
    │
    │  REST API（JWT Auth）
    ▼
.NET API（ASP.NET Core）
    │
    │  Firebase Admin SDK（Server-side）
    ▼
Firebase Firestore
```

| 層次 | 技術選擇 | 理由 |
|------|---------|------|
| **前端** | Next.js（純 REST 呼叫） | 不使用 Firebase client SDK，降低前端複雜度 |
| **API 層** | ASP.NET Core Controller | 與現有 mido-learning 後端一致，統一 JWT 驗證 |
| **Firebase 存取** | Firebase Admin SDK（server-side） | Service Account 不暴露到 client，安全性更高 |
| **原子性操作** | Firebase Admin SDK Transactions | server-side 執行，強制 admin 權限保護 |
| **資料庫** | Firebase Firestore | 保留現有 Schema 設計 |
| **Security Rules** | 簡化（後端負責授權） | .NET 層已驗證權限，Rules 只防直接存取 |

**與原 Firebase-Only 方案的差異**：

| 面向 | Firebase-Only（舊） | .NET 隔離層（新） |
|------|------------------|-----------------|
| 架構一致性 | ❌ 前端直連 Firebase | ✅ 與既有 mido-learning 一致 |
| Secret 安全 | ⚠️ client config 外露 | ✅ Service Account 在 server |
| 前端複雜度 | 高（需 Firebase SDK） | 低（只需呼叫 REST） |
| 未來可遷移性 | 差（前端耦合 Firebase） | 好（只改 .NET service 層） |

---

### 8.1 API 端點定義

所有端點需 JWT 驗證（`[Authorize]`），由現有 mido-learning 認證中介層處理。

| Method | Endpoint | 說明 | 權限 |
|--------|----------|------|------|
| `GET` | `/api/family-scoreboard/scores` | 取得所有玩家積分 | 已登入 |
| `GET` | `/api/family-scoreboard/transactions` | 取得交易記錄（分頁） | 已登入 |
| `POST` | `/api/family-scoreboard/transactions` | 新增積分／扣分 | Admin |
| `GET` | `/api/family-scoreboard/rewards` | 取得獎勵列表 | 已登入 |
| `POST` | `/api/family-scoreboard/redemptions` | 申請兌換獎勵 | Player |
| `PATCH` | `/api/family-scoreboard/redemptions/{id}` | 核准／拒絕兌換 | Admin |
| `GET` | `/api/family-scoreboard/redemptions` | 取得兌換申請列表 | 已登入 |
| `POST` | `/api/family-scoreboard/initialize` | 初始化家庭資料 | Admin |

**Request / Response 範例**：

```
POST /api/family-scoreboard/transactions
{
  "playerIds": ["player_mido"],
  "type": "earn",
  "amount": 10,
  "reason": "主動幫忙洗碗",
  "categoryId": "cat_2"
}

→ 204 No Content

---

PATCH /api/family-scoreboard/redemptions/{id}
{
  "action": "approve"   // 或 "reject"
}

→ 204 No Content
```

---

### 8.2 .NET Controller（C#）

```csharp
// Controllers/FamilyScoreboardController.cs
[ApiController]
[Route("api/family-scoreboard")]
[Authorize]
public class FamilyScoreboardController : ControllerBase
{
    private readonly IFamilyScoreboardService _service;

    public FamilyScoreboardController(IFamilyScoreboardService service)
        => _service = service;

    // GET /api/family-scoreboard/scores
    [HttpGet("scores")]
    public async Task<IActionResult> GetScores(CancellationToken ct)
    {
        var familyId = GetFamilyId();
        var scores = await _service.GetScoresAsync(familyId, ct);
        return Ok(scores);
    }

    // GET /api/family-scoreboard/transactions?playerId=&limit=20
    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] string? playerId,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        var familyId = GetFamilyId();
        var transactions = await _service.GetTransactionsAsync(familyId, playerId, limit, ct);
        return Ok(transactions);
    }

    // POST /api/family-scoreboard/transactions  [Admin Only]
    [HttpPost("transactions")]
    [Authorize(Policy = "FamilyAdmin")]
    public async Task<IActionResult> AddTransaction(
        [FromBody] AddTransactionRequest request,
        CancellationToken ct)
    {
        var familyId = GetFamilyId();
        var adminUid = GetCurrentUid();
        await _service.AddTransactionAsync(familyId, request with { CreatedBy = adminUid }, ct);
        return NoContent();
    }

    // GET /api/family-scoreboard/rewards
    [HttpGet("rewards")]
    public async Task<IActionResult> GetRewards(CancellationToken ct)
    {
        var familyId = GetFamilyId();
        var rewards = await _service.GetRewardsAsync(familyId, ct);
        return Ok(rewards);
    }

    // POST /api/family-scoreboard/redemptions  [Player]
    [HttpPost("redemptions")]
    public async Task<IActionResult> CreateRedemption(
        [FromBody] CreateRedemptionRequest request,
        CancellationToken ct)
    {
        var familyId = GetFamilyId();
        var playerId = GetCurrentUid();
        await _service.CreateRedemptionAsync(familyId, playerId, request, ct);
        return NoContent();
    }

    // PATCH /api/family-scoreboard/redemptions/{id}  [Admin Only]
    [HttpPatch("redemptions/{redemptionId}")]
    [Authorize(Policy = "FamilyAdmin")]
    public async Task<IActionResult> ProcessRedemption(
        string redemptionId,
        [FromBody] ProcessRedemptionRequest request,
        CancellationToken ct)
    {
        var familyId = GetFamilyId();
        var adminUid = GetCurrentUid();
        await _service.ProcessRedemptionAsync(familyId, redemptionId, adminUid, request.Action, ct);
        return NoContent();
    }

    // GET /api/family-scoreboard/redemptions
    [HttpGet("redemptions")]
    public async Task<IActionResult> GetRedemptions(
        [FromQuery] string? status,
        CancellationToken ct = default)
    {
        var familyId = GetFamilyId();
        var redemptions = await _service.GetRedemptionsAsync(familyId, status, ct);
        return Ok(redemptions);
    }

    // POST /api/family-scoreboard/initialize  [Admin Only]
    [HttpPost("initialize")]
    [Authorize(Policy = "FamilyAdmin")]
    public async Task<IActionResult> Initialize(CancellationToken ct)
    {
        var adminUid = GetCurrentUid();
        var familyId = await _service.InitializeFamilyAsync(adminUid, ct);
        return Ok(new { familyId });
    }

    private string GetFamilyId() => $"family_{GetCurrentUid()}";
    private string GetCurrentUid() => User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedAccessException();
}
```

---

### 8.3 Service 介面（`IFamilyScoreboardService`）

```csharp
// Services/Music/IFamilyScoreboardService.cs
using MidoLearning.Api.Models.FamilyScoreboard;

namespace MidoLearning.Api.Services.FamilyScoreboard;

public interface IFamilyScoreboardService
{
    // ── 積分查詢 ───────────────────────────────────────────────────────────────
    Task<IReadOnlyList<PlayerScoreDto>> GetScoresAsync(
        string familyId, CancellationToken ct = default);

    Task<IReadOnlyList<TransactionDto>> GetTransactionsAsync(
        string familyId, string? playerId = null, CancellationToken ct = default);

    // ── 積分異動 ───────────────────────────────────────────────────────────────
    /// <summary>新增加分或扣分紀錄，並原子更新 scores 文件</summary>
    Task<TransactionDto> AddTransactionAsync(
        string familyId, AddTransactionRequest request, string adminUid,
        CancellationToken ct = default);

    // ── 獎勵 ──────────────────────────────────────────────────────────────────
    Task<IReadOnlyList<RewardDto>> GetRewardsAsync(
        string familyId, CancellationToken ct = default);

    // ── 兌換 ──────────────────────────────────────────────────────────────────
    Task<RedemptionDto> CreateRedemptionAsync(
        string familyId, CreateRedemptionRequest request, string playerUid,
        CancellationToken ct = default);

    Task<RedemptionDto> ProcessRedemptionAsync(
        string familyId, string redemptionId, ProcessRedemptionRequest request,
        string adminUid, CancellationToken ct = default);

    Task<IReadOnlyList<RedemptionDto>> GetRedemptionsAsync(
        string familyId, string? status = null, CancellationToken ct = default);

    // ── 家庭初始化 ────────────────────────────────────────────────────────────
    /// <summary>首次使用時建立預設玩家、類別、獎勵；已存在則直接返回</summary>
    Task InitializeAsync(string familyId, string adminUid, CancellationToken ct = default);
}
```

---

### 8.4 Firebase Admin Service 實作（`FirebaseScoreboardService`）

關鍵方法範例（完整類別由 dotnet-expert 實作）：

```csharp
// Services/FamilyScoreboard/FirebaseScoreboardService.cs
using Google.Cloud.Firestore;
using MidoLearning.Api.Models.FamilyScoreboard;

namespace MidoLearning.Api.Services.FamilyScoreboard;

public class FirebaseScoreboardService : IFamilyScoreboardService
{
    private readonly FirestoreDb _db;
    private readonly ILogger<FirebaseScoreboardService> _logger;

    public FirebaseScoreboardService(FirestoreDb db,
        ILogger<FirebaseScoreboardService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ── 初始化（Batch Write，冪等） ────────────────────────────────────────────
    public async Task InitializeAsync(string familyId, string adminUid,
        CancellationToken ct = default)
    {
        var settingsRef = _db
            .Collection("families").Document(familyId)
            .Collection("config").Document("settings");

        var snap = await settingsRef.GetSnapshotAsync(ct);
        if (snap.Exists) return; // 已初始化，直接返回

        var batch = _db.StartBatch();

        // 家庭設定
        batch.Set(settingsRef, new
        {
            name = "我的家庭計分板",
            createdAt = Timestamp.GetCurrentTimestamp(),
            adminUids = new[] { adminUid }
        });

        // 預設玩家（米豆 + 毛豆）
        AddDefaultPlayer(batch, familyId, "player_mido",  "米豆", "#F59E0B");
        AddDefaultPlayer(batch, familyId, "player_maodo", "毛豆", "#10B981");

        // 預設類別（5 筆）
        var categories = new[]
        {
            ("考試優秀",     100, "earn",   1),
            ("主動幫忙家事",   5, "earn",   2),
            ("對人友善",      10, "earn",   3),
            ("兄弟吵架",      20, "deduct", 4),
            ("不誠實",        30, "deduct", 5),
        };
        foreach (var (name, amount, type, order) in categories)
        {
            var catRef = _db.Collection("families").Document(familyId)
                .Collection("categories").Document($"cat_{order}");
            batch.Set(catRef, new
            {
                name, defaultAmount = amount, type,
                isActive = true, order
            });
        }

        // 預設獎勵（4 筆）
        var rewards = new[]
        {
            ("看一集卡通",   50,   "額外看電視時間",   "reward_1"),
            ("選擇今晚晚餐", 100,  "自己決定吃什麼",   "reward_2"),
            ("買一個小玩具", 500,  "100元以下玩具",    "reward_3"),
            ("出遊一次",     1000, "選擇週末去哪玩",   "reward_4"),
        };
        foreach (var (rName, cost, desc, rId) in rewards)
        {
            var rRef = _db.Collection("families").Document(familyId)
                .Collection("rewards").Document(rId);
            batch.Set(rRef, new { name = rName, cost, description = desc, isActive = true });
        }

        await batch.CommitAsync(ct);
    }

    // ── 新增異動（Firestore Transaction，保持 scores 原子更新） ───────────────
    public async Task<TransactionDto> AddTransactionAsync(
        string familyId, AddTransactionRequest req, string adminUid,
        CancellationToken ct = default)
    {
        var txId = Guid.NewGuid().ToString("N");
        var txRef = _db.Collection("families").Document(familyId)
            .Collection("transactions").Document(txId);

        await _db.RunTransactionAsync(async transaction =>
        {
            foreach (var playerId in req.PlayerIds)
            {
                var scoreRef = _db.Collection("families").Document(familyId)
                    .Collection("scores").Document(playerId);

                var scoreSnap = await transaction.GetSnapshotAsync(scoreRef, ct);
                var current = scoreSnap.Exists
                    ? scoreSnap.ConvertTo<PlayerScoreDoc>()
                    : new PlayerScoreDoc();

                int delta = req.Type == "earn" ? req.Amount : -req.Amount;
                transaction.Update(scoreRef, new Dictionary<string, object>
                {
                    ["achievementPoints"] =
                        req.Type == "earn"
                            ? current.AchievementPoints + req.Amount
                            : current.AchievementPoints,
                    ["redeemablePoints"] =
                        Math.Max(0, current.RedeemablePoints + delta),
                    ["totalEarned"] =
                        req.Type == "earn"
                            ? current.TotalEarned + req.Amount
                            : current.TotalEarned,
                    ["totalDeducted"] =
                        req.Type == "deduct"
                            ? current.TotalDeducted + req.Amount
                            : current.TotalDeducted,
                    ["lastUpdated"] = Timestamp.GetCurrentTimestamp(),
                });
            }

            transaction.Set(txRef, new
            {
                playerIds    = req.PlayerIds,
                type         = req.Type,
                amount       = req.Amount,
                reason       = req.Reason,
                categoryId   = req.CategoryId,
                createdBy    = adminUid,
                createdAt    = Timestamp.GetCurrentTimestamp(),
                note         = req.Note,
            });
        }, cancellationToken: ct);

        // ... 返回 DTO
        return new TransactionDto { Id = txId, /* ... */ };
    }

    // ── 私有輔助：新增預設玩家 ────────────────────────────────────────────────
    private void AddDefaultPlayer(WriteBatch batch, string familyId,
        string playerId, string name, string color)
    {
        var playerRef = _db.Collection("families").Document(familyId)
            .Collection("players").Document(playerId);
        batch.Set(playerRef, new
        {
            name, color, role = "child", isActive = true,
            createdAt = Timestamp.GetCurrentTimestamp()
        });

        var scoreRef = _db.Collection("families").Document(familyId)
            .Collection("scores").Document(playerId);
        batch.Set(scoreRef, new
        {
            achievementPoints = 0, redeemablePoints = 0,
            totalEarned = 0, totalDeducted = 0, totalRedeemed = 0,
            lastUpdated = Timestamp.GetCurrentTimestamp()
        });
    }
}
```

---

### 8.5 C# DTO Records 與 DI 注冊

#### Request / Response DTOs（`Models/FamilyScoreboard/`）

```csharp
// Models/FamilyScoreboard/Dtos.cs
namespace MidoLearning.Api.Models.FamilyScoreboard;

// ── Response DTOs ──────────────────────────────────────────────────────────────

public record PlayerScoreDto(
    string PlayerId,
    string Name,
    string Color,
    int AchievementPoints,
    int RedeemablePoints,
    int TotalEarned,
    int TotalDeducted,
    int TotalRedeemed
);

public record TransactionDto(
    string Id,
    IReadOnlyList<string> PlayerIds,
    string Type,        // "earn" | "deduct"
    int Amount,
    string Reason,
    string? CategoryId,
    string CreatedBy,
    DateTimeOffset CreatedAt,
    string? Note
);

public record RewardDto(
    string Id,
    string Name,
    int Cost,
    string Description,
    string Icon,
    bool IsActive,
    int? Stock
);

public record RedemptionDto(
    string Id,
    string PlayerId,
    string RewardId,
    string RewardName,
    int Cost,
    string Status,      // "pending" | "approved" | "rejected"
    DateTimeOffset RequestedAt,
    DateTimeOffset? ProcessedAt,
    string? ProcessedBy,
    string? Note
);

// ── Request DTOs ───────────────────────────────────────────────────────────────

public record AddTransactionRequest(
    IReadOnlyList<string> PlayerIds,
    string Type,         // "earn" | "deduct"
    int Amount,
    string Reason,
    string? CategoryId,
    string? Note
);

public record CreateRedemptionRequest(
    string RewardId,
    string? Note
);

public record ProcessRedemptionRequest(
    string Action,       // "approve" | "reject"
    string? Note
);
```

#### Firestore 內部文件對應（`PlayerScoreDoc`）

```csharp
// Models/FamilyScoreboard/PlayerScoreDoc.cs
using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models.FamilyScoreboard;

[FirestoreData]
public class PlayerScoreDoc
{
    [FirestoreProperty("achievementPoints")] public int AchievementPoints { get; set; }
    [FirestoreProperty("redeemablePoints")]  public int RedeemablePoints  { get; set; }
    [FirestoreProperty("totalEarned")]       public int TotalEarned       { get; set; }
    [FirestoreProperty("totalDeducted")]     public int TotalDeducted     { get; set; }
    [FirestoreProperty("totalRedeemed")]     public int TotalRedeemed     { get; set; }
}
```

#### DI 注冊（`Program.cs` 新增片段）

```csharp
// Program.cs — 在現有 Firebase Admin SDK 注冊之後加入

// Firebase Admin SDK（若未注冊）
var firebaseApp = FirebaseApp.DefaultInstance
    ?? FirebaseApp.Create(new AppOptions
    {
        Credential = GoogleCredential.GetApplicationDefault()
    });

// Firestore
builder.Services.AddSingleton(_ =>
    FirestoreDb.Create(builder.Configuration["Firebase:ProjectId"]
        ?? throw new InvalidOperationException("Firebase:ProjectId not set")));

// Family Scoreboard Service
builder.Services.AddScoped<IFamilyScoreboardService, FirebaseScoreboardService>();
```

#### `appsettings.json` 新增設定

```json
{
  "Firebase": {
    "ProjectId": "mido-learning"
  }
}
```

> **Cloud Run 部署**：Service Account 權限透過 `GOOGLE_APPLICATION_CREDENTIALS` 環境變數或 Workload Identity 傳入，不需要在程式碼中指定金鑰檔案路徑。

---

## 9. 技術架構規格（前端）

### 8.1 模組獨立原則

```
frontend/
  app/
    (public)/
      experiments/
        family-scoreboard/           # 主路由模組（獨立）
          page.tsx                   # 主儀表板
          layout.tsx                 # 模組 Layout（含底部導航）
          player/[id]/page.tsx
          rewards/page.tsx
          reports/page.tsx
          admin/
            page.tsx
            players/page.tsx

  lib/
    family-scoreboard/               # 獨立服務層
      firestore.ts                   # Firestore CRUD（只此模組用）
      types.ts                       # TypeScript 型別定義
      constants.ts                   # 預設資料（玩家、類別、獎勵）
      utils.ts                       # 積分計算、格式化

  components/
    family-scoreboard/               # 獨立 UI 元件
      PlayerCard.tsx
      ScoreTransactionSheet.tsx      # Bottom Sheet
      RewardCard.tsx
      HabitTracker.tsx               # 第二期
      charts/
        PointsTrendChart.tsx
        CategoryPieChart.tsx
```

**共用（可從 Mido Learning 引用）**：
- `lib/firebase.ts` — Firebase 初始化（共用）
- `components/ui/Button.tsx` — 基礎按鈕
- `hooks/useAuth.ts` — Auth hook
- `components/auth/AuthProvider.tsx`

### 8.2 狀態管理

- 使用 **React Context** 管理 `familyId`（不引入 Zustand，保持模組獨立）
- 積分即時更新：**Firestore onSnapshot**
- 表單狀態：`useState`（不需要全域）

### 8.3 初始化邏輯

```typescript
// 第一次進入時，自動初始化預設資料
async function initializeFamilyIfNeeded(uid: string): Promise<string> {
  // 1. 查詢 uid 是否已有 family
  // 2. 沒有 → 建立新 family + 預設玩家 + 預設類別 + 預設獎勵
  // 3. 有 → 直接返回 familyId
}
```

---

## 9. 驗收條件（Acceptance Criteria）

### AC1：Admin 存取控制
- Given Admin 已登入
- When 進入 `/experiments` 頁面
- Then 看到「家庭計分板」卡片
- And 非 Admin 用戶看不到此卡片

### AC2：預設玩家初始化
- Given Admin 首次進入家庭計分板
- When 系統自動初始化
- Then 顯示「米豆」和「毛豆」兩位玩家，各自積分為 0

### AC3：加分操作
- Given Admin 在主儀表板
- When 點擊玩家卡片 → 選擇「主動幫忙家事」(+5)
- Then 該玩家的「可兌換分」+5，「成就分」+5
- And 交易記錄中出現此筆記錄

### AC4：雙軌積分
- Given 玩家有成就分 100，可兌換分 100
- When Admin 扣分 -20（兄弟吵架）
- Then 成就分維持 100，可兌換分變為 80

### AC5：兌換不影響成就分
- Given 玩家有成就分 100，可兌換分 80
- When 玩家申請兌換「看一集卡通」(-50)，Admin 核准
- Then 成就分維持 100，可兌換分變為 30

### AC6：手機操作流暢
- Given 在 375px 寬度手機上
- When 執行加分操作
- Then Bottom Sheet 從底部滑出，按鈕可用拇指觸及
- And 操作不超過 3 步完成

### AC7：報表可讀
- Given Admin 或 Player 進入報表頁
- When 選擇「過去30天」
- Then 顯示積分趨勢折線圖，各玩家用不同顏色區分

---

## 10. 非功能需求

| 項目 | 規格 |
|------|------|
| **效能** | 積分更新在 500ms 內反映到畫面 |
| **離線** | 基本查看功能在無網路時顯示快取資料 |
| **安全性** | Firestore Security Rules 防止跨家庭存取 |
| **可擴充性** | 家庭成員可擴充（不限 2 人），未來支援多個家庭 |
| **資料保護** | 兒童資料不對外公開，僅家庭成員可讀 |

---

## 11. 開發里程碑

| 里程碑 | 內容 | 估計 |
|--------|------|------|
| M1 | Firebase 資料設計 + 初始化邏輯 + 基礎型別 | 0.5 天 |
| M2 | 主儀表板 + 玩家卡片 + 加減分 Bottom Sheet | 1 天 |
| M3 | 雙軌積分邏輯 + 交易記錄頁 | 0.5 天 |
| M4 | 獎勵清單 + 兌換申請 + Admin 核准 | 1 天 |
| M5 | 報表儀表板（趨勢圖 + 圓餅圖）| 0.5 天 |
| M6 | Admin 管理頁 + 玩家管理 | 0.5 天 |
| M7 | 整合測試 + 手機 UX 調整 | 0.5 天 |
| **合計** | | **4.5 天** |

**第二期（習慣追蹤 + 成就系統）**：另行規劃

---

## 12. 開放問題（待確認）

| # | 問題 | 預設答案 | 需確認 |
|---|------|---------|--------|
| Q1 | familyId 怎麼與 Firebase Auth UID 關聯？ | Admin UID = family 的唯一識別基礎 | ✅ 可確認 |
| Q2 | 小孩(Player)是否需要獨立 Firebase 帳號？ | 目前 Admin 代為操作，Player 不需登入 | 待確認 |
| Q3 | 積分是否有上限或下限（如最低不能低於0）？ | 可兌換分最低為 0（不能為負）| 待確認 |
| Q4 | 兌換申請可以被玩家取消嗎？| 可以（在 pending 狀態下）| 待確認 |
| Q5 | 習慣追蹤是否要在 MVP 一起做？ | 第二期再做 | 待確認 |

---

**規格書版本歷史**

| 版本 | 日期 | 說明 |
|------|------|------|
| v1.0 | 2026-02-18 | 初版，整合用戶所有需求說明 |
