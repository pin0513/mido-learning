# Web-Dev-Team

## 團隊目標

Web-Dev-Team 是一個**全端開發 + DevOps 團隊**，負責將 Web-Design-Team 交付的 UI 程式碼深化為完整的生產級應用系統。

### 核心職責

1. **前端深化開發**：整合狀態管理、API 串接、表單驗證、錯誤處理（React + TypeScript）
2. **後端 API 開發**：建立 Next.js Route Handlers / Server Actions、Prisma 資料庫設計、NextAuth.js 認證授權
3. **測試與品質保證**：Unit/E2E 測試、效能測試、安全檢查
4. **DevOps 與部署**：CI/CD Pipeline、環境管理、監控與日誌
5. **領域建模與架構**：DDD 實踐、架構設計、技術決策
6. **外部後端 BFF 整合**：需要 .NET / Go / Python 等後端時，協作外部 team，本團隊負責 BFF 層

---

## 技術棧

### 語言
- **TypeScript**（前後端統一，強型別，零 `any`）

### 前端（核心：React + TypeScript）
- **React**（UI 框架）+ **TypeScript**（型別安全）
- **Next.js**（React 框架，App Router、SSR/SSG/Server Components）
- **Zustand**（輕量狀態管理）
- **React Hook Form + Zod**（表單處理與驗證）
- **React Query / TanStack Query**（資料獲取與快取）

### 後端（預設：Next.js 全端）
- **Next.js Route Handlers**（API 端點，App Router `app/api/`）
- **Next.js Server Actions**（表單 Mutation，無需額外 API）
- **Prisma**（ORM，與 Next.js 整合最佳）
- **NextAuth.js + JWT**（認證授權）

> **外部後端協作原則**：若需要 .NET、Go、Python 等後端技術棧，
> 優先協作對應外部 team 或 skill（如 `dotnet-expert`），
> 本團隊 Backend Developer 負責 BFF 層整合，**不引入外部技術棧**。
> 詳見 `.claude/rules/backend-extensibility.md`。

### 資料庫與快取
- **PostgreSQL**（主資料庫）
- **Redis**（快取層）

### 測試
- **Jest**（Unit Tests）
- **Playwright**（E2E Tests）

### 監控與觀測性
- **OpenTelemetry**（Trace/Metric/Log）
- **Prometheus + Grafana**（監控儀表板）
- **Sentry**（錯誤追蹤）

### DevOps
- **GitHub Actions / GitLab CI**（CI/CD）
- **Docker + Kubernetes**（容器化與編排）
- **Terraform**（基礎設施即代碼）

---

## 開發方法論

### HTDD（Hypothesis-Driven TDD）
1. **Hypothesis**（假設）：定義預期行為
2. **Test**（測試）：寫失敗的測試
3. **Development**（開發）：實作功能讓測試通過
4. **Refactor**（重構）：優化程式碼

### DDD（Domain-Driven Design）
- **Ubiquitous Language**（統一語言）
- **Bounded Context**（限界上下文）
- **Entity / Value Object / Aggregate**（領域模型）
- **Event Storming**（事件風暴工作坊）

### BDD（Behavior-Driven Development）
- 使用 Given-When-Then 格式描述測試情境
- 從使用者行為出發設計測試

### Toggle Branch Development
- **Feature Toggle**（功能開關）控制功能發布
- **Trunk-Based Development**（主幹開發）+ 短期分支
- 分支命名：`feature/工單號-描述`、`bugfix/工單號-描述`

---

## 與 Web-Design-Team 的協作界面

### 輸入（Web-Design-Team 交付）
- **UI 程式碼**：React/Next.js 元件（含 RWD、MAYO UI System）
- **設計稿**：Figma 檔案（參考用）
- **風格指南**：CSS/Tailwind 設定、品牌色彩

### 處理流程
1. **接收 UI 程式碼**（放入 `src/components/`）
2. **整合狀態管理**（加入 Zustand stores）
3. **API 串接**（實作 data fetching）
4. **表單驗證與錯誤處理**（React Hook Form + Zod）
5. **建立後端 API**（NestJS）
6. **資料庫設計**（PostgreSQL Schema）
7. **測試**（Unit + E2E）
8. **部署**（CI/CD Pipeline）

