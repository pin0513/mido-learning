# Mido Learning 功能規格

> **Spec-Driven Development**: 每個 Feature 可獨立開發與驗證。使用 Feature ID 指定實作目標。

---

## 專案資訊

| 項目 | 值 |
|------|-----|
| 專案名稱 | Mido Learning |
| 版本 | v0.1.0 |
| 前端 URL | https://mido-learning-frontend-24mwb46hra-de.a.run.app |
| 後端 URL | https://mido-learning-api-24mwb46hra-de.a.run.app |
| 本地前端 | http://localhost:3000 |
| 本地後端 | http://localhost:5000 |

---

## 角色定義

| 角色 ID | 名稱 | Firebase Custom Claim |
|---------|------|----------------------|
| `guest` | 訪客 | (無 token) |
| `member` | 會員 | `{ }` |
| `admin` | 管理員 | `{ admin: true }` |

---

## Feature 清單

| Feature ID | 名稱 | 狀態 | 依賴 |
|------------|------|------|------|
| AUTH-001 | Email 註冊 | ✅ DONE | - |
| AUTH-002 | Email 登入 | ✅ DONE | - |
| AUTH-003 | Google OAuth 登入 | ✅ DONE | - |
| AUTH-004 | 登出 | ✅ DONE | AUTH-001 |
| AUTH-005 | Token 驗證 API | ✅ DONE | AUTH-001 |
| USER-001 | 取得個人資料 | ✅ DONE | AUTH-001 |
| USER-002 | 更新個人資料 | 📋 TODO | USER-001 |
| ADMIN-001 | 管理員儀表板 | ✅ DONE | AUTH-001 |
| ADMIN-002 | 設定/移除管理員角色 | ✅ DONE | ADMIN-001 |
| ADMIN-003 | 使用者列表 | 📋 TODO | ADMIN-001 |
| COURSE-001 | 課程列表頁 | 📋 TODO | AUTH-001 |
| COURSE-002 | 課程詳情頁 | 📋 TODO | COURSE-001 |
| COURSE-003 | 課程 CRUD API | 📋 TODO | ADMIN-001 |
| COURSE-004 | 課程報名 | 📋 TODO | COURSE-002 |
| LEARN-001 | 課程學習頁 | 📋 TODO | COURSE-004 |
| LEARN-002 | 學習進度追蹤 | 📋 TODO | LEARN-001 |

---

## Feature 規格

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

Response 200: { success: true, data: { uid, email, emailVerified, isAdmin } }
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

Response 200: { success: true, data: { id, email, displayName, photoUrl } }
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
- [x] 顯示統計卡片 (使用者數、課程數、報名數、完成率)
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

### ADMIN-003: 使用者列表

**狀態**: 📋 TODO | **路由**: `/admin/users` | **權限**: admin

**API**:
```
GET /api/admin/users?page=1&limit=20
Authorization: Bearer <token>

Response 200: {
  success: true,
  data: {
    users: [{ uid, email, displayName, role, createdAt, lastLoginAt }],
    total, page, limit
  }
}
```

**驗收條件**:
- [ ] 顯示使用者表格 (Email, 角色, 建立時間, 最後登入)
- [ ] 支援分頁
- [ ] 可搜尋使用者
- [ ] 可切換使用者角色

---

### COURSE-001: 課程列表頁

**狀態**: 📋 TODO | **路由**: `/courses`

**API**:
```
GET /api/courses?page=1&limit=12&category=<category>
Authorization: Bearer <token>

Response 200: {
  success: true,
  data: {
    courses: [{ id, title, description, instructor, thumbnail, price, lessonCount, enrollmentCount }],
    total, page, limit
  }
}
```

**驗收條件**:
- [ ] 顯示課程卡片列表 (縮圖、標題、講師、價格)
- [ ] 支援分頁或無限滾動
- [ ] 可依分類篩選
- [ ] 點擊卡片進入課程詳情

---

### COURSE-002: 課程詳情頁

**狀態**: 📋 TODO | **路由**: `/courses/[id]`

**API**:
```
GET /api/courses/{id}
Authorization: Bearer <token>

Response 200: {
  success: true,
  data: { id, title, description, instructor, thumbnail, price, status, createdAt, lessons: [...], isEnrolled }
}
```

**驗收條件**:
- [ ] 顯示課程標題、描述、講師資訊
- [ ] 顯示課程大綱 (章節列表)
- [ ] 顯示「報名」或「開始學習」按鈕
- [ ] 已報名顯示學習進度

---

### COURSE-003: 課程 CRUD API

**狀態**: 📋 TODO | **權限**: admin

**API**:
```
POST   /api/admin/courses         → 建立課程
GET    /api/admin/courses/{id}    → 取得課程 (含草稿)
PUT    /api/admin/courses/{id}    → 更新課程
DELETE /api/admin/courses/{id}    → 刪除課程
```

**驗收條件**:
- [ ] 可建立新課程 (標題、描述、講師、價格、狀態)
- [ ] 可編輯課程資訊
- [ ] 可刪除課程
- [ ] 可管理課程章節

---

### COURSE-004: 課程報名

**狀態**: 📋 TODO

**API**:
```
POST   /api/courses/{id}/enroll   → 報名課程
DELETE /api/courses/{id}/enroll   → 取消報名
```

**驗收條件**:
- [ ] 點擊「報名」按鈕成功報名
- [ ] 報名後顯示「開始學習」按鈕
- [ ] 可取消報名

---

### LEARN-001: 課程學習頁

**狀態**: 📋 TODO | **路由**: `/courses/[id]/learn`

**驗收條件**:
- [ ] 左側顯示章節列表
- [ ] 主區域顯示影片播放器或課程內容
- [ ] 顯示目前進度
- [ ] 可標記章節為已完成

---

### LEARN-002: 學習進度追蹤

**狀態**: 📋 TODO

**API**:
```
POST /api/courses/{courseId}/lessons/{lessonId}/complete → 標記完成
GET  /api/courses/{courseId}/progress                    → 取得進度
```

**驗收條件**:
- [ ] 完成章節後自動更新進度
- [ ] Dashboard 顯示學習統計
- [ ] 課程完成率計算正確

---

## 資料模型 (Firestore)

```typescript
// users/{userId}
{ email, displayName?, photoUrl?, role: "member"|"admin", createdAt, lastLoginAt? }

// courses/{courseId}
{ title, description, instructor, thumbnail, price, status: "draft"|"published", category, createdAt, updatedAt }

// courses/{courseId}/lessons/{lessonId}
{ title, content, videoUrl?, duration, order }

// enrollments/{viserId}_{courseId}
{ userId, courseId, enrolledAt, status: "active"|"completed"|"cancelled" }

// progress/{userId}_{courseId}_{lessonId}
{ userId, courseId, lessonId, completed, completedAt? }
```

---

## 版本記錄

| 版本 | 日期 | 說明 |
|------|------|------|
| v0.1.0 | 2026-01-30 | 專案骨架與認證系統 |
| v0.1.1 | 2026-01-31 | Spec-Driven Development 格式，已完成功能打勾 |
