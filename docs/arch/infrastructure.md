# 基礎設施與部署配置

**版本**: 1.0
**日期**: 2026-02-12
**審查者**: Software Architect

---

## 整體部署架構

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform (GCP)                      │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                      Cloud Run Services                     │   │
│  │  ┌──────────────────────┐   ┌──────────────────────┐      │   │
│  │  │  Frontend Container  │   │  Backend Container   │      │   │
│  │  │  - React Build       │   │  - NestJS            │      │   │
│  │  │  - Nginx             │   │  - Node 20           │      │   │
│  │  │  - Port 8080         │   │  - Port 8080         │      │   │
│  │  │  - Asia-northeast1   │   │  - Asia-northeast1   │      │   │
│  │  └──────────┬───────────┘   └──────────┬───────────┘      │   │
│  │             │                           │                  │   │
│  │             │ Custom Domain             │ Custom Domain    │   │
│  │             ↓                           ↓                  │   │
│  │  skill-village.midolearning.com   api.skill-village...    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                   Firebase Services                         │   │
│  │  ┌──────────────────────┐   ┌──────────────────────┐      │   │
│  │  │  Firestore Database  │   │  Authentication      │      │   │
│  │  │  - characters        │   │  - Email/Password    │      │   │
│  │  │  - skills            │   │  - Google OAuth      │      │   │
│  │  │  - game_sessions     │   │  - Custom Claims     │      │   │
│  │  │  - rewards           │   │  (admin role)        │      │   │
│  │  │  - messages          │   └──────────────────────┘      │   │
│  │  └──────────────────────┘                                  │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                   Monitoring & Logging                      │   │
│  │  ┌──────────────────────┐   ┌──────────────────────┐      │   │
│  │  │  Cloud Logging       │   │  Cloud Monitoring    │      │   │
│  │  │  - API Logs          │   │  - API Latency       │      │   │
│  │  │  - Error Logs        │   │  - Error Rate        │      │   │
│  │  │  - Firestore Logs    │   │  - Request Count     │      │   │
│  │  └──────────────────────┘   └──────────────────────┘      │   │
│  │  ┌──────────────────────┐                                  │   │
│  │  │  Cloud Alerting      │                                  │   │
│  │  │  - Error Spike       │                                  │   │
│  │  │  - High Latency      │                                  │   │
│  │  │  - Cost Alert        │                                  │   │
│  │  └──────────────────────┘                                  │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                   Cloud Scheduler                           │   │
│  │  - Daily Summary Job (每日凌晨 2:00)                        │   │
│  │  - Backup Job (每週日凌晨 3:00)                             │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          GitHub                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  skill-village Repository                                   │   │
│  │  ├── frontend/                                              │   │
│  │  ├── backend/                                               │   │
│  │  └── .github/workflows/                                     │   │
│  │      ├── deploy-frontend.yml                                │   │
│  │      └── deploy-backend.yml                                 │   │
│  └────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│                           │ Push to main                            │
│                           ↓                                         │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  GitHub Actions (CI/CD)                                     │   │
│  │  - Build Docker Image                                       │   │
│  │  - Run Tests                                                │   │
│  │  - Deploy to Cloud Run                                      │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Firebase 專案配置

### 1. Firebase 專案建立

```bash
# 1. 建立 Firebase 專案
firebase projects:create skill-village --display-name "Skill Village"

# 2. 啟用 Firestore
firebase firestore:enable --project skill-village

# 3. 啟用 Authentication
firebase auth:enable --project skill-village

# 4. 設定 Authentication Providers
# - Email/Password: ✅ 啟用
# - Google: ✅ 啟用（需設定 OAuth Client ID）
```

### 2. Firestore 初始化

```bash
# 建立索引
firebase deploy --only firestore:indexes

# 部署 Security Rules
firebase deploy --only firestore:rules
```

**firestore.indexes.json**:

