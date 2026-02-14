# Firestore 資料庫設計

**版本**: 1.0
**日期**: 2026-02-12
**審查者**: Software Architect
**審查結果**: ⚠️ **APPROVED WITH WARNINGS**

---

## 審查總結

### ✅ 通過項目

1. **Collections 設計合理**：符合 Firestore NoSQL 特性
2. **資料關聯清晰**：character → game_sessions, rewards, messages
3. **彈性欄位設計**：skillProgress 使用 map，可動態新增技能

### ⚠️ 警告項目（必須優化）

1. **缺少複合索引設計**：查詢效能可能不佳
2. **讀取次數未優化**：訓練記錄頁面可能產生大量讀取
3. **Security Rules 不完整**：需補充詳細規則
4. **無資料匯總機制**：歷史資料會無限增長

---

## Collections 架構圖

```
Firestore Database (mido-learning)
│
├── characters/                    # 角色資料
│   ├── {characterId}
│   │   ├── accountType            # "guest" | "simple" | "full"
│   │   ├── userId?                # Firebase Auth UID (full only)
│   │   ├── username?              # (simple only)
│   │   ├── passwordHash?          # (simple only)
│   │   ├── name                   # 角色名稱
│   │   ├── currencyName           # 虛擬貨幣名稱
│   │   ├── level                  # 1-1000
│   │   ├── totalExp               # 累計經驗值
│   │   ├── skillProgress          # Map<skillId, SkillProgress>
│   │   ├── rewards                # 獎勵資訊
│   │   ├── status                 # "active" | "suspended"
│   │   ├── createdAt              # Timestamp
│   │   ├── updatedAt              # Timestamp
│   │   └── lastLoginAt            # Timestamp
│   │
│   └── (索引需求)
│       ├── username (unique)
│       ├── userId
│       └── status
│
├── skills/                        # 技能配置
│   ├── {skillId}
│   │   ├── name                   # 技能名稱
│   │   ├── icon                   # 圖示
│   │   ├── category               # 分類
│   │   ├── status                 # "active" | "coming_soon" | "disabled"
│   │   ├── levels[]               # 關卡配置
│   │   ├── gameConfig             # 遊戲配置
│   │   ├── expRules               # 經驗值規則
│   │   ├── rewardRules            # 獎勵規則
│   │   ├── createdAt
│   │   └── updatedAt
│   │
│   └── (索引需求)
│       └── status
│
├── game_sessions/                 # 遊戲記錄
│   ├── {sessionId}
│   │   ├── characterId            # 角色 ID
│   │   ├── skillId                # 技能 ID
│   │   ├── levelId                # 關卡 ID
│   │   ├── performance            # 遊戲表現
│   │   ├── result                 # 獲得獎勵
│   │   ├── metadata               # IP, sessionId
│   │   └── createdAt
│   │
│   └── (索引需求) ⚠️ 重要
│       ├── characterId + createdAt (desc)
│       ├── characterId + skillId + createdAt (desc)
│       └── metadata.sessionId (unique check)
│
├── rewards/                       # 獎勵記錄
│   ├── {rewardId}
│   │   ├── characterId
│   │   ├── type                   # "play_time" | "challenge" | "manual"
│   │   ├── amount
│   │   ├── source                 # skillId or "admin"
│   │   ├── description
│   │   ├── gameSessionId?
│   │   └── createdAt
│   │
│   └── (索引需求)
│       └── characterId + createdAt (desc)
│
├── messages/                      # 聯絡訊息
│   ├── {messageId}
│   │   ├── characterId
│   │   ├── subject
│   │   ├── content
│   │   ├── status                 # "unread" | "read" | "replied"
│   │   ├── reply?
│   │   ├── createdAt
│   │   └── updatedAt
│   │
│   └── (索引需求)
│       ├── characterId + status
│       └── status (for admin)
│
└── redemptions/                   # 兌換記錄（新增）
    ├── {redemptionId}
    │   ├── characterId
    │   ├── itemId                 # 兌換品項 ID
    │   ├── itemName
    │   ├── amount                 # 扣除金額
    │   ├── status                 # "pending" | "completed" | "cancelled"
    │   ├── note?                  # 管理員備註
    │   ├── createdAt
    │   └── completedAt?
    │
    └── (索引需求)
        ├── characterId + status
        └── status + createdAt (for admin)
```

---

## 詳細 Schema 設計

### 1. characters Collection

**Document ID**: 自動生成（Firestore auto-id）

**完整 Schema**:

