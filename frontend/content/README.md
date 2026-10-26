# 知識點內容（P1）

這裡是 learn.paulfun.net 的知識點底稿。Git 是課程結構的來源；進度、評分、可見度仍放在 Firestore。這一層**沒有**接到頁面，也**沒有**改上傳、檢視器或後端。網站行為與加上這些檔案之前相同。

檔案放在 `frontend/content/`，是為了沿用現有的前端部署條件（`frontend/**`、建置目錄 `./frontend`）。內容不 import 進 Next.js。以後若要拆成獨立的內容 repo，搬整個資料夾即可。

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
3. 國小、國中、高中要填 `curriculum_108`。領域用八大領域的名稱，核心素養**只能**是 A1、A2、A3、B1、B2、B3、C1、C2、C3。不要自編學習表現或學習內容代碼。議題用 `curriculum-108.yaml` 裡的正式名稱（「生涯規劃」要寫成「生涯規劃教育」）。
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

同一支程式也會用暫時的壞樣本做自我測試（重複 id、斷掉的連結、循環、自編素養代碼等）。內容和自我測試都過了才算通過。

Pull request 若改到 `frontend/content/**`，GitHub Actions 的 “Validate knowledge points” 會跑這支指令。既有的部署 workflow 沒有改。
