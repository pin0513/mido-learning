# 知識點資料重構：從 YAML 搬進資料庫（規格）

| 項目 | 內容 |
| --- | --- |
| 狀態 | P0 規格（本文件）；P1 第一段（規則包抽出，#58）、第二段（YAML ⇄ 修訂版轉換器，#59）已合併；YAML 註解的去處（第 15 節，#61）已合併；註解守門與主線、分類的註解（第 16 節）進行中 |
| 依據 | 「知識點資料重構方案」（2026-10-29，分析 main `8c62d7e`）；本文件對照 main `e1763c7`（2026-10-30）的程式重寫 |
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
| 2026-10-30 | 「無損」的定義 | 解析後的資料相同（PM 審查接受） | 條件：YAML 註解（批次審稿紀錄）在任何學門凍結前要有明確去處，不能消失（第 3.2、8、15 節） |
| 2026-10-30 | 何時凍結學門 | 該學門所有進行中的 YAML 批次合併後才凍結 | 內容批次 B23–B28 照舊改 YAML、跑 `pnpm validate:content` |

## 2. 現況（main `e1763c7`）

| 項目 | 位置 | 說明 |
| --- | --- | --- |
| 知識點 | `frontend/content/knowledge/<學門資料夾>/<concept>/<學段>.yaml` | 241 份：language 108、soft-skills 33、math 26、it-ai 25、philosophy 25、pm-leadership 24；206 published、35 draft |
| Schema | `frontend/content/schema/knowledge-point.schema.json` | Ajv（strict、allErrors）；代碼格式（`perfCode`、`contentCode`）也在這裡 |
| 分類 | `frontend/content/taxonomy/`：`stages`、`curriculum-108`、`curriculum-108-codes`、`competencies`、`disciplines`、`formats` | Git 參考資料，維持不動（檔內註解也留在 Git，第 16 節） |
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
| `n`、`status` | int；`draft`／`in_review`／`published`／`archived` | 從 1 遞增，發布後整份不可改。這個 `status` 是修訂版的流程狀態；YAML 的 `status`（draft／review／published）存在 `knowledge_points/{kpId}.status` |
| `structure` | map | concept、title、version、discipline（path、layer、crosscutting）、stage（level、grades）、curriculum108（domains、coreCompetencies、issues、performances、contents，只存代碼）、prerequisites、links（why、how、related、deeper）、linkNotes、competency（specialist、generalist）、ai（delegable、humanExperience）、audience、toVerify、verifyNotes、estTime（school、source）、formats（slides、article、exercise、project、aiPrompt、game）、authors、updated |
| `lead` | map | idea、goal、scenario、review、guidingQuestions |
| `why`、`how`、`what` | Markdown string | 見第 4 節；YAML 沒有這一圈就沒有這個欄位 |
| `figures` | array | 沿用現有圖的 JSON 結構，原樣保存 |
| `sources` | array | id、title、publisher、url、accessed、kind、supports；verifiedBy、verifiedAt 由發布時寫入 |
| `taxonomyVersion`、`rulesVersion` | string | 驗證時的分類 git sha 與規則版本 |
| `validation` | map | ok、errors[]、warnings[]、checkedAt |
| `authorUid`、`submittedAt`、`publishedBy`、`publishedAt` | string、timestamp | `publishedBy` 必須是 admin |
| `changeNote`、`contentHash` | string | 重複匯入不建新版 |
| `importNotes` | map | 只在匯入產生的 revision 1：file（相對 `frontend/content`）、commit（匯入時的 main）、comments[]＝{line、column、text、inline、path}。text 是原檔註解逐字（含 `#`），line／column 從 1 起算，path 是它附著的欄位（整行註解＝下面第一個鍵，例如 `id`、`why`；行尾註解＝同一行的鍵）。不是知識點資料：不轉回 YAML、不進往返比對、之後的修訂不複製；檔案沒有註解就沒有這個欄位 |

