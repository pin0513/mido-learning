---
name: Approval Workflow
description: Mandatory approval workflow for all design deliverables
---

# Approval Workflow

## 適用範圍

所有設計交付物都必須經過上下手確認機制。

---

## 階段 2：UI 設計審核

### 流程
```
UI Designer 完成 Mockup
  ↓
SEO Specialist 審核（SEO 合規性）
  ↓
Design Director 審核（設計品質）
  ↓
Project Coordinator 協調客戶確認（2 輪）
```

### 審核標準

**SEO Specialist 審核**：
- H1 包含主要關鍵字
- 標題層級正確
- 內部連結結構合理

**Design Director 審核**：
- 視覺層次清晰
- 品牌一致性無誤
- 基本 UX 無明顯問題

**客戶確認**：
- 第 1 輪：收集 feedback
- 第 2 輪：最終簽核

---

## 階段 4：程式碼實作審核

### 流程
```
UI Designer 完成程式碼
  ↓
SEO Specialist 審核（SEO 技術實作）
  ↓
Web UI Quality Manager 審核（技術品質）
  ↓
QA 驗收（RWD）
```

### 審核標準

**SEO Specialist 審核**：
- Meta Tags 完整且正確
- 結構化資料正確
- 語意化 HTML

**Web UI Quality Manager 審核**：
- 符合 Web Design Guidelines
- 通過 WCAG AA
- Core Web Vitals 達標

**QA 驗收**：
- 桌面版、平板版、行動版都正常顯示
- 無橫向滾動
- 觸控目標足夠大

---

## 違反判定

- 略過任何一個審核流程 → 違反
- 審核未通過即進入下一階段 → 違反
- 客戶未確認即進入程式碼實作 → 違反

---

## 例外

- 緊急修正（Hotfix）可簡化流程，但必須經過 Project Coordinator 批准

---

**版本**：1.0
**建立日期**：2026-02-13
