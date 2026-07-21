# Family Kanban（家庭計分板）— 授權與資料可見性規則

**版本**：1.0（Phase 0 安全地基）
**日期**：2026-07-22
**範圍**：`backend/MidoLearning.Api` 內 `/api/family-scoreboard/*` 系列端點
**目的**：給後續開發者 / AI agent 一份「誰能呼叫什麼、看到什麼」的權威參考，避免重蹈 Phase 0 修補前的 IDOR 漏洞。

---

## 1. 身份模型（Actors）

家庭計分板目前有 **三種身份**，彼此互不相通：

| 身份 | 取得方式 | 識別 Claim | 典型使用者 |
|---|---|---|---|
| **Firebase 登入者** | Firebase ID Token（`Authorization: Bearer <idToken>`） | `ClaimTypes.NameIdentifier`（uid）、`ClaimTypes.Role`（如有） | 家長（primary admin / co-admin），或平台上任何已登入帳號（教材平台的一般會員、教師等） |
| **Player（子女）** | `/player-login` 換發的短期 JWT | `role=player`、`playerId`、`familyId`（皆為 JWT claims） | 家中子女帳號 |
| **匿名訪客** | 無 | 無 | 任何人，只要知道家庭代碼（`displayCode`） |

`FirebaseAuthHandler` 會依序嘗試：API Key（僅 Development）→ Player JWT → Firebase ID Token。三者互斥，一個請求只會落在其中一種身份。

---

## 2. 授權 Policy 與套用範圍

| Policy | 定義（`Program.cs`） | 套用的 Route Group |
|---|---|---|
| `FamilyAdmin` | 需登入，且 **不是** `player` role | `admin`（`/api/family-scoreboard`，含 `/initialize`、`/transactions`、`/{familyId}/players` 等大部分管理端點） |
| `AuthenticatedOnly` | 需登入（任何角色，含 `player`） | `read`（`/{familyId}/scores`、`/{familyId}/transactions` 等）、`readExtended`（`/{familyId}/shop-items`、`/{familyId}/events`） |
| `PlayerOnly` | 需為 `player` role | `playerGroup`（`/{familyId}/tasks/available`、`/{familyId}/my-*` 等子女自助端點） |
| `SuperAdminOnly` | 需為 `super_admin` role | `superAdmin`（`/super-admin/families/*`，封禁/刪除家庭） |
| 無 policy（匿名） | — | `publicGroup`（`/lookup`、`/visitor`、`/active-families`、`/player-login`） |

**注意**：`FamilyAdmin` / `AuthenticatedOnly` 只回答「這個人有沒有登入、是不是 player」，**不回答**「這個人能不能存取這個 familyId」。後者由第 3 節的 IDOR gate 負責。

---

## 3. IDOR Gate — `CanAccessFamilyAsync`（Phase 0 新增，核心防線）

### 3.1 問題

在 Phase 0 之前，`admin` / `read` / `readExtended` 底下所有端點只檢查「有沒有登入」，**沒有檢查「這個 uid 是不是這個 familyId 的人」**。任何已登入使用者（甚至平台上完全不相干的教材會員帳號）只要知道或猜到別人的 `familyId`（格式固定為 `family_{uid}`，或透過 `co-admins` 已知的家庭），就能讀寫別人家庭的積分、交易、零用金等資料。

### 3.2 解法

`IFamilyScoreboardService.CanAccessFamilyAsync(uid, familyId)` 判定：

```
uid 可存取 familyId  ⟺  familyId == "family_{uid}"（primary admin）
                        或  uid 存在於 families/{familyId}/coAdmins/{uid}（co-admin）
```

實作見 `FirebaseScoreboardService.CanAccessFamilyAsync`（`Services/FamilyScoreboard/FirebaseScoreboardService.cs`）。與既有的 `GetMyFamilyAsync` 採用**相同的歸屬定義**，差別只在於這裡已知目標 `familyId`，用單一文件存在性查詢即可，不需要 `GetMyFamilyAsync` 那種跨全庫 `CollectionGroup` 查詢。

### 3.3 套用方式：Endpoint Filter

`FamilyScoreboardEndpoints.RequireFamilyAccessAsync` 是掛在 `admin` / `read` / `readExtended` 三個 `RouteGroupBuilder` 上的 `AddEndpointFilter`，對**該群組內每一個端點**一視同仁地套用，不需要每個 handler 各自呼叫：