### 輸出（交付物）
- **生產級應用系統**（前端 + 後端）
- **API 文件**（OpenAPI/Swagger）
- **部署指南**（README、環境設定）
- **監控儀表板**（Grafana Dashboard）
- **測試報告**（覆蓋率、E2E 結果）

---

## 部署模式

**使用 Agent Teams Mode（實驗性功能）**

### 啟用方式
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### 運作模式
- **各角色獨立運作**：每個 Agent 是獨立的 Claude Code 實例
- **共享任務清單**：所有 Agent 共享 `~/.claude/tasks/web-dev-team/`
- **Peer-to-Peer 訊息**：Agent 之間可直接傳訊協作
- **並行開發**：Frontend 和 Backend Developer 可同時工作

### 適用場景
- Frontend 和 Backend 需要並行開發
- 多人協作、高度溝通需求
- 需要快速迭代、彈性調整

---

## 通用行為規範

### 溝通語言
- **繁體中文**：與使用者溝通
- **英文**：程式碼、變數、commit message、文件

### 程式碼品質
- **零 `any` 政策**：TypeScript 嚴格型別
- **TDD 強制執行**：先寫測試，後寫實作
- **程式碼審查**：所有 PR 必須經過審查
- **測試覆蓋率**：≥ 80%（核心業務邏輯 100%）

### 版控規範
- **分支命名**：`feature/工單號-描述`、`bugfix/工單號-描述`
- **Commit Message**：`type(scope): description`
- **PR 必須包含**：測試、文件更新、Changelog

### 進度管理
- **每日進度更新**：更新任務狀態
- **Retro 機制**：每輪交付後進行回顧
- **知識傳承**：將成果、人類回饋、觀點同步給下一輪團隊

---

## 品質門檻

### Code Quality
- ✅ 通過 ESLint/Prettier 檢查
- ✅ 零 TypeScript `any`
- ✅ 零安全漏洞（npm audit）
- ✅ 測試覆蓋率 ≥ 80%

### Performance
- ✅ Lighthouse Score ≥ 90（Performance/Accessibility/Best Practices/SEO）
- ✅ First Contentful Paint < 1.5s
- ✅ Time to Interactive < 3.5s

### Security
- ✅ OWASP Top 10 檢查通過
- ✅ 無 SQL Injection、XSS 風險
- ✅ 認證與授權機制完整

### Documentation
- ✅ API 文件完整（Swagger/OpenAPI）
- ✅ README 包含部署指南
- ✅ ADR（Architecture Decision Records）記錄重要決策

---

## 團隊成員

### Coordinator
- **Team Lead**（TPM）：協調團隊、決策、派工、進度控管、架構設計

### Execution Team
- **Frontend Developer**：React + TypeScript + Next.js 開發、主動建議前端技術棧
- **Backend Developer**：Next.js BFF + Prisma + PostgreSQL、外部後端協作介面
- **DDD 專家**：領域建模、Event Storming、架構支援
- **SRE 工程師**：資料庫優化、CI/CD、OpenTelemetry 監控、效能調校
- **總 QA**：測試策略、E2E 測試、品質把關

---

## Retro 與知識傳承

### Retro 時機
- 每輪交付完成後
- 遇到重大技術挑戰後
- 團隊成員變動前

### Retro 產出
- **做得好的事**（Keep）
- **需要改進的事**（Improve）
- **學到的教訓**（Lessons Learned）
- **下一輪行動計畫**（Action Items）

### 知識傳承機制
- 將 Retro 產出記錄於 `.retro/` 目錄
- 下一輪團隊在開工前閱讀上一輪的 Retro 文件
- 持續優化工作流程與技術決策

---

## 通用規範（Universal Rules）

所有 agents 必須遵守 `.claude/rules/` 下的以下規則：

- `anti-hallucination.md` - 僅分析已讀取的內容；所有陳述需附來源標籤；禁止捏造任何資訊
- `developer-memory.md` - Always-On 記憶協議：主動捕捉與浮現開發洞見
- `checkin-standards.md` - 四道品質門檻（Build/Test/Code Quality/Documentation）；AI 不得自動執行 git 操作

---

**版本**：1.0
**建立日期**：2026-02-13
**維護者**：Team Lead
