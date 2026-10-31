/**
 * 知識地圖與相關功能的開關。這裡的變數都不要加 NEXT_PUBLIC_ 前綴，
 * 避免 Next.js 在 build 時把它們寫死進 client bundle。
 *
 * 讀取時機（docs/kp-db-restructure.md 第 17 節）：
 *   - 請求時：middleware、首頁（/city-home，讀 searchParams）、/api/kp-launch、/kp/index.json、sitemap，
 *     以及 /kp、/kp/map、/kp/layer/*、/kp/stage/*、/kp/competency/* 這幾個清單頁（先 await headers()，是請求時才算的動態頁）。
 *     「不用重新 build，重啟行程（Cloud Run 開新 revision）就生效」只對這些成立。
 *   - build 時：靜態詳細頁 /kp/概念/學段、/kp/概念、/kp-v2/概念/學段（generateStaticParams＋dynamicParams = false）。
 *     跨學門連結（isFolderLaunched）寫死在頁面裡，只重啟行程不會變，要重新 build。
 *     舊版詳細頁的「另有 N 個知識點尚未發布」也會把旗標擋掉的已發布點算進去，同樣是 build 時的值；
 *     V2 的「另有 N 個尚未發布」只算草稿，不看學門旗標。
 *   所以 KP_ENABLED、KP_SOFTSKILLS_ENABLED、KP_YUWEN_ENABLED 切換都要重新 build＋重新部署。
 *   正式值只放在 .github/workflows/deploy-frontend.yml 的 KP_BUILD_FLAGS（build）與 KP_RUNTIME_FLAGS（Cloud Run）。
 *
 * KP_ENABLED：上線開關。未設定或不是 "true" 就是關。
 *   關的時候 middleware 讓 /kp 全部 404；詳細頁在 build 時也用它判斷跨學門連結。
 *
 * KP_HOME_ENABLED：首頁是否改寫成學習城市。同樣每次請求讀取，預設關。
 *   只有 KP_ENABLED 也是 "true" 時才算打開。只設這一個時，首頁維持原樣，/city-home 是 404。
 *   首頁每次請求讀，這個旗標本身改完重啟行程即可。
 *
 * KP_INCLUDE_DRAFTS：哪些知識點會被生成成靜態頁（next build / next dev 時讀）。
 *   未設定則只有 status: published。改這個值必須重新 build。
 *   上面列的請求時清單頁與 /kp/index.json 每次請求也會讀它（visibleCatalog 的預設值），
 *   所以執行時的值要和 build 一樣，否則清單會列出沒有生成頁面的草稿。正式 build 與 Cloud Run 都不設。
 *
 * KP_SLIDES_PREVIEW：是否生成 /kp/preview/slides（投影片空狀態與錯誤狀態的預覽頁）。
 *   同樣只在 build 讀取。正式 image 不要設。
 *
 * KP_SLIDES_FIXTURE：測試用，格式 `<知識點 id>:<componentId>`。
 *   `loadCatalog` 會把該知識點的 slides 換成這一個 componentId。
 *   只在 build / dev 讀取。正式 image 與正式 Cloud Run 都不要設。
 *
 * KP_SOFTSKILLS_ENABLED：首頁是否放出六格學門切換（含「溝通與解決問題」與「語文」）。
 *   不加 NEXT_PUBLIC_。未設定或不是 "true" 就是關。
 *   只有 KP_ENABLED 也是 "true" 時才算打開。middleware、首頁、/kp 與 /kp/layer、/kp/stage、/kp/competency 的學門篩選、
 *   /kp/index.json、sitemap 每次請求讀，重啟行程就跟著變；
 *   詳細頁的跨學門連結是 build 時決定的，切換（打開或關掉）都要重新 build。
 *   關的時候學門切換維持原來的四格，/kp/sk.* 與 /kp/discipline/soft-skills 是 404，sitemap 不列 sk。
 *   「語文」那一格要不要上線，另看 KP_YUWEN_ENABLED。這個旗標只決定六格裡的「語文」是準備中還是可點。
 *
 * KP_YUWEN_ENABLED：語文（國文、外語）是否上線。
 *   不加 NEXT_PUBLIC_。未設定或不是 "true" 就是關。
 *   只有 KP_ENABLED 也是 "true" 時才算打開。和 KP_SOFTSKILLS_ENABLED 一樣，請求時的頁面重啟行程就跟著變，
 *   詳細頁的跨學門連結是 build 時決定的，切換要重新 build。
 *   關的時候「語文」維持準備中、沒有連結；/kp/zh.*、/kp/en.*、/kp/ja.*、/kp/lg.* 與
 *   /kp/discipline/language 是 404，sitemap 不列這些網址。/?d=language 回到預設學門。
 *
 * KP_DETAIL_V2_ENABLED：知識點詳細頁是否改用黃金圈版面。
 *   每次請求讀取，不加 NEXT_PUBLIC_。未設定或不是 "true" 就是關。
 *   只有 KP_ENABLED 也是 "true" 時才算打開。這個旗標本身是 middleware 每次請求讀的改寫，重啟行程即可；
 *   但 V2 頁是靜態頁，裡面的跨學門連結用的是 build 時的學門旗標值（第 17 節問題 1）。
 *   「另有 N 個尚未發布」只算草稿，已發布但被學門旗標擋掉的點不連也不算（第 17 節問題 2，V2 已修）。
 *   關的時候 /kp/概念/學段 維持原本的詳細頁。/kp-v2 不是公開網址，直連一律 404。
 *
 * WISH_FAB_ENABLED：右下角學習願望浮動按鈕（氣泡與聊天視窗一起）。
 *   未設定或不是 "true" 就是關。不要加 NEXT_PUBLIC_，避免在 build 時寫死。
 *   頁面載入後問 /api/wish-fab，所以靜態頁重啟行程就會跟著開或關。
 *   元件與許願 API 都留著，只是預設不掛到頁面上。
 */

export function isKpEnabled(): boolean {
  return process.env.KP_ENABLED === "true";
}

export function isKpHomeEnabled(): boolean {
  return isKpEnabled() && process.env.KP_HOME_ENABLED === "true";
}

export function isSoftSkillsEnabled(): boolean {
  return isKpEnabled() && process.env.KP_SOFTSKILLS_ENABLED === "true";
}

export function isYuwenEnabled(): boolean {
  return isKpEnabled() && process.env.KP_YUWEN_ENABLED === "true";
}

export function isKpDetailV2Enabled(): boolean {
  return isKpEnabled() && process.env.KP_DETAIL_V2_ENABLED === "true";
}

export function includeDraftKnowledgePoints(): boolean {
  return process.env.KP_INCLUDE_DRAFTS === "true";
}

export function kpSlidesPreviewEnabled(): boolean {
  return process.env.KP_SLIDES_PREVIEW === "true";
}

export function isWishFabEnabled(): boolean {
  return process.env.WISH_FAB_ENABLED === "true";
}
