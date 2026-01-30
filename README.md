# Mido Learning

現代化線上學習平台，使用 Next.js 14 + .NET 8 + Firebase 建構。

## 技術棧

| 層級 | 技術選擇 |
|------|---------|
| **前端** | Next.js 14 (App Router) + Tailwind CSS |
| **後端** | .NET 8 Minimal API |
| **資料庫** | Firebase Firestore |
| **認證** | Firebase Auth (Email/密碼 + Google) |
| **檔案儲存** | Firebase Storage |
| **部署** | Google Cloud Run |
| **CI/CD** | GitHub Actions |

## 專案結構

```
mido-learning/
├── frontend/                 # Next.js 前端
│   ├── app/                  # App Router 頁面
│   ├── components/           # React 元件
│   └── lib/                  # 工具函數
├── backend/                  # .NET 8 後端
│   └── MidoLearning.Api/     # Minimal API 專案
├── spec/                     # 規格文件
│   └── FunctionalMap.md      # 功能地圖
├── .github/workflows/        # CI/CD
├── firebase.json             # Firebase 設定
└── docker-compose.yml        # 本地開發
```

## 快速開始

### 前置需求

- Node.js 20+
- .NET 8 SDK
- Firebase CLI (`npm install -g firebase-tools`)

### 安裝與執行

1. **Clone 專案**
   ```bash
   git clone <repository-url>
   cd mido-learning
   ```

2. **設定環境變數**
   ```bash
   cp frontend/.env.example frontend/.env.local
   # 編輯 .env.local 填入 Firebase 設定
   ```

3. **安裝依賴並啟動前端**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **啟動後端**
   ```bash
   cd backend/MidoLearning.Api
   dotnet run
   ```

### 使用 Docker Compose

```bash
docker-compose up
```

這會啟動：
- 前端：http://localhost:3000
- 後端：http://localhost:5000
- Firebase Emulator UI：http://localhost:4000

## 環境變數

### 前端 (frontend/.env.local)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mido-learning
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### GitHub Secrets (CI/CD 需要)

- `GCP_SA_KEY`: GCP 服務帳號金鑰 (JSON)
- `NEXT_PUBLIC_FIREBASE_*`: Firebase 設定值

## 部署

Push 到 `main` 分支會自動觸發部署：
- 前端變更 → 部署到 Cloud Run (asia-east1)
- 後端變更 → 部署到 Cloud Run (asia-east1)

## 文件

- [功能地圖](./spec/FunctionalMap.md) - 完整功能規劃
- [Firestore 規則](./firestore.rules) - 資料庫安全規則
- [Storage 規則](./storage.rules) - 檔案存取規則

## License

MIT
