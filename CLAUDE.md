# Web Design Team - 團隊契約

## 團隊目標

設計並交付高品質的企業官網與 Landing Page，具備專業的 RWD 響應式設計與 SEO 優化能力，將設計轉換為可執行的程式碼，交付給 Web-Dev-Team 進行後續開發與部署。

---

## 專案範疇

### 專案類型
- 企業官網（Corporate Websites）
- Landing Page（著陸頁）

### 設計範疇
- UI 設計（70%）：視覺設計、品牌一致性、介面美學
- UX 設計（30%）：使用者體驗、資訊架構、互動流程

### 核心專長
- **RWD 響應式設計**：桌面版、平板版、行動版的完整適配
- **SEO 優化**：符合搜尋引擎最佳實踐的設計與技術實作

### 交付模式
- 按專案接案（Project-based）
- 持續維護多個網站（Ongoing Maintenance）

### 交付對象
- **Web-Dev-Team**：開發團隊負責後續整合、部署與維運

---

## 工作流程

### 階段 1：接案與需求收集
**負責角色**：專案協調者、UX 設計師、SEO 專家

1. 專案協調者建立專案、設定排程與里程碑
2. UX 設計師進行資訊架構規劃、定義使用者旅程
3. SEO 專家提供初期 SEO 策略建議（關鍵字、目標受眾）

**交付物**：
- 專案計劃文件
- 資訊架構圖
- SEO 策略建議

---

### 階段 2：UI 畫面設計
**負責角色**：UI 設計師、SEO 專家、設計總監

1. UI 設計師將 User Story 轉化為 UI 畫面結構
2. UI 設計師製作高保真 Mockup（直接從 Mockup 開始，不做 Wireframe）
3. SEO 專家審核 Mockup 是否符合 SEO 最佳實踐
4. 設計總監審核設計品質（美學、品牌一致性、視覺風格）

**交付物**：
- UI 畫面結構文件
- 高保真 Mockup（桌面版 + 行動版）
- SEO 審核報告
- 設計總監審核意見

**設計原則（必須遵守）**：
- Layout & Spacing：一致的間距比例、最大內容寬度 1200px、垂直節奏
- Typography：清晰層次、行長限制 60-80 字元、字重對比
- Color & Contrast：WCAG AA 最低標準（4.5:1 文字對比、3:1 UI 元件對比）
- Responsive Design：Mobile-first、觸控目標最小 44x44px、堆疊佈局
- Components：使用 SVG 圖標（禁止 emoji）、明確 hover 狀態、focus rings

**常見錯誤（必須避免）**：
- ❌ 文字觸碰螢幕邊緣（必須保留 padding）
- ❌ 用 emoji 當圖標（使用 SVG）
- ❌ 扁平黑色背景（增加層次與細節）
- ❌ 缺少 hover 狀態（所有可互動元素必須有 hover）
- ❌ 忘記行動版漢堡選單（導航必須適配行動裝置）

---

### 階段 3：客戶確認（2 輪）
**負責角色**：專案協調者

1. 第 1 輪：展示 Mockup，收集客戶 feedback
2. 根據 feedback 調整設計
3. 第 2 輪：確認最終設計版本，取得客戶簽核

**交付物**：
- 客戶 feedback 紀錄
- 最終簽核的 Mockup

---

### 階段 4：程式碼實作
**負責角色**：UI 設計師、SEO 專家、Web UI 品管經理、QA

1. UI 設計師將 Mockup 轉換為可執行的 HTML/React 程式碼（CDN 模式，無 build）
2. SEO 專家審核程式碼的 SEO 技術實作（meta tags、結構化資料、語意化 HTML）
3. Web UI 品管經理審核技術品質（Web Design Guidelines、可訪問性、Core Web Vitals）
4. QA 驗收 RWD 響應式設計（桌面版、平板版、行動版）

**交付物**：
- 可執行的 HTML/React 程式碼
- SEO 技術審核報告
- 技術品質審核報告
- RWD 驗收報告

**技術要求**：
- 全部圖片使用 .webp 格式
- 實作 lazy loading
- 維持正確的 aspect ratios
- Core Web Vitals：LCP < 2.5s、FID < 100ms、CLS < 0.1

