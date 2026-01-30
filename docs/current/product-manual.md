# 米豆學習網 - 產品手冊 (Product Truth)

> 這是產品的「唯一真相來源」。記錄所有已上線功能的完整規格。

**版本**: v0.1.0
**最後更新**: 2026-01-31

---

## 1. 產品概述

米豆學習網是一個線上學習平台，提供「大人學」與「小人學」兩大分類的學習元件。

### 技術棧
| 層級 | 技術 |
|------|------|
| 前端 | Next.js 14 (App Router) + Tailwind CSS |
| 後端 | .NET 8 Minimal API |
| 資料庫 | Firebase Firestore |
| 認證 | Firebase Authentication |
| 儲存 | Firebase Storage |
| 部署 | Google Cloud Run |

### 環境 URL
| 環境 | 前端 | 後端 |
|------|------|------|
| 生產 | https://mido-learning-frontend-24mwb46hra-de.a.run.app | https://mido-learning-api-24mwb46hra-de.a.run.app |
| 本地 | http://localhost:3000 | http://localhost:5000 |

---

## 2. 角色系統

| 角色 | 說明 | Firebase Custom Claim |
|------|------|----------------------|
| 訪客 (guest) | 未登入用戶 | 無 token |
| 學生 (student) | 一般會員 | `{ role: "student" }` |
| 老師 (teacher) | 可建立教材 | `{ role: "teacher" }` |
| 管理員 (admin) | 系統管理 | `{ admin: true }` |

**預設管理員**: `pin0513@gmail.com`

---

## 3. 已上線功能

### 3.1 認證系統 ✅

#### Email 註冊 (AUTH-001)
- **路由**: `/register`
- **功能**: 使用 Email 與密碼註冊新帳號
- **驗證**: 密碼最少 6 字元，需確認密碼

#### Email 登入 (AUTH-002)
- **路由**: `/login`
- **功能**: 使用 Email 與密碼登入
- **成功後**: 導向 `/dashboard`

#### Google OAuth (AUTH-003)
- **功能**: 使用 Google 帳號登入/註冊
- **新用戶**: 自動建立帳號

#### 登出 (AUTH-004)
- **位置**: Header 右上角
- **功能**: 清除登入狀態，導向首頁

#### Token 驗證 API (AUTH-005)
```
POST /api/auth/verify
Authorization: Bearer <token>

Response: { success: true, data: { uid, email, emailVerified, isAdmin } }
```

### 3.2 使用者功能 ✅

#### 個人資料頁 (USER-001)
- **路由**: `/profile`
- **顯示**: Email, UID, 建立時間, 最後登入時間
- **API**: `GET /api/users/profile`

### 3.3 管理員功能 ✅

#### 管理員儀表板 (ADMIN-001)
- **路由**: `/admin`
- **權限**: 僅 admin 可存取
- **顯示**: 統計卡片、最近活動

#### 角色管理 API (ADMIN-002)
```
POST /api/admin/set-admin/{uid}     # 設定管理員
DELETE /api/admin/remove-admin/{uid} # 移除管理員
```

---

## 4. 前端路由結構

```
app/
├── (public)/           # 公開頁面
│   ├── page.tsx        # 首頁 /
│   └── about/page.tsx  # 關於 /about
├── (auth)/             # 認證頁面 (已登入則重導)
│   ├── login/page.tsx  # 登入 /login
│   └── register/page.tsx # 註冊 /register
├── (member)/           # 會員頁面 (需登入)
│   ├── dashboard/page.tsx # 儀表板 /dashboard
│   └── profile/page.tsx   # 個人資料 /profile
└── (admin)/            # 管理員頁面 (需 admin 權限)
    └── admin/page.tsx  # 管理後台 /admin
```

---

## 5. 後端 API 結構

```
/api/auth/verify     POST   # Token 驗證
/api/users/profile   GET    # 取得個人資料
/api/admin/set-admin/{uid}     POST   # 設定管理員
/api/admin/remove-admin/{uid}  DELETE # 移除管理員
```

---

## 6. 待實作功能

詳見 `spec/FunctionalMap.md` 中標記為 📋 TODO 的 Feature。

主要包括:
- 學習元件系統 (COMP-001 ~ COMP-006)
- 教材上傳系統 (MAT-001 ~ MAT-004)
- 願望 ChatBot (WISH-001 ~ WISH-004)
- Open API (API-001 ~ API-003)
- RWD 支援 (INFRA-001, INFRA-002)
