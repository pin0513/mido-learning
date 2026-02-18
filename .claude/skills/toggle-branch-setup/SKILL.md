---
name: Toggle Branch Setup
description: Set up Feature Toggle system and configure branch strategy for controlled feature releases
---

# Toggle Branch Setup Skill

## 用途

設定 **Feature Toggle**（功能開關）系統，配置分支策略，實現可控的功能發布。

---

## Feature Toggle 設計

### 1. Toggle 類型
- **Release Toggle**: 控制新功能是否啟用
- **Experiment Toggle**: A/B 測試
- **Ops Toggle**: 運維開關（例如：關閉某功能降低負載）
- **Permission Toggle**: 權限控制

### 2. 實作範例
```typescript
// feature-toggles.ts
export const FeatureToggles = {
  NEW_CHECKOUT_FLOW: process.env.TOGGLE_NEW_CHECKOUT === 'true',
  ENABLE_PAYMENT_V2: process.env.TOGGLE_PAYMENT_V2 === 'true',
};

// 使用
if (FeatureToggles.NEW_CHECKOUT_FLOW) {
  return <NewCheckoutPage />;
} else {
  return <OldCheckoutPage />;
}
```

---

## 分支策略

### Trunk-Based Development + Feature Flags
- 所有開發在 `main` 分支進行
- 使用短期 feature 分支（< 2 天）
- 使用 Feature Toggle 控制發布

---

**版本**：1.0
