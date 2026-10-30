# 知識點資料重構：從 YAML 搬進資料庫（規格）

| 項目 | 內容 |
| --- | --- |
| 狀態 | P0 規格（本文件）＋ P1 第一段（規則包抽出）進行中 |
| 依據 | 「知識點資料重構方案」（2026-10-29，分析 main `8c62d7e`）；本文件對照 main `e9bfd5e`（2026-10-30）的程式重寫 |
| 決定者 | I-PING（admin） |
| 不做的事 | 本文件與 P1 不碰正式 Firestore、GCP 資源，不改任何旗標 |

## 1. 已決定

| 日期 | 題目 | 決定 | 對設計的影響 |
| --- | --- | --- | --- |
| 2026-10-29 | 結構放哪裡 | 結構與內容都搬進 DB | `knowledge_points` 是唯一來源；YAML 只做一次性種子，依學門凍結後刪除 |
| 2026-10-29 | 教材連結 | 發布時鎖定版本 | 每條連結帶 `materialId`＋`version`，沒有「跟最新版」 |
| 2026-10-29 | 影片 | 只收外部連結 | 不做影片上傳；`video` 只能是允許清單內的網址；檔案維持 50MB 上限 |
| 2026-10-29 | 誰能發布 | 只有 admin | teacher 與 AI 批次可建草稿、送審；發布、回滾、改主線限 admin |
| 2026-10-30 | 課綱代碼與分類 | 維持 Git 參考資料，PR 審查，不在 DB 編輯 | `content/taxonomy/*.yaml`（含 `curriculum-108-codes.yaml`）留在 repo；規則包與前台在部署時打包同一份，修訂版記 `taxonomyVersion` |
| 2026-10-30 | 承諾用語檢查 | 先當警告，不擋發布 | 規則包 `promise.ts` 只產生 warning；之後要升級只改呼叫端 |
| 2026-10-30 | 每晚 Git 匯出 | 推到同 repo 的 `content-export` 分支，永不合併 main | 匯出工作只對該分支有寫入權；main 的保護規則不變 |
| 2026-10-30 | 何時凍結學門 | 該學門所有進行中的 YAML 批次合併後才凍結 | 內容批次 B23–B28 照舊改 YAML、跑 `pnpm validate:content` |

## 2. 現況（main `e9bfd5e`）

| 項目 | 位置 | 說明 |
| --- | --- | --- |
| 知識點 | `frontend/content/knowledge/<學門資料夾>/<concept>/<學段>.yaml` | 241 份：language 108、soft-skills 33、math 26、it-ai 25、philosophy 25、pm-leadership 24；206 published、35 draft |
| Schema | `frontend/content/schema/knowledge-point.schema.json` | Ajv（strict、allErrors）；代碼格式（`perfCode`、`contentCode`）也在這裡 |
| 分類 | `frontend/content/taxonomy/`：`stages`、`curriculum-108`、`curriculum-108-codes`、`competencies`、`disciplines`、`formats` | Git 參考資料，維持不動 |
| 主線 | `frontend/content/paths/<學門>.yaml` | 每份是一個學門的多條主線 |
| 補件清單 | `frontend/content/sources-backfill.yaml`、`golden-circle-backfill.yaml` | 只能刪不能加（`scripts/check-backfill-shrink.ts`） |
| 讀取 | `frontend/lib/content/load.ts` → `catalog.ts`（`loadCatalog`） | build 時讀 YAML、生成靜態頁 |
| 驗證 | `frontend/scripts/validate-knowledge-points.ts`（`pnpm validate:content`） | 自我測試（壞樣本）＋整份內容；main 上 0 錯誤、140 警告 |
| 禁用字 | `frontend/scripts/check-no-city-word.test.ts`、CI build 後 grep | 清單寫死在測試與 workflow，不在 `load.ts` |
| 後端 | `backend/MidoLearning.Api`（.NET Minimal API，Cloud Run `mido-learning-api`） | `FirebaseService` 用 Admin SDK 連 Firestore；`MaterialEndpoints.cs` 管教材版本 |
| 權限政策 | `backend/MidoLearning.Api/Program.cs` | `AdminOnly` = super_admin、admin；`TeacherOrAdmin` = super_admin、game_admin、teacher、admin |