```typescript
interface Character {
  id: string; // Document ID

  // === 帳號資訊 ===
  accountType: 'guest' | 'simple' | 'full';
  userId?: string;          // full 帳號的 Firebase Auth UID
  username?: string;        // simple 帳號的使用者名稱（唯一）
  passwordHash?: string;    // simple 帳號的密碼 Hash（bcrypt）

  // === 角色資訊 ===
  name: string;             // 角色名稱（可重複）
  avatar?: string;          // 頭像 URL
  currencyName: string;     // 虛擬貨幣名稱，預設「米豆幣」

  // === 等級與經驗 ===
  level: number;            // 1-1000
  totalExp: number;         // 累計總經驗值
  currentLevelExp: number;  // 當前等級的經驗值
  nextLevelExp: number;     // 升級所需經驗值

  // === 技能進度（動態欄位）===
  skillProgress: {
    [skillId: string]: {
      skillLevel: number;
      skillExp: number;
      playCount: number;
      totalPlayTime: number;    // 分鐘
      lastPlayedAt: Timestamp;
      streak: number;            // 連續完成次數
      bestScore?: {
        accuracy?: number;       // 0-1
        wpm?: number;
        score?: number;
      };
    };
  };

  // === 獎勵資訊 ===
  rewards: {
    totalEarned: number;    // 累計獲得
    available: number;      // 可用餘額
    redeemed: number;       // 已兌換
    lastRewardAt?: Timestamp;
  };

  // === 狀態 ===
  status: 'active' | 'suspended';

  // === 時間戳 ===
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}
```

**範例資料**:

```json
{
  "id": "char_abc123",
  "accountType": "simple",
  "username": "mido2024",
  "passwordHash": "$2b$10$...",
  "name": "米豆",
  "avatar": "default",
  "currencyName": "米豆幣",
  "level": 15,
  "totalExp": 3250,
  "currentLevelExp": 250,
  "nextLevelExp": 500,
  "skillProgress": {
    "english-typing": {
      "skillLevel": 8,
      "skillExp": 450,
      "playCount": 25,
      "totalPlayTime": 360,
      "lastPlayedAt": "2026-02-11T12:00:00Z",
      "streak": 3,
      "bestScore": {
        "accuracy": 0.95,
        "wpm": 60
      }
    }
  },
  "rewards": {
    "totalEarned": 150,
    "available": 80,
    "redeemed": 70,
    "lastRewardAt": "2026-02-11T11:50:00Z"
  },
  "status": "active",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-02-11T12:00:00Z",
  "lastLoginAt": "2026-02-11T12:00:00Z"
}
```

**索引需求**:

| 欄位 | 索引類型 | 用途 |
|------|----------|------|
| `username` | Single Field (Ascending) | 檢查唯一性、登入查詢 |
| `userId` | Single Field (Ascending) | 查詢完整帳號的所有角色 |
| `status` | Single Field (Ascending) | 管理員查詢 |

---

### 2. game_sessions Collection ⚠️ 重點優化

**Document ID**: 自動生成

**Schema**:

```typescript
interface GameSession {
  id: string;
  characterId: string;
  skillId: string;
  levelId: string;

  performance: {
    playTime: number;      // 分鐘
    accuracy?: number;     // 0-1
    wpm?: number;
    score?: number;
    challengeCount?: number;
  };

  result: {
    expGained: number;
    levelUp: boolean;
    newLevel: number;
    rewardEarned: number;
    message: string;
  };

  metadata: {
    ip: string;
    userAgent: string;
    sessionId: string;     // 防止重複提交
  };

  createdAt: Timestamp;
}
```

**索引需求（複合索引）**:

| 欄位組合 | 排序 | 用途 |
|---------|------|------|
| `characterId` + `createdAt` | ASC + DESC | 角色的訓練記錄（最新在前）|
| `characterId` + `skillId` + `createdAt` | ASC + ASC + DESC | 依技能篩選訓練記錄 |
| `metadata.sessionId` | ASC | 防止重複提交（唯一性檢查）|

**⚠️ 讀取優化策略**:

```typescript
// ❌ 錯誤：一次載入所有記錄
const sessions = await db.collection('game_sessions')
  .where('characterId', '==', characterId)
  .get();
// 可能讀取 1000+ 筆 → 費用高昂

// ✅ 正確：分頁載入
const sessions = await db.collection('game_sessions')
  .where('characterId', '==', characterId)
  .orderBy('createdAt', 'desc')
  .limit(10) // 每頁 10 筆
  .get();

// ✅ 更好：前端快取
const cachedSessions = localStorage.getItem('sessions');
if (cachedSessions && Date.now() - lastFetch < 5 * 60 * 1000) {
  return JSON.parse(cachedSessions); // 使用快取
}
```

**資料匯總機制（建議）**:

```typescript
// 每週執行 Cloud Function，匯總舊資料
// 將 30 天前的 game_sessions 匯總成每日統計

interface DailySummary {
  characterId: string;
  skillId: string;
  date: string; // "2026-02-11"
  totalPlayTime: number;
  totalExp: number;
  playCount: number;
  avgAccuracy: number;
}

// 匯總後刪除原始 game_sessions（節省讀取成本）
```

