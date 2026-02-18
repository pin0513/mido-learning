---
name: Retro Handoff
description: Facilitate retrospective meetings and generate knowledge handoff documents for the next team iteration
---

# Retro Handoff Skill

## 用途

主持 **Retrospective（回顧檢討）會議**，並產生知識傳承文件，將成果、人類回饋、學到的教訓同步給下一輪團隊。

---

## 適用情境

- 專案交付完成後
- 重大里程碑達成後
- 遇到重大技術挑戰後
- 團隊成員變動前

---

## Retro 會議流程

### Step 1: 準備階段（5 分鐘）
1. **邀請參與者**：
   - Team Lead（主持人）
   - 所有團隊成員（Frontend/Backend/QA/DDD 專家/全端除錯）
   - 可選：使用者/客戶

2. **設定氛圍**：
   - 強調「無責備文化」（No Blame Culture）
   - 目標是學習與改進，不是指責

---

### Step 2: 資料收集（20 分鐘）
使用 **Start-Stop-Continue** 框架或 **4Ls** 框架。

#### 框架 A: Start-Stop-Continue

| 類別 | 問題 | 範例答案 |
|------|------|----------|
| **Start** | 我們應該開始做什麼？ | 「開始每日 standup」、「開始寫 ADR」 |
| **Stop** | 我們應該停止做什麼？ | 「停止在 PR 中加入太多功能」 |
| **Continue** | 我們應該繼續做什麼？ | 「繼續 Code Review」、「繼續 TDD」 |

#### 框架 B: 4Ls

| 類別 | 問題 | 範例答案 |
|------|------|----------|
| **Liked** | 我們喜歡什麼？ | 「Zustand 狀態管理很簡潔」 |
| **Learned** | 我們學到什麼？ | 「學到如何優化 SQL 查詢」 |
| **Lacked** | 我們缺少什麼？ | 「缺少 E2E 測試」 |
| **Longed For** | 我們渴望什麼？ | 「渴望更好的 CI/CD Pipeline」 |

---

### Step 3: 討論與分析（20 分鐘）
1. **分組相似回饋**：
   - 將相似的回饋歸類

2. **投票**：
   - 每人 3 票，投給最想討論的議題

3. **深入討論前 3 名議題**：
   - 根因分析（為什麼發生？）
   - 提出改進方案

---

### Step 4: 行動計畫（10 分鐘）
1. **制定具體行動項目**：
   - Who（誰負責）
   - What（做什麼）
   - When（何時完成）

2. **範例**：
   ```
   Action Item 1:
   - What: 建立 E2E 測試 Pipeline
   - Who: QA Engineer
   - When: 下一個 Sprint

   Action Item 2:
   - What: 撰寫 SQL 優化 ADR
   - Who: Backend Developer
   - When: 本週五前
   ```

---

### Step 5: 知識傳承文件產生（15 分鐘）
產生 **Handoff Document**，包含：

1. **專案摘要**
2. **做得好的事**（Keep Doing）
3. **需要改進的事**（Improve）
4. **學到的教訓**（Lessons Learned）
5. **技術債清單**
6. **下一輪行動計畫**

---

## 知識傳承文件範本

