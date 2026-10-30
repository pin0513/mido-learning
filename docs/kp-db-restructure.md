# 知識點資料重構：從 YAML 搬進資料庫（規格）

| 項目 | 內容 |
| --- | --- |
| 狀態 | P0 規格（本文件）；P1 第一段（規則包抽出，#58）、第二段（YAML ⇄ 修訂版轉換器，#59）已合併；YAML 註解的去處（第 15 節，#61）已合併；註解守門與主線、分類的註解（第 16 節，#62）已合併；旗標的前提（第 17 節，#65）已合併；做法 A 第一步（旗標集中到部署 workflow，第 17.4 節）進行中 |
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
2. **YAML → 修訂版轉換器**（P1 第二段，`lib/content/revision/`）：結構＋Markdown 可逆；每一點逐點比對 V2 主欄與側欄輸出，一字不差才算過；每個檔的註解逐字抽進 `importNotes`，整行註解與行尾註解都要抽到（`scripts/kp-revision-roundtrip.test.ts` 在 `pnpm test:unit` 裡跑；`pnpm kp:roundtrip` 印各學門結果）。
3. **一次性匯入**（P2）：預設 dry-run，先對 Firestore 模擬器；每點建 `knowledge_points`＋revision 1（`yamlToRecord` 帶原文與 commit，註解進 `importNotes`），主線進 `learning_paths`（`importNotes` 同上，`audit_log` 每條主線一筆 `path.import`），`audit_log` 每點一筆 `kp.import`（gitSha＋同一份註解）；匯入報表列出每個檔（知識點與主線）的註解筆數，和 yaml Lexer 在原檔數到的註解數相同才算成功。這個數包含整行註解與行尾註解（`key: value  # 說明`），不含字串與區塊字串裡的 `#`，等於 `content/comments.lock.yaml` 裡那個檔的指紋數（`extractComments` 與註解鎖用同一個數法）。不能用「以 `#` 開頭的行數」：`taxonomy/disciplines.yaml` 有 5 行整行註解、2 則行尾註解（第 186、187 行），行數是 5，實際是 7（分類不匯入，但同一套數法也用在鎖檔）。到 `ac79f40`（152 個有註解的檔、781 則），其他 151 個檔兩種數法相同；`*.yaml` 的區塊字串若出現以 `#` 開頭的 Markdown 標題，行數也會多算。重跑不重複（`contentHash`）。正式 Firestore 匯入要另外取得 I-PING 同意。
4. **依學門凍結**（P6）：`frontend/content/db-frozen.yaml` 列出已交給 DB 的學門（只能增加），CI 擋下這些學門的 YAML 修改。條件：該學門沒有未合併的 YAML 批次 PR（B23–B28 照舊走 YAML）；凍結前以當時 main 重新匯入；每晚 Git 匯出與原 YAML 比對一致（比資料）後，再開 PR 刪掉該學門的 YAML。**註解的去處是凍結的前提**：(a) 該學門每個檔的註解都已在 DB 的 `importNotes` 與 `audit_log`（從凍結當時的 main 重新抽一次，逐筆相同）；(b) 刪除前在那個 main commit 打標籤 `kp-yaml-final/<學門>`；(c) 刪 YAML 的 PR 說明寫出標籤與完整 sha，原檔與註解永遠留在 Git 歷史。三項缺一項就不凍結。凍結後的批次改用 API 建草稿。刪 YAML 的那個 PR 同時跑 `pnpm content:comments:lock`，把該學門的檔從註解鎖移掉（鎖檔的變更就是刪除紀錄）；主線檔在最後一個用到它的學門凍結時一起處理。分類檔不凍結、不刪，註解一直留在 Git。
5. **凍結前的註解守門**（現在就生效，見第 16 節）：`content/comments.lock.yaml` 記每個 YAML 檔的註解指紋，CI 的「YAML comments may not silently disappear」擋下刪掉或改掉已鎖的註解；故意刪改要跑 `pnpm content:comments:lock`，鎖檔變更出現在 review。新檔、新註解不擋。

## 9. 旗標上線（`KP_DB_SOURCE_ENABLED`）