驗證時把修訂版**轉回 schema 形狀的物件**（`lib/content/revision` 的 `recordToYaml`，再交給 `rules`），所以 schema 與規則只有一份。欄位名稱：YAML 的 snake_case 在修訂版改成 camelCase（`curriculum_108` → `curriculum108`、`core_competencies` → `coreCompetencies`、`human_experience` → `humanExperience`、`ai_prompt` → `aiPrompt`、`est_time` → `estTime`、`link_notes` → `linkNotes`、`to_verify` → `toVerify`、`verify_notes` → `verifyNotes`、`guiding_questions` → `guidingQuestions`），其餘同名。選填欄位「沒寫」和「寫了空陣列」分開保存。轉換器的型別在 `lib/content/revision/types.ts`（`KpRecord`＝`kpId`、`status`、`revision`）。

### 3.3 其他集合

| 集合 | 重點欄位 | 說明 |
| --- | --- | --- |
| `learning_paths/{pathId}` | title、discipline、items[]、version、updatedBy、importNotes | 取代 `content/paths/*.yaml`；只有 admin 能改。`importNotes` 和知識點同一個形狀（第 3.2 節），匯入時由 `importNotesFor` 從主線 YAML 逐字抽出，之後的修改不複製 |
| `kp_material_links/{linkId}` | kpId、revision、role（slides／audio／file／video／link）、section（why／how／what／null）、order、title、note、componentId、materialId、version、url、provider | 頂層集合才查得到「教材用在哪些知識點」；教材型的 `materialId`＋`version` 發布時寫死；`video` 只收允許清單網址 |
| `materials`（既有，加欄位） | kind（html_bundle／audio／file）、contentType、durationSec、pageCount | 舊資料沒有 `kind` 視為 html_bundle；不收影片 |
| `audit_log/{id}` | at、uid、action、kpId、fromRevision、toRevision、structureDiff、validationSummary | 只能新增。匯入那筆 action＝`kp.import`，另帶 file、commit、comments[]（和 revision 1 的 `importNotes` 同一份，`importAuditEntry` 產生），修訂版之後被改也查得到原始註解 |
| `catalog_snapshots/{discipline}` | publishedAt、catalogVersion、points[]（已發布結構＋內容） | 發布時由 API 寫；依學門分檔避開 1MB 上限；前台只讀這份 |

## 4. Markdown 寫法

每一圈一份 Markdown（實作：`lib/content/revision/markdown.ts`）：

```
## 標題                                  ← heading

第一段                                   ← body（每段一行，空行分隔）

:::qa{source="scrum-guide"}              ← qa（source 必填）
### 問題
回答
:::

:::items{title="四步做"}                 ← items_title＋items
- 項目標題 {code="涯 Ca-V-2"}            ← title、code（選填）
  項目內容                               ← text（兩格縮排）
  > 例子                                 ← example（選填）
:::

:::checklist{title="每輪檢查"}           ← checklist_title＋checklist
- 檢查項目
:::

::figure{#agile-flow role="activity"}    ← activity_figure
::figure{#agile-compare}                 ← figures（`::figure{}` 表示空陣列）

:::notes                                 ← notes（每則一段）
補充說明
:::

[^scrum-guide] [^zonghe]                 ← sources
```

