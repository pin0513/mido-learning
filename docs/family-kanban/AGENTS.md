# Family Kanban / Family Scoreboard — 授權與資料可見性規則

**版本**：2.0（Phase 0 安全地基 + Phase 3 per-user 私密文件切片 + 架構獨立化）
**日期**：2026-07-22
**範圍**：`backend/MidoLearning.Api` 內 `/api/family-scoreboard/*`（family-scoreboard 模組）與
`/api/family-kanban/*`（family-kanban 模組，獨立模組）兩組端點，以及兩者共用的授權基礎。
**目的**：給後續開發者 / AI agent 一份「誰能呼叫什麼、看到什麼、模組邊界在哪」的權威參考，避免重蹈 Phase 0 修補前的 IDOR 漏洞，也避免未來不小心讓兩個模組互相依賴。

**變更紀錄**：
- v2.0：**架構獨立化**——family-kanban 從 family-scoreboard 中拆成獨立模組（前綴 `/api/family-kanban`，見第 9 節）。家庭歸屬判定（原 `CanAccessFamilyAsync`）抽成共用的 `IFamilyAccessService`/`FirebaseFamilyAccessService`，endpoint gate 抽成共用的 `FamilyAccessEndpointFilter`，family-scoreboard 與 family-kanban 都依賴這兩個共用元件，但彼此不直接依賴。private-docs（第 8 節）整組搬到 family-kanban，Firestore 路徑也從 `families/{familyId}/private-docs` 改成獨立的 `family-kanban/{familyId}/private-docs`。
- v1.1：新增第 8 節「Per-User 私密文件」——提前做的 Phase 3 安全切片，複用 Phase 0 的 `CanAccessFamilyAsync` 授權範式，額外疊加 per-doc email 過濾。
- v1.0：Phase 0 初版（IDOR gate、FamilyAdmin policy、parent allowlist 鋪路、visitor tier 遮罩、JWT/API Key 後門硬化）。

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
| `FamilyAdmin` | 需登入，且 **不是** `player` role | family-scoreboard 的 `admin`（`/api/family-scoreboard`，含 `/initialize`、`/transactions`、`/{familyId}/players` 等大部分管理端點）；family-kanban 的 `admin`（`/api/family-kanban`，見第 9 節） |
| `AuthenticatedOnly` | 需登入（任何角色，含 `player`） | `read`（`/{familyId}/scores`、`/{familyId}/transactions` 等）、`readExtended`（`/{familyId}/shop-items`、`/{familyId}/events`） |
| `PlayerOnly` | 需為 `player` role | `playerGroup`（`/{familyId}/tasks/available`、`/{familyId}/my-*` 等子女自助端點） |
| `SuperAdminOnly` | 需為 `super_admin` role | `superAdmin`（`/super-admin/families/*`，封禁/刪除家庭） |
| 無 policy（匿名） | — | `publicGroup`（`/lookup`、`/visitor`、`/active-families`、`/player-login`） |

**注意**：`FamilyAdmin`/`AuthenticatedOnly`/`PlayerOnly`/`SuperAdminOnly` 這四個 policy 定義在 `Program.cs`，是**平台層級的共用資源**，family-scoreboard 與 family-kanban 都直接引用同一份，不算模組互相依賴。

**注意**：`FamilyAdmin` / `AuthenticatedOnly` 只回答「這個人有沒有登入、是不是 player」，**不回答**「這個人能不能存取這個 familyId」。後者由第 3 節的 IDOR gate 負責。

---

## 3. IDOR Gate — `IFamilyAccessService.CanAccessFamilyAsync`（Phase 0 新增，v2.0 抽成共用服務，核心防線）

### 3.1 問題

在 Phase 0 之前，`admin` / `read` / `readExtended` 底下所有端點只檢查「有沒有登入」，**沒有檢查「這個 uid 是不是這個 familyId 的人」**。任何已登入使用者（甚至平台上完全不相干的教材會員帳號）只要知道或猜到別人的 `familyId`（格式固定為 `family_{uid}`，或透過 `co-admins` 已知的家庭），就能讀寫別人家庭的積分、交易、零用金等資料。

### 3.2 解法

`IFamilyAccessService.CanAccessFamilyAsync(uid, familyId)`（`Services/FamilyAccess/IFamilyAccessService.cs` + `FirebaseFamilyAccessService.cs`）判定：

```
uid 可存取 familyId  ⟺  familyId == "family_{uid}"（primary admin）
                        或  uid 存在於 families/{familyId}/coAdmins/{uid}（co-admin）
```

與既有的 `FirebaseScoreboardService.GetMyFamilyAsync` 採用**相同的歸屬定義**，差別只在於這裡已知目標 `familyId`，用單一文件存在性查詢即可，不需要 `GetMyFamilyAsync` 那種跨全庫 `CollectionGroup` 查詢。