- 不加 `NEXT_PUBLIC_`，每次請求讀；只有 `KP_ENABLED` 也是 true 才算開（同 `lib/kp/flags.ts` 現有模式）。預設關。
- 開：`loadCatalog` 與詳細頁讀 API 的 `catalog_snapshots`；關：讀 image 內打包的 YAML。V2 版面不變。
- 順序：本機正式 image（`frontend/Dockerfile`）＋Firestore 模擬器＋本機 API，旗標開與關各跑 Playwright（含 390px），輸出相同 → Cloud Run 帶標籤、0% 流量的 revision 打開旗標實測 → 切流量；有問題切回前一個 revision。
- `/kp` 頁改 ISR，快取上限 300 秒；發布時 API 呼叫受保護的 revalidate；API 失敗時繼續給舊快取。
- 打開前先看第 17 節：詳細頁是 build 時生成的靜態頁，現有的 `KP_SOFTSKILLS_ENABLED`、`KP_YUWEN_ENABLED` 只在執行時切換不夠；`KP_DB_SOURCE_ENABLED` 讓詳細頁改讀 API 時，同樣要說清楚頁面在 build 時還是請求時決定。
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

## 17. 旗標的前提（`KP_SOFTSKILLS_ENABLED`、`KP_DETAIL_V2_ENABLED`）

#64 加了「旗標開的正式 build」e2e 之後，對照程式找到兩個問題。問題 2 的 V2 部分已由第 17.6 節的 PR 修好，其餘還沒修，打開 `KP_SOFTSKILLS_ENABLED`（或在旗標關的 build 上打開 `KP_DETAIL_V2_ENABLED`）之前要先處理。`KP_YUWEN_ENABLED` 走同一條路（`isFolderLaunched("language")`），問題相同。

**任何正式環境的旗標切換（打開或關掉，含帶標籤、0% 流量的 revision）都要 I-PING 本人明確同意**，不能由 AI 批次、teacher 或自動流程自行切換。這和第 9 節 `KP_DB_SOURCE_ENABLED` 是同一個原則。下面的做法與檢查清單都是同意之前要準備好的東西，不代表可以自行切換。

### 17.1 問題

1. **詳細頁在 build 時就決定好了，執行時切換 `KP_SOFTSKILLS_ENABLED` 不會加上跨學門的軟實力連結。**
   - `/kp/概念/學段` 與 `/kp-v2/概念/學段` 都是 `generateStaticParams`＋`dynamicParams = false` 的靜態頁。
   - 頁面裡「這個點連不連得出去」用 `isFolderLaunched(folder)`，它讀 `KP_ENABLED`＋`KP_SOFTSKILLS_ENABLED`，但讀的是 `next build` 當時的值。
   - 請求時讀的有：middleware、首頁（`/city-home`）、`/kp`、`/kp/layer/*`、`/kp/stage/*`、`/kp/competency/*`、`/kp/index.json`、sitemap。所以執行時打開旗標，`/kp/sk.*` 會回 200，首頁會出現六格。
   - `/kp`、`/kp/layer/[id]`（`page.tsx:34`）、`/kp/stage/[id]`（`page.tsx:35`）、`/kp/competency/[code]` 也用 `isFolderLaunched`，但它們先呼叫 `await headers()`，在 build 輸出裡是 `ƒ`（請求時才算），不是靜態頁。全關與全開兩張 build 在同一組執行時旗標下渲染比對，這幾頁的差異是 0。
   - build 時讀、寫死在頁面裡的只有靜態詳細頁：`/kp/概念/學段`、`/kp/概念`、`/kp-v2/概念/學段`（`KnowledgePointView`、`components/kp/v2/refs.ts`）。`/kp/map` 是靜態頁，但不看學門旗標，本來就只畫四個領域。
   - 但別學門的頁面還是旗標關時的樣子。例如 `pm.team@jh` 的「把這裡當先備」不會列出 `sk.consensus@sh`，`ph.argument@jh` 不會連到 `sk.speech@jh`。
   - 反過來，旗標開著 build、執行時關掉，別學門的頁面會連到 middleware 回 404 的 `/kp/sk.*`。所以關掉旗標同樣要重新 build，不能只重啟行程。
   - #64 的反向對照證實了這點：旗標關的 build 只在執行時打開旗標，`ph.argument@jh → sk.speech@jh` 的連結不在。
   - `frontend/content/README.md` 的旗標表與 `lib/kp/flags.ts` 的說明原本寫「不用重新 build」，只對上面列的請求時頁面成立，對詳細頁不成立。兩處都已改寫（第 17.4 節的 PR）。