1. 從 `ClaimsPrincipal` 取出 `uid`（`NameIdentifier` 或 `user_id`）。
2. 解析這次請求的 `familyId`：優先讀路由 `{familyId}`；若路由沒有（例如 `/initialize`、`/transactions`、`/generate-code` 這類用 query string 或預設 `family_{uid}` 的端點），退回既有的 `ResolveFamilyId(httpContext, uid)` 邏輯。
3. 呼叫 `CanAccessFamilyAsync(uid, familyId)`；不通過回 `403 Forbidden`（`Results.Forbid()`），通過才放行到實際 handler。

對於本來就不吃 `familyId` 的端點（如 `GET /lookup-user`、`GET /my-family`），fallback 會解析成 `family_{uid}`，而 `family_{uid} == family_{uid}` 恆為真，因此 gate 對這些端點是「必過」的空操作，不影響既有行為。

### 3.4 Player JWT 的另一條分支（同一個 gate，不同判定邏輯）

`RequireFamilyAccessAsync` 對 `role=player` 的呼叫者走**不同的判定邏輯**，而不是套用 `CanAccessFamilyAsync`：

- Player JWT 簽發時（`PlayerLoginAsync`）已經把 `familyId` 綁在 claim 上，這裡的 `uid`（`NameIdentifier`）其實是 `playerId`，**不是**任何家庭的 primary admin / co-admin，不能拿去問 `CanAccessFamilyAsync`（那樣會把所有子女的合法請求都擋成 403 —— Phase 0 開發過程中真的先這樣寫錯，靠 E2E 案例中 `playerReq(...).../scores` 這條既有用法才發現）。
- 子女的正確檢查是：**路由的 `{familyId}` 是否等於 JWT 內的 `familyId` claim**。不符直接 403。
- 這個分支同時套用在 `read` / `readExtended`（子女也會呼叫 `/scores` 等端點）與 `playerGroup`（`PlayerOnly` policy，全部端點都有路由 `{familyId}`）。因此 **Player JWT 跨家庭存取（例如 A 家的子女 token 讀 B 家的任務/零用金/狀態）也已經被這個 gate 擋下**，見 `MidoLearning.Api.Tests/Endpoints/PlayerJwtFamilyAccessTests.cs`。

### 3.5 已知限制（誠實列出，未在本輪修）

- **co-admin 與 primary admin 之間沒有再分權**：目前 `CanAccessFamilyAsync` 對 primary admin 與 co-admin 一視同仁。理論上 co-admin 可以呼叫 `POST /{familyId}/co-admins` 新增其他 co-admin，甚至移除其他人 —— 是否要限制「只有 primary admin 能管理 co-admins」是設計取捨，非本次 IDOR 修補範圍。

---

## 4. 資料可見性（Tier）與欄位遮罩

| Tier | 端點範例 | 可見欄位 | 不可見欄位 |
|---|---|---|---|
| **Public（匿名）** | `GET /visitor?code=`（`VisitorPlayerDto`） | `playerId`、`name`、`color`、`emoji`、`achievementPoints`、`redeemablePoints`、`hasPassword` | **`allowanceBalance`（零用金餘額）— Phase 0 移除**，避免任何知道家庭代碼的人都能看到財務資訊 |
| **Public（匿名）** | `GET /lookup?code=`（`FamilyLookupDto`） | 玩家清單 + 是否已設密碼 | 積分、零用金 |
| **Child（player JWT）** | `/{familyId}/my-status`、`/my-effects`、`/my-withdrawals` 等 | 僅自己（`playerId` 來自 JWT）的狀態 | 其他玩家資料（by design，這些端點都用 JWT 內的 `playerId`，不吃路由參數） |
| **Parent（primary admin / co-admin）** | `GET /{familyId}/scores`（`PlayerScoreDto`） | 完整欄位，含 `allowanceBalance` | — |
| **Bot / Service（尚未實作）** | — | — | 目前沒有機器人/服務帳號的概念；若未來要開放（例如 LINE Bot 查詢），需要新設計一組 scope 較小的 policy，不應直接沿用 `FamilyAdmin` |

