# 測試資料腳本使用說明

## 🚀 快速開始（推薦）

使用 `seed-all.sh` 一鍵插入所有測試資料（教材 + 成就）：

```bash
cd backend/scripts
ADMIN_TOKEN='你的token' ./seed-all.sh
```

---

## 📦 分別插入測試資料

### 選項 1: 插入教材資料

```bash
ADMIN_TOKEN='你的token' ./seed-components.sh
```

將創建 8 個公開教材：
- 注音符號練習
- 英文字母練習
- 加法大冒險
- 九九乘法表
- 程式設計第一課
- 水的三態變化
- 日常英語對話
- 台灣歷史小故事

### 選項 2: 插入成就資料

```bash
ADMIN_TOKEN='你的token' ./seed-test-data.sh
```

將創建 6 個測試成就（詳見下方）。

---

## 🔑 取得 Admin Token

### 步驟 1: 取得 Admin Token

1. 啟動前後端服務：
   ```bash
   # 後端
   cd backend/MidoLearning.Api
   dotnet run --urls "http://localhost:5000"

   # 前端
   cd frontend
   PORT=3001 pnpm run dev
   ```

2. 在瀏覽器登入為 admin 使用者：
   - 訪問: http://localhost:3001/login
   - 使用 admin 帳號登入

3. 開啟瀏覽器開發者工具 (F12)，在 Console 執行：
   ```javascript
   localStorage.getItem('token')
   ```
   複製輸出的 token

### 步驟 2: 運行腳本

```bash
cd backend/scripts

# 一鍵插入所有測試資料（推薦）
ADMIN_TOKEN='你的token' ./seed-all.sh

# 或分別插入
ADMIN_TOKEN='你的token' ./seed-components.sh  # 教材
ADMIN_TOKEN='你的token' ./seed-test-data.sh   # 成就
```

### 步驟 3: 驗證資料

訪問以下頁面確認測試資料已插入：

**教材相關：**
- **首頁（公開教材）**: http://localhost:3001
- **教材列表**: http://localhost:3001/components
- **管理介面**: http://localhost:3001/admin/components

**成就相關：**
- **Game Admin 成就管理**: http://localhost:3001/game-admin/achievements
- **會員成就頁面**: http://localhost:3001/dashboard/achievements

---

## 測試資料內容

腳本會創建 6 個測試成就：

| 成就 | 圖標 | 類型 | 條件 | 獎勵 |
|------|------|------|------|------|
| 新手上路 | 🎓 | GameCompletion | 完成任一課程 | 100 XP, 50 金幣 |
| 速度達人 | ⚡ | SkillMastery | 達到 30 WPM | 200 XP, 100 金幣 |
| 準確射手 | 🎯 | SkillMastery | 達到 95% 準確度 | 150 XP, 75 金幣 |
| 完美主義 | 💎 | WinStreak | 連續 5 次完美 | 300 XP, 150 金幣 |
| 勤奮學習 | 📚 | Milestone | 累計遊玩 10 次 | 250 XP, 125 金幣 |
| 星星收集家 | ⭐ | StarCollection | 累積 50 顆星 | 500 XP, 250 金幣 |

---

## 清除測試資料

目前需要手動透過 Game Admin 介面刪除成就。

---

## 故障排除

### 錯誤: "❌ 請設定 ADMIN_TOKEN 環境變數"

確保你有設定 `ADMIN_TOKEN` 環境變數：

```bash
ADMIN_TOKEN='你的token' ./seed-test-data.sh
```

### 錯誤: "401 Unauthorized"

Token 可能過期或無效，請重新取得 token。

### 錯誤: "403 Forbidden"

當前使用者不是 admin，請確認使用 admin 帳號登入。