**SEO 技術檢查清單**：
- Primary keyword in title tag (< 60 chars)
- Meta description (150-160 chars)
- H1 with primary keyword
- Images compressed with alt text
- 3-5 internal links
- Schema markup（JSON-LD 格式）
- Mobile-friendly（通過 Google Mobile-Friendly Test）
- Page speed < 3s
- No broken links

---

### 階段 5：交付給 Web-Dev-Team
**負責角色**：專案協調者

**遵循規範**：`handoff-protocol.md`

1. 確認交接檢查清單完整（程式碼、設計文件、審核報告、客戶資料）
2. 舉辦交接會議（30-45 分鐘）
3. 產生交接文件與會議紀錄
4. 提供後續支援窗口

**交付物**：
- 完整的程式碼套件
- 設計規範文件
- 所有審核報告
- 交接會議紀錄
- 交接文件（使用 `/design-handoff` skill）

---

## 通用行為規範

### 溝通語言
- **對內溝通**：繁體中文
- **技術術語**：保持英文（例如：RWD、SEO、Mockup、Core Web Vitals）
- **文件撰寫**：繁體中文為主，技術名詞使用英文

### 溝通規範
**遵循規範**：`communication-protocol.md`

**與 Web-Dev-Team 溝通時機**：
- 里程碑完成時（客戶確認、QA 驗收）
- 發現問題時（即時通知）
- 每週五進度更新

**溝通管道**：
- 非緊急：Email、Slack #web-design-handoff
- 緊急：Slack DM、電話/會議

**必須使用標準格式**：進度更新、問題通報、交接通知

### 輸出格式
- **設計稿**：Figma 連結或 PNG/WebP（桌面版 + 行動版）
- **程式碼**：HTML/React（CDN 模式，單一檔案或模組化結構）
- **文件**：Markdown 格式，遵循 DopeDocSkill 雙格式系統

### 確認機制
**每個交付物都必須經過上下手確認**：
- UI 設計師 → 設計總監 → 客戶
- UI 設計師（程式碼）→ Web UI 品管經理 → QA
- SEO 專家的審核必須在每個階段完成後記錄

### 品質標準
- 所有設計必須符合 **Web Design Guidelines**（Vercel Interface Guidelines）
- 所有程式碼必須通過 **可訪問性檢查**（WCAG AA）
- 所有頁面必須通過 **RWD 驗收**（三種裝置）
- 所有內容必須符合 **SEO 最佳實踐**

---

## 技術約束

### 前端技術棧
- **HTML5**：語意化標籤
- **CSS3**：Flexbox、Grid、Media Queries
- **React**（可選）：CDN 模式，無 build process
- **圖片格式**：WebP 為主，fallback 至 PNG/JPG

### 響應式斷點（RWD Breakpoints）
```css
/* Mobile (預設) */
@media (min-width: 768px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
```

### 可訪問性要求
- 顏色對比：WCAG AA（4.5:1 文字、3:1 UI 元件）
- 鍵盤導航：所有互動元素可用 Tab 鍵操作
- Screen Reader：正確的 ARIA labels
- Focus 狀態：明確的 focus rings

### 效能要求
- **LCP**（Largest Contentful Paint）< 2.5s
- **FID**（First Input Delay）< 100ms
- **CLS**（Cumulative Layout Shift）< 0.1
- Page Speed < 3s

---

## 部署模式

**本團隊使用 Subagent 模式**：

- **專案協調者**（Coordinator）透過 Task tool 依序呼叫其他 agents
- 工作流程為**順序式交付**（Sequential Handoff）
- 每個階段完成後，下一階段才開始
- 適合有明確設計流程與審核節點的專案

---

## 角色總覽

| 角色 | 職責 | 審核時機 |
|------|------|----------|
| **專案協調者** | 排程、追蹤進度、協調交接 | - |
| **設計總監** | 審核設計品質（美學、品牌） | Mockup 完成後 |
| **UX 設計師** | 資訊架構、使用者體驗規劃 | 需求階段 |
| **UI 設計師** | Story → UI 結構 → Mockup → 程式碼 | 所有設計階段 |
| **SEO 專家** | SEO 建議與審核 | 需求、Mockup、程式碼三階段 |
| **Web UI 品管經理** | 技術品質把關 | 程式碼完成後 |
| **QA** | RWD 驗收 | 程式碼完成後 |

---

## 遵循的規範（Rules）

