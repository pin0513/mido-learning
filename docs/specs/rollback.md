# 知識地圖上線與回滾

這份文件談 `/kp` 知識地圖，以及可另外打開的學習城市首頁。層級 × 階段（本質→基礎→進階→應用 × 國小→大學）和學門／階段／核心素養三軸都留在 `/kp`。城市地圖在 `/kp/map`（P2-07 沒有另做 `/kp/graph`），層級總圖與清單是同一頁的另外兩種檢視，不取代 `/kp` 上的數量表。

`KP_HOME_ENABLED` 關掉時，`/` 仍是原本的靜態首頁（`LegacyHome`），版面與打開這個旗標之前相同。打開時，middleware 把 `/` 改寫到 `/city-home`，網址還是 `/`。

這次沒有建立、也沒有推送任何 git tag。

## 1. 上線前的基準 tag

兩個 tag，用途不同。下面的指令是給操作的人。這份文件沒有代打，也沒有推送任何 tag。

### `pre-kp-merge`：合併 #16 之前

程式還沒有 `/kp` 的那一版。在合併 #16 之前，對當時的 `main`（`206a235`，`fix(cli): load the Firebase API key from the environment`，#12）打 tag：

```bash
git fetch origin main
git tag pre-kp-merge 206a235
git push origin pre-kp-merge
```

第 3 節若要回到「程式還沒含 `/kp`」的 revision，用這個 tag 的 SHA 去對 image。不要用 `pre-kp-launch`，那個 tag 打在合併之後，程式已經含 `/kp`，只是旗標關著。

### `pre-kp-launch`：打開旗標之前

在上述 PR 都合併進 `main`、**打開 `KP_ENABLED` 之前**，對即將部署的 `main` 打 tag：

```bash
git fetch origin main
git tag pre-kp-launch origin/main
git push origin pre-kp-launch
```

tag 指到旗標還沒打開時的 `main`。若 `main` 在打 tag 之後又進了別的 commit，以實際部署的 SHA 為準，不要沿用舊 tag。

## 2. 第一道：關掉上線開關

開關是 Cloud Run 服務上的環境變數 `KP_ENABLED`。讀取點：

- `frontend/middleware.ts`：不是 `"true"` 時，`/kp` 與 `/kp/*` 回 HTML 404（`找不到頁面`／`這個網址目前沒有開放。`），並加 `x-robots-tag: noindex`。
- `frontend/app/api/kp-launch/route.ts`：`{ "enabled": false }`。Header 依這個結果決定要不要放「知識地圖」。變數沒有 `NEXT_PUBLIC_` 前綴，不會寫進 client bundle。
- `frontend/app/sitemap.ts`：關的時候回空 sitemap。

未設定與 `false` 都是關。只有字串 `true` 是開。

關掉（同一張 image，開新 revision，不重新 build）：

```bash
gcloud run services update mido-learning-frontend \
  --project mido-learning \
  --region asia-east1 \
  --remove-env-vars KP_ENABLED
```

若要留著變數但明確關掉，改用 `--update-env-vars KP_ENABLED=false`。不要用 `--set-env-vars`，那個旗標會先清掉服務上既有的環境變數。

若先前做過第 3 節的 `--to-revisions`，流量還鎖在舊 revision。這時 `services update` 開出來的新 revision 是 0% 流量，旗標其實沒關。關旗標之後要把流量放回最新 revision（或把 100% 指到剛關了旗標的那個新 revision）：

```bash
gcloud run services update-traffic mido-learning-frontend \
  --project mido-learning \
  --region asia-east1 \
  --to-latest
```

本機演練（2026-10-26，同一份 `next build` 產物，沒有重新 build）：

| 步驟 | 結果 |
| --- | --- |
| `pnpm exec next start -p 3000`，未設 `KP_ENABLED` | `/` 200，h1 仍是「AI 驅動的…」；HTML 沒有「知識地圖」。`/kp` 404，body 為「這個網址目前沒有開放。」，回應帶 `x-robots-tag: noindex`。`/api/kp-launch` 為 `{"enabled":false}`。 |
| 停掉行程，同一份產物改以 `KP_ENABLED=true pnpm exec next start -p 3000` | 約 2 秒內就緒。`/api/kp-launch` 為 `{"enabled":true}`。`/kp` 200，`/kp/pm.breakdown/es` 200，`/kp/index.json` 200。首頁 HTML 仍是原本的 h1。 |
| 正式進入點 `node .next/standalone/server.js`（`PORT=3000`）先不設、再設 `KP_ENABLED=true` | 關：`/kp` 404、首頁 200。開：重啟後約 384ms 就緒，`/kp` 200、細節頁 200。 |
| Playwright（桌面） | 開：`header` 裡「知識地圖」連結 1 個。關：0 個。首頁 h1 仍是「AI 驅動的 學習實驗室」。 |

