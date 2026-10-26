/**
 * 知識地圖的開關。兩個變數都不要加 NEXT_PUBLIC_ 前綴，
 * 避免 Next.js 在 build 時把它們寫死進 client bundle。
 *
 * KP_ENABLED：上線開關，Node 行程每次請求讀取（middleware、/api/kp-launch、sitemap）。
 *   未設定或不是 "true" 就是關。關掉不需要重新 build，但行程要重啟
 *   （本機重開 next start；Cloud Run 會用同一張 image 開新 revision）。
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
 */

export function isKpEnabled(): boolean {
  return process.env.KP_ENABLED === "true";
}

export function includeDraftKnowledgePoints(): boolean {
  return process.env.KP_INCLUDE_DRAFTS === "true";
}

export function kpSlidesPreviewEnabled(): boolean {
  return process.env.KP_SLIDES_PREVIEW === "true";
}