```json
{
  "indexes": [
    {
      "collectionGroup": "game_sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "characterId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "game_sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "characterId", "order": "ASCENDING" },
        { "fieldPath": "skillId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "rewards",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "characterId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "characterId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**firestore.rules**:

```javascript
// 詳見 database-design.md
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ... (省略，見 database-design.md)
  }
}
```

### 3. Firebase Admin SDK 設定

```bash
# 1. 產生 Service Account Key
gcloud iam service-accounts keys create credentials/firebase-admin-key.json \
  --iam-account firebase-adminsdk@skill-village.iam.gserviceaccount.com

# 2. 設定環境變數（Cloud Run）
gcloud run services update skill-village-api \
  --set-env-vars FIREBASE_PROJECT_ID=skill-village

# 3. 掛載 Secret（Service Account Key）
gcloud secrets create firebase-admin-key --data-file=credentials/firebase-admin-key.json
gcloud run services update skill-village-api \
  --update-secrets /secrets/firebase-admin-key.json=firebase-admin-key:latest
```

---

## Cloud Run 部署配置

### 1. Frontend Container

**Dockerfile**:

```dockerfile
# frontend/Dockerfile

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# 複製 build 檔案
COPY --from=builder /app/dist /usr/share/nginx/html

# 自訂 nginx 配置（支援 React Router）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:

```nginx
server {
    listen 8080;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # React Router 支援
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 快取靜態資源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 壓縮
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;
}
```

**Cloud Run 配置**:

```bash
gcloud run deploy skill-village-frontend \
  --image gcr.io/skill-village/frontend:latest \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --min-instances 0 \
  --max-instances 10 \
  --memory 256Mi \
  --cpu 1 \
  --set-env-vars "NODE_ENV=production"
```

### 2. Backend Container

**Dockerfile**:

```dockerfile
# backend/Dockerfile

FROM node:20-alpine

WORKDIR /app

# 安裝依賴
COPY package*.json ./
RUN npm ci --only=production

# 複製程式碼
COPY dist ./dist

# 掛載 Service Account Key（由 Cloud Run 提供）
# /secrets/firebase-admin-key.json

EXPOSE 8080

CMD ["node", "dist/main.js"]
```

**Cloud Run 配置**:

```bash
gcloud run deploy skill-village-api \
  --image gcr.io/skill-village/backend:latest \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --min-instances 1 \
  --max-instances 20 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=skill-village" \
  --update-secrets /secrets/firebase-admin-key.json=firebase-admin-key:latest
```

---

## CI/CD Pipeline（GitHub Actions）

### 1. Frontend Deployment

**.github/workflows/deploy-frontend.yml**:

```yaml
name: Deploy Frontend

on:
  push:
    branches:
      - main
    paths:
      - 'frontend/**'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: skill-village

      - name: Configure Docker for GCR
        run: gcloud auth configure-docker

      - name: Build Docker image
        run: |
          cd frontend
          docker build -t gcr.io/skill-village/frontend:${{ github.sha }} .
          docker tag gcr.io/skill-village/frontend:${{ github.sha }} gcr.io/skill-village/frontend:latest

      - name: Push to GCR
        run: |
          docker push gcr.io/skill-village/frontend:${{ github.sha }}
          docker push gcr.io/skill-village/frontend:latest

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy skill-village-frontend \
            --image gcr.io/skill-village/frontend:latest \
            --platform managed \
            --region asia-northeast1 \
            --allow-unauthenticated

      - name: Notify deployment
        run: echo "Frontend deployed successfully"
```

### 2. Backend Deployment

**.github/workflows/deploy-backend.yml**:

```yaml
name: Deploy Backend

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Run tests
        run: |
          cd backend
          npm run test

      - name: Run E2E tests
        run: |
          cd backend
          npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: skill-village

      - name: Configure Docker for GCR
        run: gcloud auth configure-docker

      - name: Build Docker image
        run: |
          cd backend
          npm ci
          npm run build
          docker build -t gcr.io/skill-village/backend:${{ github.sha }} .
          docker tag gcr.io/skill-village/backend:${{ github.sha }} gcr.io/skill-village/backend:latest

      - name: Push to GCR
        run: |
          docker push gcr.io/skill-village/backend:${{ github.sha }}
          docker push gcr.io/skill-village/backend:latest

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy skill-village-api \
            --image gcr.io/skill-village/backend:latest \
            --platform managed \
            --region asia-northeast1 \
            --allow-unauthenticated

      - name: Notify deployment
        run: echo "Backend deployed successfully"
```

