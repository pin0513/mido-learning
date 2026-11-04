"use client";

import { useCallback, useId, type ReactNode, type RefObject } from "react";

/** 線性比例尺：資料值 → SVG 座標。 */
export function scale(d0: number, d1: number, r0: number, r1: number) {
  const f = (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
  f.invert = (p: number) => d0 + ((p - r0) / (r1 - r0)) * (d1 - d0);
  return f;
}
export type Scale = ReturnType<typeof scale>;

export const range = (from: number, to: number, step: number) => {
  const out: number[] = [];
  for (let v = from; v <= to + step / 1e6; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
};

/** 圖的外框：SVG 有 role=img、標題和文字說明；控制項與讀數在 SVG 外面，字不會壓到線。 */
export function FigureFrame({
  title,
  desc,
  caption,
  width,
  height,
  svgRef,
  onPointer,
  controls,
  readout,
  children,
}: {
  title: string;
  desc: string;
  caption: string;
  width: number;
  height: number;
  svgRef?: RefObject<SVGSVGElement | null>;
  onPointer?: (event: React.PointerEvent<SVGSVGElement>) => void;
  controls?: ReactNode;
  readout?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <figure className="kpfig mt-4 border border-[#c0bab2] bg-white p-4 text-ink sm:p-6" aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`} className="text-lg font-bold">{title}</h3>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={`${id}-t`}
          aria-describedby={`${id}-d`}
          className="h-auto w-full max-w-[560px] touch-none select-none"
          onPointerDown={onPointer ? (event) => { event.currentTarget.setPointerCapture(event.pointerId); onPointer(event); } : undefined}
          onPointerMove={onPointer ? (event) => { if (event.buttons) onPointer(event); } : undefined}
        >
          {children}
        </svg>
        <div className="flex min-w-0 flex-col gap-4">
          {controls}
          {readout ? <div aria-live="polite" className="bg-[#f3f0ea] p-4 leading-7">{readout}</div> : null}
        </div>
      </div>
      <p id={`${id}-d`} className="mt-4 max-w-3xl leading-7">{desc}</p>
      <figcaption className="mt-2 text-sm text-[#3d3830]">{caption}</figcaption>
    </figure>
  );
}

/** 坐標軸、格線、刻度。刻度數字放在圖框外的留白，不壓在格線或曲線上。 */
export function Axes({
  x,
  y,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  fmtX = String,
  fmtY = String,
}: {
  x: Scale;
  y: Scale;
  xTicks: number[];
  yTicks: number[];
  xLabel?: string;
  yLabel?: string;
  fmtX?: (v: number) => string;
  fmtY?: (v: number) => string;
}) {
  const [x0, x1] = [x(xTicks[0]), x(xTicks[xTicks.length - 1])];
  const [y0, y1] = [y(yTicks[0]), y(yTicks[yTicks.length - 1])];
  const zeroX = xTicks[0] <= 0 && xTicks[xTicks.length - 1] >= 0 ? x(0) : x0;
  const zeroY = yTicks[0] <= 0 && yTicks[yTicks.length - 1] >= 0 ? y(0) : y0;
  return (
    <g className="text-[18px]">
      {xTicks.map((t) => <line key={`gx${t}`} x1={x(t)} x2={x(t)} y1={y0} y2={y1} className="stroke-[#e4dfd7]" />)}
      {yTicks.map((t) => <line key={`gy${t}`} y1={y(t)} y2={y(t)} x1={x0} x2={x1} className="stroke-[#e4dfd7]" />)}
      <line x1={x0} x2={x1} y1={zeroY} y2={zeroY} className="stroke-ink" strokeWidth={1.5} />
      <line x1={zeroX} x2={zeroX} y1={y0} y2={y1} className="stroke-ink" strokeWidth={1.5} />
      {xTicks.map((t) => <text key={`tx${t}`} x={x(t)} y={y0 + 32} textAnchor="middle" className="fill-[#3d3830]">{fmtX(t)}</text>)}
      {yTicks.map((t) => <text key={`ty${t}`} x={x0 - 8} y={y(t) + 5} textAnchor="end" className="fill-[#3d3830]">{fmtY(t)}</text>)}
      {xLabel ? <text x={x1} y={y0 + 58} textAnchor="end" className="fill-ink font-bold">{xLabel}</text> : null}
      {yLabel ? <text x={x0} y={y1 - 12} textAnchor="start" className="fill-ink font-bold">{yLabel}</text> : null}
    </g>
  );
}

/** 原生 range：可鍵盤操作，觸控高度 44px，旁邊顯示目前值。 */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  display?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-bold">
        <span>{label}</span>
        <output htmlFor={id} className="text-base tabular-nums">{display ?? value}</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full cursor-pointer accent-[#a83a0f]"
      />
    </div>
  );
}

/** 一排選項按鈕（aria-pressed），每顆至少 44px。 */
export function Choices<T extends string | number>({
  label,
  options,
  value,
  onChange,
  render = String,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  render?: (value: T) => string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-sm font-bold">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={String(option)}
            type="button"
            aria-pressed={option === value}
            onClick={() => onChange(option)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-ink px-4 text-sm font-bold tabular-nums aria-pressed:bg-ink aria-pressed:text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent-deep"
          >
            {render(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 把指標位置換成 SVG 座標。 */
export function useSvgPoint(svgRef: RefObject<SVGSVGElement | null>) {
  return useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      const matrix = svg?.getScreenCTM();
      if (!svg || !matrix) return null;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      return { x: point.x, y: point.y };
    },
    [svgRef],
  );
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const snap = (v: number, step: number) => Math.round(v / step) * step;