- 每個值佔一行。值是空字串、含換行、前後有空白、或開頭是 `# : - > [ \ { * + |` 時，整行寫成 `\` 加 JSON 字串；屬性值一律是 JSON 字串。讀回來一字不差。
- 輸出用上面的固定順序；讀的時候區塊順序不拘。寫錯（沒有標題、區塊沒收尾、不認得的區塊）回報行號，`checkRecord` 算錯誤。
- 不允許原始 HTML：渲染沿用 V2 的 `components/kp/v2/text.tsx`（RichText），它只輸出文字節點。
- 轉換器必須可逆。「可逆」的定義是**資料**：YAML 解析出的物件 → 修訂版 → 物件完全相同（型別、值、陣列順序、選填欄位有沒有寫）。物件的欄位順序不保留（Firestore 的 map 不保留順序），匯出時一律用 schema 的順序；YAML 註解不是資料，不進 structure 與內文，逐字放在 revision 1 的 `importNotes`（第 3.2、15 節）。

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
2. **YAML → 修訂版轉換器**（P1 第二段，`lib/content/revision/`）：結構＋Markdown 可逆；每一點逐點比對 V2 主欄與側欄輸出，一字不差才算過；每個檔的註解逐字抽進 `importNotes`，以 `#` 開頭的每一行都要抽到（`scripts/kp-revision-roundtrip.test.ts` 在 `pnpm test:unit` 裡跑；`pnpm kp:roundtrip` 印各學門結果）。
3. **一次性匯入**（P2）：預設 dry-run，先對 Firestore 模擬器；每點建 `knowledge_points`＋revision 1（`yamlToRecord` 帶原文與 commit，註解進 `importNotes`），主線進 `learning_paths`（`importNotes` 同上，`audit_log` 每條主線一筆 `path.import`），`audit_log` 每點一筆 `kp.import`（gitSha＋同一份註解）；匯入報表列出每個檔（知識點與主線）的註解筆數，和原檔以 `#` 開頭的行數相同才算成功；重跑不重複（`contentHash`）。正式 Firestore 匯入要另外取得 I-PING 同意。
4. **依學門凍結**（P6）：`frontend/content/db-frozen.yaml` 列出已交給 DB 的學門（只能增加），CI 擋下這些學門的 YAML 修改。條件：該學門沒有未合併的 YAML 批次 PR（B23–B28 照舊走 YAML）；凍結前以當時 main 重新匯入；每晚 Git 匯出與原 YAML 比對一致（比資料）後，再開 PR 刪掉該學門的 YAML。**註解的去處是凍結的前提**：(a) 該學門每個檔的註解都已在 DB 的 `importNotes` 與 `audit_log`（從凍結當時的 main 重新抽一次，逐筆相同）；(b) 刪除前在那個 main commit 打標籤 `kp-yaml-final/<學門>`；(c) 刪 YAML 的 PR 說明寫出標籤與完整 sha，原檔與註解永遠留在 Git 歷史。三項缺一項就不凍結。凍結後的批次改用 API 建草稿。刪 YAML 的那個 PR 同時跑 `pnpm content:comments:lock`，把該學門的檔從註解鎖移掉（鎖檔的變更就是刪除紀錄）；主線檔在最後一個用到它的學門凍結時一起處理。分類檔不凍結、不刪，註解一直留在 Git。
5. **凍結前的註解守門**（現在就生效，見第 16 節）：`content/comments.lock.yaml` 記每個 YAML 檔的註解指紋，CI 的「YAML comments may not silently disappear」擋下刪掉或改掉已鎖的註解；故意刪改要跑 `pnpm content:comments:lock`，鎖檔變更出現在 review。新檔、新註解不擋。

## 9. 旗標上線（`KP_DB_SOURCE_ENABLED`）

- 不加 `NEXT_PUBLIC_`，每次請求讀；只有 `KP_ENABLED` 也是 true 才算開（同 `lib/kp/flags.ts` 現有模式）。預設關。
- 開：`loadCatalog` 與詳細頁讀 API 的 `catalog_snapshots`；關：讀 image 內打包的 YAML。V2 版面不變。
- 順序：本機正式 image（`frontend/Dockerfile`）＋Firestore 模擬器＋本機 API，旗標開與關各跑 Playwright（含 390px），輸出相同 → Cloud Run 帶標籤、0% 流量的 revision 打開旗標實測 → 切流量；有問題切回前一個 revision。
- `/kp` 頁改 ISR，快取上限 300 秒；發布時 API 呼叫受保護的 revalidate；API 失敗時繼續給舊快取。
- **打開 `KP_DB_SOURCE_ENABLED` 要 I-PING 本人明確同意**：任何正式環境（含帶標籤、0% 流量的 revision）都一樣，不能由 AI 批次、teacher 或自動流程自行打開；和第 8 節「正式 Firestore 匯入要另外取得 I-PING 同意」是同一個原則。

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
| P1 | 規則包（第一段，#58）→ YAML 轉修訂版、逐點比對（第二段）→ kp-rules 服務 | M | 否 |
| P2 | Firestore 集合與規則、API、匯入程式（模擬器） | L | 否 |
| P3 | 前台讀 `catalog_snapshots`、`/kp` ISR、教材區、本機 image 測試 | M | 旗標開才看得到 |
| P4 | 管理介面：結構表單、Markdown、教材連結、差異檢視、發布 | L | 管理者 |
| P5 | 每日 Firestore 匯出、每晚 Git 匯出＋驗證 | S | 否 |
| P6 | 依學門凍結、刪除 YAML | 每學門 S | 是 |

