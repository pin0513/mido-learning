---
name: Frontend Review
description: Frontend code review standards including Effect Elimination, Strong Typing, and MAYO UI compliance
---

# Frontend Review

## 適用範圍

所有 Frontend 程式碼（React/Next.js）都必須遵守此規範。

---

## 核心原則

### 1. Effect Elimination（效果消除）
避免不必要的 `useEffect`，優先使用 derived state 和事件處理。

#### ❌ 錯誤做法
```typescript
const [count, setCount] = useState(0);
const [doubled, setDoubled] = useState(0);

useEffect(() => {
  setDoubled(count * 2); // ❌ 不必要的 effect
}, [count]);
```

#### ✅ 正確做法
```typescript
const [count, setCount] = useState(0);
const doubled = count * 2; // ✅ Derived state
```

---

### 2. Strong Typing（強型別）
**零 `any` 政策**：禁止使用 `any`，使用 `unknown` + Type Guard。

#### ❌ 錯誤做法
```typescript
const userData: any = await fetchUser();
const name = userData.name as string; // ❌ any + type assertion
```

#### ✅ 正確做法
```typescript
type User = {
  id: string;
  name: string;
};

const userData: unknown = await fetchUser();

function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data
  );
}

if (isUser(userData)) {
  const name = userData.name; // ✅ Type-safe
}
```

---

### 3. MAYO UI System Compliance
**Wrapper Pattern Mandate**：禁止直接 import `@mayo/mayo-ui`。

#### ❌ 錯誤做法
```typescript
import { Button } from '@mayo/mayo-ui'; // ❌ Direct import
```

#### ✅ 正確做法
```typescript
import { Button } from '@/components/ui/Button'; // ✅ Wrapper
```

---

### 4. Hydration Safety
互動元件必須使用 `ssr: false`。

#### ❌ 錯誤做法
```typescript
const Component = () => {
  const isClient = typeof window !== 'undefined';
  return <div>{isClient ? 'Client' : 'Server'}</div>; // ❌ Hydration mismatch
};
```

#### ✅ 正確做法
```typescript
import dynamic from 'next/dynamic';

const ClientOnlyComponent = dynamic(() => import('./ClientOnly'), {
  ssr: false, // ✅ SSR disabled
});
```

---

## Feedback Levels

### ❌ Blocker（必須修正）
- 使用 `any`
- 使用 `as Type` assertion
- 直接 import `@mayo/mayo-ui`
- 有明顯 bugs

### ⚠️ Warning（應該修正）
- 使用 `useEffect` 設定 derived state
- 未優化的 Context Provider

### 💡 Suggestion（建議重構）
- 元件過長（> 200 lines）
- 複雜的條件邏輯（可簡化）

---

## 違反判定

- 使用 `any` → Blocker
- 使用 `as Type` → Blocker
- 直接 import `@mayo/mayo-ui` → Blocker
- 不必要的 `useEffect` → Warning

---

**版本**：1.0