2. **旗標關的 build 上，V2 的「後學」把已發布的軟實力點算成「尚未發布」。**
   - `SeqPanel` 的後學讀完整內容的 `requiredBy`。`PointLinks` 對每一筆用 `shownPoint`（可見而且學門已上線，或同學門）決定連不連；不連的就算進「另有 N 個尚未發布」。
   - 旗標關的時候，已發布的軟實力點也不連，就被寫成「尚未發布」。
   - 例：`ph.argument@jh` 的後學是 `ph.fallacy@jh`、`ph.logic@sh`，另有「另有 1 個尚未發布」，那一筆是已發布的 `sk.speech@jh`。在 `484b512` 上，旗標關的 build＋執行時打開 `KP_SOFTSKILLS_ENABLED`、`KP_DETAIL_V2_ENABLED` 實測，`/kp/sk.speech/jh` 回 200，`ph.argument@jh` 卻寫它「尚未發布」。
   - 目前其他這類的組合是 `ph.reason@es → sk.point@es`、`pm.conflict@sh → sk.facilitate@uni`、`pm.team@jh → sk.consensus@sh`。B25–B28 發布更多軟實力點後會變多。
   - 2026-10-30 補註：軟實力與語文在 build 時都關（正式站現況）時，實際是 11 個點，見第 17.6 節。V2 已修好（第 17.6 節）；舊版頁的 `LinkedIds` 還沒改。
   - 舊版詳細頁的 `LinkedIds` 也是同一個算法（先備與四種 links）。只開軟實力時沒有實例；但軟實力與語文都在執行時打開、build 時全關（正式站現況，第 17.5 節），舊版頁就會把對方學門的已發布點算成「尚未發布」，例如 `sk.present@sh` 寫「另有 2 個知識點尚未發布」，那兩筆是已發布的 `zh.explain@sh`、`en.present@sh`。舊版的「把這裡當先備」只列看得到的點，不計數。

### 17.2 做法

| 做法 | 內容 | 好處 | 代價 |
| --- | --- | --- | --- |
| A. 旗標綁 build | `deploy-frontend.yml` 的 `docker build` 帶 `KP_ENABLED`、`KP_SOFTSKILLS_ENABLED`（與 `KP_YUWEN_ENABLED`）build arg，Dockerfile 在 builder 階段設成 ENV；`gcloud run deploy` 用同一組值 `--update-env-vars`。旗標的值放在 workflow 的 env，切換＝改值的 PR＋重新部署 | build 與執行時永遠一致；切換有 PR 紀錄，回滾＝重新部署前一張 image | 切換要跑一次部署（約數分鐘）；不能只在 Cloud Run 主控台改環境變數 |
| B. V2／舊版不把旗標擋掉的已發布點算成未發布 | `PointLinks` 與 `LinkedIds` 只把「不在 `visible` 裡」的點（草稿）算進筆數；已發布但學門沒上線的點整筆不出現 | 「尚未發布」的字面永遠正確；旗標關的 build 不再誤報 | 不解決問題 1：旗標打開後仍要重新 build 才有跨學門連結 |
| C. 詳細頁改成每次請求重算 | 跨學門連結的區塊改由請求時讀旗標（`headers()` 或 ISR），像 `/kp` 的 index 頁 | 執行時切換就生效 | 數百個靜態頁變成動態或 ISR，影響效能與快取；和第 9 節 `/kp` ISR 一起規劃比較合理 |

**建議：A＋B，C 留到第 9 節的 P3 再評估。** A 讓「切換旗標」和「重新部署」變成同一件事，build 時與執行時不會再不一致；B 是小改動，讓「尚未發布」只代表草稿，旗標關的 build 也不會誤報。兩者都要另開程式 PR。這份文件只寫規格。

### 17.3 切換前的檢查清單（每一項都做完，才請 I-PING 同意）