## 3. 資料模型（Firestore，專案 mido-learning）

所有集合只由 API（Admin SDK）讀寫；`firestore.rules` 對這些集合一律 `allow read, write: if false`。

### 3.1 `knowledge_points/{kpId}`：目前狀態

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| 文件 id | string | `zh.prompt@jh`，沿用現有 id 規則，建立後不可改 |
| `structure` | map | 已發布那一版的結構副本，給列表與查詢用 |
| `status` | `draft`／`review`／`published` | 對應現在 YAML 的 `status` |
| `publishedRevision` | int｜null | 頁面顯示哪一版 |
| `draftRevision` | int｜null | 同時最多一份草稿 |
| `updatedAt`、`updatedBy` | timestamp、string | 最後一次發布 |
| `seed` | map | `gitSha`、`path`，只在匯入時寫一次 |

### 3.2 `knowledge_points/{kpId}/revisions/{n}`：修訂版

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `n`、`status` | int；`draft`／`in_review`／`published`／`archived` | 從 1 遞增，發布後整份不可改 |
| `structure` | map | concept、title、discipline（path、layer、crosscutting）、stage（level、grades）、curriculum108（只存代碼）、prerequisites、links、linkNotes、competency、ai、audience、toVerify、verifyNotes、estTime |
| `lead` | map | idea、goal、scenario、review、guidingQuestions |
| `why`、`how`、`what` | Markdown string | 見第 4 節 |
| `figures` | array | 沿用現有圖的 JSON 結構 |
| `sources` | array | id、title、publisher、url、accessed、kind、supports；verifiedBy、verifiedAt |
| `taxonomyVersion`、`rulesVersion` | string | 驗證時的分類 git sha 與規則版本 |
| `validation` | map | ok、errors[]、warnings[]、checkedAt |
| `authorUid`、`submittedAt`、`publishedBy`、`publishedAt` | string、timestamp | `publishedBy` 必須是 admin |
| `changeNote`、`contentHash` | string | 重複匯入不建新版 |

驗證時把修訂版**轉回 schema 形狀的物件**（第 6 節），所以 schema 與規則只有一份。

### 3.3 其他集合

| 集合 | 重點欄位 | 說明 |
| --- | --- | --- |
| `learning_paths/{pathId}` | title、discipline、items[]、version、updatedBy | 取代 `content/paths/*.yaml`；只有 admin 能改 |
| `kp_material_links/{linkId}` | kpId、revision、role（slides／audio／file／video／link）、section（why／how／what／null）、order、title、note、componentId、materialId、version、url、provider | 頂層集合才查得到「教材用在哪些知識點」；教材型的 `materialId`＋`version` 發布時寫死；`video` 只收允許清單網址 |
| `materials`（既有，加欄位） | kind（html_bundle／audio／file）、contentType、durationSec、pageCount | 舊資料沒有 `kind` 視為 html_bundle；不收影片 |
| `audit_log/{id}` | at、uid、action、kpId、fromRevision、toRevision、structureDiff、validationSummary | 只能新增 |
| `catalog_snapshots/{discipline}` | publishedAt、catalogVersion、points[]（已發布結構＋內容） | 發布時由 API 寫；依學門分檔避開 1MB 上限；前台只讀這份 |

## 4. Markdown 寫法

- 每段一份 Markdown，第一行 `## 標題` 對應 `heading`，段落對應 `body`。
- 結構塊用指令：`:::qa`、`:::items{title="國中課綱怎麼說"}`、`:::checklist`；項目可帶 `{code=6-IV-2}`。
- 圖 `::figure{#how-flow}`，來源 `[^cap-writing]`；不允許原始 HTML。
- 渲染沿用 V2 的 `components/kp/v2/text.tsx`（RichText）。轉換器必須可逆：YAML → 修訂版 → YAML 一字不差。

## 5. API（mido-learning-api，新增 `Endpoints/KnowledgePointEndpoints.cs`）