---

## 環境變數管理

### 1. Frontend 環境變數

**.env.production**:

```bash
VITE_API_URL=https://api.skill-village.midolearning.com
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=skill-village.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=skill-village
VITE_FIREBASE_STORAGE_BUCKET=skill-village.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 2. Backend 環境變數

**Cloud Run 設定**:

```bash
gcloud run services update skill-village-api \
  --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=skill-village,JWT_SECRET=$JWT_SECRET"
```

**或使用 Secret Manager**:

```bash
# 建立 Secret
echo -n "your-jwt-secret" | gcloud secrets create jwt-secret --data-file=-

# 掛載到 Cloud Run
gcloud run services update skill-village-api \
  --update-secrets JWT_SECRET=jwt-secret:latest
```

---

## 監控與日誌

### 1. Cloud Logging

**後端日誌設定**:

```typescript
// backend/src/main.ts

import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Structured logging for Cloud Logging
  const logger = new Logger('Main');
  logger.log({
    message: 'Application started',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });

  await app.listen(8080);
}
```

**查詢日誌**:

```bash
# 查詢錯誤日誌
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit 50

# 即時監控
gcloud logging tail "resource.type=cloud_run_revision"
```

### 2. Cloud Monitoring

**建立 Dashboard**:

```yaml
# monitoring-dashboard.yaml

displayName: Skill Village Dashboard
mosaicLayout:
  columns: 12
  tiles:
    - width: 6
      height: 4
      widget:
        title: API Request Count
        xyChart:
          dataSets:
            - timeSeriesQuery:
                timeSeriesFilter:
                  filter: resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count"
                  aggregation:
                    alignmentPeriod: 60s
                    perSeriesAligner: ALIGN_RATE

    - width: 6
      height: 4
      widget:
        title: API Latency (p95)
        xyChart:
          dataSets:
            - timeSeriesQuery:
                timeSeriesFilter:
                  filter: resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_latencies"
                  aggregation:
                    perSeriesAligner: ALIGN_DELTA
                    crossSeriesReducer: REDUCE_PERCENTILE_95

    - width: 6
      height: 4
      widget:
        title: Error Rate
        xyChart:
          dataSets:
            - timeSeriesQuery:
                timeSeriesFilter:
                  filter: resource.type="cloud_run_revision" AND metric.type="logging.googleapis.com/log_entry_count" AND severity>=ERROR
```

**建立 Alert**:

```bash
# Error Spike Alert
gcloud alpha monitoring policies create \
  --notification-channels=$CHANNEL_ID \
  --display-name="API Error Spike" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=60s \
  --condition-threshold-filter='resource.type="cloud_run_revision" AND severity>=ERROR'

# High Latency Alert
gcloud alpha monitoring policies create \
  --notification-channels=$CHANNEL_ID \
  --display-name="API High Latency" \
  --condition-display-name="p95 latency > 1s" \
  --condition-threshold-value=1000 \
  --condition-threshold-duration=300s \
  --condition-threshold-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_latencies"'
