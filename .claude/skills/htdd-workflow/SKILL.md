---
name: HTDD Workflow
description: Guide developers through Hypothesis-Driven Test-Driven Development process
---

# HTDD Workflow Skill

## 用途

引導開發者執行 **HTDD（Hypothesis-Driven Test-Driven Development）** 流程，確保每個功能開發都遵循「假設 → 測試 → 開發 → 重構」的循環。

---

## 適用情境

- 開發新功能
- 修復 Bug
- 重構現有程式碼
- 實作業務邏輯

---

## HTDD 流程

### Step 1: Hypothesis（假設）
定義預期行為，用自然語言描述。

**範例**：
```
功能：加入購物車
假設：當使用者點擊「加入購物車」按鈕時，購物車數量應該 +1
```

**產出**：
- 功能描述（一句話）
- 預期行為（Given-When-Then 格式）

---

### Step 2: Test（測試）
寫一個失敗的測試（Red）。

**範例（Frontend）**：
```typescript
// cart.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AddToCartButton } from './AddToCartButton';

test('點擊加入購物車後，購物車數量應該 +1', () => {
  // Given: 初始狀態
  render(<AddToCartButton productId="123" />);

  // When: 點擊按鈕
  const button = screen.getByRole('button', { name: /加入購物車/ });
  fireEvent.click(button);

  // Then: 驗證結果
  expect(screen.getByText(/購物車 \(1\)/)).toBeInTheDocument();
});
```

**範例（Backend）**：
```typescript
// cart.service.spec.ts
describe('CartService', () => {
  test('addItem 應該新增商品到購物車', async () => {
    // Given
    const cart = await cartService.getCart('user-123');
    expect(cart.items).toHaveLength(0);

    // When
    await cartService.addItem('user-123', { productId: '456', quantity: 1 });

    // Then
    const updatedCart = await cartService.getCart('user-123');
    expect(updatedCart.items).toHaveLength(1);
    expect(updatedCart.items[0].productId).toBe('456');
  });
});
```

**確認**：
- 執行測試，確認測試失敗（Red）
- 測試失敗的原因應該是「功能尚未實作」，不是「測試寫錯」

---

### Step 3: Development（開發）
實作最小化的程式碼，讓測試通過（Green）。

**範例（Frontend）**：
```typescript
// AddToCartButton.tsx
import { useCartStore } from '@/stores/cartStore';

export const AddToCartButton = ({ productId }: Props) => {
  const addItem = useCartStore(state => state.addItem);

  const handleClick = () => {
    addItem(productId);
  };

  return (
    <button onClick={handleClick}>
      加入購物車
    </button>
  );
};
```

**範例（Backend）**：
```typescript
// cart.service.ts
@Injectable()
export class CartService {
  async addItem(userId: string, item: AddCartItemDto): Promise<void> {
    const cart = await this.cartRepository.findByUserId(userId);
    cart.items.push({ productId: item.productId, quantity: item.quantity });
    await this.cartRepository.save(cart);
  }
}
```

**確認**：
- 執行測試，確認測試通過（Green）
- **不要過度設計**，只實作讓測試通過的最小程式碼

---

### Step 4: Refactor（重構）
優化程式碼，改善可讀性、移除重複、改善設計。

**重構原則**：
- 保持測試通過（綠燈）
- 改善命名（變數、函式、類別）
- 移除重複邏輯
- 簡化複雜邏輯
- 遵循 SOLID 原則

**範例（重構前）**：
```typescript
const handleClick = () => {
  const cart = useCartStore.getState().cart;
  const newCart = { ...cart, items: [...cart.items, { productId, quantity: 1 }] };
  useCartStore.setState({ cart: newCart });
};
```

**範例（重構後）**：
```typescript
const handleClick = () => {
  addItem(productId); // ✅ 使用 Store 提供的 action
};
```

**確認**：
- 測試仍然通過（Green）
- 程式碼更易讀、更易維護

---

## 互動式引導模式

當開發者呼叫此 Skill 時，按照以下步驟引導：

### Step 1: 收集資訊
詢問開發者：

1. **你要開發什麼功能？**（例如：「加入購物車」）
2. **預期行為是什麼？**（例如：「點擊按鈕後，購物車數量 +1」）
3. **這是前端還是後端？**（決定測試框架）

### Step 2: 引導寫測試
根據開發者的回答，提供測試範本：

**前端範本**：
```typescript
test('功能描述', () => {
  // Given: [初始狀態]
  render(<Component />);

  // When: [觸發行為]
  fireEvent.click(screen.getByRole('button'));

  // Then: [驗證結果]
  expect(screen.getByText('...')).toBeInTheDocument();
});
```

**後端範本**：
```typescript
test('功能描述', async () => {
  // Given: [準備資料]
  const input = { ... };

  // When: [呼叫方法]
  const result = await service.method(input);

  // Then: [驗證結果]
  expect(result).toEqual({ ... });
});
```

### Step 3: 確認測試失敗
提醒開發者：
```
請執行測試，確認測試失敗（Red）：
- Frontend: npm run test
- Backend: npm run test

測試應該失敗，因為功能尚未實作。
如果測試通過，代表測試可能寫錯了。

失敗後，請告訴我錯誤訊息，我會協助確認是否正確。
```

