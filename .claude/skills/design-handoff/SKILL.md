---
name: Design Handoff
description: Standard process for handing off design deliverables to Web-Dev-Team
---

# Design Handoff Skill

## 目的

提供一個標準化的設計交接流程，確保 Web-Dev-Team 收到完整、清楚的設計交付物，並理解設計意圖與技術細節。

---

## 適用時機

- 專案完成所有品質驗收（設計審核、SEO 審核、技術審核、RWD 驗收）
- 準備將設計與程式碼交付給開發團隊

---

## 交接清單

### 1. 設計檔案

**必須提供**：
- [ ] 高保真 Mockup（桌面版 + 行動版）
  - 格式：PNG 或 WebP
  - 解析度：桌面版 1920px 寬、行動版 375px 寬
- [ ] 設計規範文件（Design Spec）
  - 色彩（色碼）
  - 字體（字型、字級、行距）
  - 間距系統（8px 基準）
  - 圓角、陰影、邊框規範
- [ ] 圖標與圖片素材
  - SVG 圖標
  - WebP 格式圖片
  - 原始檔案（若需要）

---

### 2. 程式碼

**必須提供**：
- [ ] 可執行的 HTML/CSS/JavaScript 檔案
- [ ] 程式碼註解（複雜邏輯需說明）
- [ ] 相依套件清單（若使用外部函式庫）
- [ ] README.md（如何執行、檔案結構說明）

**程式碼結構範例**：
```
deliverables/
├── index.html
├── about.html
├── services.html
├── contact.html
├── css/
│   ├── main.css
│   └── responsive.css
├── js/
│   └── main.js
├── images/
│   ├── hero.webp
│   ├── logo.svg
│   └── icons/
├── fonts/
│   └── NotoSansTC/
└── README.md
```

---

### 3. 文件

**必須提供**：
- [ ] SEO 審核報告
- [ ] 技術品質審核報告
- [ ] RWD 驗收報告
- [ ] 設計決策紀錄（重要設計選擇的原因）

---

### 4. 測試資料

**建議提供**：
- [ ] 測試用文字內容
- [ ] 測試用圖片（各種尺寸）
- [ ] 表單測試案例

---

## 交接文件範本

### Design Handoff Document

```markdown
# {專案名稱} 設計交接文件

**專案代號**：{project-code}
**交接日期**：2026-03-03
**負責人**：Project Coordinator
**交接給**：Web-Dev-Team

---

## 專案概述

**專案類型**：企業官網
**設計範疇**：首頁、關於我們、服務頁面、案例頁面、聯絡頁面
**核心需求**：RWD 響應式設計、SEO 優化

---

## 設計說明

### 品牌色彩

| 用途 | 色碼 | 使用場景 |
|------|------|----------|
| 主色（Primary） | #667eea | CTA 按鈕、重點文字 |
| 次要色（Secondary） | #764ba2 | 背景漸層、裝飾元素 |
| 文字色（Text） | #333333 | 主要內文 |
| 輔助文字（Muted） | #666666 | 次要資訊 |
| 背景色（Background） | #f8f9fa | 區塊背景 |

### 字體

| 用途 | 字型 | 字級 | 字重 | 行距 |
|------|------|------|------|------|
| H1 | Noto Sans TC | 48px（桌面）/ 32px（行動） | 700 | 1.2 |
| H2 | Noto Sans TC | 36px（桌面）/ 28px（行動） | 700 | 1.3 |
| H3 | Noto Sans TC | 24px | 600 | 1.4 |
| Body | Noto Sans TC | 16px | 400 | 1.6 |
| Small | Noto Sans TC | 14px | 400 | 1.5 |

**字體載入**：
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;600;700&display=swap" rel="stylesheet">
```

### 間距系統

基於 **8px 基準**：
- 元素內間距：8px, 16px
- 元素間間距：24px, 32px
- 區塊間間距：48px, 64px, 80px