---

### 3. skills Collection

**Document ID**: 自訂（例如: `english-typing`, `math-calculation`）

**Schema**: 與規格一致（已在規格文件中詳述）

**索引需求**:

| 欄位 | 索引類型 | 用途 |
|------|----------|------|
| `status` | Single Field | 前端查詢 active skills |

---

### 4. rewards Collection

**Document ID**: 自動生成

**Schema**:

```typescript
interface Reward {
  id: string;
  characterId: string;
  type: 'play_time' | 'challenge' | 'manual' | 'achievement';
  amount: number;
  source: string;       // skillId or "admin" or "achievement:xxx"
  description: string;
  gameSessionId?: string; // 關聯的遊戲 session（如有）
  createdAt: Timestamp;
}
```

**索引需求**:

| 欄位組合 | 排序 | 用途 |
|---------|------|------|
| `characterId` + `createdAt` | ASC + DESC | 獎勵歷史（最新在前）|

**讀取優化**:

```typescript
// ✅ 分頁查詢
const rewards = await db.collection('rewards')
  .where('characterId', '==', characterId)
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get();

// ✅ 今日獎勵總額（用於檢查每日上限）
const today = new Date();
today.setHours(0, 0, 0, 0);

const todayRewards = await db.collection('rewards')
  .where('characterId', '==', characterId)
  .where('createdAt', '>=', today)
  .get();

const total = todayRewards.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
```

---

### 5. messages Collection

**Document ID**: 自動生成

**Schema**:

```typescript
interface Message {
  id: string;
  characterId: string;
  subject: string;
  content: string;
  status: 'unread' | 'read' | 'replied';

  reply?: {
    content: string;
    repliedBy: string;    // 管理員 ID
    repliedAt: Timestamp;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**索引需求**:

| 欄位組合 | 排序 | 用途 |
|---------|------|------|
| `characterId` + `status` | ASC + ASC | 使用者查詢未讀訊息 |
| `status` + `createdAt` | ASC + DESC | 管理員查詢待處理訊息 |

---

### 6. redemptions Collection（新增）

**目的**: 分離兌換記錄，避免與 rewards 混在一起

**Schema**:

```typescript
interface Redemption {
  id: string;
  characterId: string;
  itemId: string;       // 兌換品項 ID（從管理員設定中取得）
  itemName: string;
  amount: number;       // 扣除金額
  status: 'pending' | 'completed' | 'cancelled';
  note?: string;        // 管理員備註（如物流單號）
  createdAt: Timestamp;
  completedAt?: Timestamp;
}
```

**索引需求**:

| 欄位組合 | 排序 | 用途 |
|---------|------|------|
| `characterId` + `status` | ASC + ASC | 使用者查詢兌換狀態 |
| `status` + `createdAt` | ASC + DESC | 管理員處理兌換申請 |

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // === Helper Functions ===
    function isAuthenticated() {
      return request.auth != null;
    }

    function isCharacterOwner(characterId) {
      // simple 帳號：檢查 characterId 是否為 token 的 sub
      // full 帳號：檢查 character.userId 是否為 token.uid
      return request.auth.uid != null &&
             (request.auth.uid == characterId ||
              get(/databases/$(database)/documents/characters/$(characterId)).data.userId == request.auth.uid);
    }

    function isAdmin() {
      return request.auth.token.admin == true;
    }

    // === characters Collection ===
    match /characters/{characterId} {
      // 讀取：只能讀取自己的角色
      allow read: if isAuthenticated() && isCharacterOwner(characterId);

      // 建立：禁止前端直接建立（必須透過 API）
      allow create: if false;

      // 更新：禁止前端直接更新（必須透過 API）
      allow update: if false;

      // 刪除：禁止
      allow delete: if false;
    }

    // === skills Collection ===
    match /skills/{skillId} {
      // 讀取：所有人可讀（包含未登入）
      allow read: if true;

      // 寫入：僅管理員
      allow write: if isAdmin();
    }

    // === game_sessions Collection ===
    match /game_sessions/{sessionId} {
      // 讀取：只能讀取自己的記錄
      allow read: if isAuthenticated() &&
                     resource.data.characterId == request.auth.uid;

      // 寫入：禁止前端直接寫入（必須透過 API）
      allow write: if false;
    }

    // === rewards Collection ===
    match /rewards/{rewardId} {
      // 讀取：只能讀取自己的獎勵
      allow read: if isAuthenticated() &&
                     resource.data.characterId == request.auth.uid;

      // 寫入：禁止
      allow write: if false;
    }

    // === messages Collection ===
    match /messages/{messageId} {
      // 讀取：角色本人或管理員
      allow read: if isAuthenticated() &&
                     (resource.data.characterId == request.auth.uid || isAdmin());

      // 建立：禁止前端直接建立（透過 API）
      allow create: if false;

      // 更新：禁止（回覆透過 API）
      allow update: if false;

      // 刪除：禁止
      allow delete: if false;
    }

    // === redemptions Collection ===
    match /redemptions/{redemptionId} {
      // 讀取：角色本人或管理員
      allow read: if isAuthenticated() &&
                     (resource.data.characterId == request.auth.uid || isAdmin());

      // 寫入：禁止
      allow write: if false;
    }
  }
}
```

