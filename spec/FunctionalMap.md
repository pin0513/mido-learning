# 米豆學習網 功能規格

> **Spec-Driven Development**: 每個 Feature 可獨立開發與驗證。使用 Feature ID 指定實作目標。

---

## 專案資訊

| 項目 | 值 |
|------|-----|
| 專案名稱 | 米豆學習網 (Mido Learning) |
| 版本 | v0.6.1 |
| 前端 URL | https://mido-learning-frontend-24mwb46hra-de.a.run.app |
| 後端 URL | https://mido-learning-api-24mwb46hra-de.a.run.app |
| 本地前端 | http://localhost:3000 |
| 本地後端 | http://localhost:5000 |

---

## 角色定義

| 角色 ID | 名稱 | Firebase Custom Claim | 說明 |
|---------|------|----------------------|------|
| `guest` | 訪客 | (無 token) | 可瀏覽公開頁面、提交學習願望 |
| `student` | 學生 | `{ role: "student" }` | 可學習教材、追蹤進度 |
| `teacher` | 老師 | `{ role: "teacher" }` | 可建立/管理學習元件與教材 |
| `admin` | 管理員 | `{ admin: true }` | 完整系統管理權限 |

**管理員帳號**: `pin0513@gmail.com` (系統預設管理員)

---

## 學習元件分類

**分類為動態管理**，可透過 API 新增/編輯/刪除。預設分類如下：

| 分類 ID | 名稱 | 主題風格 | 色系 | 目標受眾 |
|---------|------|---------|------|---------|
| `adult` | 大人學 | 高山冰河 | 冷色調 (藍、白、銀) | 成人學習者 |
| `kid` | 小人學 | 地底火山 | 暖色調 (紅、橙、黃) | 兒童學習者 |
| `Programming` | 程式設計 | 科技感 | 紫色調 | 開發者 |
| `Language` | 語言學習 | 自然感 | 綠色調 | 語言學習者 |
| `Science` | 自然科學 | 探索感 | 青色調 | 科學愛好者 |
| `Art` | 藝術創作 | 創意感 | 粉紅色調 | 藝術創作者 |

**API**: `/api/categories` (GET/POST/PUT/DELETE)

---

## Feature 清單

### 基礎架構

| Feature ID | 名稱 | 狀態 | 依賴 |
|------------|------|------|------|
| INFRA-001 | RWD 響應式設計 | ✅ DONE | - |
| INFRA-002 | 投影片檢視器 (RWD) | ✅ DONE | MAT-004 |

### 認證系統 (已完成)

| Feature ID | 名稱 | 狀態 | 依賴 |
|------------|------|------|------|
| AUTH-001 | Email 註冊 | ✅ DONE | - |
| AUTH-002 | Email 登入 | ✅ DONE | - |
| AUTH-003 | Google OAuth 登入 | ✅ DONE | - |
| AUTH-004 | 登出 | ✅ DONE | AUTH-001 |
| AUTH-005 | Token 驗證 API | ✅ DONE | AUTH-001 |

### 使用者管理 (部分完成)

| Feature ID | 名稱 | 狀態 | 依賴 |
|------------|------|------|------|
| USER-001 | 取得個人資料 | ✅ DONE | AUTH-001 |
| USER-002 | 更新個人資料 | 📋 TODO | USER-001 |
| USER-003 | 角色切換 (Admin 設定) | 📋 TODO | ADMIN-001 |

### 管理員功能 (部分完成)

| Feature ID | 名稱 | 狀態 | 依賴 |
|------------|------|------|------|
| ADMIN-001 | 管理員儀表板 | ✅ DONE | AUTH-001 |
| ADMIN-002 | 設定/移除管理員角色 | ✅ DONE | ADMIN-001 |
| ADMIN-003 | 使用者列表與角色管理 | ✅ DONE | ADMIN-001 |
| ADMIN-004 | 系統設定管理 | 📋 TODO | ADMIN-001 |

### 學習元件系統 (大部分完成)

| Feature ID | 名稱 | 狀態 | 依賴 |
|------------|------|------|------|
| COMP-001 | 學習元件列表頁 | ✅ DONE | AUTH-001 |
| COMP-002 | 學習元件詳情頁 | ✅ DONE | COMP-001 |
| COMP-003 | 建立學習元件 (Teacher) | ✅ DONE | AUTH-001 |
| COMP-004 | 編輯學習元件 (Teacher) | ✅ DONE | COMP-003 |
| COMP-005 | 刪除學習元件 (Teacher/Admin) | 📋 TODO | COMP-003 |
| COMP-006 | 學習元件標籤系統 | 📋 TODO | COMP-001 |

### 教材上傳系統 (已完成)

| Feature ID | 名稱 | 狀態 | 依賴 |
|------------|------|------|------|
| MAT-001 | Zip 教材上傳 | ✅ DONE | COMP-003 |
| MAT-002 | 教材版本管理 | ✅ DONE | MAT-001 |
| MAT-003 | 教材解壓與儲存 | ✅ DONE | MAT-001 |
| MAT-004 | 教材下載/預覽 | ✅ DONE | MAT-001 |
| MAT-005 | 教材檢視頁 (RWD iframe) | ✅ DONE | MAT-003, MAT-004 |

### 願望 ChatBot (部分完成)

| Feature ID | 名稱 | 狀態 | 依賴 |
|------------|------|------|------|
| WISH-001 | 首頁願望輸入介面 | ✅ DONE | - |
| WISH-002 | 願望儲存 API | ✅ DONE | WISH-001 |
| WISH-003 | 願望池管理 (Admin) | ✅ DONE | ADMIN-001 |
| WISH-004 | 願望統計儀表板 | ✅ DONE | WISH-003 |

### Open API (新功能)

| Feature ID | 名稱 | 狀態 | 依賴 |
|------------|------|------|------|
| API-001 | API Key 管理 | 📋 TODO | ADMIN-001 |
| API-002 | 教材上傳 API | 📋 TODO | MAT-001, API-001 |
| API-003 | API 文件 (Swagger) | 📋 TODO | API-001 |

