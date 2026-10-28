# 知識點內容

這裡是 learn.paulfun.net 的知識點底稿。Git 是課程結構的來源；進度、評分、可見度仍放在 Firestore。P2 把這些檔案在 **build 時**讀進靜態頁，不新增後端 API，也不寫 Firestore。

檔案放在 `frontend/content/`，是為了沿用現有的前端部署條件（`frontend/**`、建置目錄 `./frontend`）。Cloud Run 的 runner 只帶 `.next/standalone`，**執行時不再讀這個資料夾**。以後若要拆成獨立的內容 repo，搬整個資料夾即可。

## 頁面

| 網址 | 內容 |
| --- | --- |
| `/kp` | 層級 × 階段（本質→應用、國小→大學）與學門、階段、核心素養入口。另有連結到城市地圖、層級總圖、清單 |
| `/kp/map` | 學習城市。`?view=system` 是層級總圖，`?view=list` 是清單。`?d=` 學區、`?s=` 階段、`?kp=` 建築 |
| `/kp/layer/[id]` | 四個層級各一頁（`essence`、`foundation`、`advanced`、`applied`） |
| `/kp/discipline/[id]` | 學門，id 用 `content_folder`（`pm-leadership`、`it-ai`） |
| `/kp/stage/[id]` | `es`、`jh`、`sh`、`uni` |
| `/kp/competency/[code]` | A1–C3 |
| `/kp/path/[pathId]` | 主線 |
| `/kp/[concept]/[stage]` | 單一知識點，例如 `/kp/pm.breakdown/es` |
| `/kp/[concept]` | 同一概念的各階段；目前各只有一個階段，會直接導向 |
| `/kp/index.json` | 給之後家庭看板用的靜態清單 |

層級 × 階段是地圖的骨幹。學習城市（`/kp/map`）疊在這張表上面，不取代 `/kp` 的層級表、學門、階段、核心素養。首頁要不要改成城市，看 `KP_HOME_ENABLED`，跟 `KP_ENABLED` 分開。兩個都關時，首頁與改版前相同。

讀取與索引在 `frontend/lib/content/`（server-only）。驗證腳本走同一份 `lib/content/load.ts`，那個檔案不掛 `server-only`，因為 `tsx` 直接跑。

### 環境變數

都不要加 `NEXT_PUBLIC_`。

| 變數 | 何時讀 | 預設 | 作用 |
| --- | --- | --- | --- |
| `KP_ENABLED` | 每次請求（middleware、`/api/kp-launch`、sitemap） | 關 | `/kp` 上線開關。關的時候 `/kp` 全部 404，導覽列沒有「知識地圖」。改值要重啟行程，**不用重新 build**。Cloud Run 用同一張 image 開新 revision 即可。 |
| `KP_HOME_ENABLED` | 每次請求（middleware、`/api/kp-launch` 的 `home`） | 關 | 首頁開關，跟上面分開。關的時候 `/` 是原本的靜態首頁，`/city-home` 404。開的時候 middleware 把 `/` 改寫到 `/city-home`（網址仍是 `/`）。同樣不用重新 build，要重啟行程。知識點連結仍要 `KP_ENABLED` 才開得了。 |
| `KP_SOFTSKILLS_ENABLED` | 每次請求（middleware、首頁、sitemap） | 關 | 打開六格學門切換，含「溝通與解決問題」。只有 `KP_ENABLED` 也是 true 才算開。關的時候學門切換維持四格，`/kp/sk.*` 是 404，sitemap 不列 `sk`。不用重新 build。「語文」那一格要上線，還要開 `KP_YUWEN_ENABLED`。 |
| `KP_YUWEN_ENABLED` | 每次請求（middleware、首頁、sitemap） | 關 | 打開語文（國文、外語）。只有 `KP_ENABLED` 也是 true 才算開。關的時候「語文」維持準備中，`/kp/zh.*`、`/kp/en.*`、`/kp/ja.*`、`/kp/lg.*` 是 404，sitemap 不列這些網址。不用重新 build。 |
| `KP_INCLUDE_DRAFTS` | `next build` / `next dev` | 關（只生成 `published`） | 草稿與 `review` 要不要變成頁面。正式站預設不生成。改值必須重新 build。 |

正式站目前發布的是主線 `pm.estimate`（拆解與估算）的四站，加上哲學的 `ph.reason@es`。溝通與解決問題的口語表達、語文的 108 個知識點都已發布，但要各自的旗標打開才看得到。其餘維持草稿。正式 image 不要設 `KP_INCLUDE_DRAFTS`。CI 的知識地圖測試會打開草稿，徑向圖才會有全部建築。

投影片預覽頁 `/kp/preview/slides` 只有 `KP_SLIDES_PREVIEW=true` 的 build 才會出現。

授權文字（D09）還沒決定，頁面上是空的占位，不要自行填入 CC 條文。

### 本機預覽

```bash
cd frontend
# frontend/.env.local
# KP_ENABLED=true
# KP_HOME_ENABLED=true
# KP_INCLUDE_DRAFTS=true

pnpm dev
```

開發伺服器在 3001。打開 http://localhost:3001/kp 。沒設 `KP_ENABLED` 時，`/kp` 會 404。沒設 `KP_HOME_ENABLED` 時，首頁維持原本的樣子。

要看跟正式站相同的靜態結果：