## 12. 對照程式後，方案要修正的地方

1. 計數已變：方案寫 124 published／117 draft（`8c62d7e`），`e9bfd5e` 是 206 published／35 draft（到 `e1763c7` 不變）。
2. 「Firestore 規則只讓 API 服務帳號寫」做不到：規則管不到 Admin SDK，Admin SDK 本來就繞過規則。正確做法是這些集合對客戶端 `read, write: if false`，所有寫入走 API。
3. 「teacher 能編輯」不能直接用 `TeacherOrAdmin`：它包含 `game_admin`。另開 `KpEditor`。
4. 規則包不是「純函式」一刀切：schema 檢查需要 Ajv 與 schema JSON，分類需要讀好的 `Taxonomy`。兩者由呼叫端讀好放進 `RuleContext`。
5. 檔名、資料夾、`knowledge/<學門>/<concept>/<學段>.yaml` 的檢查只對 YAML 有意義。資料庫文件不帶位置，學門資料夾由學科樹推出。
6. 禁用字清單不在 `load.ts`，在 `scripts/check-no-city-word.test.ts` 與 CI workflow 的 grep。要在 DB 儲存時檢查，得先把清單搬進規則包（下一步）。
7. 承諾用語在現有內容上 0 命中。這條規則目前只能擋以後的新寫法，不會整理出舊內容裡的問題。
8. 第 3.2 節原本的 `structure` 少了 `version`、`formats`、`authors`、`updated`，而且修訂版的 `status`（流程）和 YAML 的 `status`（draft／review／published）是兩回事。要無損就得保存；已補進第 3.2 節，YAML 的 `status` 放在 `knowledge_points` 上。
9. 「YAML → 修訂版 → YAML 一字不差」做不到文字層級：131 個檔有註解（批次審查紀錄，其中 5 個檔中間還有「新增」分隔線），物件欄位順序各檔不同（最常見的兩種順序分別有 67、64 檔），日期字串的引號也是原本工具的寫法。改成以**資料**相同為準（第 4 節）。匯出的 YAML 文字與原檔（去掉註解）完全相同的有 91 檔，其餘只差欄位順序。凍結學門時「Git 匯出與原 YAML 比對一致」也要比資料，不比文字。註解不算資料，但要保存，見更正 11。
10. 修訂版裡的圖與來源可以原樣進 Firestore：圖的 `groups[].symbols` 是「陣列裡的物件裡的陣列」，Firestore 允許；沒有陣列直接套陣列。轉換測試會檢查這一點。
11. 更正 9 原本寫「註解要留的話寫進 `knowledge_points.seed`（P2 決定）」，PM 審查不接受「可能消失」：註解是批次審稿紀錄，凍結前一定要有去處。改成：轉換器逐字抽出每個檔的全部註解（不只檔頭；有 5 個檔在 `why` 前面還有一段「新增」紀錄），放進 revision 1 的 `importNotes`，匯入時同一份寫進 `audit_log`，凍結 PR 引用標籤與 sha，原檔留在 Git 歷史（第 3.2、8 節）。在 `e1763c7`：131 個檔、704 行，全部是整行註解，沒有行尾註解；附著欄位 `id` 699 筆、`why` 5 筆。
12. 註解不只在知識點：`769c966` 上，`content/` 底下 146 個 YAML 檔、751 則註解（Lexer 數）：知識點 131 檔 704 則；分類 6 檔 35 則（`disciplines.yaml` 有 2 則行尾註解）；主線 6 檔各 1 則；`content/` 根目錄 3 檔 6 則（兩份補強清單、`home-disciplines.yaml`）。分類留在 Git，註解跟著留；主線搬進 `learning_paths`，轉換器目前不處理主線，P2 的主線匯入用同一個 `importNotesFor`（單元測試已證明 6 個主線檔的註解逐字抽得到）；根目錄三檔不搬，註解留在 Git。
13. 「匯入時抽註解」只保護匯入那一刻的內容；匯入前的內容 PR 也可能刪掉註解。所以凍結前要有 CI 守門（第 8 節第 5 步、第 16 節）。

