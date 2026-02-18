---
name: OpenTelemetry Standards
description: OpenTelemetry instrumentation standards including trace naming, metric definitions, and log formats
---

# OpenTelemetry Standards

## 適用範圍

所有服務都必須實作 OpenTelemetry 埋點。

---

## Trace 規範

### Span 命名規範
```
{HTTP Method} {Route}

範例：
- GET /users/:id
- POST /orders
- PUT /cart/items
```

---

### Span Attributes（必須包含）

```typescript
span.setAttributes({
  'http.method': 'GET',
  'http.route': '/users/:id',
  'http.status_code': 200,
  'user.id': userId,
});
```

---

## Metric 規範

### Metric 命名規範
```
{namespace}.{metric_name}.{unit}

範例：
- api.request.duration.ms
- db.query.duration.ms
- cache.hit.ratio
```

---

### 必要 Metrics

| Metric | 說明 | Unit |
|--------|------|------|
| `api.request.duration` | API 請求延遲 | ms |
| `api.request.count` | API 請求數量 | count |
| `api.error.count` | API 錯誤數量 | count |
| `db.query.duration` | 資料庫查詢延遲 | ms |
| `cache.hit.ratio` | 快取命中率 | percentage |

---

## Log 規範

### Log Level
```
ERROR: 需要立即處理的錯誤
WARN: 潛在問題
INFO: 重要資訊（例如：API 請求）
DEBUG: 除錯資訊
```

---

### Log Format（JSON）
```json
{
  "level": "INFO",
  "timestamp": "2026-02-13T10:00:00Z",
  "traceId": "abc123",
  "spanId": "def456",
  "message": "User logged in",
  "userId": "user-123"
}
```

---

## 違反判定

- 服務未實作 OpenTelemetry → 違反
- Span 命名不符合規範 → 違反
- 缺少必要 Metric → 違反

---

**版本**：1.0
