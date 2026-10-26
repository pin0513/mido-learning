import { notFound } from "next/navigation";
import { KpSlides } from "@/components/kp/KpSlides";
import { kpSlidesPreviewEnabled } from "@/lib/kp/flags";

export const metadata = {
  title: { absolute: "投影片預覽" },
  robots: { index: false, follow: false },
};

/** 只在 KP_SLIDES_PREVIEW=true 的 build 出現。正式 image 不要設這個變數。 */
export default function SlidesPreviewPage() {
  if (!kpSlidesPreviewEnabled()) notFound();
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">投影片預覽</h1>
      <p className="mt-3 text-sm leading-6">這頁只用來檢查嵌入狀態，不對應任何知識點。</p>
      <div data-testid="slides-missing">
        <KpSlides componentIds={["missing-component"]} title="不存在的投影片" />
      </div>
      <div data-testid="slides-ok">
        <KpSlides componentIds={["preview-ok"]} title="預覽投影片" />
      </div>
    </div>
  );
}