**⚠️ 重要提醒**:

1. **所有寫入都透過後端 API**：前端只能讀取，不能寫入
2. **後端使用 Admin SDK**：繞過 Security Rules，直接寫入
3. **定期審查 Rules**：確保沒有權限漏洞

---

## 資料遷移與備份

### 1. 定期備份

```bash
# 使用 Firebase CLI 匯出資料
firebase firestore:export gs://mido-learning-backups/$(date +%Y%m%d)

# 設定自動備份（Cloud Scheduler + Cloud Functions）
# 每週日凌晨 2:00 執行
0 2 * * 0 firebase firestore:export gs://backups/weekly
```

### 2. 資料匯總（節省成本）

```typescript
// Cloud Function: 每月執行一次
export const summarizeOldSessions = functions
  .pubsub.schedule('0 0 1 * *') // 每月 1 日
  .onRun(async (context) => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // 1. 查詢舊資料
    const oldSessions = await db.collection('game_sessions')
      .where('createdAt', '<', oneMonthAgo)
      .get();

    // 2. 匯總成每日統計
    const summaries = new Map<string, DailySummary>();

    oldSessions.forEach(doc => {
      const session = doc.data();
      const key = `${session.characterId}_${session.skillId}_${getDate(session.createdAt)}`;

      if (!summaries.has(key)) {
        summaries.set(key, {
          characterId: session.characterId,
          skillId: session.skillId,
          date: getDate(session.createdAt),
          totalPlayTime: 0,
          totalExp: 0,
          playCount: 0,
          avgAccuracy: 0,
        });
      }

      const summary = summaries.get(key)!;
      summary.totalPlayTime += session.performance.playTime;
      summary.totalExp += session.result.expGained;
      summary.playCount += 1;
    });

    // 3. 寫入匯總資料
    const batch = db.batch();
    summaries.forEach(summary => {
      const ref = db.collection('daily_summaries').doc();
      batch.set(ref, summary);
    });
    await batch.commit();

    // 4. 刪除舊資料（節省儲存與讀取成本）
    const deleteBatch = db.batch();
    oldSessions.forEach(doc => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();

    console.log(`Summarized ${oldSessions.size} sessions`);
  });
```

---

## 效能監控

### 1. 讀取次數監控

```typescript
// 在 Cloud Functions 中追蹤讀取次數
export const trackFirestoreUsage = functions.firestore
  .document('{collection}/{docId}')
  .onRead((snapshot, context) => {
    // 記錄到 BigQuery 或 Cloud Logging
    console.log({
      collection: context.params.collection,
      operation: 'read',
      timestamp: new Date(),
    });
  });
```

### 2. 成本估算

| 使用者數 | 每日平均遊玩次數 | 每日讀取次數 | 月讀取量 | 月成本（$） |
|---------|----------------|-------------|---------|------------|
| 100     | 5              | 5,000       | 150,000 | $0.09 |
| 1,000   | 5              | 50,000      | 1,500,000 | $0.90 |
| 10,000  | 5              | 500,000     | 15,000,000 | $9.00 |

*假設: 每次遊戲讀取 10 次（skills, character, sessions）*
*Firestore 讀取費用: $0.06 / 100,000 次*

---

## 建議改進

### ⚠️ 必須實作

1. **建立複合索引**（game_sessions, rewards, messages）
2. **實作資料匯總機制**（每月執行）
3. **前端快取 Skills**（5 分鐘 TTL）
4. **分頁載入訓練記錄**（預設 10 筆）

### 🔄 建議實作

1. **新增 daily_summaries collection**（匯總歷史資料）
2. **使用 Firestore Bundles**（預載常用資料）
3. **監控讀寫次數**（Cloud Logging + BigQuery）
4. **定期備份**（Cloud Scheduler + Cloud Storage）

---

## 總結

✅ **Collections 設計合理，符合 Firestore 特性**
✅ **Security Rules 完整，保護使用者資料**
⚠️ **必須建立複合索引，否則查詢會失敗**
⚠️ **必須實作資料匯總，否則成本會持續增長**
⚠️ **必須實作分頁載入，否則讀取次數過高**

**預估開發時間**:
- Schema 實作: 1 天
- Security Rules: 1 天
- 複合索引建立: 0.5 天
- 資料匯總 Cloud Function: 2 天
