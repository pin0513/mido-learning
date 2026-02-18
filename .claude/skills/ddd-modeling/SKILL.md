---
name: DDD Modeling
description: Facilitate Event Storming workshops and guide domain modeling using Domain-Driven Design principles
---

# DDD Modeling Skill

## 用途

引導 **Event Storming 工作坊**，協助團隊進行領域建模，識別 Domain Event、Command、Aggregate、Bounded Context。

---

## Event Storming 流程

### Step 1: Domain Event 風暴（30 分鐘）
識別系統中所有可能發生的事件（過去式）。

**輸出範例**：
```
- 訂單已建立 (OrderCreated)
- 商品已加入購物車 (ItemAddedToCart)
- 付款已完成 (PaymentCompleted)
- 訂單已出貨 (OrderShipped)
```

### Step 2: 事件排序（30 分鐘）
將事件按時間順序排列，識別主要流程。

### Step 3: 識別 Command（30 分鐘）
每個 Event 前面加上觸發它的 Command。

**輸出範例**：
```
加入購物車 (AddToCart) → ItemAddedToCart
確認訂單 (ConfirmOrder) → OrderConfirmed
```

### Step 4: 識別 Aggregate（30 分鐘）
將相關的 Command 和 Event 分組。

**輸出範例**：
```
Aggregate: Order
├── Command: ConfirmOrder
├── Event: OrderConfirmed
├── Command: CancelOrder
└── Event: OrderCancelled
```

### Step 5: 識別 Bounded Context（30 分鐘）
將 Aggregate 分組為 Context。

---

## 使用範例

**DDD Expert**: `/ddd-modeling`

**Skill**:
```
歡迎使用 DDD Modeling！

請回答：
1. 你要建模的業務領域是什麼？（例如：電商、訂單管理、會員系統）
2. 參與者有哪些？（業務專家、開發者）
3. 預計時間？（建議 2-3 小時）
```

---

**版本**：1.0