**v2.0 架構筆記**：這個判定邏輯原本寫在 `FirebaseScoreboardService.CanAccessFamilyAsync` 裡（Phase 0），v2.0 抽成獨立、單一職責的 `IFamilyAccessService`，讓 family-scoreboard 與 family-kanban 兩個模組共用同一份判定邏輯，不各寫一份（見第 9 節）。`IFamilyScoreboardService.CanAccessFamilyAsync` 這個 interface 方法還留著，但實作內部只是委派給 `IFamilyAccessService`（向下相容既有呼叫端，不是重複邏輯）。

### 3.3 套用方式：共用 Endpoint Filter

`FamilyAccessEndpointFilter.RequireFamilyAccessAsync`（`Endpoints/FamilyAccessEndpointFilter.cs`，v2.0 從 `FamilyScoreboardEndpoints.cs` 抽出來的共用類別）是掛在多個 `RouteGroupBuilder` 上的 `AddEndpointFilter`，對**該群組內每一個端點**一視同仁地套用，不需要每個 handler 各自呼叫：

- family-scoreboard：`admin` / `read` / `readExtended` / `playerGroup` 四個 group。
- family-kanban：`admin` 一個 group（見第 9 節）。

執行邏輯：

1. 從 `ClaimsPrincipal` 取出 `uid`（`NameIdentifier` 或 `user_id`）。
2. 解析這次請求的 `familyId`：優先讀路由 `{familyId}`；若路由沒有（例如 family-scoreboard 的 `/initialize`、`/transactions`、`/generate-code` 這類用 query string 或預設 `family_{uid}` 的端點），退回 `FamilyAccessEndpointFilter.ResolveFamilyId(httpContext, uid)` 邏輯。
3. 呼叫 `IFamilyAccessService.CanAccessFamilyAsync(uid, familyId)`；不通過回 `403 Forbidden`（`Results.Forbid()`），通過才放行到實際 handler。

對於本來就不吃 `familyId` 的端點（如 `GET /lookup-user`、`GET /my-family`），fallback 會解析成 `family_{uid}`，而 `family_{uid} == family_{uid}` 恆為真，因此 gate 對這些端點是「必過」的空操作，不影響既有行為。

### 3.4 Player JWT 與 dev-api-key 的另外兩條分支（同一個 gate，不同判定邏輯）

`FamilyAccessEndpointFilter.RequireFamilyAccessAsync` 對特殊身份走**不同的判定邏輯**，而不是套用 `CanAccessFamilyAsync`：

- **Player（role=player）**：Player JWT 簽發時（`PlayerLoginAsync`）已經把 `familyId` 綁在 claim 上，這裡的 `uid`（`NameIdentifier`）其實是 `playerId`，**不是**任何家庭的 primary admin / co-admin，不能拿去問 `CanAccessFamilyAsync`（那樣會把所有子女的合法請求都擋成 403 —— Phase 0 開發過程中真的先這樣寫錯，靠 E2E 案例中 `playerReq(...).../scores` 這條既有用法才發現）。正確檢查是：**路由的 `{familyId}` 是否等於 JWT 內的 `familyId` claim**。不符直接 403。這個分支套用在 family-scoreboard 的 `read` / `readExtended`（子女也會呼叫 `/scores` 等端點）與 `playerGroup`。因此 **Player JWT 跨家庭存取也已經被這個 gate 擋下**，見 `MidoLearning.Api.Tests/Endpoints/PlayerJwtFamilyAccessTests.cs`。
- **dev-api-key（`auth_method=dev_api_key` claim）**：Development-only 測試後門身份，完全跳過家庭歸屬檢查（見 `FirebaseAuthHandler.TryAuthenticateWithApiKey`）。E2E 測試套件靠這個身份操作動態建立的測試家庭，這個 claim 只可能由後門本身設定，非使用者可控輸入。

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
- `/api/family-kanban/{familyId}/private-docs`（family-kanban 模組的 `admin` group）→ 除了 `CanAccessFamilyAsync`，GET 還疊加 per-doc email 過濾，見第 8、9 節。

---

## 8. Per-User 私密文件（Phase 3 安全切片，v2.0 起屬於 family-kanban 模組）

### 8.1 用途

保羅寫給配偶的「使用說明書」這類**個人對個人**的私密內容，儲存在家庭底下，但**不是家庭共享資料**——同一個家庭的其他 admin/co-admin（包含 primary admin 自己）都不應該看到不是寫給自己的文件。這比「家庭歸屬」（`IFamilyAccessService.CanAccessFamilyAsync`）更嚴一層。

**v2.0 架構筆記**：這個功能最初（v1.1）是直接加在 family-scoreboard 模組裡的「安全切片」，v2.0 整組搬到獨立的 family-kanban 模組（見第 9 節）——這是它的正式歸屬，不是暫時借住。