## 13. P1 第一段做了什麼（PR `refactor/kp-rules-p1`）

- `load.ts` 只留讀檔與分類載入；所有知識點與主線規則搬到 `lib/content/rules/`。
- 證明行為不變：`pnpm validate:content` 輸出逐字相同（0 錯誤、140 警告）；`loadContent` 的整份結果（含 Map／Set）序列化後 sha256 相同；原樣加 15 種壞樣本（壞 id、重複 id、放錯資料夾、YAML／schema 壞掉、拿掉來源、先備循環、主線壞掉、分類壞掉、自編代碼等）的錯誤與警告在新舊版完全相同。
- 為了好和 B23（`Vc` 代碼）rebase，代碼格式相關的行（`ROMAN_STAGE`、`CODE_ROMAN`、`stageFromCode`、schema、`text.tsx`、自我測試）一行都沒動，仍在原位。`load.ts` 頂端的 `AUDIENCE`、`A_LEVEL_KINDS`、`CIRCLE_KEYS` 已複製到 `rules/point.ts`，緊鄰 B23 改的那行，等 B23 合併後再刪。

## 14. P1 第二段：YAML ⇄ 修訂版轉換器（PR `feat/kp-revision-converter`）

| 檔案 | 內容 |
| --- | --- |
| `lib/content/revision/types.ts` | `KpRecord`（kpId、status、revision）、`KpRevisionContent`（structure、lead、why／how／what、figures、sources）、`ConvertError` |
| `lib/content/revision/markdown.ts` | 一圈 ⇄ Markdown（第 4 節） |
| `lib/content/revision/convert.ts` | `yamlToRecord`、`recordToYaml`、`recordToYamlText`（每晚匯出用）、`checkRecord`／`checkRecords`（轉回物件後跑 `rules`） |
| `lib/content/revision/revision.test.ts` | Markdown 固定寫法、跳脫、區塊順序、錯誤行號、不認得的欄位、規則結果一致 |
| `scripts/kp-revision-roundtrip.ts`（`pnpm kp:roundtrip`） | 全部知識點的往返比對與各學門報表 |
| `scripts/kp-revision-roundtrip.test.ts` | 同上，掛在 `pnpm test:unit`（CI 的 Validate knowledge points）；另有一個「改一個字就抓得到」的反向測試 |
| `scripts/node-stubs.ts`（原 `.mjs`，第 15 節改） | 讓 Node 直接 render 詳細頁：`server-only` 與 `.css` 換成空模組；只由 `kp-revision-roundtrip.ts` 第一行 import |

比對內容（每一點）：資料往返（含模擬 Firestore 的 JSON 來回、第二次轉換、匯出 YAML 文字解析回來、Markdown 讀回再寫出）、Firestore 存得下、`checkRecords` 的錯誤與警告和 YAML 相同（訊息開頭換成 `knowledge_points/<id>`）、讀成的 `KnowledgePoint` 相同（`file` 除外）、V2 詳細頁主欄與側欄 HTML 逐字元相同（含草稿的目錄每點一頁，只看已發布的目錄每個已發布點再一頁）。

結果（main `a8aba8c`）：241 點資料無損 241、畫面相同 241（比了 447 頁）；規則 0 錯誤、140 警告，兩邊相同。

### 下一步（不在這個 PR）

1. 禁用字清單搬進規則包，掃每個字串欄位。
2. kp-rules 服務（Cloud Run 內部），對外提供 `checkRecord`／`checkRecords`。
3. Firestore 集合、`firestore.rules`、API 端點、`KpEditor` 政策、匯入程式（只對模擬器）。
4. 前台讀取路徑與 `KP_DB_SOURCE_ENABLED`。

## 15. YAML 註解的去處（PR `feat/kp-import-notes`）

PM 審查接受「無損＝解析後的資料相同」，條件是註解要有去處（第 1 節）。

