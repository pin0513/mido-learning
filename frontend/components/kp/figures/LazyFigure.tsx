"use client";

import dynamic from "next/dynamic";
import type { FigureSpec } from "@/lib/kp/figures/specs";

// 在 client 邊界做動態載入，圖形的 JS 才會切成獨立 chunk，只有有圖的頁面會下載；預渲染 HTML 照常輸出。
const InteractiveFigure = dynamic(() => import("./widgets").then((mod) => mod.InteractiveFigure));

export function LazyFigure({ spec }: { spec: FigureSpec }) {
  return <InteractiveFigure spec={spec} />;
}