### 8.2 資料模型

Firestore 路徑：`family-kanban/{familyId}/private-docs/{docId}`（v2.0 起獨立於 `families/{familyId}/*`，見 9.3 節資料邊界）。

`PrivateDocDoc`（`Models/FamilyKanban/PrivateDocDoc.cs`）：`Id`、`Title`、`Content`、`VisibleToEmail`、`CreatedBy`、`CreatedAt`。對應 DTO：`PrivateDocDto`（`Models/FamilyKanban/Dtos.cs`）。

### 8.3 兩層授權（缺一不可）

1. **家庭歸屬**（共用 gate）：呼叫者必須是這個 `familyId` 的 primary admin 或 co-admin（`FamilyAccessEndpointFilter.RequireFamilyAccessAsync` 已掛在 family-kanban 的 `admin` group，自動套用，端點本身不用重複寫）。
2. **Per-doc email 過濾**（family-kanban 專屬，只在 GET 適用）：即使通過了第 1 層，`IFamilyKanbanService.GetVisiblePrivateDocsAsync(familyId, viewerEmail)` 只回傳 `VisibleToEmail` 與呼叫者的 `ClaimTypes.Email`（大小寫不敏感）相符的文件。**不相符就是空清單，不是 403**——因為呼叫者對這個家庭本來就有權限，只是這份文件不是給他看的，語意上是「這裡沒有你能看的東西」而不是「你不該來這裡」。

過濾邏輯抽成 `FirebaseFamilyKanbanService.FilterVisiblePrivateDocs`（`internal static`，純函式，不碰 Firestore），方便脫離 Firestore 直接單元測試 email 大小寫比對與「pin0513 看不到 daisy9928 文件」這個核心不變量（見 `MidoLearning.Api.Tests/Services/PrivateDocVisibilityFilterTests.cs`）。用「先讀整個 collection 再過濾」而非 Firestore `WhereEqualTo` 查詢，是因為 Firestore 的等式查詢大小寫敏感，這裡資料量小（單一家庭的私密文件不會太多），先讀後濾比多維護一個正規化欄位划算。

### 8.4 端點（掛在 family-kanban 的 `admin` group，前綴 `/api/family-kanban`）

| 方法 | 路徑 | 誰能建 / 看 / 刪 |
|---|---|---|
| `POST` | `/{familyId}/private-docs` | 家庭 primary admin / co-admin 皆可建立，`visibleToEmail` 可以指定給家庭內任何人（包含自己） |
| `GET` | `/{familyId}/private-docs` | 家庭 primary admin / co-admin 皆可呼叫，但只看得到 `visibleToEmail` 是自己的文件（見 8.3） |
| `DELETE` | `/{familyId}/private-docs/{docId}` | 家庭 primary admin / co-admin 皆可刪除**任何**該家庭的私密文件（本輪沒有做「只有建立者能刪」的限制，比照 family-scoreboard 既有 `DeleteEventAsync` 等其他刪除端點的權限寬鬆度） |

### 8.5 已知限制（誠實列出，未在本輪修）

- **DELETE 沒有 per-doc email 檢查**：任何家庭 admin/co-admin 都能刪除任何私密文件，即使不是自己能看的那份。目前定位為「家長對家長」的信任關係內操作，是否要收緊留給之後判斷。
- **沒有「編輯」端點**：只有 Create / Read / Delete，沒有 Update。目前夠用（改內容 = 刪掉重建），如果之後要加 Update，記得同樣要走兩層授權。
- **`visibleToEmail` 沒有驗證是否為家庭成員的 email**：建立時可以填任何字串，包含根本不是任何人 email 的亂打。這不是安全漏洞（反正查詢時要精準比對到那個字串才看得到），但可能造成「打錯字永遠沒人看得到」的資料孤兒。前端（team lead 另外處理）應該在 UI 層做基本驗證。

---

## 9. family-kanban 模組架構邊界（使用者定案，v2.0）

這是 Paul（使用者）明確定案的架構原則，後續開發**務必守住**，不要因為「順手」或「省事」而破壞。

### 9.1 獨立模組，不是 family-scoreboard 的子功能

- **URL 前綴**：`/api/family-kanban`，與 `/api/family-scoreboard` 平行，不是它的子路徑。
- **Service**：`IFamilyKanbanService` / `FirebaseFamilyKanbanService`（`Services/FamilyKanban/`），**不實作、不繼承、不包裝** `IFamilyScoreboardService`。
- **Endpoints**：`FamilyKanbanEndpoints.cs`（`Endpoints/`），獨立的 `MapFamilyKanbanEndpoints()`，在 `Program.cs` 單獨呼叫，不掛在 `MapFamilyScoreboardEndpoints()` 底下。
- **Model**：`Models/FamilyKanban/`，獨立的 `Dtos.cs` 與 Firestore Doc 類別，不共用 `Models/FamilyScoreboard/Dtos.cs` 裡的型別。
- **部署**：仍是**同一個 ASP.NET Core process / 同一個 service**（`MidoLearning.Api`），不是獨立的微服務——這是使用者定案的「獨立模組、同 service」，模組邊界在程式碼組織層級，不是部署層級。