1. 已合併 A 與 B（或 I-PING 明確接受不做的風險）。
2. 在 `deploy-frontend.yml` 把 `KP_BUILD_FLAGS` 與 `KP_RUNTIME_FLAGS` 改成要上線的值（同一個 PR），用 `KP_BUILD_FLAGS` 重新 build 正式 image（`frontend/Dockerfile`，不帶 `KP_INCLUDE_DRAFTS`）。
3. 在這張正式 image 上跑旗標開的正式 build e2e：`e2e/kp-published-softskills.spec.ts`，舊版與 V2 各一輪（`E2E_PUBLISHED_SOFTSKILLS=1`，V2 再加 `KP_DETAIL_V2_ENABLED=true`、`E2E_DETAIL_V2=1`），跟 CI「Published-only pages, soft-skills on」同一組設定，但對象是正式 image，不是 CI 的 `next build`。第 1 則（旗標在 build 與執行時都開）必須通過。
4. 部署成帶標籤、0% 流量的 revision，對它的網址再跑一次第 3 項，並人工看：首頁六格、`/kp/sk.facilitate/uni`、`pm.team@jh` 列出 `sk.consensus@sh`、`ph.argument@jh` 的後學連到 `sk.speech@jh` 且沒有「尚未發布」誤報。
5. 取得 I-PING 本人明確同意後才切流量；切完在正式網址再看一次第 4 項。
6. 回滾：切回前一個 revision（它的 image 與旗標值一致）；不要只改環境變數。

`KP_DETAIL_V2_ENABLED` 本身只是 middleware 改寫，執行時切換就生效；但 V2 頁裡的連結一樣是 build 時的旗標值，所以在旗標關的 build 上打開 V2 時，問題 2 會直接出現在正式站。B 合併之前，打開 V2 也要走上面的清單。B 的 V2 部分合併後（第 17.6 節），V2 不再誤報「尚未發布」，但跨學門連結仍是 build 時的值（問題 1），打開 V2 仍屬旗標切換，要 I-PING 本人明確同意。

### 17.4 做法 A 第一步：旗標集中到部署 workflow，值照現況

- `.github/workflows/deploy-frontend.yml` 的 `env` 是正式旗標的唯一來源，分兩行：
  - `KP_BUILD_FLAGS`：`docker build` 時逐一當 `--build-arg` 傳進去；`frontend/Dockerfile` 在 builder 階段有對應的 `ARG`／`ENV`，不進最後的 image。
  - `KP_RUNTIME_FLAGS`：`gcloud run deploy --update-env-vars` 設成 Cloud Run 環境變數。
- 兩行都照 2026-10-30 正式站的實際值寫（見第 17.5 節），合併後正式內容不變：`KP_BUILD_FLAGS` 全是 `false`（現行 workflow 的 build 不帶 `KP_*`，等於全關），`KP_RUNTIME_FLAGS` 是 `KP_ENABLED`、`KP_HOME_ENABLED`、`KP_SOFTSKILLS_ENABLED`、`KP_YUWEN_ENABLED` 為 `true`，`KP_DETAIL_V2_ENABLED` 為 `false`。
  - Cloud Run 會多一個 `KP_DETAIL_V2_ENABLED=false`。旗標只認 `"true"`，和沒設一樣。
- `Check KP flags` 步驟：每個名字都要是 `KP_*`、值只能是 `true`／`false`、Dockerfile 要有對應的 `ARG`、兩行要列同一組旗標；兩行的值不一致時發 `::warning::`。
- 第二步（另一個 PR）：把 `KP_BUILD_FLAGS` 改成和 `KP_RUNTIME_FLAGS` 一致。這會改變正式內容（下面 20 條路由），屬於旗標切換，要先走第 17.3 節的清單，並取得 I-PING 本人明確同意。

### 17.5 正式站現況（2026-10-30，`f4a394f`，revision `00203-5fb`）