| 方法與路徑 | 權限 | 做什麼 | 規則 |
| --- | --- | --- | --- |
| `GET /api/kp/snapshots/{discipline}` | 公開 | 已發布目錄（前台 `loadCatalog` 讀） | — |
| `GET /api/kp/points/{kpId}` | 公開（只回已發布） | 單點已發布版 | — |
| `GET /api/kp/points/{kpId}/revisions[/{n}]` | KpEditor | 修訂版列表、單版、預覽 | — |
| `POST /api/kp/points` | KpEditor | 新知識點（revision 1，draft） | 單點規則 |
| `POST /api/kp/points/{kpId}/drafts` | KpEditor | 從發布版複製出 n+1（結構、內容、連結） | — |
| `PUT /api/kp/points/{kpId}/revisions/{n}` | 作者或 admin | 存草稿（有錯仍可存） | 單點規則，結果寫 `validation` |
| `PUT /api/kp/points/{kpId}/revisions/{n}/links` | 作者或 admin | 教材連結 | 連結規則（role、允許清單、版本存在） |
| `POST /api/kp/points/{kpId}/revisions/{n}/submit` | KpEditor | 送審 | 單點規則，有錯不能送 |
| `POST /api/kp/points/{kpId}/revisions/{n}/publish` | AdminOnly | 發布；body 帶逐條勾過的 `verifiedSupports[]` | 交易內跑單點＋跨點＋主線規則，比對 `catalogVersion` |
| `POST /api/kp/points/{kpId}/rollback` | AdminOnly | `publishedRevision` 指回舊版 | 跨點規則 |
| `GET/PUT /api/kp/paths/{pathId}` | 讀公開；寫 AdminOnly | 主線 | 主線規則 |
| `GET /api/kp/materials/{materialId}/usages` | KpEditor | 教材用在哪些知識點 | — |
| `GET /api/kp/audit?kpId=` | AdminOnly | 歷史 | — |
| `POST /api/kp/import` | AdminOnly | 一次性匯入，預設 `dryRun=true` | 全部規則 |

## 6. 角色

| 角色 | 對應既有政策 | 可以做 |
| --- | --- | --- |
| admin（I-PING） | `AdminOnly`（super_admin、admin） | 看差異、勾引文核對、發布、回滾、改主線、匯入 |
| teacher | 新政策 `KpEditor`（super_admin、admin、teacher） | 建草稿、改結構與 Markdown、掛教材、送審 |
| AI 批次 | 服務帳號，角色 teacher | 建草稿與 changeNote、送審；不能發布 |

注意：既有的 `TeacherOrAdmin` 也包含 `game_admin`。知識點編輯不應給 game_admin，所以另開 `KpEditor`，不要直接沿用。

## 7. 規則包（kp-rules）

### 7.1 邊界

| 層 | 位置 | 吃什麼 | 誰呼叫 |
| --- | --- | --- | --- |
| 讀檔（YAML 載入器） | `frontend/lib/content/load.ts` | 檔案系統 | `catalog.ts`、`validate-knowledge-points.ts`、sitemap／backfill 腳本 |
| 分類參考資料 | `load.ts` 的 `loadTaxonomy`、`loadCurriculumCodes` | `content/taxonomy/*.yaml` | 讀檔層；結果以 `Taxonomy` 物件傳進規則 |
| 規則 | `frontend/lib/content/rules/` | 記憶體物件（schema 形狀）＋`RuleContext` | 讀檔層、單元測試、之後的 kp-rules 服務 |

規則包不讀檔、不連 DB、不 import `server-only`。依賴只有 `ajv` 的型別與 `../types`。

| 檔案 | 內容 |
| --- | --- |
| `rules/types.ts` | `RuleContext`（taxonomy、validateSchema、兩份補件清單）、`KpDocument`（ref、raw、選填 location）、`PathDocument`、結果型別 |
| `rules/point.ts` | `checkPoint`：schema、形狀、位置（只有 YAML）、id、學科路徑與前綴、學段與年級、108 欄位與代碼、貫穿主題、專才通才、連結、deeper 學段、全形冒號、來源規則、圖與來源 id、承諾用語；同時讀成 `KnowledgePoint` |
| `rules/catalog.ts` | `checkPoints`（逐點＋重複 id＋補件清單 id＋引用存在＋先備循環）、`checkPaths`（主線） |
| `rules/normalize.ts` | `readSources`、`readFigures`、`readCircle`、`circleHasContent` |
| `rules/promise.ts` | 承諾用語（警告） |
| `rules/rules.test.ts` | 資料庫形式（沒有檔案位置）與 YAML 結果一致、承諾用語正反例、主線 |