### 遊戲化課程系統 (部分完成)

| Feature ID | 名稱 | 狀態 | 依賴 |
|------------|------|------|------|
| GAME-001 | 英打練習遊戲頁面 | ✅ DONE | AUTH-001 |
| GAME-002 | 遊戲結算與獎勵 | ✅ DONE | GAME-001 |
| GAME-003 | 遊戲進度追蹤與排行榜 | ✅ DONE | GAME-002 |

---

## Feature 規格

---

### INFRA-001: RWD 響應式設計

**狀態**: ✅ DONE

**斷點定義**:
```css
/* Mobile First 設計 */
sm: 640px   /* 手機橫向 */
md: 768px   /* 平板直向 */
lg: 1024px  /* 平板橫向 / 小筆電 */
xl: 1280px  /* 桌機 */
2xl: 1536px /* 大螢幕 */
```

**驗收條件**:
- [x] 所有頁面支援 320px ~ 1920px 寬度
- [x] 導覽列在手機版改為漢堡選單
- [x] 卡片列表在手機版為單欄，桌機版為多欄
- [x] 表單在手機版為垂直排列
- [x] 投影片檢視器支援手機全螢幕

**實作檔案**:
- `frontend/components/layout/Header.tsx` - 手機版漢堡選單
- `frontend/components/layout/Sidebar.tsx` - 可收合側邊欄
- `frontend/components/layout/Footer.tsx` - RWD Footer

---

### INFRA-002: 投影片檢視器 (RWD)

**狀態**: ✅ DONE | **路由**: `/components/[componentId]/materials/[materialId]`

**驗收條件**:
- [x] 載入教材 index.html
- [x] 支援全螢幕檢視
- [x] 手機/平板觸控滑動換頁
- [x] 桌機鍵盤 (左右鍵) 換頁
- [x] 顯示講稿 (可開關側邊欄)
- [x] 正確載入 HTML 內的相對路徑資源

**技術方案**:
- 使用 iframe 載入 index.html
- 透過 Firebase Storage signed URL 存取
- 投影片內的圖片使用相對路徑自動解析

**實作檔案**:
- `frontend/app/(member)/components/[componentId]/materials/[materialId]/page.tsx`
- `frontend/components/materials/MaterialViewer.tsx`
- `frontend/components/materials/MaterialIframe.tsx`
- `frontend/components/materials/ScriptSidebar.tsx`

---

### AUTH-001: Email 註冊

**狀態**: ✅ DONE | **路由**: `/register` | **元件**: `RegisterForm.tsx`

**驗收條件**:
- [x] 顯示 Email 輸入欄位
- [x] 顯示密碼輸入欄位 (最少 6 字元)
- [x] 顯示確認密碼輸入欄位
- [x] 密碼不符時顯示錯誤訊息
- [x] 註冊成功後導向 `/dashboard`
- [x] 註冊失敗時顯示 Firebase 錯誤訊息

**實作檔案**:
- `frontend/app/(auth)/register/page.tsx`
- `frontend/components/auth/RegisterForm.tsx`
- `frontend/lib/auth.ts` → `signUp()`

---

### AUTH-002: Email 登入

**狀態**: ✅ DONE | **路由**: `/login` | **元件**: `LoginForm.tsx`

**驗收條件**:
- [x] 顯示 Email 輸入欄位
- [x] 顯示密碼輸入欄位
- [x] 登入成功後導向 `/dashboard`
- [x] 登入失敗時顯示錯誤訊息
- [x] 提供「註冊」連結

**實作檔案**:
- `frontend/app/(auth)/login/page.tsx`
- `frontend/components/auth/LoginForm.tsx`
- `frontend/lib/auth.ts` → `signIn()`

---

### AUTH-003: Google OAuth 登入

**狀態**: ✅ DONE | **元件**: `GoogleLoginButton.tsx`

**驗收條件**:
- [x] 顯示「Continue with Google」按鈕
- [x] 點擊後彈出 Google 登入視窗
- [x] 登入成功後導向 `/dashboard`
- [x] 新用戶自動建立帳號

**實作檔案**:
- `frontend/components/auth/GoogleLoginButton.tsx`
- `frontend/lib/auth.ts` → `signInWithGoogle()`

---

### AUTH-004: 登出

**狀態**: ✅ DONE | **元件**: `Header.tsx`

**驗收條件**:
- [x] Header 顯示使用者 Email
- [x] 顯示「Sign Out」按鈕
- [x] 點擊後清除登入狀態
- [x] 登出後導向首頁

**實作檔案**:
- `frontend/components/layout/Header.tsx`
- `frontend/components/auth/AuthProvider.tsx` → `signOut()`

---

### AUTH-005: Token 驗證 API

**狀態**: ✅ DONE

**API**:
```
POST /api/auth/verify
Authorization: Bearer <token>

Response 200: { success: true, data: { uid, email, emailVerified, isAdmin, role } }
Response 400: { success: false, message: "..." }
```

**實作檔案**:
- `backend/MidoLearning.Api/Endpoints/AuthEndpoints.cs`
- `backend/MidoLearning.Api/Middleware/FirebaseAuthMiddleware.cs`

---

### USER-001: 取得個人資料

**狀態**: ✅ DONE | **路由**: `/profile`

**API**:
```
GET /api/users/profile
Authorization: Bearer <token>

Response 200: { success: true, data: { id, email, displayName, photoUrl, role } }
```

**驗收條件**:
- [x] 顯示使用者 Email
- [x] 顯示使用者 UID
- [x] 顯示帳號建立時間
- [x] 顯示最後登入時間
- [x] 顯示「Edit Profile」按鈕 (功能待實作)

**實作檔案**:
- `frontend/app/(member)/profile/page.tsx`
- `backend/MidoLearning.Api/Endpoints/UserEndpoints.cs`

---