### 響應式斷點

```css
/* Mobile: < 768px (預設) */

@media (min-width: 768px) {
    /* Tablet */
}

@media (min-width: 1024px) {
    /* Desktop */
}
```

### 圓角與陰影

- **按鈕圓角**：8px
- **卡片圓角**：12px
- **卡片陰影**：`box-shadow: 0 2px 8px rgba(0,0,0,0.1);`

---

## 設計決策紀錄

### 為什麼選擇漸層背景？
- 目的：增加視覺層次，避免扁平單調
- 漸層色：#667eea → #764ba2（135deg）
- 使用位置：Hero Section、CTA Section

### 為什麼 Hero Section 使用大標題？
- 目的：在 3 秒內抓住使用者注意力
- 字級：48px（桌面）、32px（行動）
- 對比：白色文字 + 深色漸層背景

### 為什麼使用圖標？
- 目的：增強視覺吸引力、快速傳達資訊
- 格式：SVG（可縮放、檔案小）
- 風格：Outline（統一風格）

---

## 技術說明

### SEO 實作

**Meta Tags**：
- Title Tag 長度：< 60 字元
- Meta Description 長度：150-160 字元
- Open Graph Tags：完整

**結構化資料**：
- Organization Schema：已實作（`<script type="application/ld+json">`）

**語意化 HTML**：
- 使用 `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- H1-H3 標題層級正確

### 可訪問性

**WCAG AA 標準**：
- 文字對比度 ≥ 4.5:1
- 觸控目標 ≥ 44x44px
- 所有圖片有 alt text
- 鍵盤導航可用

### 效能優化

**圖片**：
- 格式：WebP
- 載入：lazy loading（非首屏圖片）
- 尺寸：width 和 height 屬性已設定

**Core Web Vitals**：
- LCP：2.1s ✅
- FID：85ms ✅
- CLS：0.08 ✅

---

## 已驗收項目

- [x] 設計總監審核通過
- [x] 客戶確認通過（2 輪）
- [x] SEO 技術審核通過
- [x] Web UI 技術品質審核通過
- [x] RWD 驗收通過（桌面、平板、行動）

---

## 檔案清單

### 設計稿
- `/design/mockup-desktop.png`（桌面版）
- `/design/mockup-mobile.png`（行動版）
- `/design/design-spec.md`（設計規範）

### 程式碼
- `/code/index.html`（首頁）
- `/code/about.html`（關於我們）
- `/code/services.html`（服務頁面）
- `/code/contact.html`（聯絡頁面）
- `/code/css/main.css`（主要樣式）
- `/code/js/main.js`（互動腳本）

### 素材
- `/assets/images/`（圖片素材）
- `/assets/icons/`（SVG 圖標）
- `/assets/fonts/`（字體檔案）

### 文件
- `/docs/seo-audit-report.md`（SEO 審核報告）
- `/docs/technical-qa-report.md`（技術品質審核報告）
- `/docs/rwd-validation-report.md`（RWD 驗收報告）

---

## 後續支援

**設計相關問題**：
- 聯絡人：Design Director
- Email：design@webdesignteam.com

**技術相關問題**：
- 聯絡人：Web UI Quality Manager
- Email：tech@webdesignteam.com

**SEO 相關問題**：
- 聯絡人：SEO Specialist
- Email：seo@webdesignteam.com

**回應時間**：工作日 24 小時內

---

## 交接會議紀錄

**會議日期**：2026-03-03
**參與者**：
- Web Design Team：Project Coordinator, UI Designer, SEO Specialist
- Web-Dev-Team：Tech Lead, Frontend Developer, Backend Developer

**討論重點**：
1. 設計意圖說明（為什麼這樣設計）
2. 技術實作細節（RWD 邏輯、SEO 結構）
3. 注意事項（效能優化、可訪問性）
4. Q&A

**Q&A 紀錄**：
- Q：為什麼使用 WebP 而非 PNG？
  A：WebP 檔案大小小 25-35%，載入更快，且支援度已足夠（> 95%）
- Q：如何處理不支援 WebP 的瀏覽器？
  A：可使用 `<picture>` 元素提供 PNG fallback

---

**確認簽收**：
- Web-Dev-Team Tech Lead：[簽名]
- 日期：2026-03-03

---

## 附錄

### 常見問題

**Q：如果需要修改設計，該找誰？**
A：先聯絡 Project Coordinator，評估修改範圍與影響。

**Q：如果發現 Bug，該怎麼辦？**
A：回報給 Web UI Quality Manager，會協助診斷與修正。

**Q：如果需要新增頁面，設計規範還適用嗎？**
A：是的，請遵循本文件的設計規範（色彩、字體、間距）。

---

**版本**：1.0
**建立日期**：2026-03-03
**維護者**：Web Design Team
```