```bash
cd frontend
KP_INCLUDE_DRAFTS=true pnpm build
KP_ENABLED=true KP_HOME_ENABLED=true pnpm start
```

`pnpm build` 會先重寫 `lib/content/published-paths.ts`（sitemap 用，不含草稿）。`next build` 應把 `/kp` 頁列成靜態。

## 目錄

```text
content/
├─ taxonomy/          學科樹、階段、108 課綱、專才／通才、呈現格式
├─ schema/            知識點 JSON Schema
├─ knowledge/         每個知識點一個 YAML
│  └─ <學門>/<concept>/<階段>.yaml
└─ paths/             主線：知識點 id 的有序清單
```

四個學門資料夾：

| 資料夾 | id 前綴 | 內容 |
| --- | --- | --- |
| `pm-leadership` | `pm` | 專案管理與領導 |
| `philosophy` | `ph` | 哲學與思考方法 |
| `math` | `ma` | 數學 |
| `it-ai` | `it` | 資訊與 AI |

## id

```text
{前綴}.{概念}@{階段}
```

- 前綴來自 `taxonomy/disciplines.yaml` 的 `id_prefix`（目前是 `pm`、`ph`、`ma`、`it`）
- 概念是小寫英文與數字，例如 `breakdown`
- 階段是 `es` 國小、`jh` 國中、`sh` 高中、`uni` 大學
- 例子：`pm.breakdown@es`
- `concept` 欄位必須等於 `@` 前面那段
- 檔案路徑必須是 `knowledge/pm-leadership/pm.breakdown/es.yaml`

`links` 與 `prerequisites` 只能填已經存在的 id。還沒有知識點的學門（物理、經濟、心理、藝術、土木、語文等）寫在 `link_notes`，不要造一個假 id。

## 新增一個知識點

1. 在 `taxonomy/disciplines.yaml` 確認學科路徑。路徑用中文名稱，由上往下，例如 `[數學, 分析, 變化率]`。`layer` 要等於葉子的層級（沒寫的話沿用父節點）。
2. 複製一份相近的 YAML，改 `id`、`concept`、`title`、內文。
3. 國小、國中、高中要填 `curriculum_108`。領域用八大領域的名稱，核心素養**只能**是 A1、A2、A3、B1、B2、B3、C1、C2、C3。學習表現（`performances`）與學習內容（`contents`）只能填 `taxonomy/curriculum-108-codes.yaml` 裡已有的代碼。那份檔的每一筆都是官方課綱逐字複製，並附官方 PDF 網址與頁碼。不可自編、不可改寫。議題用 `curriculum-108.yaml` 裡的正式名稱（「生涯規劃」要寫成「生涯規劃教育」）。
4. 大學不要出現 `curriculum_108`。
5. 設計時還不確定、文件裡標了「需要核對」的，設 `to_verify: true`，並在 `verify_notes` 寫下要核對的句子。確定的就設 `false`，`verify_notes` 留空陣列。
6. `formats.slides` 是既有教材的 componentId 陣列。還沒對到投影片就留 `[]`。不要填檔名。
7. `prerequisites` 是先備，不能形成循環。`links.deeper` 是同一主線的下一個深度，階段必須比自己後面；一個知識點可以接多條主線，所以它是陣列。
8. 若這筆屬於某條主線，把 id 加進 `paths/<學門>.yaml`，順序要由淺到深。

範例：`knowledge/pm-leadership/pm.breakdown/es.yaml`。

## 驗證

在 `frontend/` 執行：

```bash
pnpm validate:content
```

會檢查：

- 必填欄位與 JSON Schema
- 階段、領域、素養代碼、議題、學科路徑、專才／通才標籤都落在 taxonomy
- 核心素養只有 A1–C3
- id 唯一，且和檔名一致
- 先備與連結沒有指向不存在的 id
- 先備沒有循環
- 主線的階段一路往後
- review、published 要有至少兩筆來源，而且黃金圈 why、how、what 都要寫。`sources-backfill.yaml` 與 `golden-circle-backfill.yaml` 裡的 id 暫時只警告。這兩份清單只能刪、不能加；已經補齊的 id 必須移出清單
- 內文與圖引用的來源 id、圖 id 必須對得上。課綱代碼必須在 codes 檔裡，而且學習階段要落在該知識點的學段

只有警告時仍然算通過，警告會印出來。同一支程式也會用暫時的壞樣本做自我測試（重複 id、斷掉的連結、循環、自編素養代碼、缺來源、自編課綱代碼等）。內容和自我測試都過了才算通過。

Pull request 若改到 `frontend/content/**`，GitHub Actions 的 “Validate knowledge points” 會跑這支指令。既有的部署 workflow 沒有改。

## 建置用的環境變數

正式 image 不要設這些。說明也寫在 `frontend/lib/kp/flags.ts`。

| 變數 | 何時讀 | 說明 |
| --- | --- | --- |
| `KP_ENABLED` | 每次請求 | 上線開關。不是 `"true"` 時 `/kp` 不開放。 |
| `KP_INCLUDE_DRAFTS` | build | `"true"` 才把 draft 知識點生成成頁面。 |
| `KP_SLIDES_PREVIEW` | build | `"true"` 才生成 `/kp/preview/slides`。 |
| `KP_SLIDES_FIXTURE` | build / dev | 測試用。格式 `<知識點 id>:<componentId>`，把該知識點的投影片換成這一個既有教材。 |