### USER-002: 更新個人資料

**狀態**: 📋 TODO | **路由**: `/profile`

**API**:
```
PATCH /api/users/profile
Authorization: Bearer <token>
Body: { displayName, photoUrl }

Response 200: { success: true, message: "Profile updated" }
```

**驗收條件**:
- [ ] 點擊「Edit Profile」進入編輯模式
- [ ] 可編輯顯示名稱
- [ ] 可上傳頭像到 Firebase Storage
- [ ] 儲存成功顯示提示訊息

---

### ADMIN-001: 管理員儀表板

**狀態**: ✅ DONE | **路由**: `/admin` | **權限**: admin

**驗收條件**:
- [x] 非管理員無法存取，自動導向 `/dashboard`
- [x] 顯示統計卡片 (使用者數、學習元件數、教材數、願望數)
- [x] 顯示最近活動區塊

**實作檔案**:
- `frontend/app/(admin)/layout.tsx`
- `frontend/app/(admin)/admin/page.tsx`

---

### ADMIN-002: 設定/移除管理員角色

**狀態**: ✅ DONE | **權限**: admin

**API**:
```
POST /api/admin/set-admin/{uid}
DELETE /api/admin/remove-admin/{uid}
Authorization: Bearer <token>

Response 200: { success: true, message: "..." }
```

**實作檔案**:
- `backend/MidoLearning.Api/Endpoints/AdminEndpoints.cs`

---

### ADMIN-003: 使用者列表與角色管理

**狀態**: ✅ DONE | **路由**: `/admin/users` | **權限**: admin

**API**:
```
GET /api/admin/users?page=1&limit=20&role=<role>&search=<email>
Authorization: Bearer <token>

Response 200: {
  success: true,
  data: {
    users: [{ uid, email, displayName, role, createdAt, lastLoginAt }],
    total, page, limit
  }
}

PATCH /api/admin/users/{uid}/role
Body: { role: "student" | "teacher" | "admin" }
```

**驗收條件**:
- [x] 顯示使用者表格 (Email, 角色, 建立時間, 最後登入)
- [x] 支援分頁
- [x] 可依角色篩選
- [x] 可搜尋使用者
- [x] 可切換使用者角色 (student/teacher/admin)

**實作檔案**:
- `frontend/app/(admin)/admin/users/page.tsx`
- `frontend/components/admin/UserTable.tsx`
- `frontend/components/admin/UserFilters.tsx`
- `frontend/components/admin/RoleSelect.tsx`
- `frontend/components/admin/Pagination.tsx`
- `backend/MidoLearning.Api/Endpoints/AdminEndpoints.cs`
- `backend/MidoLearning.Api/Models/UserListResponse.cs`

**測試檔案**:
- `backend/MidoLearning.Api.Tests/Endpoints/AdminUsersEndpointsTests.cs` (14 tests)

---

### COMP-001: 學習元件列表頁

**狀態**: ✅ DONE | **路由**: `/components` (學生) `/teacher/components` (老師)

**API**:
```
GET /api/components?page=1&limit=12&category=<adult|kid>&tags=<tag1,tag2>
Authorization: Bearer <token>

Response 200: {
  success: true,
  data: {
    components: [{ id, title, theme, description, category, tags, thumbnail, materialCount, createdAt }],
    total, page, limit
  }
}
```

**驗收條件**:
- [x] 顯示學習元件卡片列表
- [x] 依分類顯示不同主題風格 (大人學: 冰河藍 / 小人學: 火山紅)
- [x] 支援標籤篩選
- [x] 支援分頁
- [x] 點擊卡片進入詳情頁

**實作檔案**:
- `frontend/app/(member)/components/page.tsx`
- `frontend/app/(teacher)/teacher/components/page.tsx`
- `frontend/components/learning/ComponentCard.tsx`
- `frontend/components/learning/ComponentList.tsx`
- `frontend/components/learning/CategoryFilter.tsx`
- `backend/MidoLearning.Api/Endpoints/ComponentEndpoints.cs`

**測試檔案**:
- `backend/MidoLearning.Api.Tests/Tests/Endpoints/ComponentEndpointsTests.cs`

---

### COMP-002: 學習元件詳情頁

**狀態**: ✅ DONE | **路由**: `/components/[id]`

**API**:
```
GET /api/components/{id}
Authorization: Bearer <token>

Response 200: {
  success: true,
  data: {
    id, title, theme, description, category, tags,
    questions: [{ question, answer }],
    materials: [{ id, version, filename, uploadedAt }],
    createdBy, createdAt, updatedAt
  }
}
```

**驗收條件**:
- [x] 顯示主題名稱與說明
- [x] 顯示問與答列表 (手風琴展開)
- [x] 顯示相關標籤
- [x] 顯示教材列表與版本 (待 MAT 系列實作)
- [ ] 學生可下載/預覽教材 (待 MAT-005)
- [x] 老師/管理員可編輯

**實作檔案**:
- `frontend/app/(member)/components/[id]/page.tsx`
- `frontend/components/learning/ComponentDetail.tsx`
- `frontend/components/learning/QuestionList.tsx`
- `frontend/components/learning/TagDisplay.tsx`

---

### COMP-003: 建立學習元件 (Teacher)

**狀態**: ✅ DONE | **路由**: `/teacher/components/upload` | **權限**: teacher, admin

**API**:
```
POST /api/components
Authorization: Bearer <token>
Body: {
  title,              // 必填
  theme,              // 必填
  description?,       // 選填
  category,           // 必填
  tags: [],           // 選填
  questions: [],      // 選填
  thumbnailUrl?       // 選填
}

Response 201: { success: true, data: { id } }
```

**驗收條件**:
- [x] 可輸入標題 (必填)
- [x] 可輸入主題 (必填)
- [x] 可選擇分類 (大人學/小人學)
- [x] 可輸入說明 (選填)
- [x] 可新增多組問與答 (選填)
- [x] 可新增標籤 (選填)
- [x] 可上傳教材 Zip 檔 (選填)
- [x] 儲存後跳轉至詳情頁

