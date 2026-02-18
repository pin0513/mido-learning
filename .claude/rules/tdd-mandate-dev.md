---
name: TDD Mandate
description: Test-Driven Development mandatory enforcement requiring tests before implementation
---

# TDD Mandate

## 適用範圍

所有功能開發都必須遵循 TDD（Test-Driven Development）流程。

---

## TDD 流程

### Red → Green → Refactor

```
1. Red: 寫失敗的測試
2. Green: 實作最小化程式碼讓測試通過
3. Refactor: 重構程式碼（保持測試通過）
```

---

## 強制規則

### 1. 測試優先
**禁止**：先寫實作，後補測試。

#### ❌ 錯誤流程
```
1. 寫功能
2. 補測試
```

#### ✅ 正確流程
```
1. 寫測試（Red）
2. 寫功能（Green）
3. 重構（Refactor）
```

---

### 2. 測試覆蓋率
- **最低要求**：≥ 80%
- **核心業務邏輯**：100%
- **認證/授權**：100%
- **金流計算**：100%

---

### 3. 測試結構（AAA Pattern）

```typescript
test('功能描述', () => {
  // Arrange: 準備資料
  const input = { ... };

  // Act: 執行動作
  const result = service.method(input);

  // Assert: 驗證結果
  expect(result).toEqual({ ... });
});
```

---

## 測試命名規範

```typescript
// Pattern: MethodName_Scenario_ExpectedBehavior
test('addItem_ValidProduct_IncreasesCartCount', () => { ... });
test('addItem_OutOfStock_ThrowsError', () => { ... });
```

---

## 違反判定

- 先寫實作，後寫測試 → 違反
- 測試覆蓋率 < 80% → 違反
- 核心業務邏輯測試覆蓋率 < 100% → 違反
- 測試不遵循 AAA Pattern → 違反

---

## 例外

- **探索性程式碼**（Spike）可以不寫測試，但**不能** merge 到 main

---

**版本**：1.0
