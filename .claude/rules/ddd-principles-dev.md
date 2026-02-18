---
name: DDD Principles
description: Domain-Driven Design core principles including Entity, Value Object, Aggregate, and Domain Event
---

# DDD Principles

## 適用範圍

所有 Backend 領域模型設計都必須遵守 DDD 原則。

---

## 核心概念

### 1. Entity（實體）
有唯一識別（ID）、可變、生命週期長。

```typescript
export class Order {
  constructor(
    private readonly id: OrderId,
    private status: OrderStatus,
  ) {}

  confirm(): void {
    this.status = OrderStatus.Confirmed;
  }
}
```

---

### 2. Value Object（值物件）
無唯一識別、不可變、可替換。

```typescript
export class Money {
  constructor(
    private readonly amount: number,
    private readonly currency: string,
  ) {}

  add(other: Money): Money {
    return new Money(this.amount + other.amount, this.currency);
  }
}
```

---

### 3. Aggregate（聚合）
一組相關 Entity 和 Value Object，有 Aggregate Root。

```typescript
Order (Root)
├── OrderId
├── OrderItem[]
└── Status
```

外部只能透過 Root 操作：
```typescript
order.addItem(product); // ✅
orderItem.setQuantity(5); // ❌
```

---

### 4. Domain Event（領域事件）
記錄業務事件，過去式命名。

```typescript
export class OrderPlacedEvent {
  constructor(
    public readonly orderId: string,
    public readonly occurredAt: Date,
  ) {}
}
```

---

### 5. Repository（儲存庫）
只針對 Aggregate Root。

```typescript
export interface IOrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
}
```

---

## 分層架構

```
Domain Layer (核心)
├── Entity
├── Value Object
├── Aggregate
├── Domain Event
└── Repository Interface

Application Layer
└── Use Cases

Infrastructure Layer
└── Repository Implementation
```

**依賴方向**：所有層都依賴 Domain 層，Domain 層不依賴任何層。

---

## 反模式（禁止）

### ❌ Anemic Domain Model（貧血領域模型）
業務邏輯在 Service 層，Entity 只有 getter/setter。

#### 錯誤做法
```typescript
class Order {
  status: string; // ❌ 只有資料
}

class OrderService {
  confirm(order: Order) {
    order.status = 'CONFIRMED'; // ❌ 業務邏輯在 Service
  }
}
```

#### 正確做法
```typescript
class Order {
  confirm(): void {
    this.status = OrderStatus.Confirmed; // ✅ 業務邏輯在 Entity
  }
}
```

---

## 違反判定

- 業務邏輯在 Service 層，不在 Entity → 違反
- Domain 層依賴 Infrastructure（例如：直接 import TypeORM）→ 違反
- Aggregate 邊界不清楚 → 違反

---

**版本**：1.0
