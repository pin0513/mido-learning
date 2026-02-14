# Tech Debt - 技能村系統

**建立日期**: 2026-02-11
**專案**: 技能村遊戲化學習系統
**Branch**: feature/skill-village-system

---

## 🚨 Critical (必須修正)

### TD-001: 密碼強度過低
**問題**: 遊戲註冊允許 4-8 字元密碼，安全性不足
**現況**: 規格定義為 4-8 字元，可包含英文、數字
**建議**: 改為 6-20 字元，必須包含大小寫與數字
**影響**: 安全性
**優先級**: P1
**預估工時**: 2 小時（規格修正 + API 驗證調整）
**負責人**: TBD
**狀態**: 🔴 待處理

---

## ⚠️ High (強烈建議)

### TD-002: Firestore 複合索引未建立
**問題**: 規格中的查詢需要複合索引，否則會失敗
**需要建立的索引**:
- `game_sessions`: characterId (ASC) + createdAt (DESC)
- `game_sessions`: characterId (ASC) + skillId (ASC) + createdAt (DESC)
- `rewards`: characterId (ASC) + createdAt (DESC)
- `messages`: characterId (ASC) + status (ASC)

**影響**: 功能無法正常運作
**優先級**: P1
**預估工時**: 1 小時（建立索引）
**負責人**: Backend Developer
**狀態**: 🔴 待處理

---

### TD-003: Rate Limiting 未實作
**問題**: API 缺少 Rate Limiting，容易被濫用
**需要實作的限制**:
- 登入 API: 每 IP 每分鐘 5 次
- 遊戲完成 API: 每角色每分鐘 10 次
- 所有 API: 每 IP 每分鐘 30 次

**影響**: 安全性、成本
**優先級**: P1
**預估工時**: 4 小時（安裝 @nestjs/throttler + 配置）
**負責人**: Backend Developer
**狀態**: 🔴 待處理

---

### TD-004: 訓練記錄缺少分頁
**問題**: 訓練記錄一次性載入所有資料，效能問題
**建議**: 預設只載入最近 10 筆，使用「載入更多」按鈕
**影響**: 效能、成本
**優先級**: P2
**預估工時**: 3 小時（後端分頁 API + 前端無限滾動）
**負責人**: Frontend Developer
**狀態**: 🔴 待處理

---

## 💡 Medium (建議優化)

### TD-005: 資料匯總機制未實作
**問題**: game_sessions 會持續增長，成本增加
**建議**: 每月將 30 天前的 game_sessions 匯總成 daily_summaries
**影響**: 成本優化（預估可節省 30% Firestore 成本）
**優先級**: P3
**預估工時**: 8 小時（Cloud Function + 定期任務）
**負責人**: Backend Developer
**狀態**: 🟡 未來優化

---

### TD-006: JWT Token 未使用 HttpOnly Cookie
**問題**: Token 存在 localStorage，容易被 XSS 攻擊竊取
**建議**: 改用 HttpOnly Cookie 儲存 Token
**影響**: 安全性
**優先級**: P2
**預估工時**: 4 小時（後端 Cookie 配置 + 前端調整）
**負責人**: Backend Developer
**狀態**: 🟡 未來優化

---

## 📊 統計

| 優先級 | 數量 | 總工時 |
|--------|------|--------|
| P1 (Critical) | 3 | 7 小時 |
| P2 (High) | 2 | 7 小時 |
| P3 (Medium) | 2 | 12 小時 |
| **Total** | **7** | **26 小時** |

---

## 📅 處理計劃

### Sprint 1 (本次開發)
- ✅ TD-002: Firestore 索引建立（Backend 啟動時）
- ✅ TD-003: Rate Limiting（Backend 初期設定）
- 🔲 TD-004: 訓練記錄分頁（Frontend 開發時）

### Sprint 2 (下次迭代)
- 🔲 TD-001: 密碼強度調整（與 PM 確認後）
- 🔲 TD-006: HttpOnly Cookie

### Future
- 🔲 TD-005: 資料匯總機制（成本優化）

---

**最後更新**: 2026-02-11
