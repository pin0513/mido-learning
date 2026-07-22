# family-kanban References 同步機制定義

## 目的
把 `~/Documents/PaulFamilyIssues`（家庭治理真相源）中**標記為 public** 的衍生視圖，單向同步到
family-kanban 的 references 面板，開源給 family 成員瀏覽。**coread/private 內容永不進成員看得到的地方。**

## 安全紅線（不可跨越）
真相源 `family-ssot.yaml` 的 `derived_views` 已為每個檔案標 tier：

| 檔案 | tier | 同步? |
|------|------|------|
| `dashboard/family-dashboard.html` | public | ✅ 可同步 |
| `家庭共讀版地圖.html/.png` | coread | ❌ 不同步 |
| `家庭系統心智圖.html` | private | ❌ 不同步 |
| `dashboard/openab/CLAUDE.md` | coread | ❌ 不同步 |
| `family-ssot.yaml` 本身（含 private/coread） | — | ❌❌ 絕不同步 |

- **INV-REF-1**：references 只含 `tier=public`；coread/private 一個 byte 都不進 family-kanban（不是上傳後隱藏，是根本不上傳）。
- **INV-REF-2**：同步器**預設拒絕** —— 只有 SSOT 明確標 `tier: public` 才放行；沒標 tier、或 tier 非 public，一律 skip。
- **INV-REF-3**：`GET /references` 永遠只回 `tier=public`（即使資料層混入非 public，GET 也二次過濾）。

## 同步器（手動命令）
命令（暫名 `family-kanban sync-references`）：
1. 讀 `~/Documents/PaulFamilyIssues/family-ssot.yaml` 的 `derived_views`。
2. 對每個 view 檢查 `tier`，**只有 `tier == "public"`** 才納入同步清單。
3. `--dry-run`（預設）：印出「會同步哪些、會 skip 哪些（附 tier 與原因）」，**不實際上傳**，先讓你確認。
4. `--confirm`：實際上傳 public 檔案到 `POST /api/family-kanban/{familyId}/references`。
5. **冪等**：每次同步覆蓋 references（SSOT 是唯一真相源，references 是衍生視圖）。
6. 方向：**單向** SSOT → family-kanban；references 不可反向改寫 SSOT。

## References 後端（family-kanban 模組，`/api/family-kanban`）
- Model `ReferenceDoc`（`family-kanban/{familyId}/references/{refId}`）：`{ id, fileName, tier(=public), contentType, content|url, sourceHash, syncedAt }`。
- `POST /api/family-kanban/{familyId}/references` — 同步器上傳（FamilyAdmin + 家庭歸屬 gate）。**後端二次驗 tier**：非 public 一律拒絕寫入（縱深，不只靠同步器）。
- `GET /api/family-kanban/{familyId}/references` — **family 成員可讀（含孩子 player）**：經家庭歸屬 gate，只回 public references。這是「開源給成員」的唯一出口。

## References 面板（前端）
family-kanban 成員登入後可見的「參考資料」面板，列出 public references（如 family-dashboard.html 的連結/內嵌），成員可點閱。

## 實作階段（後續）
1. references 後端 model + endpoints（POST 上傳、GET 成員可讀，雙重 tier 驗證）+ TDD（非 public 拒寫、成員讀得到 public、非成員擋下）。
2. 同步器命令（讀 SSOT tier + dry-run + confirm + 冪等）。
3. references 面板前端。