沒有檔案位置的文件（資料庫）不檢查檔名與資料夾，學門資料夾改由學科樹最上層的 `content_folder` 推出；其他規則與訊息完全相同。

### 7.2 何時跑哪一層

| 時機 | 規則 | 不過時 |
| --- | --- | --- |
| 存草稿 | `checkPoint` | 可存，錯誤顯示在編輯器 |
| 送審 | `checkPoint` | 有錯誤不能送審 |
| 發布、回滾（admin） | `checkPoints`（目錄＝已發布＋這一版）＋`checkPaths`；改過的 `supports` 要有核對紀錄 | 擋發布 |
| 每晚 | 匯出 YAML 後跑現有 `pnpm validate:content` | 通知 admin |

### 7.3 承諾用語（警告）

學習時間或效果的保證：「保證」「包會」、「一定能學會」、「馬上學會」、「三天學會」、「成績提升 30%」。同一字串有「示意」「本站建議」、「」引文，或「根據／研究／調查／統計／指出」就不算。`sources`、`est_time`（schema 已要求帶 source）、代碼與結構欄位不掃。main 上這條規則新增 0 個警告（內容已普遍標示「示意」「本站建議」）。

### 7.4 kp-rules 服務（P1 後段）

同一份規則包包成內部 Cloud Run 服務：`POST /v1/check-point`、`/v1/check-catalog`、`/v1/check-paths`、`GET /v1/version`（rulesVersion＋taxonomyVersion）。只接受 API 服務帳號的 IAM 呼叫。.NET API 不重寫規則。

## 8. 遷移與凍結

1. **規則包**（P1，本 PR）：檢查改吃記憶體物件，CI 行為不變。
2. **YAML → 修訂版轉換器**（P1）：結構＋Markdown 可逆；241 點逐點比對 V2 主欄與側欄輸出，一字不差才算過。
3. **一次性匯入**（P2）：預設 dry-run，先對 Firestore 模擬器；每點建 `knowledge_points`＋revision 1，主線進 `learning_paths`，`audit_log` 記 gitSha；重跑不重複（`contentHash`）。正式 Firestore 匯入要另外取得 I-PING 同意。
4. **依學門凍結**（P6）：`frontend/content/db-frozen.yaml` 列出已交給 DB 的學門（只能增加），CI 擋下這些學門的 YAML 修改。條件：該學門沒有未合併的 YAML 批次 PR（B23–B28 照舊走 YAML）；凍結前以當時 main 重新匯入；每晚 Git 匯出與原 YAML 比對一致後，再開 PR 刪掉該學門的 YAML。凍結後的批次改用 API 建草稿。

## 9. 旗標上線（`KP_DB_SOURCE_ENABLED`）

- 不加 `NEXT_PUBLIC_`，每次請求讀；只有 `KP_ENABLED` 也是 true 才算開（同 `lib/kp/flags.ts` 現有模式）。預設關。
- 開：`loadCatalog` 與詳細頁讀 API 的 `catalog_snapshots`；關：讀 image 內打包的 YAML。V2 版面不變。
- 順序：本機正式 image（`frontend/Dockerfile`）＋Firestore 模擬器＋本機 API，旗標開與關各跑 Playwright（含 390px），輸出相同 → Cloud Run 帶標籤、0% 流量的 revision 打開旗標實測 → 切流量；有問題切回前一個 revision。
- `/kp` 頁改 ISR，快取上限 300 秒；發布時 API 呼叫受保護的 revalidate；API 失敗時繼續給舊快取。

## 10. 匯出與備份

