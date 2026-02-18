---
name: OpenTelemetry Analysis
description: Analyze OpenTelemetry traces, metrics, and logs to diagnose performance bottlenecks and system issues
---

# OpenTelemetry Analysis Skill

## 用途

分析 **OpenTelemetry Trace/Metric/Log**，診斷效能瓶頸、找出慢查詢、識別記憶體洩漏。

---

## 分析流程

### 1. Trace 分析
識別高延遲的 API 請求。

**範例**：
```
Trace: GET /orders (總延遲 1200ms)
├─ DB Query: SELECT * FROM orders (800ms) ← 瓶頸
├─ Redis Get (50ms)
└─ Response Serialization (350ms)
```

**診斷建議**：
- 加入資料庫索引
- 使用 JOIN 取代 N+1 查詢

---

### 2. Metric 分析
監控系統資源使用。

**指標**：
- CPU 使用率
- 記憶體使用率
- API 請求量
- 錯誤率

---

### 3. Log 分析
找出錯誤模式。

---

**版本**：1.0