- build 時：`deploy-frontend.yml` 只傳 `NEXT_PUBLIC_*` build arg，Dockerfile 沒有 `KP_*` 的 `ARG`，`.dockerignore` 排除 `.env*`。所以每一張正式 image 都是在 `KP_*` 全關下 build 的。
- 執行時（Cloud Run 環境變數）：`KP_ENABLED`、`KP_HOME_ENABLED`、`KP_SOFTSKILLS_ENABLED`、`KP_YUWEN_ENABLED` 都是 `true`；`KP_DETAIL_V2_ENABLED` 沒設。
  - `KP_SOFTSKILLS_ENABLED=true` 從 revision `00166-25r`（2026-10-27 16:18，台北時間）起；`KP_YUWEN_ENABLED=true` 從 `00168-rvp`（2026-10-28 08:56，台北時間）起。兩個 revision 都是 `pin0513@gmail.com` 用 `gcloud` 在 CI 部署後一分鐘內另外建的；部署 workflow 沒有設環境變數，之後的部署沿用。
- 所以正式站現在：
  - middleware 放行：已發布的 `/kp/sk.*` 與語文點回 200、內容完整（例如 `/kp/sk.listen/es`、`/kp/sk.speech/jh`），`/kp/discipline/soft-skills` 回 200，首頁六格，sitemap 與 `/kp/index.json` 列出軟實力點。草稿（例如 `sk.hypo/uni`）沒有生成頁面，回 404。
  - 本機「旗標關」的 e2e 預期 `/kp/sk.*` 是 404，是因為本機執行時也關；正式站執行時是開的。
  - 靜態詳細頁還是全關時 build 的樣子：10 個點、20 條路由（含 `/kp/概念`）缺跨學門連結，其中 6 個點在舊版頁上寫「另有 N 個知識點尚未發布」，其實那些點都已發布、上線：

| 頁面 | build 與執行時一致後會多出的連結 | 現在的誤報 |
| --- | --- | --- |
| `en.emi@uni` | `sk.discuss@jh` | 另有 1 個尚未發布 |
| `en.present@sh` | `sk.present@sh` | 另有 1 個尚未發布 |
| `ph.argument@jh` | `sk.speech@jh` | — |
| `ph.reason@es` | `sk.point@es`、`sk.why5@es` | — |
| `pm.conflict@sh` | `sk.facilitate@uni` | — |
| `pm.team@jh` | `sk.consensus@sh` | — |
| `sk.audience@jh` | `zh.audience@uni` | 另有 1 個尚未發布 |
| `sk.present@sh` | `zh.explain@sh`、`en.present@sh` | 另有 2 個尚未發布 |
| `zh.audience@uni` | `sk.audience@jh` | 另有 1 個尚未發布 |
| `zh.explain@sh` | `sk.present@sh` | 另有 1 個尚未發布 |

- 量法：在本機用正式 Dockerfile build `main`（`f4a394f`）、做法 A 分支（`KP_BUILD_FLAGS` 全關）、和「build 也全開」三張 image，執行時都用正式站的四個 `true`，爬 528 條路由（首頁、`/kp`、`/kp/map`、所有 `/kp/概念` 與 `/kp/概念/學段`、`/kp/layer/*`、`/kp/stage/*`、`/kp/competency/*`、`/kp/discipline/*`、`/kp/path/*`、`/kp/index.json`、sitemap），去掉 build id、雜湊與時間後比對 HTML。`main` 對分支：0 條不同。`main` 對「build 也全開」：上表 20 條。另抽 39 條路由對照正式網址的可見 HTML，與本機 `main` image 一致。

### 17.6 做法 B（V2）：「尚未發布」只算草稿