```markdown
# Retro Handoff Document

**專案名稱**: {專案名稱}
**交付日期**: {YYYY-MM-DD}
**參與者**: Team Lead, Frontend Dev, Backend Dev, QA, DDD Expert, Fullstack Debugger

---

## 專案摘要

### 交付物
- ✅ 前端應用（Next.js + Zustand）
- ✅ 後端 API（NestJS + PostgreSQL + Redis）
- ✅ E2E 測試（Playwright）
- ✅ CI/CD Pipeline（GitHub Actions）
- ✅ API 文件（Swagger）

### 關鍵指標
- 測試覆蓋率: 85%
- Lighthouse Score: 92
- API P95 延遲: 450ms
- 部署成功率: 100%

---

## 做得好的事 (Keep Doing)

### 1. HTDD 開發流程
**What**: 每個功能都遵循 Hypothesis → Test → Dev → Refactor

**Why it worked**:
- 測試覆蓋率達到 85%
- Bug 減少 40%（相比上一輪）
- 重構更有信心

**下一輪建議**: 繼續執行，並在 Code Review 時檢查是否遵循

---

### 2. DDD 領域建模
**What**: 使用 Event Storming 進行領域建模

**Why it worked**:
- 業務邏輯清楚反映在程式碼中
- Backend 程式碼易於維護
- 新成員快速理解系統

**下一輪建議**: 繼續使用，建議每個新模組都進行 Event Storming

---

### 3. Zustand 狀態管理
**What**: 前端使用 Zustand 取代 Redux

**Why it worked**:
- 程式碼量減少 50%
- 學習曲線低
- 效能優於 Redux

**下一輪建議**: 繼續使用 Zustand

---

## 需要改進的事 (Improve)

### 1. E2E 測試覆蓋不足
**Problem**:
- 只有 3 個 E2E 測試
- 關鍵流程（結帳、支付）缺少 E2E 測試

**Impact**:
- 整合問題在生產環境才發現
- Hotfix 次數多

**Root Cause**:
- E2E 測試寫起來慢
- 缺少 Page Object Model

**Action**:
- [ ] QA Engineer 建立 E2E 測試框架（Page Object Model）
- [ ] 每個使用者故事必須有至少 1 個 E2E 測試
- [ ] Deadline: 下一個 Sprint

---

### 2. SQL 查詢效能問題
**Problem**:
- `/orders` API P95 延遲達到 1.2s（目標 < 500ms）
- 存在 N+1 查詢問題

**Impact**:
- 使用者體驗差
- 高峰時段伺服器負載高

**Root Cause**:
- 缺少索引
- 使用 eager loading 不當

**Action**:
- [ ] Backend Developer 優化 SQL 查詢（加入索引、使用 JOIN）
- [ ] 使用 `/otel-analysis` skill 追蹤效能
- [ ] Deadline: 本週五前

---

### 3. PR Review 速度慢
**Problem**:
- PR 平均等待 2 天才被 Review
- 阻塞開發進度

**Root Cause**:
- Team Lead 忙於其他任務
- 缺少 PR Review 排程

**Action**:
- [ ] 建立 PR Review Rotation（輪流 Review）
- [ ] PR 超過 1 天未 Review，自動提醒
- [ ] Deadline: 下一個 Sprint

---

## 學到的教訓 (Lessons Learned)

### 1. Redis 快取策略
**What we learned**:
- Redis 快取大幅降低資料庫負載（從 80% → 20%）
- 但需要謹慎設計 Cache Invalidation 策略

**What went wrong**:
- 一開始沒設計 Invalidation，導致使用者看到舊資料

**How we fixed**:
- 使用 Event-driven Cache Invalidation（當資料變更時發送 Event，清除相關快取）

**Next time**:
- 在設計快取時，同步設計 Invalidation 策略

---

### 2. TypeScript `any` 的代價
**What we learned**:
- 使用 `any` 會導致型別安全失效，產生 Runtime Error

**What went wrong**:
- Frontend 有 15 個 `any`，其中 3 個導致生產環境錯誤

**How we fixed**:
- 全面移除 `any`，改用 `unknown` + Type Guard
- 在 ESLint 中強制執行 `no-explicit-any`

**Next time**:
- 從一開始就禁用 `any`（zero-any-policy）

---

### 3. OpenTelemetry 的價值
**What we learned**:
- OpenTelemetry Trace 大幅縮短問題診斷時間（從 2 小時 → 15 分鐘）

**What went well**:
- 能快速找出慢查詢、高延遲 API

**Next time**:
- 在專案初期就加入 OpenTelemetry
- 建立 Grafana Dashboard

---

## 技術債清單

| ID | 描述 | 影響 | 優先順序 | 預估時間 |
|----|------|------|----------|----------|
| TD-001 | 移除 deprecated `useEffect` (5 處) | 可維護性 | Medium | 2 小時 |
| TD-002 | 將 API Client 改為 class-based | 可測試性 | Low | 4 小時 |
| TD-003 | 加入 Database Migration Rollback 機制 | 風險控制 | High | 1 天 |
| TD-004 | 移除未使用的套件（bundle size -50KB） | 效能 | Medium | 1 小時 |
| TD-005 | 將硬編碼的字串改為 i18n | 國際化 | Low | 3 小時 |

---

## 下一輪行動計畫

### 優先順序 P0（本週完成）
- [ ] 優化 `/orders` API 查詢效能（Backend Developer）
- [ ] 修復 E2E 測試 flaky test（QA Engineer）
- [ ] 加入 Database Migration Rollback（Backend Developer）

### 優先順序 P1（下一個 Sprint）
- [ ] 建立 E2E 測試框架（QA Engineer）
- [ ] 建立 Grafana Dashboard（Team Lead）
- [ ] 清理技術債 TD-001, TD-004（Frontend Developer）

### 優先順序 P2（未來）
- [ ] 國際化（i18n）實作
- [ ] API Rate Limiting 實作
- [ ] 監控告警規則優化

---

## 給下一輪團隊的建議

### 技術建議
1. **繼續使用 HTDD**：測試優先能確保高品質
2. **遵循 DDD**：領域模型清楚，維護容易
3. **重視 OpenTelemetry**：能快速診斷問題
4. **Zero `any` Policy**：型別安全非常重要

### 流程建議
1. **PR Review Rotation**：避免單點瓶頸
2. **每日 Standup**：快速同步進度與障礙
3. **定期 Retro**：持續改進

### 警告
1. **不要跳過測試**：短期省時間，長期付出代價
2. **不要過度優化**：先讓功能正常運作，再優化
3. **不要忽略技術債**：定期清理，避免累積

---

## 附件

- [Lighthouse Report](./lighthouse-report.html)
- [Test Coverage Report](./coverage/index.html)
- [OpenTelemetry Trace Examples](./traces/)
- [ADR Collection](./adrs/)

---

**產生日期**: 2026-02-13
**下一次 Retro**: 2026-03-15
**維護者**: Team Lead
```

