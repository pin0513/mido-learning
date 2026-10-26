import { FloatingWishBot } from "@/components/wish";
import "../kp-theme.css";

/**
 * 知識城市的框。不讀 request header，靜態頁才不會在請求時重跑、把 build 時的草稿開關洗掉。
 * 主題只在這層載入，旗標關閉的舊頁不會多下載這份 CSS。
 * 拉丁字用根層已經載入的 Geist（OFL，next/font）。中文走系統字型，不把字型檔放進 repo。
 */
export default function KpSurfaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="kp-root">
      {children}
      <FloatingWishBot />
    </div>
  );
}