結論：`KP_ENABLED` 是**執行期**開關。改它要重啟行程（Cloud Run 會為新的 env 開一個 revision），**不用**重新 build image。本機重啟不到 1 秒；Cloud Run 新 revision 通常一分鐘內接流量，這次沒有對正式服務計時。

`next start` 會警告 `output: "standalone"` 應改跑 `node .next/standalone/server.js`。正式 Dockerfile 的 `CMD` 就是 `node server.js`。兩種進入點都讀得到行程上的 `KP_ENABLED`。

另外兩個變數是 **build 期**，關掉上線開關不會改變它們：

- `KP_INCLUDE_DRAFTS`：沒設時只生成 `status: published`。正式 image 不會帶草稿頁。目前已發布的是 `pm.estimate` 四站：`pm.breakdown@es`、`pm.triangle@jh`、`pm.estimate@sh`、`pm.evm@uni`。其餘仍是草稿。學門、階段、層級、核心素養這些殼頁仍會生成。主線只在至少有一站 published 時才進 sitemap。改發布狀態或這個變數都必須重新 build。筆數會變，不要把演練當下的筆數當成現況。
- `KP_SLIDES_PREVIEW`：只有 build 時設成 `true` 才會做出 `/kp/preview/slides`。沒設時該 URL 是靜態 404（HTML 為 `__next_error__`）。正式 image 不要設。

### 首頁旗標 `KP_HOME_ENABLED`

跟 `KP_ENABLED` 一樣是**執行期**開關，預設關，沒有 `NEXT_PUBLIC_` 前綴。讀取點是 `frontend/middleware.ts`：

- 未設定或不是 `"true"`：`/` 走原本的靜態頁（h1「AI 驅動的學習實驗室」），`/city-home` 回同一份 HTML 404（`這個網址目前沒有開放。`，`x-robots-tag: noindex`）。
- `"true"`：`/` 被 rewrite 到 `/city-home`，瀏覽器網址仍是 `/`。直接開 `/city-home` 也看得到同一頁。

關掉（同一張 image，開新 revision，不重新 build）：

```bash
gcloud run services update mido-learning-frontend \
  --project mido-learning \
  --region asia-east1 \
  --remove-env-vars KP_HOME_ENABLED
```

兩個一起關：`--remove-env-vars KP_ENABLED,KP_HOME_ENABLED`。城市首頁裡的 `/kp/...` 連結在 `KP_ENABLED` 關閉時會 404，所以只開首頁旗標時地圖畫得出來，點進知識點頁不行。進度寫在瀏覽器 `localStorage`（`mido-city-progress`、`mido-city-view`），關掉旗標不會清這些鍵，也沒有 Firestore 資料要清。

`KP_INCLUDE_DRAFTS` 仍是 build 期。正式 image 沒設它，`/kp/map` 與城市首頁只畫已發布的建築。目前已發布的是 `pm.estimate` 四站。CI 建置有設草稿變數，HTML 才會有 100 棟。改發布狀態或草稿開關都要重新 build。

本機演練（2026-10-26，同一份已含草稿的 `next build`，沒有為了開關而重新 build）：

| 步驟 | 結果 |
| --- | --- |
| `pnpm exec next start -p 3000`，兩個旗標都沒設 | 約 667ms 後 `/api/kp-launch` 為 `{"enabled":false,"home":false}`。`/` 200，內文有「AI 驅動的」，沒有「從家庭廣場出發」，沒有建築。`/city-home`、`/kp`、`/kp/map` 都是 404，帶 `x-robots-tag: noindex`，內文是「這個網址目前沒有開放。」 |
| 停掉行程，同一份產物改以 `KP_ENABLED=true KP_HOME_ENABLED=true` 啟動 | 約 667ms 後 `/api/kp-launch` 為 `{"enabled":true,"home":true}`。`/` 200，內文有「從家庭廣場出發」，100 棟 `city-building`。`/city-home` 與 `/kp/map` 也是 200，地圖頁同樣 100 棟。 |
| `node .next/standalone/server.js`（`PORT=3000`）先不設、再設兩個旗標 | 關：約 271ms 就緒，`/` 200，`/city-home` 與 `/kp` 404。開：約 265ms 就緒，`/` 與 `/kp/map` 都是 200，首頁 HTML 有 100 棟建築。 |

