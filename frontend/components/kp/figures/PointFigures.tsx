import { figureSpecsFor } from "@/lib/kp/figures/specs";
import dynamic from "next/dynamic";

// 動態載入：圖形的 JS 只在有圖的頁面下載；預渲染的 HTML 照常輸出（ssr 預設開）。
const InteractiveFigure = dynamic(() => import("./widgets").then((mod) => mod.InteractiveFigure));

/** 知識點頁的「動手看圖」：只有 specs.ts 有這個點才出現，其他頁 DOM 不變。 */
export function PointFigures({ pointId }: { pointId: string }) {
  const specs = figureSpecsFor(pointId);
  if (specs.length === 0) return null;
  return (
    <section className="mt-8" aria-labelledby="kp-figures-heading" data-testid="kp-figures">
      <h2 id="kp-figures-heading" className="text-xl font-bold">動手看圖</h2>
      <p className="mt-2 max-w-3xl leading-7">拉一拉、點一點，看數字怎麼跟著變；每張圖下面都有文字說明。</p>
      {specs.map((spec) => <InteractiveFigure key={spec.id} spec={spec} />)}
    </section>
  );
}
