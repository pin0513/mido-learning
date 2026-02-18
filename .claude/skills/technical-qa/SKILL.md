---
name: Technical QA
description: Technical quality audit checklist for web UI code compliance
---

# Technical QA Skill

## Web Design Guidelines 檢查

### Layout & Spacing
- [ ] 最大內容寬度 ≤ 1200px
- [ ] 容器有適當 padding（≥ 20px）
- [ ] 使用一致的間距系統（8px 基準）
- [ ] 區塊之間間距 ≥ 48px

### Typography
- [ ] 字級大小合理（內文 16-18px）
- [ ] 行距適當（1.5-1.8）
- [ ] 行長控制在 60-80 字元
- [ ] 標題層級正確（H1 > H2 > H3）

### Color & Contrast
- [ ] 文字對比度 ≥ 4.5:1
- [ ] UI 元件對比度 ≥ 3:1
- [ ] 使用 CSS 變數（色彩一致）

### Responsive Design
- [ ] Mobile-first 思維
- [ ] Media Queries 正確（768px, 1024px）
- [ ] 觸控目標 ≥ 44x44px
- [ ] 行動版重新佈局（不只縮小）

### Components
- [ ] 使用 SVG 圖標（不使用 emoji）
- [ ] 所有按鈕有 hover 狀態
- [ ] 所有可互動元素有 focus rings
- [ ] 圖片使用 WebP 格式

---

## 可訪問性檢查（WCAG AA）

### 鍵盤導航
- [ ] 所有互動元素可用 Tab 鍵操作
- [ ] Tab 順序合理
- [ ] 可用 Enter/Space 觸發按鈕
- [ ] 可用 Esc 關閉 Modal

### Screen Reader 支援
- [ ] 所有圖片有 alt text
- [ ] 表單有 label 或 aria-label
- [ ] 按鈕有清楚的文字或 aria-label
- [ ] Landmark 元素正確（header, nav, main, footer）

### Focus 狀態
- [ ] 所有可互動元素有明顯 focus outline
- [ ] Focus outline 不被移除（outline: none 是錯誤的）
- [ ] Focus outline 顏色對比足夠

### ARIA 屬性
- [ ] 使用正確的 ARIA roles
- [ ] aria-label 清楚描述元素功能
- [ ] aria-hidden 用於裝飾性元素

---

## Core Web Vitals 檢查

- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1

### LCP 優化
- [ ] 主要圖片已壓縮
- [ ] 使用 WebP 格式
- [ ] 實作 lazy loading（非首屏圖片）
- [ ] Critical CSS 內嵌在 head

### CLS 優化
- [ ] 圖片有 width 和 height 屬性
- [ ] 字體使用 font-display: swap
- [ ] 避免動態插入內容到頂部

---

## 程式碼品質檢查

### HTML
- [ ] 語意化標籤（不濫用 div）
- [ ] 標題層級正確（不跳級）
- [ ] 表單有正確的 label
- [ ] 通過 W3C Validator

### CSS
- [ ] 使用 CSS 變數（顏色、字體、間距）
- [ ] 避免 !important
- [ ] 使用 Flexbox 或 Grid 佈局
- [ ] Media Queries 正確

### JavaScript（若有）
- [ ] 無 console.log
- [ ] 錯誤處理正確
- [ ] 無全域變數污染
- [ ] 使用 defer 或 async 載入

### 圖片
- [ ] 使用 WebP 格式
- [ ] 檔案大小 < 200KB
- [ ] 有 width 和 height 屬性
- [ ] 實作 lazy loading

---

## 檢查工具

- Lighthouse（Chrome DevTools）
- axe DevTools
- W3C HTML Validator
- WebAIM Contrast Checker
- Google PageSpeed Insights

---

## 審核結果

- [ ] ✅ 通過（可進入 QA 驗收）
- [ ] 🔄 需修正（1-5 個問題）
- [ ] ❌ 重大問題（建議重新實作）

---

**使用此 skill 可確保技術品質審核的完整性。**