---

## 交接會議議程

### 會議目標
- 說明設計意圖
- 解釋技術細節
- 回答開發團隊問題
- 確認後續支援方式

### 會議流程（40 分鐘）

**1. 專案背景與目標（5 分鐘）**
- 客戶背景
- 設計目標
- 核心需求（RWD、SEO）

**2. 設計說明（10 分鐘）**
- 視覺風格（品牌色、字體、間距）
- 設計決策（為什麼這樣設計）
- 使用者體驗（互動流程）

**3. 技術說明（10 分鐘）**
- 程式碼結構
- SEO 實作（Meta Tags、結構化資料）
- 可訪問性（WCAG AA）
- 效能優化（Core Web Vitals）

**4. RWD 說明（5 分鐘）**
- 響應式斷點（768px, 1024px）
- 行動版佈局邏輯
- 觸控目標大小

**5. Q&A（10 分鐘）**
- 回答開發團隊問題

---

## 交接後追蹤

### 第 1 週
- 確認開發團隊已收到所有檔案
- 回答初期問題

### 第 2 週
- 詢問整合進度
- 協助排除技術問題

### 第 4 週
- 確認上線準備
- 最後檢查（若需要）

---

## 使用範例

### 範例 1：交接給內部開發團隊

```bash
# 1. 整理交付物
mkdir -p handoff/{design,code,docs,assets}
cp design/*.png handoff/design/
cp -r code/* handoff/code/
cp docs/*.md handoff/docs/
cp -r assets/* handoff/assets/

# 2. 生成交接文件
# 使用本 skill 的範本填寫資訊

# 3. 壓縮打包
zip -r project-handoff.zip handoff/

# 4. 發送給開發團隊
# Email + 會議邀請
```

---

### 範例 2：交接給外部開發團隊

**需額外提供**：
- 更詳細的 README（如何執行、環境需求）
- 程式碼註解更完整
- 影片教學（若專案複雜）

---

## 檢查清單

使用此清單確保交接完整：

### 交付物
- [ ] 設計稿（桌面版 + 行動版）
- [ ] 程式碼（HTML/CSS/JS）
- [ ] 素材（圖片、圖標、字體）
- [ ] 文件（審核報告、設計規範）
- [ ] README.md

### 文件內容
- [ ] 專案概述
- [ ] 設計說明（色彩、字體、間距）
- [ ] 設計決策紀錄
- [ ] 技術說明（SEO、可訪問性、效能）
- [ ] 已驗收項目清單
- [ ] 檔案清單
- [ ] 後續支援聯絡方式

### 會議
- [ ] 已安排交接會議
- [ ] 已準備會議簡報
- [ ] 已邀請相關人員

### 後續
- [ ] 已建立追蹤機制（第 1 週、第 2 週、第 4 週）
- [ ] 已確認支援窗口

---

**記住**：完整且清楚的交接文件，能大幅減少開發團隊的疑惑與來回溝通，加速專案進度。
