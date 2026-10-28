/**
 * 知識地圖的開關。兩個變數都不要加 NEXT_PUBLIC_ 前綴，
 * 避免 Next.js 在 build 時把它們寫死進 client bundle。
 *
 * KP_ENABLED：上線開關，Node 行程每次請求讀取（middleware、/api/kp-launch、sitemap）。
 *   未設定或不是 "true" 就是關。關掉不需要重新 build，但行程要重啟
 *   （本機重開 next start；Cloud Run 會用同一張 image 開新 revision）。
 *
 * KP_HOME_ENABLED：首頁是否改寫成學習城市。同樣每次請求讀取，預設關。
 *   只有 KP_ENABLED 也是 "true" 時才算打開。只設這一個時，首頁維持原樣，/city-home 是 404。
 *   兩個都不用重新 build，改完要重啟行程。
 *
 * KP_INCLUDE_DRAFTS：哪些知識點會被生成成靜態頁。只在 next build / next dev 讀取。
 *   未設定則只有 status: published。改這個值必須重新 build。
 *
 * KP_SLIDES_PREVIEW：是否生成 /kp/preview/slides（投影片空狀態與錯誤狀態的預覽頁）。
 *   同樣只在 build 讀取。正式 image 不要設。
 *
 * KP_SLIDES_FIXTURE：測試用，格式 `<知識點 id>:<componentId>`。
 *   `loadCatalog` 會把該知識點的 slides 換成這一個 componentId。
 *   只在 build / dev 讀取。正式 image 與正式 Cloud Run 都不要設。
 *
 * KP_SOFTSKILLS_ENABLED：首頁是否放出六格學門切換（含「溝通與解決問題」與「語文」）。
 *   每次請求讀取，不加 NEXT_PUBLIC_。未設定或不是 "true" 就是關。
 *   只有 KP_ENABLED 也是 "true" 時才算打開。關掉不用重新 build，重啟行程即可。
 *   關的時候學門切換維持原來的四格，/kp/sk.* 與 /kp/discipline/soft-skills 是 404，sitemap 不列 sk。
 *   「語文」那一格要不要上線，另看 KP_YUWEN_ENABLED。這個旗標只決定六格裡的「語文」是準備中還是可點。
 *
 * KP_YUWEN_ENABLED：語文（國文、外語）是否上線。
 *   每次請求讀取，不加 NEXT_PUBLIC_。未設定或不是 "true" 就是關。
 *   只有 KP_ENABLED 也是 "true" 時才算打開。關掉不用重新 build，重啟行程即可。
 *   關的時候「語文」維持準備中、沒有連結；/kp/zh.*、/kp/en.*、/kp/ja.*、/kp/lg.* 與
 *   /kp/discipline/language 是 404，sitemap 不列這些網址。/?d=language 回到預設學門。
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

export function includeDraftKnowledgePoints(): boolean {
  return process.env.KP_INCLUDE_DRAFTS === "true";
}

export function kpSlidesPreviewEnabled(): boolean {
  return process.env.KP_SLIDES_PREVIEW === "true";
}

export function isWishFabEnabled(): boolean {
  return process.env.WISH_FAB_ENABLED === "true";
}