**實作檔案**:
- `frontend/app/(teacher)/teacher/components/upload/page.tsx` (建立+上傳整合頁)
- `frontend/app/(teacher)/layout.tsx`
- `frontend/components/learning/ComponentForm.tsx`
- `frontend/lib/api/components.ts`
- `backend/MidoLearning.Api/Models/LearningComponent.cs`
- `backend/MidoLearning.Api/Endpoints/ComponentEndpoints.cs`

---

### COMP-004: 編輯學習元件 (Teacher)

**狀態**: ✅ DONE | **路由**: `/teacher/components/[id]/edit` | **權限**: teacher (自己的), admin

**API**:
```
PUT /api/components/{id}
Authorization: Bearer <token>
Body: { title?, theme?, description?, category?, tags?, questions? }

Response 200: { success: true, data: { ...component } }
```

**驗收條件**:
- [x] 可編輯所有欄位
- [x] 老師只能編輯自己建立的元件
- [x] 管理員可編輯所有元件
- [x] 儲存成功顯示提示
- [x] 可上傳新版教材

**實作檔案**:
- `frontend/app/(teacher)/teacher/components/[id]/edit/page.tsx`
- `frontend/lib/api/components.ts` (updateComponent)
- `backend/MidoLearning.Api/Endpoints/ComponentEndpoints.cs`

---

### COMP-005: 刪除學習元件 (Teacher/Admin)

**狀態**: 📋 TODO | **權限**: teacher (自己的), admin

**API**:
```
DELETE /api/components/{id}
Authorization: Bearer <token>

Response 200: { success: true, message: "Component deleted" }
```

**驗收條件**:
- [ ] 刪除前顯示確認對話框
- [ ] 刪除時一併刪除相關教材
- [ ] 老師只能刪除自己建立的元件
- [ ] 管理員可刪除所有元件

---

### COMP-006: 學習元件標籤系統

**狀態**: 📋 TODO

**API**:
```
GET /api/tags?category=<adult|kid>
Response 200: { success: true, data: { tags: ["tag1", "tag2", ...] } }
```

**驗收條件**:
- [ ] 標籤自動完成建議
- [ ] 可建立新標籤
- [ ] 標籤依分類區分

---

### MAT-001: Zip 教材上傳

**狀態**: ✅ DONE | **權限**: teacher, admin

**API**:
```
POST /api/components/{componentId}/materials
Authorization: Bearer <token>
Content-Type: multipart/form-data
Body: { file: <zip file> }

Response 201: {
  success: true,
  data: { materialId, version, filename, size }
}
```

**Zip 檔案結構規範**:
```
learning-component.zip
├── *.html              # 投影片主檔 (必須，根目錄至少一個 HTML)
├── script.md           # 講稿 (選填)
├── assets/             # 資源目錄
│   ├── images/         # 圖片檔
│   │   ├── slide01.png
│   │   └── diagram.svg
│   ├── videos/         # 影片檔 (選填)
│   └── styles/         # CSS 檔案 (選填)
└── README.md           # 教材說明 (選填)
```

**入口點自動偵測**:
- 優先使用 `index.html` 作為入口點
- 若無 `index.html`，自動使用根目錄第一個 HTML 檔案 (如 `presentation.html`, `train.html`)
- 自動忽略 `__MACOSX` 等系統資料夾

**重要**: 解壓時必須保留原始目錄結構，確保 HTML 內的相對路徑 (如 `./assets/images/slide01.png`) 可正確存取。

**驗收條件**:
- [x] 支援 .zip 格式上傳
- [x] 檔案大小限制 (50MB)
- [x] 顯示上傳進度
- [x] 上傳成功顯示版本號
- [x] 驗證 Zip 內含根目錄 HTML 檔案 (自動偵測入口點)

**實作檔案**:
- `backend/MidoLearning.Api/Endpoints/MaterialEndpoints.cs`
- `backend/MidoLearning.Api/Models/CourseMaterial.cs`
- `backend/MidoLearning.Api/Services/StorageService.cs`
- `frontend/components/materials/MaterialUpload.tsx`

**測試檔案**:
- `backend/MidoLearning.Api.Tests/Tests/Endpoints/MaterialEndpointsTests.cs` (25 tests)

---

### MAT-002: 教材版本管理

**狀態**: ✅ DONE | **權限**: teacher, admin

**API**:
```
GET /api/components/{componentId}/materials
Response 200: {
  success: true,
  data: {
    materials: [{ id, version, filename, size, uploadedAt, uploadedBy }]
  }
}

DELETE /api/materials/{materialId}
Response 200: { success: true, message: "教材已刪除" }
```

**驗收條件**:
- [x] 顯示所有版本列表
- [x] 可下載特定版本
- [x] 可刪除任意版本 (含 v1)
- [x] 版本號自動遞增

**實作檔案**:
- `backend/MidoLearning.Api/Endpoints/MaterialEndpoints.cs`
- `frontend/components/materials/MaterialList.tsx`
- `frontend/components/materials/VersionSelector.tsx`

---

### MAT-003: 教材解壓與儲存

**狀態**: ✅ DONE

**技術規格**:
- 儲存位置: Firebase Storage
- 路徑格式: `materials/{componentId}/v{version}/`
- 解壓後保留原始目錄結構

**解壓後 Storage 結構**:
```
materials/
└── {componentId}/
    └── v{version}/
        ├── index.html
        ├── script.md
        └── assets/
            └── images/
                ├── slide01.png
                └── diagram.svg
```

**驗收條件**:
- [x] Zip 自動解壓至 Storage
- [x] 完整保留原始目錄結構 (確保相對路徑有效)
- [x] 生成檔案清單 manifest
- [x] 支援投影片 HTML 線上檢視 (可讀取相對路徑圖片)

