# Component Series（Hub-Children 系列）功能規格

> 日期：2026-05-26
> 狀態：實作中
> 動機：讓 LearningComponent 之間能建立「父子（hub-children）」關係，支援把多個獨立 component 組成一個系列／課程，由 hub component 作為大綱頁。

---

## 1. 為什麼要這個功能

目前 Mido 一個 component = 一個獨立教材。若教材內容多（例如「程式騎士」的多個關卡章節），只能塞在同一個 component 內，導致 bundle 變大、難以獨立擴充。

解法：允許 component 間有 `parent / children` 關係。一個「Hub」component 可以列出多個 child component，並支援快速跳轉。將來新增章節＝新建一個 child component，不必改動 hub 或既有 children。

---

## 2. 不破壞既有功能

所有改動以「additive」為原則：
- 新欄位 `parentComponentId` 為 `nullable`，既有 doc 無此欄位 → 自動為 null，行為跟之前完全相同。
- 新 API endpoint 純新增，舊 endpoint 不動。
- 前端新 UI 只在 component **有 parent 或有 children** 時顯示，否則維持現狀。

---

## 3. 資料模型

### 3.1 `LearningComponent.cs` 與 `LearningComponentDetail.cs`

新增欄位：

```csharp
[FirestoreProperty("parentComponentId")]
public string? ParentComponentId { get; init; }

// 在系列中的順序，給 hub 排序 children 用（小→大）
[FirestoreProperty("orderInSeries")]
public int? OrderInSeries { get; init; }
```

兩個都是 nullable。舊 doc 沒這欄位 → 反序列化為 null → API 回傳也是 null → 前端判斷 null 走原路徑。

### 3.2 DTOs

`CreateComponentRequest`、`UpdateComponentRequest` 各新增：
```csharp
public string? ParentComponentId { get; init; }
public int? OrderInSeries { get; init; }
```

`UpdateComponentRequest` 的 null 仍然代表「不更新此欄位」（既有語意）。要把 child 從系列中拔出，傳一個明確的 sentinel（或新增 endpoint `DELETE /api/components/{id}/parent`）。

---

## 4. 新 API endpoints

### 4.1 GET `/api/components/{id}/children`

回傳該 component 的所有子 component（依 `orderInSeries` 升序）。

**Auth**：跟 GET `/api/components/{id}` 一致——public 也可呼叫，但會依個別 child 的 `visibility` 過濾（published 全看、login 需登入、private 僅本人）。

**Response**：
```json
{
  "success": true,
  "data": {
    "parent": { "id": "...", "title": "..." },
    "children": [ /* LearningComponent[] 依 orderInSeries 排序 */ ]
  }
}
```

### 4.2 GET `/api/components/{id}/breadcrumb`（之後可加）

回傳該 component 從根到自己的路徑。v1 先只支援 1 層（hub → child），所以 breadcrumb 邏輯前端自己組就行；先不做 endpoint。

---

## 5. Validation

### 5.1 建立／更新時

- 如果 `parentComponentId` 不為 null：parent 必須存在（query Firestore 確認）。否則回 400。
- **禁止循環**：
  - 簡單規則：v1 限制最多 1 層。若 parent 自己有 `parentComponentId`（即 parent 不是 root），拒絕。
  - 等價條件：child 自己不能有 children（否則它本來就不是 leaf）。
- **禁止自我引用**：`parentComponentId == self.Id` → 400。

### 5.2 刪除時

- 若有 children 引用此 component 為 parent：拒絕刪除，回 409 Conflict，訊息 `"This component has N children. Remove them first or move them to another parent."`。

---

## 6. 前端改動

### 6.1 Types（`frontend/types/component.ts`）

`LearningComponent` 與 `CreateComponentRequest`、`UpdateComponentRequest` 各加：
```ts
parentComponentId?: string | null;
orderInSeries?: number | null;
```

### 6.2 API client（`frontend/lib/api/components.ts`）

新增：
```ts
export async function getComponentChildren(parentId: string): Promise<{
  parent: { id: string; title: string };
  children: LearningComponent[];
}>
```

### 6.3 ComponentDetail 顯示邏輯

`frontend/components/learning/ComponentDetail.tsx`：

**判斷流程**：
1. Mount 時 fetch children（呼叫 `getComponentChildren(id)`）。
2. 若 `children.length > 0` → 在頁面上方加一個「系列／章節清單」區塊（show series children as cards，點 → router.push 到該 child）。
3. 若 `parentComponentId != null` → 在頁首加一個 breadcrumb：「← 回到 {parent.title}」（連 hub 頁）。

### 6.4 ComponentForm 編輯欄位

`ComponentForm.tsx` 新增：
- 「父教材」下拉選單（fetch user's own components，過濾掉自己 + 自己已是 parent 的 children）。
- 「在系列中順序」number input（選 parent 時才顯示）。

---

## 7. 部署 & 驗證

- 後端：push 進 main → `.github/workflows/deploy-backend.yml` 自動 build + deploy 到 Cloud Run。
- 前端：依現有部署流程（待確認，先在 `docker-compose` 本地驗證）。
- 驗證 case：把 `programming-knight-basics`（`USmNVsZlaRxKxvIxZKwT`）設 `parentComponentId = buqTSnJ9kPSUTn3A5UUz`（coding hub）。

---

## 8. 階段拆解

| Phase | 工作 | 驗收 |
|-------|------|------|
| 1 後端模型 | 加欄位 + DTOs + GET children + validation | API 接得到、Firestore 寫得進、舊 component 讀取正常 |
| 2 前端 types + API | 型別補、API client 補 | 編譯通過 |
| 3 前端 UI | breadcrumb + children list | 設好 parent 後實際看得到效果 |
| 4 部署 | backend push → CI、frontend 本地或 deploy | learn.paulfun.net 看得到 |
| 5 E2E 驗證 | 設 programming-knight-basics.parent = hub，跳一輪 | hub 自動列出 child；child 顯示 breadcrumb |
| 6 (later) ComponentForm | admin UI 可設定 parent | 老師端可建系列 |

Phase 6 可延後——我可以直接用 API 設第一筆，驗證 1–5 階段成果。