結論：`KP_HOME_ENABLED` 和 `KP_ENABLED` 都是執行期開關。關掉任一個只要重啟行程（Cloud Run 開新 revision），不用重新 build。草稿要不要進 image 才需要重新 build。

## 3. 第二道：Cloud Run 回到上一版

服務與 image 以 repo 裡的 workflow 為準，不是猜的：

- workflow：`.github/workflows/deploy-frontend.yml`
- 專案 `mido-learning`，區域 `asia-east1`，服務 `mido-learning-frontend`
- image：`asia-east1-docker.pkg.dev/mido-learning/mido-learning/mido-learning-frontend:${github.sha}`，另有 `:latest`
- `gcloud run deploy` 只帶 image、region、platform、allow-unauthenticated、port 3000、memory 512Mi、cpu 1、min-instances 0、max-instances 10。**沒有** `--set-env-vars`、`--update-env-vars`、`--clear-env-vars`。
- `frontend/Dockerfile`：`node:22-alpine`，build 階段 `pnpm run build`。build-arg 只有 `NEXT_PUBLIC_FIREBASE_*` 與 `NEXT_PUBLIC_API_URL`。runner 只複製 `public`、`.next/standalone`、`.next/static`，**沒有** `frontend/content`。`CMD ["node", "server.js"]`。

這個環境沒有安裝 `gcloud`。以下行為來自 2026-10-26 讀到的官方文件，不是本機 `--help`：