| 檔案 | 內容 |
| --- | --- |
| `lib/content/revision/comments.ts` | `extractComments`（用 yaml 的 Lexer 逐字抽，字串裡的 `#` 不算）、`importNotesFor`、`importAuditEntry`（`audit_log` 那筆的純資料）、`blankComments`（測試用：挖掉抽到的註解） |
| `lib/content/revision/types.ts` | `KpRevisionContent.importNotes`、`KpImportNotes`、`KpSourceComment` |
| `lib/content/revision/convert.ts` | `yamlToRecord(raw, ref, { sourceText, file, commit })` 帶原文時寫 `importNotes`；`recordToYaml` 認得但不輸出它 |
| `scripts/kp-revision-roundtrip.ts` | 第 5 項比對：以 `#` 開頭的每一行都抽到（不靠 Lexer 數）；抽到的每筆在原檔那一行那一欄逐字相同；挖掉之後 Lexer 找不到任何註解、資料不變 |
| `scripts/node-stubs.ts` | 不再由 `test:unit` 整體預先載入；只在需要 render 的腳本第一行 import。`node --test` 每個測試檔各一個行程，其他單元測試誤 import `server-only` 照樣失敗（`revision.test.ts` 有測） |

結果（main `e1763c7`）：註解 131 個檔、704 行，逐字抽到 704 筆（行尾 0）；資料無損 241、畫面相同 241（447 頁）；規則 0 錯誤、140 警告，兩邊相同。

## 16. 凍結前的註解守門（PR `feat/kp-comment-guard`）

PM 審查的 P2 後續：學門凍結之前，內容 PR 不能悄悄刪掉 YAML 註解。

**規則**
- `frontend/content/comments.lock.yaml`：`content/` 底下每個有註解的 YAML 檔，列出每一則註解的指紋（逐字內容的 sha256 前 12 碼）。順序不算，重複的註解各算一次。這個檔自己不掃。
- CI 擋下：鎖裡有、檔案裡沒有的註解，包括刪掉、改字、整段檔頭刪光、整個檔刪掉或改名。錯誤訊息寫出檔名和指紋。
- 不擋：新檔、新加的註解、搬動註解的位置。新註解在下一次重寫鎖檔時鎖進去。
- 故意刪改既有註解時，在 `frontend/` 跑一個指令 `pnpm content:comments:lock`，把鎖檔一起提交。指令會印出這次解鎖了哪些檔，請寫在 PR 說明。
- 和 main 比（CI 用 `--base`）：main 上有、還沒鎖、被這個 PR 刪掉的註解，發 GitHub 警告，不擋。從鎖看不出這種刪除是不是故意的，所以交給 reviewer。想讓新註解立刻受保護，加註解的批次可以順手跑一次 `pnpm content:comments:lock`。

**用過去的批次重放**：每個 commit 用前一個 commit 的內容當鎖。B1–B23 和之前的內容 commit 共 26 個，25 個通過，只有 B8 會被擋下：它改寫了 `lg.ai/sh.yaml` 一行 B5 的審稿紀錄。這正是要 review 看到的情況，跑一次 `pnpm content:comments:lock` 就過。B13–B23 發布時拿掉了提案檔頭，所以註解沒有變化，也不用碰鎖檔。B1–B12 保留檔頭，只會新增註解，也通過。B24（哲學大學）要改的 6 個檔目前沒有註解，加不加檔頭都會過。

| 檔案 | 內容 |
| --- | --- |
| `lib/content/comment-lock.ts` | `snapshotComments`、`lockToText`／`parseLock`、`checkAgainstLock`、`unlockedRemovals`（純函式） |
| `scripts/check-yaml-comments.ts` | `pnpm content:comments`（檢查）、`pnpm content:comments:lock`（重寫）、`--base`（和 origin/main 比） |
| `lib/content/comment-lock.test.ts` | 刪一則、改一字、刪光檔頭、刪檔都擋下；一般批次（改內容、加檔頭、搬註解、新檔）都過；重寫鎖後過；主線註解逐字抽得到 |
| `.github/workflows/validate-knowledge-points.yml` | 在 backfill 檢查後面加一步 `pnpm content:comments --base` |