```

---

## 定期任務（Cloud Scheduler + Cloud Functions）

### 1. 每日資料匯總

**Cloud Function**:

```typescript
// functions/src/daily-summary.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const dailySummary = functions
  .pubsub.schedule('0 2 * * *') // 每日凌晨 2:00
  .timeZone('Asia/Taipei')
  .onRun(async (context) => {
    const db = admin.firestore();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 查詢昨日的 game_sessions
    const sessions = await db.collection('game_sessions')
      .where('createdAt', '>=', yesterday)
      .where('createdAt', '<', today)
      .get();

    // 匯總資料
    const summaries = new Map();
    sessions.forEach(doc => {
      const session = doc.data();
      const key = `${session.characterId}_${session.skillId}`;

      if (!summaries.has(key)) {
        summaries.set(key, {
          characterId: session.characterId,
          skillId: session.skillId,
          date: yesterday.toISOString().split('T')[0],
          totalPlayTime: 0,
          totalExp: 0,
          playCount: 0,
        });
      }

      const summary = summaries.get(key);
      summary.totalPlayTime += session.performance.playTime;
      summary.totalExp += session.result.expGained;
      summary.playCount += 1;
    });

    // 寫入匯總資料
    const batch = db.batch();
    summaries.forEach(summary => {
      const ref = db.collection('daily_summaries').doc();
      batch.set(ref, summary);
    });
    await batch.commit();

    console.log(`Summarized ${summaries.size} records for ${yesterday.toISOString().split('T')[0]}`);
  });
```

**部署**:

```bash
cd functions
firebase deploy --only functions:dailySummary
```

### 2. 每週備份

**Cloud Scheduler**:

```bash
# 建立 Scheduler Job
gcloud scheduler jobs create http firestore-backup \
  --schedule="0 3 * * 0" \
  --time-zone="Asia/Taipei" \
  --uri="https://firestore.googleapis.com/v1/projects/skill-village/databases/(default):exportDocuments" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"outputUriPrefix":"gs://skill-village-backups"}'
```

---

## 成本估算

### 月成本預估（1000 名使用者）

| 服務 | 用量 | 單價 | 月成本（$） |
|------|------|------|------------|
| **Cloud Run (Frontend)** | 1M requests, 50 GB-hours | $0.40/M + $0.024/GB-hour | $1.60 |
| **Cloud Run (Backend)** | 1M requests, 200 GB-hours | $0.40/M + $0.024/GB-hour | $5.20 |
| **Firestore (Reads)** | 15M reads | $0.06/100K | $9.00 |
| **Firestore (Writes)** | 500K writes | $0.18/100K | $0.90 |
| **Firestore (Storage)** | 5 GB | $0.18/GB | $0.90 |
| **Cloud Logging** | 10 GB logs | $0.50/GB | $5.00 |
| **Cloud Monitoring** | Standard | Free tier | $0 |
| **Cloud Storage (Backup)** | 10 GB | $0.02/GB | $0.20 |
| **Total** | | | **$22.80** |

**優化建議**:
- 實作快取減少 Firestore 讀取次數
- 使用資料匯總減少 game_sessions 數量
- 定期清理舊日誌

---

## 災難復原計畫

### 1. 備份策略

```bash
# 每週完整備份
0 3 * * 0 → firestore:export gs://skill-village-backups/weekly/$(date +%Y%m%d)

# 每日增量備份（僅備份當日變更）
0 3 * * 1-6 → firestore:export gs://skill-village-backups/daily/$(date +%Y%m%d) --collection-ids=game_sessions,rewards,messages
```

### 2. 復原流程

```bash
# 1. 停止所有寫入（暫停 Cloud Run）
gcloud run services update skill-village-api --min-instances 0 --max-instances 0

# 2. 從備份還原
gcloud firestore import gs://skill-village-backups/weekly/20260210

# 3. 驗證資料
# 手動檢查關鍵資料是否正確

# 4. 恢復服務
gcloud run services update skill-village-api --min-instances 1 --max-instances 20
```

---

## 總結

✅ **Cloud Run 自動擴展，可應付流量波動**
✅ **Firebase 整合完整，開發效率高**
✅ **CI/CD 自動化，減少人工部署錯誤**
✅ **監控與日誌完善，問題可快速定位**
✅ **成本可控，月成本預估 $22.80（1000 使用者）**

**部署檢查清單**:
- [ ] Firebase 專案建立並啟用服務
- [ ] Firestore 索引建立
- [ ] Security Rules 部署
- [ ] Cloud Run 部署配置完成
- [ ] GitHub Actions 設定完成
- [ ] 環境變數正確設定
- [ ] 監控 Dashboard 建立
- [ ] Alert 設定完成
- [ ] 定期備份 Scheduler 啟用