**Phase 0 只處理了「Public 不應看到零用金」這一項欄位遮罩**。其餘 tier 的欄位可見性目前是「有沒有存取這個 familyId」的 0/1 判斷（見第 3 節），還沒有做到「同一個 familyId 內，依 tier 決定哪些欄位可見」的細粒度控制。

---

## 5. Parent Allowlist（`IParentAllowlist`，Phase 0 鋪路、Phase 3 才套用）

`Services/FamilyScoreboard/ParentAllowlist.cs` 提供 `IsParent(email)`，判定依據為設定檔 `FamilyScoreboard:ParentEmails`（目前預設值：`pin0513@gmail.com`、`daisy9928@gmail.com`，見 `appsettings.json`）。

**這是 Phase 0 唯一的鋪路動作，本輪沒有把它接到任何 policy 或 endpoint 上**。未來若要推出「只有白名單家長才能做某些高風險操作（例如刪除家庭、匯出備份）」的功能，可以：

1. 注入 `IParentAllowlist`。
2. 從 `ClaimsPrincipal` 取出 email（`ClaimTypes.Email`）。
3. 呼叫 `IsParent(email)` 決定是否放行。

在套用之前，務必先確認「白名單」與「co-admin 機制」之間的關係（例如：co-admin 若不在白名單內，是否仍可視為 parent？），避免與現有 `CanAccessFamilyAsync` 的定義互相矛盾。

---

## 6. JWT / 測試後門硬化（Phase 0）

| 項目 | Phase 0 之前 | Phase 0 之後 |
|---|---|---|
| Player JWT 簽章金鑰（`Jwt:Key`） | 缺設定時，任何環境都 fallback 到硬編碼字串 `your-super-secret-jwt-key-change-this-in-production-skill-village` | 集中在 `JwtKeyProvider.ResolveKey`：Development 缺設定才 fallback；**非 Development 缺設定直接拋 `InvalidOperationException`，在 `Program.cs` 頂層同步程式碼執行、啟動即失敗**（見 `Program.cs` 內 `jwtSigningKey` 那行的註解） |
| API Key 測試後門（`X-API-Key` header + `ApiKey:TestKey`） | 任何環境，只要設定了 `ApiKey:TestKey` 就能用 | `FirebaseAuthHandler.TryAuthenticateWithApiKey` 一開始就檢查 `IHostEnvironment.IsDevelopment()`，非 Development 一律回 `null`（即使設定檔誤帶了 `ApiKey:TestKey` 也不生效） |

### ⚠️ 部署前置條件（務必在合併／部署前確認）

本 repo 的 `appsettings.json`（正式環境會載入的設定）**目前沒有 `Jwt` 區塊**。這代表：

- 部署此變更前，**必須**先在正式環境（Cloud Run）設定環境變數 `Jwt__Key`（雙底線是 ASP.NET Core 巢狀設定的環境變數命名慣例）與 `Jwt__Issuer`（可選，預設 `MidoLearning`）。
- 若沒有設定就部署，process 會在啟動當下直接拋例外、無法啟動（fail-fast 是刻意設計，但這代表**必須先協調好部署順序**，不能盲目部署）。

這是一個 **dark-commitment 風格的部署順序問題**：程式碼可以先合併，但「上線」（實際部署到 Cloud Run）必須等 `Jwt__Key` 環境變數就緒，兩者不可同時發生。

---

## 7. 端點清單（哪個 policy、哪個 gate）

完整端點骨架見同目錄 `openapi.yaml`。摘要規則：

- `/api/family-scoreboard/{familyId}/...`（`admin` / `read` / `readExtended`）→ 非 player 呼叫者需登入 + `CanAccessFamilyAsync` 通過；player 呼叫者需路由 `familyId` 與 JWT `familyId` claim 相符（見第 3.4 節）。
- `/api/family-scoreboard/{familyId}/...`（`playerGroup`）→ 需 `player` JWT，且路由 `familyId` 必須與 JWT `familyId` claim 相符，僅能操作 JWT 內 `playerId` 對應的資料。
- `/api/family-scoreboard/lookup`、`/visitor`、`/active-families`、`/player-login`（`publicGroup`）→ 匿名可呼叫，資料經過欄位遮罩（第 4 節）。
- `/api/family-scoreboard/super-admin/*`（`superAdmin`）→ 需 `super_admin` role，管理全平台所有家庭，不受 `CanAccessFamilyAsync` 限制（設計如此：super admin 本來就該能管所有家庭）。
