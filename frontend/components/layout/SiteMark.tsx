/**
 * 站標：四層同心圓，和知識地圖頂列（KpFrame 的 Mark）同一個圖形。
 * 顏色用 globals.css 的 @theme 色票（board-3、accent），所以不必載入 kp-theme.css。
 * 外圈與第三圈跟著文字色（currentColor）。純裝飾，旁邊一定有「Mido Learning」字樣。
 */
export function SiteMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="currentColor" />
      <circle cx="20" cy="20" r="14.5" className="fill-board-3" />
      <circle cx="20" cy="20" r="9.5" fill="currentColor" />
      <circle cx="20" cy="20" r="4.5" className="fill-accent" />
    </svg>
  );
}
