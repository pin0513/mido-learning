---
name: Zero Any Policy
description: TypeScript strict typing policy prohibiting the use of 'any' type
---

# Zero Any Policy

## 適用範圍

所有 TypeScript 程式碼（Frontend + Backend）都必須遵守此政策。

---

## 核心規則

### 禁止使用 `any`
在任何情況下都禁止使用 `any` 型別。

#### ❌ 錯誤做法
```typescript
const data: any = await fetchData();
function process(input: any) { ... }
```

#### ✅ 正確做法
```typescript
const data: unknown = await fetchData();

type Input = {
  id: string;
  name: string;
};

function process(input: Input) { ... }
```

---

## 替代方案

### 1. 使用 `unknown`
當型別真的未知時，使用 `unknown` + Type Guard。

```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

if (isString(data)) {
  console.log(data.toUpperCase()); // ✅ Type-safe
}
```

---

### 2. 使用泛型
```typescript
function identity<T>(value: T): T {
  return value;
}
```

---

### 3. 使用 Union Type
```typescript
type ApiResponse = SuccessResponse | ErrorResponse;
```

---

## ESLint 強制執行

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

---

## 違反判定

- 使用 `any` → 違反
- 使用 `as any` → 違反

---

**版本**：1.0