- `components/kp/v2/refs.ts` 新增 `hiddenDraftCount(known, shown)`：不連出去的點裡，只算 `status` 不是 `published` 的。`PointLinks` 改用它。已發布、只因學門旗標沒上線而不連的點整筆不出現，也不算數。
- 清單裡只有這種點（沒有可連的點、也沒有草稿）時，只略過這一個清單，不寫「沒有，這是起點。」這類空清單的話（那句話只在清單本來就空時才對）；「學習順序」區塊與另一個清單照常畫。後續 PR 讓「先學」「後學」標題跟著清單一起畫（`PointLinks` 的 `label`），清單略過時標題也略過，不留孤零零的標題。
- 舊版詳細頁（`KnowledgePointView` 的 `LinkedIds`）**沒改**。它也會把旗標擋掉的已發布點算成「尚未發布」（第 17.1 節問題 2，正式站 6 個點、12 條路由，見第 17.5 節的表），所以不是「正確」的參考。這個 PR 只改 V2，正式站（`KP_DETAIL_V2_ENABLED` 關）的頁面一條都不變；舊版要另開 PR，那會改變正式內容。
- 旗標的值都沒改（workflow、env、Dockerfile 都不動）。`lib/kp/flags.ts`、`content/README.md`、`docs/specs/rollback.md` 的說明改成：「不用重新 build」只對請求時算的頁面（middleware、首頁、`/api/kp-launch`、`/kp/index.json`、sitemap、`/kp`、`/kp/layer/*`、`/kp/stage/*`、`/kp/competency/*`）成立；靜態詳細頁要重新 build。另外，請求時的清單頁與 `/kp/index.json` 也讀 `KP_INCLUDE_DRAFTS`（`visibleCatalog` 的預設值），不只 build 時。
- 渲染比對（本機用正式 Dockerfile build `main`（`70d03c0`）與分支兩張 image，build 時 `KP_*` 全關，執行時用正式站的四個 `true`，爬 552 條路由，去掉 build id、雜湊與時間後比對 HTML）：
  - `KP_DETAIL_V2_ENABLED` 關（正式站現況）：0 條不同。
  - `KP_DETAIL_V2_ENABLED` 開：22 條不同，是下表 11 個點的 `/kp/概念`（轉址到唯一學段）與 `/kp/概念/學段`。去掉 `<script>` 後的可見 HTML 只差「尚未發布」那一行；其餘差異是 RSC payload 的編號與切段位置。

| 頁面（V2 後學） | 被旗標擋掉的已發布點 | 之前 | 之後 |
| --- | --- | --- | --- |
| `ma.data@es` | `sk.rootcause@sh` | 另有 1 個尚未發布 | — |
| `ph.argument@jh` | `sk.speech@jh` | 另有 1 個尚未發布 | — |
| `ph.fact@es` | `sk.nvc@jh` | 另有 1 個尚未發布 | — |
| `ph.hypothesis@jh` | `sk.pdca@jh` | 另有 1 個尚未發布 | — |
| `ph.parts@es` | `sk.fishbone@jh` | 另有 1 個尚未發布 | — |
| `ph.question@es` | `sk.interview@sh` | 另有 1 個尚未發布 | — |
| `ph.reason@es` | `sk.point@es`、`sk.why5@es` | 另有 2 個尚未發布 | — |
| `pm.breakdown@es` | `sk.issuetree@jh` | 另有 1 個尚未發布 | — |
| `pm.conflict@sh` | `sk.facilitate@uni`（`sk.mediate@uni` 是草稿，照算） | 另有 2 個尚未發布 | 另有 1 個尚未發布 |
| `pm.team@jh` | `sk.consensus@sh` | 另有 1 個尚未發布 | — |
| `pm.triangle@jh` | `sk.decide@sh` | 另有 1 個尚未發布 | — |

- 測試：`components/kp/hidden-notice.test.ts` 加一則（學門旗標關時只算草稿；只有旗標擋掉的點時略過那個清單；旗標開時連出去、草稿照算），在舊的 `PointLinks` 上會失敗。新的 `e2e/kp-detail-v2-flag-hidden.spec.ts` 由 `content/` 算出所有受影響的點，在 CI 的「Published-only pages, V2 with production runtime flags」步驟（不含草稿、`KP_*` 全關的 build，執行時用正式站的旗標加 V2）檢查；對 `main` 的 image 會失敗（1 個多餘的「尚未發布」），對分支通過。`e2e/kp-published-softskills.spec.ts` 的 V2 輪改成只算草稿。
- eslint：改到的檔案沒有錯誤。`components/kp` 裡有 2 個既有錯誤（`AxisBrowser.tsx:38`、`v2/figures/Compare.tsx:116`），整個 `frontend/` 在 `main` 上有 26 個既有錯誤（`npx eslint .`，65 個警告），都不是這些 PR 加的。
- 回滾：revert 這個 PR 的 squash commit，或回到 PM 建的 pre-tag。
