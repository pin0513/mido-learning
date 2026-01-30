# Spec: COMP-001~003 學習元件 CRUD (核心功能)

**Date**: 2026-01-31
**Author**: PM
**Feature ID**: COMP-001, COMP-002, COMP-003
**Priority**: P0 (核心功能)
**Depends On**: AUTH-001 ✅

---

## Background

學習元件是米豆學習網的核心。老師可以建立學習元件（包含主題、說明、問與答），學生可以瀏覽和學習。這是整個教材系統的基礎。

---

## User Stories

- As a **Teacher**, I want 建立學習元件, so that 學生可以學習我的教材
- As a **Student**, I want 瀏覽學習元件列表, so that 找到想學習的內容
- As a **Student**, I want 查看學習元件詳情, so that 了解完整內容與問答

---

## Acceptance Criteria

### COMP-001: 學習元件列表頁
- [ ] 學生路由: `/components`
- [ ] 老師路由: `/teacher/components` (顯示「我的元件」)
- [ ] 顯示卡片列表 (縮圖、標題、分類、標籤)
- [ ] 大人學使用冷色調 (藍)，小人學使用暖色調 (紅)
- [ ] 支援分類篩選 (大人學/小人學/全部)
- [ ] 支援標籤篩選
- [ ] 支援分頁或無限滾動
- [ ] 點擊卡片進入詳情頁

### COMP-002: 學習元件詳情頁
- [ ] 路由: `/components/[id]`
- [ ] 顯示主題名稱、說明
- [ ] 顯示問與答列表 (可展開/收合)
- [ ] 顯示相關標籤
- [ ] 顯示教材列表 (待 MAT 系列實作)
- [ ] 老師/管理員顯示「編輯」按鈕

### COMP-003: 建立學習元件
- [ ] 路由: `/teacher/components/new`
- [ ] 權限: teacher, admin
- [ ] 表單欄位: 標題、主題、說明、分類、標籤、問與答
- [ ] 問與答可動態新增/刪除多組
- [ ] 標籤支援自動完成
- [ ] 儲存後跳轉至詳情頁

---

## API Specification

### GET /api/components (列表)
```http
GET /api/components?page=1&limit=12&category=adult&tags=python,ai
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "components": [
      {
        "id": "comp-001",
        "title": "Python 基礎入門",
        "theme": "從零開始學 Python",
        "description": "適合完全沒有程式背景的學習者...",
        "category": "adult",
        "tags": ["python", "程式設計", "入門"],
        "thumbnail": "https://...",
        "materialCount": 3,
        "createdBy": "teacher-uid",
        "createdAt": "2026-01-30T10:00:00Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 12
  }
}
```

### GET /api/components/{id} (詳情)
```http
GET /api/components/comp-001
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "comp-001",
    "title": "Python 基礎入門",
    "theme": "從零開始學 Python",
    "description": "適合完全沒有程式背景的學習者...",
    "category": "adult",
    "tags": ["python", "程式設計", "入門"],
    "questions": [
      {
        "question": "什麼是變數？",
        "answer": "變數是用來儲存資料的容器..."
      },
      {
        "question": "Python 有哪些資料型別？",
        "answer": "int, float, str, list, dict..."
      }
    ],
    "materials": [],
    "createdBy": {
      "uid": "teacher-uid",
      "displayName": "王老師"
    },
    "createdAt": "2026-01-30T10:00:00Z",
    "updatedAt": "2026-01-31T08:00:00Z"
  }
}
```

### POST /api/components (建立)
```http
POST /api/components
Authorization: Bearer <teacher-or-admin-token>
Content-Type: application/json

{
  "title": "Python 基礎入門",
  "theme": "從零開始學 Python",
  "description": "適合完全沒有程式背景的學習者...",
  "category": "adult",
  "tags": ["python", "程式設計", "入門"],
  "questions": [
    {
      "question": "什麼是變數？",
      "answer": "變數是用來儲存資料的容器..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "comp-001"
  },
  "message": "學習元件建立成功"
}
```

---

## Data Model

### Firestore: `components/{componentId}`
```typescript
{
  title: string,
  theme: string,
  description: string,
  category: "adult" | "kid",
  tags: string[],
  questions: Array<{
    question: string,
    answer: string
  }>,
  thumbnail?: string,
  createdBy: string,  // userId
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Firestore: `tags/{tagId}`
```typescript
{
  name: string,
  category: "adult" | "kid" | "both",
  usageCount: number
}
```

---

## UI Design

### 視覺主題
| 分類 | 主色 | 輔色 | 風格 |
|------|------|------|------|
| 大人學 | `#1E40AF` | `#60A5FA`, `#E0F2FE` | 高山冰河 - 冷靜專業 |
| 小人學 | `#DC2626` | `#FB923C`, `#FEF3C7` | 地底火山 - 活力探索 |

### 卡片設計 (ASCII)
```
┌────────────────────────┐
│  ┌──────────────────┐  │
│  │   [縮圖/Icon]    │  │
│  └──────────────────┘  │
│  Python 基礎入門       │
│  從零開始學 Python     │
│                        │
│  🏷️ python  程式設計   │
│                        │
│  📚 3 份教材           │
└────────────────────────┘
```

---

## Technical Spec

### 前端檔案
```
frontend/app/(member)/components/
├── page.tsx                    # 列表頁
└── [id]/page.tsx               # 詳情頁

frontend/app/(teacher)/teacher/components/
├── page.tsx                    # 我的元件列表
└── new/page.tsx                # 建立新元件

frontend/components/learning/
├── ComponentCard.tsx           # 卡片元件
├── ComponentList.tsx           # 列表元件
├── ComponentDetail.tsx         # 詳情元件
├── ComponentForm.tsx           # 表單元件
├── QuestionList.tsx            # 問答列表
└── TagInput.tsx                # 標籤輸入
```

### 後端檔案
```
backend/MidoLearning.Api/
├── Endpoints/ComponentEndpoints.cs
├── Models/LearningComponent.cs
└── Models/Question.cs
```

---

## Out of Scope

- ❌ 編輯學習元件 (COMP-004)
- ❌ 刪除學習元件 (COMP-005)
- ❌ 教材上傳 (MAT-001~004)

---

## Definition of Done

1. [ ] 列表頁開發完成 (前端 + API)
2. [ ] 詳情頁開發完成 (前端 + API)
3. [ ] 建立頁開發完成 (前端 + API)
4. [ ] 分類篩選功能測試通過
5. [ ] 視覺主題正確套用
6. [ ] RWD 測試通過
7. [ ] 前後端整合測試通過
