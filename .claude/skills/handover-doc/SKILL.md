---
name: Handover Documentation
description: Generate comprehensive handover documentation including deployment guides, API specs, and system architecture
---

# Handover Documentation Skill

## 用途

產生完整的**交付文件**，包含部署指南、API 規格、系統架構、監控指南。

---

## 文件結構

### 1. 專案概覽
- 系統簡介
- 技術棧
- 架構圖

### 2. 部署指南
- 環境變數設定
- 資料庫 Migration
- Docker/Kubernetes 部署步驟

### 3. API 文件
- Swagger/OpenAPI 規格
- 認證方式
- API 範例

### 4. 監控與運維
- Grafana Dashboard
- 告警規則
- 常見問題排查

---

## 產出範例

```markdown
# Handover Document

## 系統簡介
這是一個電商系統，包含前端（Next.js）和後端（NestJS）...

## 部署指南
### 環境變數
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
```

### 部署步驟
1. 執行 Migration: `npm run migration:run`
2. 啟動服務: `docker-compose up`
```

---

**版本**：1.0
