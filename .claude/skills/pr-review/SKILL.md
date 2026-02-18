---
name: PR Review
description: Automated PR review based on frontend-review standards and code quality checks
---

# PR Review Skill

## 用途

自動化 PR 審查，檢查程式碼是否符合 **frontend-review** 標準、**zero-any-policy**、**TDD**。

---

## 檢查項目

### Frontend Review
- ❌ Blocker: `any`, `as Type`, 直接 import `@mayo/mayo-ui`
- ⚠️ Warning: 不必要的 `useEffect`, 未優化的 Context
- 💡 Suggestion: 可重構的地方

### Zero Any Policy
- 檢查所有 TypeScript 檔案是否有 `any`

### TDD Mandate
- 檢查是否有對應的測試檔案

---

**版本**：1.0