| 機制 | 內容 |
| --- | --- |
| revisions | 每一版完整快照，發布後不可改 |
| audit_log | 只能新增 |
| Firestore 每日 managed export | 新 GCS 備份桶，保留 30 天 |
| 每晚 Git 匯出 | 已發布版本轉回 YAML，推到 `content-export` 分支（不合併 main），跑 `pnpm validate:content`，失敗通知 admin；用 git diff 審查變動，必要時重新匯入 |

## 11. 分期

| 期 | 內容 | 大小 | 使用者看得到 |
| --- | --- | --- | --- |
| P0 | 規格（本文件） | S | 否 |
| P1 | 規則包（本 PR 第一段）→ YAML 轉修訂版、241 點比對 → kp-rules 服務 | M | 否 |
| P2 | Firestore 集合與規則、API、匯入程式（模擬器） | L | 否 |
| P3 | 前台讀 `catalog_snapshots`、`/kp` ISR、教材區、本機 image 測試 | M | 旗標開才看得到 |
| P4 | 管理介面：結構表單、Markdown、教材連結、差異檢視、發布 | L | 管理者 |
| P5 | 每日 Firestore 匯出、每晚 Git 匯出＋驗證 | S | 否 |
| P6 | 依學門凍結、刪除 YAML | 每學門 S | 是 |

## 12. 對照程式後，方案要修正的地方

1. 計數已變：方案寫 124 published／117 draft（`8c62d7e`），`e9bfd5e` 是 206 published／35 draft。
2. 「Firestore 規則只讓 API 服務帳號寫」做不到：規則管不到 Admin SDK，Admin SDK 本來就繞過規則。正確做法是這些集合對客戶端 `read, write: if false`，所有寫入走 API。
3. 「teacher 能編輯」不能直接用 `TeacherOrAdmin`：它包含 `game_admin`。另開 `KpEditor`。
4. 規則包不是「純函式」一刀切：schema 檢查需要 Ajv 與 schema JSON，分類需要讀好的 `Taxonomy`。兩者由呼叫端讀好放進 `RuleContext`。
5. 檔名、資料夾、`knowledge/<學門>/<concept>/<學段>.yaml` 的檢查只對 YAML 有意義。資料庫文件不帶位置，學門資料夾由學科樹推出。
6. 禁用字清單不在 `load.ts`，在 `scripts/check-no-city-word.test.ts` 與 CI workflow 的 grep。要在 DB 儲存時檢查，得先把清單搬進規則包（下一步）。
7. 承諾用語在現有內容上 0 命中。這條規則目前只能擋以後的新寫法，不會整理出舊內容裡的問題。

## 13. P1 第一段做了什麼（PR `refactor/kp-rules-p1`）

- `load.ts` 只留讀檔與分類載入；所有知識點與主線規則搬到 `lib/content/rules/`。
- 證明行為不變：`pnpm validate:content` 輸出逐字相同（0 錯誤、140 警告）；`loadContent` 的整份結果（含 Map／Set）序列化後 sha256 相同；原樣加 15 種壞樣本（壞 id、重複 id、放錯資料夾、YAML／schema 壞掉、拿掉來源、先備循環、主線壞掉、分類壞掉、自編代碼等）的錯誤與警告在新舊版完全相同。
- 為了好和 B23（`Vc` 代碼）rebase，代碼格式相關的行（`ROMAN_STAGE`、`CODE_ROMAN`、`stageFromCode`、schema、`text.tsx`、自我測試）一行都沒動，仍在原位。`load.ts` 頂端的 `AUDIENCE`、`A_LEVEL_KINDS`、`CIRCLE_KEYS` 已複製到 `rules/point.ts`，緊鄰 B23 改的那行，等 B23 合併後再刪。

### 下一步（不在這個 PR）

1. YAML → 修訂版轉換器與 241 點逐字比對。
2. 禁用字清單搬進規則包，掃每個字串欄位。
3. kp-rules 服務（Cloud Run 內部）。
4. Firestore 集合、`firestore.rules`、API 端點、`KpEditor` 政策、匯入程式（只對模擬器）。
5. 前台讀取路徑與 `KP_DB_SOURCE_ENABLED`。