**實作檔案**:
- `backend/MidoLearning.Api/Services/IStorageService.cs`
- `backend/MidoLearning.Api/Services/StorageService.cs`
- `backend/MidoLearning.Api/Endpoints/MaterialEndpoints.cs` (上傳時解壓)

---

### MAT-004: 教材下載/預覽

**狀態**: ✅ DONE

**API**:
```
GET /api/materials/{materialId}/download
Response: Redirect to signed URL for zip download

GET /api/materials/{materialId}/manifest
Response: { materialId, componentId, version, entryPoint, files, baseUrl }

GET /api/materials/{materialId}/content/{*path}
Response: Proxy content from Firebase Storage (visibility-based access control)
```

**內容代理存取控制**:
- `published` 元件：允許匿名存取
- `login` 元件：需要已驗證使用者
- `private` 元件：僅擁有者或管理員

**驗收條件**:
- [x] 可下載完整 Zip (signed URL redirect)
- [x] 投影片 HTML 可線上檢視 (RWD 支援)
- [x] HTML 內的相對路徑圖片可正確載入
- [x] 講稿 Markdown 可預覽 (側邊欄)
- [x] 使用內容代理 API (基於元件可見度存取控制)

**實作檔案**:
- `backend/MidoLearning.Api/Endpoints/MaterialEndpoints.cs`
- `frontend/components/materials/MaterialIframe.tsx`
- `frontend/components/materials/ScriptSidebar.tsx`

---

### MAT-005: 教材檢視頁 (RWD iframe)

**狀態**: ✅ DONE | **路由**: `/components/[componentId]/materials/[materialId]`

**用戶旅程**:
```
學習元件詳情頁 → 點擊教材 → 教材檢視頁 (iframe 全螢幕)
                           ↓
                   可切換版本 / 下載 / 關閉
                           ↓
                   關閉 → 返回學習元件詳情頁
```

**API**:
```
GET /api/materials/{materialId}/manifest
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "materialId": "mat-001",
    "componentId": "comp-001",
    "version": 3,
    "entryPoint": "index.html",
    "files": ["index.html", "script.md", "assets/images/slide01.png", ...],
    "baseUrl": "https://storage.googleapis.com/.../materials/comp-001/v3/"
  }
}

GET /api/components/{componentId}/materials/versions
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "versions": [
      { "materialId": "mat-003", "version": 3, "uploadedAt": "...", "isCurrent": true },
      { "materialId": "mat-002", "version": 2, "uploadedAt": "..." },
      { "materialId": "mat-001", "version": 1, "uploadedAt": "..." }
    ]
  }
}
```

**前端頁面結構**:
```
┌──────────────────────────────────────────────────────────────┐
│  ← 返回學習元件    教材名稱 v3 ▼    [下載] [全螢幕] [✕ 關閉] │  ← Header Bar
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│                    ┌────────────────────┐                    │
│                    │                    │                    │
│                    │      iframe        │                    │
│                    │   (index.html)     │                    │
│                    │                    │                    │
│                    │   RWD 響應式顯示   │                    │
│                    │                    │                    │
│                    └────────────────────┘                    │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**iframe 內嵌相容性**:
```typescript
// 1. 取得教材 manifest，找到 entryPoint (預設 index.html)
// 2. 建構完整 URL: baseUrl + entryPoint
// 3. 使用 iframe 載入，設定適當的 sandbox 屬性

<iframe
  src={`${baseUrl}${entryPoint}`}
  className="w-full h-full"
  sandbox="allow-scripts allow-same-origin allow-popups"
  allow="fullscreen"
  style={{ border: 'none' }}
/>
```

**相對路徑解析**:
- 教材 HTML 內的相對路徑 (如 `./assets/images/slide01.png`) 會自動相對於 `baseUrl` 解析
- Firebase Storage 的 CORS 需設定允許前端域名
- 所有檔案使用 signed URL 或公開 URL 存取

**版本切換邏輯**:
```typescript
// 預設顯示最新版本
const defaultVersion = versions.find(v => v.isCurrent) || versions[0];

// 版本選擇下拉選單
<select onChange={(e) => navigateToVersion(e.target.value)}>
  {versions.map(v => (
    <option key={v.materialId} value={v.materialId}>
      v{v.version} - {formatDate(v.uploadedAt)}
    </option>
  ))}
</select>
```

**驗收條件**:
- [x] 從學習元件詳情頁點擊教材可進入檢視頁
- [x] 自動找到教材首頁 (index.html) 並用 iframe 顯示
- [x] iframe 內容 RWD 響應式，適應不同螢幕
- [x] HTML 內的相對路徑圖片/CSS/JS 可正確載入
- [x] 版本下拉選單可切換不同版本
- [x] 無指定版本時顯示最新版
- [x] 可下載當前版本的 Zip 檔
- [x] 支援全螢幕檢視
- [x] 關閉按鈕返回學習元件詳情頁
- [x] 手機版支援觸控操作
- [x] 講稿 (script.md) 可選擇性顯示為側邊欄

**實作檔案**:
- `frontend/app/(member)/components/[componentId]/materials/[materialId]/page.tsx`
- `frontend/components/materials/MaterialViewer.tsx`
- `frontend/components/materials/MaterialHeader.tsx`
- `frontend/components/materials/VersionSelector.tsx`
- `frontend/components/materials/MaterialIframe.tsx`
- `frontend/components/materials/ScriptSidebar.tsx`
- `frontend/components/materials/MaterialUpload.tsx`
- `frontend/components/materials/MaterialList.tsx`
- `frontend/lib/api/materials.ts`
- `frontend/types/material.ts`

---

### WISH-001: 首頁願望輸入介面

**狀態**: ✅ DONE | **路由**: `/` (首頁)

**驗收條件**:
- [x] 首頁顯示「許願 ChatBot」區塊
- [x] 可愛的對話框介面
- [x] 提示文字: "你想學什麼呢？告訴米豆吧！"
- [x] 可輸入學習願望
- [x] 訪客也可提交 (無需登入)

**實作檔案**:
- `frontend/components/wish/WishChatBot.tsx`
- `frontend/app/(public)/page.tsx`

---

### WISH-002: 願望儲存 API

**狀態**: ✅ DONE

**API**:
```
POST /api/wishes
Body: { content, email? }