- [`gcloud run deploy`](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy)：`--set-env-vars` 會先移除既有環境變數；`--clear-env-vars` 清空；`--update-env-vars` 是更新列出的鍵。workflow 三者都沒帶。
- [環境變數文件](https://docs.cloud.google.com/run/docs/configuring/services/environment-variables)：設定會留在後續 revision，除非之後的部署明確改掉。因此**下一次正常的前端部署會保留已經設上的 `KP_ENABLED`**。要關掉，用上一節的 `services update`，不要以為重新 deploy 就會清掉。
- [`gcloud run services update-traffic`](https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update-traffic) 的文件範例就是把 100% 流量指回舊 revision。

把流量指回舊 revision。先用 image tag（就是 `github.sha`）查出 revision 名稱：

```bash
gcloud run revisions list \
  --service mido-learning-frontend \
  --project mido-learning \
  --region asia-east1 \
  --format='table(metadata.name,spec.containers[0].image,metadata.creationTimestamp)'

gcloud run services update-traffic mido-learning-frontend \
  --project mido-learning \
  --region asia-east1 \
  --to-revisions REVISION_NAME=100
```

把 `REVISION_NAME` 換成上表裡、image tag 等於目標 SHA 的那一列。要回到程式還沒含 `/kp` 的版本，對 `pre-kp-merge`（`206a235`）。要回到旗標還沒打開、但程式已含 `/kp` 的版本，對 `pre-kp-launch`。這一步只改流量，不改 image 內容。若那一版 revision 的服務 env 已經帶著 `KP_ENABLED=true`，流量回去之後地圖仍是開的，還要再做第 2 節。

`--to-revisions` 會把之後的新 revision（含第 2 節關旗標、以及 workflow 的 `gcloud run deploy`）留在 0% 流量。回滾結束、恢復正常部署之前，把流量放回最新 revision：

```bash
gcloud run services update-traffic mido-learning-frontend \
  --project mido-learning \
  --region asia-east1 \
  --to-latest
```

內容不在 runner 裡的演練：draft build 起來之後把 `frontend/content` 整包移走，`GET /kp/layer/essence` 仍是 200，`/kp/index.json` 仍是 100 筆。頁面在 build 時就寫進靜態 HTML。移走後已把資料夾放回。

## 4. 第三道：git revert

分支依合併順序由下往上（先合併的在前）：

1. [#16](https://github.com/pin0513/mido-learning/pull/16) `cursor/kp-content-loader-ea35` — 內容載入、驗證器、`yaml` 依賴、`KP_ENABLED` middleware、`/api/kp-launch`、sitemap 路徑產生器、這份文件
2. [#14](https://github.com/pin0513/mido-learning/pull/14) `cursor/kp-pages-ea35` — `/kp` 頁面、層級 × 階段、三軸、主線、SEO、投影片、共學卡、`index.json`
3. [#13](https://github.com/pin0513/mido-learning/pull/13) `cursor/kp-nav-ea35` — Header「知識地圖」
4. [#15](https://github.com/pin0513/mido-learning/pull/15) `cursor/kp-e2e-docs-ea35` — E2E、CI、Next.js 版本文字
5. [#17](https://github.com/pin0513/mido-learning/pull/17) `cursor/kp-publish-pm-estimate-ea35` — 把主線 `pm.estimate` 的四個知識點標成 published
6. [#18](https://github.com/pin0513/mido-learning/pull/18) `cursor/kp-city-map-ea35` — `/kp/map`（HP-01～04）
7. [#19](https://github.com/pin0513/mido-learning/pull/19) `cursor/kp-city-progress-ea35` — 主線路線與本機進度（HP-05～06）
8. [#20](https://github.com/pin0513/mido-learning/pull/20) `cursor/kp-city-views-ea35` — 層級總圖、清單、手機（HP-07、HP-08、HP-13）
9. [#21](https://github.com/pin0513/mido-learning/pull/21) `cursor/kp-city-home-ea35` — 首頁旗標 `KP_HOME_ENABLED`（HP-09～12）

每個 PR 合併進 `main` 之後，**後合併的先 revert**（#21 → #20 → #19 → #18 → #17 → #15 → #13 → #14 → #16）：

```bash
git revert <city-home 的 squash commit>      #21
git revert <city-views 的 squash commit>     #20
git revert <city-progress 的 squash commit>  #19
git revert <city-map 的 squash commit>       #18
git revert <publish-pm-estimate 的 squash commit>  #17
git revert <e2e-docs 的 squash commit>       #15
git revert <nav 的 squash commit>            #13
git revert <pages 的 squash commit>          #14
git revert <loader 的 squash commit>         #16
```

revert 之後要重新部署，流量才會離開含 `/kp` 的 image。只 revert 不部署，線上還是舊 image。

## 5. 沒有後端與資料遷移

這次沒有改 backend、Firestore schema、教材上傳，也沒有改 `deploy-frontend.yml`、`deploy-backend`、`deploy-music-producer`。沒有資料要遷移。回滾不用清 Firestore。

`KP_INCLUDE_DRAFTS` 與 `KP_SLIDES_PREVIEW` 只影響前端 image 裡有哪些靜態頁。把它們從「沒設」改成「有設」或反過來，都是重新 build，不是資料遷移。

## 6. 上線檢查與回滾觸發

打開開關之前：

- `main` 已含上述 PR，並且打了 `pre-kp-launch`（這份文件沒有代打）。
- 確認這張 image 是不是草稿 build。正式 Dockerfile **沒有** `KP_INCLUDE_DRAFTS`。已發布的只有主線 `pm.estimate` 四站：`pm.breakdown@es`、`pm.triangle@jh`、`pm.estimate@sh`、`pm.evm@uni`。正式 image 的細節頁與地圖只含這四棟；其餘草稿要另建 `KP_INCLUDE_DRAFTS=true` 的 image 才看得到。不要把那個變數寫進正式 workflow。
- `KP_HOME_ENABLED` 預設不要設，而且只有 `KP_ENABLED` 也是 `true` 時才生效。關掉任一個都是 `gcloud run services update ... --remove-env-vars`，**不用**重新 build。不要用 `--set-env-vars`，那個會清掉服務上其他環境變數。下一次正常的 `gcloud run deploy`（workflow 沒帶 env 旗標）會保留已經設上的變數。若先前用 `--to-revisions` 鎖過流量，恢復正常部署前要先 `--to-latest`（見第 3 節）。
- D09 授權仍是空的。頁面文案是「授權文字尚未公告」，`data-testid="kp-license-body"` 是空的。不要在回滾或上線時補上 CC 條文。
- 草稿網址不進 sitemap。只有一個已發布階段的 concept 不放會轉址的 `/kp/{concept}`。主線只放至少有一站 published 的。`/kp/map` 是 noindex，不進 sitemap。`KP_ENABLED` 關掉時整份是空的。筆數不寫死。
- `to_verify` 的「課綱對應待核對」在正式站也會出現，含大學頁。

建議回滾（先做第 2 節與下面的首頁旗標；若 image 本身有問題再做第 3 節）：

- `/kp` 在旗標應關閉時仍回 200。
- `KP_HOME_ENABLED` 關掉之後，首頁 h1 仍是「從家庭廣場出發」，或 `/city-home` 不是 404。
- `KP_ENABLED` 應關閉時，首頁仍出現「知識地圖」連結，或 `/kp` 仍回 200。
- 旗標關閉時首頁版面與打開旗標之前不同。
- 細節頁 500、層級表或三軸入口缺頁、靜態頁在 runner 上因為找不到 `content/` 而失敗。
- sitemap 出現 draft URL、`/login` 或 `/dashboard`。
- 授權區塊被填進尚未公告的條文。