### 9.2 共用授權基礎，但彼此不直接依賴

family-scoreboard 與 family-kanban 只共用兩個「平台層級」元件，兩者互相之間**沒有任何 `using`/`ProjectReference` 等級的依賴**：

1. `Program.cs` 的 policy 定義（`FamilyAdmin`、`AuthenticatedOnly` 等）——ASP.NET Core 授權框架本來就是全域註冊，不算模組耦合。
2. `IFamilyAccessService`（`Services/FamilyAccess/`）+ `FamilyAccessEndpointFilter`（`Endpoints/FamilyAccessEndpointFilter.cs`）——見第 3 節，這是「家庭歸屬」這個共同概念的單一實作來源。

驗證方式（架構守則，之後每次改動都可以重跑這條檢查；已在 v2.0 這輪重構驗證過，結果為 0）：

```bash
# family-kanban 底下不應該出現任何對 FamilyScoreboard 命名空間的 using 依賴
# （用 "^using.*FamilyScoreboard" 而不是裸的 "FamilyScoreboard"，避免誤判
#  說明性註解——例如「不依賴 IFamilyScoreboardService」這種註解文字本身就會
#  含有 FamilyScoreboard 字樣，但那不是真的程式碼依賴）
grep -rn "^using.*FamilyScoreboard" backend/MidoLearning.Api/Services/FamilyKanban/ backend/MidoLearning.Api/Endpoints/FamilyKanbanEndpoints.cs backend/MidoLearning.Api/Models/FamilyKanban/
# 預期：0 個結果（exit code 1）
```

### 9.3 資料邊界：獨立的 Firestore 頂層 collection

family-kanban 的資料存在 `family-kanban/{familyId}/*`（獨立頂層 collection），**不是** `families/{familyId}/*` 底下的子集合。這不只是命名習慣，是刻意的資料所有權切割：

- family-scoreboard 擁有並管理 `families/{familyId}/*`（scores、transactions、shop-items、seals、penalties、coAdmins 等）。
- family-kanban 擁有並管理 `family-kanban/{familyId}/*`（目前只有 `private-docs`，未來可能加其他 kanban 專屬資料，如個人目標、自我覺察紀錄）。
- family-kanban **讀** `families/{familyId}/coAdmins`（透過 `IFamilyAccessService`）來判定家庭歸屬，這是「讀」，不是「擁有」——不會寫入、不會建立、不會刪除 family-scoreboard 的資料。

### 9.4 單向讀取，不碰計分邏輯（現況：連讀都還沒做）

北極星（見專案記憶 `family-kanban-vision`）：family-kanban 的目的是**自我覺察，不是管控**——每個人的課題只有自己知道（per-user 私密），這與 family-scoreboard「家長管控子女積分/零用金」的定位本質不同，不應該混在一起。

- **本輪（v2.0）尚未實作任何跨模組資料讀取**——private-docs 是 family-kanban 自己的資料，不涉及 family-scoreboard 的計分/零用金。
- **未來若要顯示點數/零用金**（例如 kanban 卡片上帶一個「本週 XP」小標籤），規則是：
  - family-kanban 只能**讀** family-scoreboard 的資料（例如呼叫 `IFamilyScoreboardService.GetScoresAsync` 或直接讀 Firestore `families/{familyId}/scores`），**不能寫**。
  - family-kanban **絕對不實作**加分/扣分/商城兌換/封印處罰等計分板管控邏輯——那些永遠是 family-scoreboard 的職責。
  - 如果需要跨模組讀取，優先考慮讓 family-kanban 依賴 `IFamilyScoreboardService`（唯讀呼叫），而不是讓 family-scoreboard 反過來依賴 family-kanban——依賴方向只能單向。

### 9.5 已知限制 / 待確認事項

- `IFamilyKanbanService` 目前完全不依賴 `IFamilyAccessService`（gate 已經在 endpoint filter 層做完，service 層不需要重複判斷）。未來若 family-kanban 有更細的 per-feature 授權需求（不只是「這個家庭的 admin/co-admin」），要重新評估這個邊界。
- 這份文件是 v2.0 這一輪重構的「當下快照」。family-kanban 還在早期階段（目前只有 private-docs 一個功能），架構邊界會隨著功能增加持續被考驗，建議每次加新功能前重跑 9.2 節的 grep 檢查。