Response 201: { success: true, data: { wishId }, message: "願望已收到！" }
```

**驗收條件**:
- [x] 儲存願望內容
- [x] 可選填 Email (通知用)
- [x] 記錄提交時間
- [x] 提交成功顯示感謝訊息

**實作檔案**:
- `backend/MidoLearning.Api/Endpoints/WishEndpoints.cs`
- `backend/MidoLearning.Api/Models/Wish.cs`

---

### WISH-003: 願望池管理 (Admin)

**狀態**: ✅ DONE | **路由**: `/admin/wishes` | **權限**: admin

**願望狀態流轉**:
```
┌─────────┐     ┌────────────┐     ┌───────────┐
│ pending │ ──▶ │ processing │ ──▶ │ completed │ ──▶ 連結學習元件
│ (待處理) │     │  (處理中)   │     │  (已完成)  │
└─────────┘     └────────────┘     └───────────┘
     │                │
     ▼                ▼
┌─────────┐     ┌─────────┐
│ deleted │     │ deleted │
│ (已刪除) │     │ (已刪除) │
└─────────┘     └─────────┘
```

**API**:
```
GET /api/admin/wishes?page=1&limit=20&status=<pending|processing|completed|deleted>
Authorization: Bearer <token>

Response 200: {
  success: true,
  data: {
    wishes: [{
      id, content, email, status,
      linkedComponentId?,  // 已完成時連結的學習元件
      createdAt, updatedAt, processedBy?
    }],
    total, page, limit
  }
}

PATCH /api/admin/wishes/{id}/status
Body: { status: "processing" | "completed" | "deleted", linkedComponentId?: string }

POST /api/admin/wishes/{id}/create-component
Body: { title, theme, description, category, tags, questions }
Response 201: { success: true, data: { componentId, wishId } }
// 自動將願望標記為 completed 並連結
```

**用戶旅程 - 處理願望**:
```
1. Admin 進入願望池 → 看到 pending 願望列表
2. 點擊「開始處理」→ 狀態變 processing
3. 方式 A: 直接從願望建立學習元件
   - 點擊「建立學習元件」→ 表單預填願望內容
   - 建立成功 → 願望自動 completed + 連結
4. 方式 B: 連結現有學習元件
   - 搜尋/選擇現有元件 → 願望 completed + 連結
5. 不處理: 點擊「刪除」→ 狀態變 deleted
```

**驗收條件**:
- [x] 顯示願望列表 (分頁)
- [x] 依狀態篩選 (tabs: 待處理/處理中/已完成/已刪除)
- [x] 顯示願望內容、提交時間、狀態
- [x] 可變更狀態: pending → processing → completed/deleted
- [x] 已完成的願望顯示連結的學習元件
- [x] 可從願望直接建立學習元件 (預填內容)
- [x] 可連結到現有學習元件
- [x] 搜尋願望內容

**實作檔案**:
- `frontend/app/(admin)/admin/wishes/page.tsx`
- `frontend/components/admin/wishes/WishCard.tsx`
- `frontend/components/admin/wishes/WishStatusTabs.tsx`
- `frontend/components/admin/wishes/CreateComponentModal.tsx`
- `frontend/components/admin/wishes/LinkComponentModal.tsx`
- `frontend/lib/api/wishes.ts`
- `frontend/types/wish.ts`
- `backend/MidoLearning.Api/Endpoints/WishEndpoints.cs` (admin endpoints)
- `backend/MidoLearning.Api/Models/Wish.cs` (extended)

**測試檔案**:
- `backend/MidoLearning.Api.Tests/Tests/Endpoints/WishAdminEndpointsTests.cs` (14 tests)

---

### WISH-004: 願望統計儀表板

**狀態**: ✅ DONE | **路由**: `/admin/wishes/stats` | **權限**: admin

**API**:
```
GET /api/admin/wishes/stats
Authorization: Bearer <token>

Response 200: {
  success: true,
  data: {
    totalCount: number,
    byStatus: { pending: n, processing: n, completed: n, deleted: n },
    weeklyTrend: [{ date: "2026-01-25", count: n }, ...],
    avgProcessingTimeHours: number,
    completionRate: number  // 0.0 - 1.0
  }
}
```

**驗收條件**:
- [x] 顯示願望總數統計 (依狀態分類)
- [x] 顯示最近 7 天趨勢 (bar chart)
- [x] 顯示平均處理時間 (hours)
- [x] 處理率 (completed / total excluding deleted)
- [x] 從願望列表頁可導航到統計頁

**實作檔案**:
- `frontend/app/(admin)/admin/wishes/stats/page.tsx`
- `frontend/lib/api/wishes.ts` (getWishStats)
- `frontend/types/wish.ts` (WishStats, DailyWishCount)
- `backend/MidoLearning.Api/Endpoints/WishEndpoints.cs` (GetWishStats)
- `backend/MidoLearning.Api/Models/Wish.cs` (WishStatsResponse, DailyWishCount)
- `backend/MidoLearning.Api/Services/FirebaseService.cs` (GetWishStatsAsync)

**測試檔案**:
- `backend/MidoLearning.Api.Tests/Endpoints/WishStatsEndpointsTests.cs` (7 tests)

---

### API-001: API Key 管理

**狀態**: 📋 TODO | **路由**: `/admin/api-keys` | **權限**: admin

**API**:
```
POST /api/admin/api-keys
Body: { name, permissions: ["upload"] }
Response 201: { success: true, data: { apiKey, keyId } }

GET /api/admin/api-keys
Response 200: { success: true, data: { keys: [{ id, name, permissions, createdAt, lastUsedAt }] } }

