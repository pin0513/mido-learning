import { FloatingWishBot } from "@/components/wish";

/** 知識城市的框。不讀 request header，靜態頁才不會在請求時重跑、把 build 時的草稿開關洗掉。 */
export default function KpSurfaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="kp-root">
      {children}
      <FloatingWishBot />
    </div>
  );
}