---

## 使用範例

### 呼叫方式
```
Team Lead: /retro-handoff
```

### 互動流程

**Skill**:
```
歡迎使用 Retro Handoff！

我會引導你完成 Retrospective 會議，並產生知識傳承文件。

請選擇 Retro 框架：
1. Start-Stop-Continue（適合快速回顧）
2. 4Ls (Liked-Learned-Lacked-Longed For)（適合深度反思）

請輸入 1 或 2：
```

**Team Lead**: `1`

**Skill**:
```
收到！使用 Start-Stop-Continue 框架。

## Step 1: 資料收集

請團隊成員回答以下問題（每人 5 分鐘）：

### Start（應該開始做什麼？）
- 例如：「開始每日 standup」、「開始寫 ADR」

### Stop（應該停止做什麼？）
- 例如：「停止在 PR 中加入太多功能」

### Continue（應該繼續做什麼？）
- 例如：「繼續 Code Review」、「繼續 TDD」

請將團隊回饋整理後貼上，或者我可以逐一詢問每個成員。

你希望如何進行？
```

**Team Lead**: `逐一詢問`

**Skill**:
```
收到！

## Frontend Developer

請回答：
1. Start（應該開始做什麼？）
2. Stop（應該停止做什麼？）
3. Continue（應該繼續做什麼？）
```

（依此類推，詢問每個成員）

最後產生完整的 Handoff Document，存放於：
```
.retro/2026-02-13-retro-handoff.md
```

---

## 成功指標

- ✅ 所有團隊成員參與 Retro
- ✅ 至少識別出 3 個「做得好的事」
- ✅ 至少識別出 3 個「需要改進的事」
- ✅ 產生具體的行動計畫（Who/What/When）
- ✅ Handoff Document 完整記錄
- ✅ 下一輪團隊能從文件中快速理解上一輪的成果與教訓

---

**版本**：1.0
**維護者**：Team Lead