DELETE /api/admin/api-keys/{keyId}
Response 200: { success: true, message: "API Key deleted" }
```

**驗收條件**:
- [ ] 可建立新 API Key
- [ ] Key 只顯示一次，需立即複製
- [ ] 可設定權限範圍
- [ ] 可停用/刪除 Key

---

### API-002: 教材上傳 API

**狀態**: 📋 TODO

**API**:
```
POST /api/v1/components/{id}/materials
X-API-Key: <api-key>
Content-Type: multipart/form-data
Body: { file: <zip file> }

Response 201: { success: true, data: { materialId, version } }
Response 401: { success: false, message: "Invalid API Key" }
Response 403: { success: false, message: "Permission denied" }
```

**驗收條件**:
- [ ] 支援 API Key 認證
- [ ] 檢查權限
- [ ] 回傳標準錯誤格式
- [ ] 記錄 API 使用紀錄

---

### API-003: API 文件 (Swagger)

**狀態**: 📋 TODO | **路由**: `/api/docs`

**驗收條件**:
- [ ] Swagger UI 可瀏覽
- [ ] 包含所有 Open API endpoints
- [ ] 包含認證說明
- [ ] 包含範例請求/回應

---

### GAME-001: 英打練習遊戲頁面

**狀態**: 🚧 WIP | **路由**: `/courses/[id]/play` | **類型**: 遊戲化課程

**API**:
```
GET /api/courses/{id}                    → 取得遊戲課程資訊 (含題庫)
POST /api/games/start                    → 開始遊戲 (建立 session)
POST /api/games/complete                 → 結算遊戲 (計算分數、更新進度)
```

**驗收條件**:
- [ ] 確認課程類型為 `game` 且 `gameType` 為 `typing`
- [ ] 顯示遊戲標題、等級、目標 WPM
- [ ] 顯示倒數計時器（可暫停/繼續）
- [ ] 顯示題目文字
- [ ] 輸入框即時驗證（正確顯示綠色，錯誤顯示紅色）
- [ ] 即時顯示統計（WPM、正確率、連擊數）
- [ ] 時間到或完成題目後顯示結算畫面
- [ ] 結算畫面顯示：分數、星級、WPM、正確率
- [ ] 提供「再玩一次」和「返回」按鈕

**遊戲規則**:
- **WPM 計算**: `(正確字元數 / 5) / (秒數 / 60)`
- **正確率**: `正確字元數 / 總字元數 * 100%`
- **連擊系統**: 連續正確字元 +1，錯誤歸零
- **星級評分**:
  - ⭐⭐⭐ (3星): WPM ≥ 目標 WPM 且正確率 ≥ 95%
  - ⭐⭐ (2星): WPM ≥ 目標 WPM × 0.8 且正確率 ≥ 85%
  - ⭐ (1星): 完成遊戲

**實作檔案**:
- `frontend/app/(member)/courses/[id]/play/page.tsx`
- `frontend/components/game/GameHeader.tsx`
- `frontend/components/game/QuestionDisplay.tsx`
- `frontend/components/game/TypingInput.tsx`
- `frontend/components/game/StatsPanel.tsx`
- `frontend/components/game/ResultModal.tsx`
- `frontend/hooks/game/useTypingGame.ts`
- `frontend/hooks/game/useGameTimer.ts`

---

### GAME-002: 遊戲結算與獎勵

**狀態**: 📋 TODO

**API**:
```
POST /api/games/complete
Body: {
  courseId, sessionId, score, wpm, accuracy, stars, timeSpent, correctChars, totalChars
}

Response 200: {
  success: true,
  data: {
    experienceGained, coinsEarned, levelUp, newLevel,
    achievements: [{ id, name, icon }]
  }
}
```

**驗收條件**:
- [ ] 遊戲結束後呼叫結算 API
- [ ] 顯示獲得的經驗值（+XP 動畫）
- [ ] 顯示獲得的金幣（+Coin 動畫）
- [ ] 升級時顯示特效與新等級
- [ ] 解鎖成就時顯示提示
- [ ] 更新使用者的總遊戲次數、最佳成績

**經驗值計算**:
```
baseExp = 10
expGained = baseExp × stars × (accuracy / 100)
```

**金幣計算**:
```
baseCoins = 5
coinsEarned = baseCoins × stars
```

**實作檔案**:
- `backend/MidoLearning.Api/Endpoints/GameEndpoints.cs` → `CompleteGame()`
- `frontend/components/game/ResultModal.tsx` (更新以顯示獎勵)
- `frontend/components/game/LevelUpEffect.tsx`

---

### GAME-003: 遊戲進度追蹤與排行榜

**狀態**: 📋 TODO

**API**:
```
GET /api/games/progress?gameType=typing      → 取得個人遊戲進度
GET /api/games/leaderboard?gameType=typing&limit=10  → 取得排行榜
```

**Progress Response**:
```json
{
  "success": true,
  "data": {
    "gameType": "typing",
    "totalPlays": 25,
    "bestScore": 450,
    "bestWPM": 65,
    "bestAccuracy": 98.5,
    "totalStars": 45,
    "completedLevels": [1, 2, 3],
    "recentSessions": [
      { "level": 3, "score": 420, "wpm": 62, "accuracy": 96, "stars": 3, "playedAt": "..." }
    ]
  }
}
```

**Leaderboard Response**:
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      { "rank": 1, "userId": "...", "displayName": "User A", "bestScore": 500, "bestWPM": 70 },
      { "rank": 2, "userId": "...", "displayName": "User B", "bestScore": 480, "bestWPM": 68 }
    ]
  }
}
```

**驗收條件**:
- [ ] Dashboard 顯示遊戲統計卡片（總遊戲次數、最佳成績、最高 WPM）
- [ ] 遊戲頁面顯示個人最佳紀錄
- [ ] 排行榜頁面顯示全站前 10 名
- [ ] 排行榜可依 WPM 或分數排序
- [ ] 顯示自己的排名