### 設計交付物標準
- **`design-deliverables-sop.md`**：設計展示必要要件（Sitemap、頁碼系統、Wireframes、四種交付格式、固定A4尺寸原則）

### 設計與品質標準
- **`design-standards.md`**：Layout、Typography、Color、RWD、Components
- **`approval-workflow.md`**：上下手確認機制、審核流程

### 協作與溝通
- **`handoff-protocol.md`**：交付給 Web-Dev-Team 的完整流程
- **`communication-protocol.md`**：內部與跨團隊溝通規範

---

## 參考資源

- **DopeDocSkill**：雙格式文件系統（Markdown + HTML）
- **Vercel Web Interface Guidelines**：UI 設計與實作規範
- **WCAG 2.1**：可訪問性標準
- **Google Core Web Vitals**：效能指標
- **Schema.org**：結構化資料標準

---

**版本**：1.3
**建立日期**：2026-02-13
**更新日期**：2026-02-21
**維護者**：Web Design Team

---

## 上版規範（Deploy Gate）

### 上版前必跑 E2E 測試

**任何 push 到 main 分支之前，必須通過 Playwright E2E 測試**：

```bash
cd frontend && npx playwright test e2e/family-scoreboard.spec.ts --reporter=list
```

**要求**：
- 所有 56 個測試必須全部通過（0 failed）
- 測試覆蓋：STEP 1–14（初始化 → 積分 → 任務 → 零用金 → 商城 → 封印處罰 → 事件 → 道具 → 摘要 → 清理）
- 每次測試建立獨立的 `family_test{datetime}` 家庭，不污染真實帳號

**E2E 測試失敗時**：
1. 不得上版
2. 找出失敗的 STEP，修正對應的 Backend / Frontend 程式碼
3. 重跑測試直到全部通過

---

## Family Scoreboard 開發備忘

> 本專案除企業官網外，同時維護一個**家庭計分板 App**（`/family-scoreboard`），以下記錄核心架構與近期重要設計決策。

### 核心頁面
- **路徑**：`frontend/app/(scoreboard)/family-scoreboard/page.tsx`（單一大型頁面組件）
- **Tabs**：首頁（home）/ 記錄（history）/ 任務（quest）/ 報表（report）/ 商城（shop）

### 資料模型重點
- `scores`：各玩家積分快照（achievementPoints、redeemablePoints、totalRedeemed 等）
- `transactions`：所有加扣分紀錄，含 `categoryId`（對應 `CATEGORIES` 常數）
- `CATEGORIES`：頂部常數，含 emoji、amount、type（earn / deduct）

### UI 設計決策記錄

| 日期 | 區塊 | 決策 |
|------|------|------|
| 2026-02-21 | 報表 Tab - 比較卡片 | 移除本週/本月 XP 長條圖，改為「本週貼紙牆」：每筆加分用 categoryId 對應 emoji 呈現，空格顯示 ○，目標 10 張，童趣風格優先於數字密度 |
| 2026-02-21 | 報表 Tab - 個別玩家 | 從 8 格大數字縮減為「貼紙牆 + 5 格小數字」（今日/本週/本月 + 成就點/可兌換），移除「已兌換/累計獲得/累計扣除」以降低資訊過載 |

### E2E 覆蓋範圍
E2E 測試覆蓋 API 層與核心業務流程（56 個測試），**不覆蓋報表 Tab 視覺呈現**。報表 UI 異動後需人工在瀏覽器驗證貼紙牆顯示是否正確。

---

## 已安裝的 Team 合約

| Team | 角色 | 文件 |
|------|------|------|
| **Web Design Team** | 設計 UI、RWD、SEO、交付程式碼 | 本文件（CLAUDE.md） |
| **Web Dev Team** | 接收 UI 程式碼、全端開發、部署 | [docs/teams/WEB-DEV-TEAM.md](docs/teams/WEB-DEV-TEAM.md) |

---

## mido CLI — 教材上傳工具

腳本位置：`scripts/mido` | symlink: `~/bin/mido`

### 架構

透過 mido-learning REST API 上傳教材（非靜態檔案部署）：
- `POST /api/components/{componentId}/materials` — 上傳 ZIP
- API 自動解壓到 GCS、建立 Firestore 文件 + manifest、版本遞增
- 前端透過 `/api/materials/{materialId}/content/` proxy 存取
- 需要 Firebase Auth（TeacherOrAdmin 角色）