### Step 4: 引導實作
提示開發者：
```
現在請實作最小化的程式碼，讓測試通過（Green）。

記住：
- 只實作讓測試通過的程式碼
- 不要過度設計
- 不要加入測試沒要求的功能

實作完成後，請執行測試，確認通過。
```

### Step 5: 引導重構
詢問開發者：
```
測試通過了嗎？Great！

現在檢視你的程式碼，是否有以下需要重構的地方：
1. 命名不清楚的變數/函式
2. 重複的邏輯
3. 過長的函式（> 20 行）
4. 複雜的條件判斷（可簡化）

重構時，確保測試仍然通過（保持綠燈）。
```

---

## 範例對話流程

**開發者**：`/htdd-workflow`

**Skill**：
```
歡迎使用 HTDD Workflow！

請回答以下問題：

1. 你要開發什麼功能？
   例如：「加入購物車」、「使用者登入」、「計算訂單總金額」

2. 預期行為是什麼？（用 Given-When-Then 格式）
   例如：
   Given: 使用者已登入
   When: 點擊「加入購物車」按鈕
   Then: 購物車數量 +1

3. 這是前端還是後端功能？
```

**開發者**：
```
1. 加入購物車
2. Given: 使用者查看商品頁
   When: 點擊「加入購物車」
   Then: 購物車數量 +1
3. 前端
```

**Skill**：
```
收到！我們要開發「加入購物車」功能（前端）。

## Step 1: 寫測試（Red）

請建立測試檔案：`src/components/AddToCartButton.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { AddToCartButton } from './AddToCartButton';
import { useCartStore } from '@/stores/cartStore';

test('點擊加入購物車後，購物車數量應該 +1', () => {
  // Given: 初始購物車為空
  useCartStore.setState({ items: [] });
  render(<AddToCartButton productId="123" />);

  // When: 點擊按鈕
  const button = screen.getByRole('button', { name: /加入購物車/ });
  fireEvent.click(button);

  // Then: 購物車數量應該是 1
  const state = useCartStore.getState();
  expect(state.items).toHaveLength(1);
  expect(state.items[0].productId).toBe('123');
});
```

請執行測試：
```bash
npm run test AddToCartButton.test.tsx
```

測試應該失敗（因為 AddToCartButton 元件還不存在）。

請告訴我測試結果。
```

**開發者**：「測試失敗了，錯誤訊息是：Cannot find module './AddToCartButton'」

**Skill**：
```
Perfect！測試失敗是正確的（Red 階段完成）。

## Step 2: 實作功能（Green）

現在建立 `src/components/AddToCartButton.tsx`：

```typescript
import { useCartStore } from '@/stores/cartStore';

type Props = {
  productId: string;
};

export const AddToCartButton = ({ productId }: Props) => {
  const addItem = useCartStore(state => state.addItem);

  const handleClick = () => {
    addItem(productId);
  };

  return (
    <button onClick={handleClick}>
      加入購物車
    </button>
  );
};
```

請再次執行測試：
```bash
npm run test AddToCartButton.test.tsx
```

測試應該通過（Green）。請告訴我結果。
```

**開發者**：「測試通過了！」

**Skill**：
```
Excellent！Green 階段完成。

## Step 3: 重構（Refactor）

現在檢視你的程式碼，確認以下幾點：

1. ✅ 變數/函式命名清楚嗎？
   - `handleClick` → 清楚
   - `addItem` → 清楚
   - `productId` → 清楚

2. ✅ 是否有重複邏輯？
   - 目前沒有

3. ✅ 是否有過長的函式？
   - `handleClick` 只有 1 行，很簡潔

4. ✅ 是否符合 frontend-review 標準？
   - 使用 Zustand (useCartStore)
   - 沒有 `any`
   - 沒有不必要的 `useEffect`

看起來不需要重構，程式碼已經很乾淨了！

## 完成！

HTDD 循環完成：
✅ Hypothesis: 定義了預期行為
✅ Test: 寫了失敗的測試（Red）
✅ Development: 實作了功能（Green）
✅ Refactor: 檢視了程式碼品質

請提交你的程式碼：
```bash
git add .
git commit -m "feat(cart): add to cart button with Zustand"
```

繼續開發下一個功能時，再次使用 `/htdd-workflow` 即可！
```

---

## 檢查清單

每次使用此 Skill，確保完成以下項目：

- [ ] Hypothesis 明確定義（Given-When-Then）
- [ ] 測試先寫（Red 階段）
- [ ] 測試失敗原因正確（功能未實作，不是測試寫錯）
- [ ] 實作最小化程式碼（Green 階段）
- [ ] 測試通過
- [ ] 重構檢查（命名、重複、複雜度）
- [ ] 測試仍然通過（保持綠燈）
- [ ] 符合程式碼品質標準（frontend-review/zero-any-policy）

---

## 常見問題

### Q: 測試寫完後一直通過，沒有經過 Red 階段？
**A**: 這代表測試可能寫錯了，或功能已經存在。請確認測試真的在驗證新功能。

### Q: 實作功能後，測試仍然失敗？
**A**: 檢查以下幾點：
1. 測試的期望值是否正確
2. 實作是否有 bug
3. Mock/Stub 是否正確設定

### Q: 重構後測試失敗了？
**A**: 回退重構，小步進行重構，每次重構後立即執行測試。

---

**版本**：1.0
**維護者**：Team Lead