**實作檔案**:
- `backend/MidoLearning.Api/Endpoints/GameEndpoints.cs` → `GetProgress()`, `GetLeaderboard()`
- `frontend/app/(member)/dashboard/page.tsx` (更新以顯示遊戲統計)
- `frontend/app/(member)/leaderboard/page.tsx` (新增排行榜頁面)

---

## 資料模型 (Firestore)

```typescript
// users/{userId}
{
  email: string,
  displayName?: string,
  photoUrl?: string,
  role: "student" | "teacher" | "admin",
  level?: number,              // 玩家等級 (預設 1)
  experience?: number,         // 經驗值 (預設 0)
  coins?: number,              // 金幣 (預設 0)
  createdAt: Timestamp,
  lastLoginAt?: Timestamp
}

// components/{componentId}
{
  title: string,
  theme: string,
  description: string,
  category: "adult" | "kid",
  tags: string[],
  questions: [{ question: string, answer: string }],
  thumbnail?: string,
  createdBy: string,  // userId
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// courses/{courseId}
{
  title: string,
  description: string,
  instructor: string,
  thumbnail: string,
  price: number,
  status: "draft" | "published",
  category: string,
  type: "video" | "article" | "game",  // 課程類型
  gameConfig?: {                        // 遊戲設定 (僅當 type = "game")
    gameType: "typing" | "math" | "memory",
    level: number,
    timeLimit: number,                  // 秒
    targetWPM?: number,                 // 目標 WPM (僅英打遊戲)
    questions: Array<{                  // 題庫
      text: string,
      difficulty?: "easy" | "medium" | "hard"
    }>
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// materials/{materialId}
{
  componentId: string,
  version: number,
  filename: string,
  size: number,
  storagePath: string,
  manifest: { files: string[] },
  uploadedBy: string,  // userId
  uploadedAt: Timestamp
}

// wishes/{wishId}
{
  content: string,
  email?: string,
  status: "pending" | "reviewed" | "archived",
  createdAt: Timestamp,
  reviewedAt?: Timestamp,
  reviewedBy?: string
}

// apiKeys/{keyId}
{
  name: string,
  keyHash: string,  // hashed API key
  permissions: string[],
  createdBy: string,
  createdAt: Timestamp,
  lastUsedAt?: Timestamp,
  isActive: boolean
}

// tags/{tagId}
{
  name: string,
  category: "adult" | "kid",
  usageCount: number
}

// gameSessions/{sessionId}
{
  userId: string,
  courseId: string,
  gameType: "typing" | "math" | "memory",
  level: number,
  score: number,
  wpm?: number,                              // Words Per Minute (僅英打遊戲)
  accuracy: number,                          // 正確率 (%)
  stars: 1 | 2 | 3,                          // 星級評分
  timeSpent: number,                         // 實際花費秒數
  correctChars?: number,                     // 正確字元數 (僅英打遊戲)
  totalChars?: number,                       // 總字元數 (僅英打遊戲)
  createdAt: Timestamp
}

// gameProgress/{userId}_{gameType}
{
  userId: string,
  gameType: "typing" | "math" | "memory",
  totalPlays: number,                        // 總遊戲次數
  bestScore: number,                         // 最高分數
  bestWPM?: number,                          // 最高 WPM (僅英打遊戲)
  bestAccuracy: number,                      // 最高正確率
  totalStars: number,                        // 累積星數
  completedLevels: number[],                 // 已完成關卡
  updatedAt: Timestamp
}
```

---

## 視覺主題

### 大人學 (Adult Learning)
- **主題**: 高山冰河
- **色系**: 冷色調
- **主色**: `#1E40AF` (深藍)
- **輔色**: `#60A5FA` (天藍), `#E0F2FE` (淺藍)
- **意象**: 沉穩、專業、深度

### 小人學 (Kid Learning)
- **主題**: 地底火山
- **色系**: 暖色調
- **主色**: `#DC2626` (火山紅)
- **輔色**: `#FB923C` (橙), `#FEF3C7` (淺黃)
- **意象**: 活力、探索、冒險

---

## 版本記錄

| 版本 | 日期 | 說明 |
|------|------|------|
| v0.1.0 | 2026-01-30 | 專案骨架與認證系統 |
| v0.1.1 | 2026-01-31 | Spec-Driven Development 格式 |
| v0.2.0 | 2026-01-31 | 米豆學習網全新規格：角色系統、學習元件、教材上傳、願望 ChatBot、Open API |
| v0.2.1 | 2026-01-31 | 新增 RWD 支援、投影片檢視器、教材 Zip 結構規範 |
| v0.3.0 | 2026-01-31 | WISH-001/002 完成、ADMIN-003 完成 (TDD)、COMP-001~003 完成 (TDD)、新增 MAT-005 教材檢視頁規格 |
| v0.4.0 | 2026-01-31 | MAT-001~005 教材上傳系統完成 (TDD, 25 tests)：Zip 上傳、版本管理、解壓儲存、下載預覽、RWD iframe 檢視器 |
| v0.5.0 | 2026-01-31 | WISH-003 願望池管理完成 (TDD, 14 tests)：狀態流轉、從願望建立元件、連結現有元件、管理介面 |
| v0.5.1 | 2026-01-31 | WISH-004 願望統計儀表板完成 (TDD, 7 tests)：總數統計、7日趨勢、平均處理時間、完成率 |
| v0.6.0 | 2026-01-31 | INFRA-001/002 RWD 完成、COMP-003/004 優化：欄位簡化（僅標題/主題必填）、建立+上傳整合、Header/Sidebar/Footer RWD 修正 |
| v0.6.1 | 2026-01-31 | 教材系統優化：內容代理 API (取代 signed URL)、自動偵測 HTML 入口點、v1 版本可刪除、分類動態管理 |
| v0.6.2 | 2026-02-12 | 遊戲化課程系統完成：英打練習遊戲介面 (GAME-001)、遊戲結算與獎勵 (GAME-002)、進度追蹤與排行榜 (GAME-003) |