### 指令

```bash
mido publish <path> [title]        # 智慧上傳（推薦）：自動搜尋匹配 → 詢問更新或建新
mido login                         # 登入（貼 Firebase ID Token）
mido upload <componentId> <path>   # 直接上傳到指定 component
mido list <componentId>            # 列出教材
mido delete <materialId>           # 刪除教材
mido open <materialId>             # 瀏覽器開啟
mido components                    # 列出 components
mido status                        # 查看登入狀態
```

### publish 智慧上傳流程（推薦）

`mido publish` 會自動：
1. 從目錄名推斷關鍵字搜尋現有 components
2. 找到匹配 → 詢問是否上傳新版本（v2, v3...）
3. 沒找到 → 詢問是否建立新 component 再上傳
4. 全程互動確認，不會靜默操作

```bash
# 1. 登入
mido login

# 2. 智慧上傳（自動搜尋「claude code」相關教材）
mido publish ~/slides/claude-code-deep-dive/output/
# → Found: "Claude Code 深度解析"
# → [1] Upload as v5  [N] Create new  [Q] Cancel

# 3. 帶標題提示（搜尋更精確）
mido publish ~/slides/my-talk/output/ "投資入門"

# 4. 完全新教材
mido publish ~/slides/new-course/output/ "全新課程名稱"
# → No match found → Create new component? → Title/Theme/Category → Upload v1
```

### 直接上傳（已知 componentId）

```bash
mido upload GUhEP9CnMcdfc7NTgVHw ~/slides/claude-code-deep-dive/output/
mido upload GUhEP9CnMcdfc7NTgVHw ~/slides/my-talk.zip
```

### 瀏覽教材

```bash
mido open <materialId>                                     # API content proxy
open https://learn.paulfun.net/components/<componentId>    # 前台頁面
```

### 自動登入（Claude Code 用）

Claude Code 可透過 service account 自動取得 token，不需手動貼：

```python
import firebase_admin
from firebase_admin import credentials, auth
import requests, json

SA_FILE = "credentials/firebase-admin-key.json"
API_KEY = "<from frontend/.env.local NEXT_PUBLIC_FIREBASE_API_KEY>"

# 1. Mint custom token
cred = credentials.Certificate(SA_FILE)
firebase_admin.initialize_app(cred)
custom_token = auth.create_custom_token("admin-cli", {"admin": True, "role": "admin"})

# 2. Exchange for ID token
resp = requests.post(
    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={API_KEY}",
    json={"token": custom_token, "returnSecureToken": True}
)
id_token = resp.json()["idToken"]

# 3. Save to mido CLI config
import time
config = {"token": id_token, "expires": int(time.time()) + 3600}
with open(os.path.expanduser("~/.mido-cli.json"), "w") as f:
    json.dump(config, f)
```

### 已知 Components

| Component ID | 名稱 | 用途 |
|-------------|------|------|
| `GUhEP9CnMcdfc7NTgVHw` | Claude Code 深度解析 | Claude Code Skills/Rules/Agents/Teams 投影片 |
| `MjGTL1xj9uHENqB3V5Q0` | AI PM與RD的協作指引 | AI 協作指引教材 |
| `AjNK66cm7Chxk5NevFyt` | 股市投資101 | 投資教材 |

### 環境變數

| 變數 | 說明 | 預設 |
|------|------|------|
| `MIDO_API_URL` | API base URL | `https://mido-learning-api-24mwb46hra-de.a.run.app` |

### Token 儲存

登入 token 存於 `~/.mido-cli.json`（1 小時過期，自動檢查）。

### API 端點參考

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/components/{id}/materials` | 上傳 ZIP 教材 | TeacherOrAdmin |
| GET | `/api/components/{id}/materials` | 列出教材 | Anonymous (published) |
| DELETE | `/api/materials/{id}` | 刪除教材 | TeacherOrAdmin |
| GET | `/api/materials/{id}/manifest` | 取得 manifest + access token | Anonymous (published) |
| GET | `/api/materials/{id}/content/{path}` | 取得教材檔案內容 | Token/Referer |
| GET | `/api/materials/{id}/download` | 下載（redirect to signed URL） | Auth |
| POST | `/api/materials/batch` | 批次查詢（最多 20 筆） | Anonymous (published) |
