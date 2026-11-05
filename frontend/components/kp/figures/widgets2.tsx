"use client";

import { useRef, useState } from "react";
import type { FigureSpec } from "@/lib/kp/figures/specs";
import { binaryGuesses, canBestR, canDS, canH, canS, fmt, foldThickness, halvingSum, holeF, sign, vecAdd, vecLen, vecScale, type Vec } from "@/lib/kp/figures/math";
import { Axes, Choices, FigureFrame, Slider, clamp, range, scale, useSvgPoint } from "./parts";

const W = 480;
const H = 340;
const M = { l: 64, r: 24, t: 40, b: 64 };
const INK = "stroke-ink";
const DEEP = "stroke-accent-deep";
type Of<K extends FigureSpec["widget"]> = Extract<FigureSpec, { widget: K }>;
const num = (v: number) => v.toLocaleString("en-US");
const sup = (n: number) => String(n).split("").map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]).join("");
const len = (u: Vec) => {
  const s = u[0] ** 2 + u[1] ** 2;
  return Number.isInteger(Math.sqrt(s)) ? String(Math.sqrt(s)) : `√${s} ≈ ${fmt(vecLen(u), 2)}`;
};

function Arrow({ from, to, x, y, className, dashed }: { from: Vec; to: Vec; x: (v: number) => number; y: (v: number) => number; className: string; dashed?: boolean }) {
  const [x1, y1, x2, y2] = [x(from[0]), y(from[1]), x(to[0]), y(to[1])];
  const d = Math.hypot(x2 - x1, y2 - y1);
  if (d < 1) return null;
  const [ux, uy] = [(x2 - x1) / d, (y2 - y1) / d];
  const head = `${x2},${y2} ${x2 - 12 * ux - 6 * uy},${y2 - 12 * uy + 6 * ux} ${x2 - 12 * ux + 6 * uy},${y2 - 12 * uy - 6 * ux}`;
  return (
    <g className={className}>
      <line x1={x1} y1={y1} x2={x2 - 8 * ux} y2={y2 - 8 * uy} strokeWidth={3} strokeDasharray={dashed ? "7 5" : undefined} />
      <polygon points={head} className="fill-current" stroke="none" />
    </g>
  );
}

function Vectors({ spec }: { spec: Of<"vector"> }) {
  const [v, setV] = useState<Vec>(spec.v);
  const [k, setK] = useState(spec.ks[0]);
  const ref = useRef<SVGSVGElement>(null);
  const toSvg = useSvgPoint(ref);
  const [lo, hi] = spec.range;
  const size = H - M.t - 30;
  const left = (W - size) / 2;
  const x = scale(lo, hi, left, left + size);
  const y = scale(lo, hi, M.t + size - 10, M.t - 10);
  const sum = vecAdd(spec.u, v);
  const ks = vecScale(k, sum);
  const at = (p: Vec) => `(${sign(p[0])}, ${sign(p[1])})`;
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      svgRef={ref}
      onPointer={(event) => {
        const p = toSvg(event);
        if (p) setV([clamp(Math.round(x.invert(p.x)) - spec.u[0], lo - spec.u[0], hi - spec.u[0]), clamp(Math.round(y.invert(p.y)) - spec.u[1], lo - spec.u[1], hi - spec.u[1])]);
      }}
      controls={
        <>
          <Slider label="向量 v 的 x 分量" value={v[0]} min={lo - spec.u[0]} max={hi - spec.u[0]} step={1} onChange={(n) => setV([n, v[1]])} display={sign(v[0])} />
          <Slider label="向量 v 的 y 分量（也可以在圖上拖）" value={v[1]} min={lo - spec.u[1]} max={hi - spec.u[1]} step={1} onChange={(n) => setV([v[0], n])} display={sign(v[1])} />
          <Choices label="和向量乘幾倍" options={spec.ks} value={k} onChange={setK} />
        </>
      }
      readout={
        <>
          <p>u ＝ {at(spec.u)}，v ＝ {at(v)}</p>
          <p className="font-bold">u ＋ v ＝ {at(sum)}，長度 {len(sum)}</p>
          {k !== 1 ? <p>{k} × (u ＋ v) ＝ {at(ks)}，長度 {len(ks)}</p> : null}
        </>
      }
    >
      <Axes x={x} y={y} xTicks={range(lo, hi, 1)} yTicks={range(lo, hi, 1)} fmtX={(t) => (t % 4 === 0 ? sign(t) : "")} fmtY={(t) => (t % 4 === 0 && t !== lo ? sign(t) : "")} />
      <clipPath id={`${spec.id}-plot`}>
        <rect x={x(lo)} y={y(hi)} width={x(hi) - x(lo)} height={y(lo) - y(hi)} />
      </clipPath>
      {k !== 1 ? (
        <g clipPath={`url(#${spec.id}-plot)`}>
          <Arrow from={[0, 0]} to={ks} x={x} y={y} className="text-[#8a8178] stroke-[#8a8178]" dashed />
        </g>
      ) : null}
      <Arrow from={[0, 0]} to={spec.u} x={x} y={y} className="text-ink stroke-ink" />
      <Arrow from={spec.u} to={sum} x={x} y={y} className="text-ink stroke-ink" />
      <Arrow from={[0, 0]} to={sum} x={x} y={y} className="text-accent-deep stroke-accent-deep" />
      <circle cx={x(sum[0])} cy={y(sum[1])} r={14} className="fill-accent-deep/20 cursor-grab" />
    </FigureFrame>
  );
}

function Doubling({ spec }: { spec: Of<"doubling"> }) {
  const [n, setN] = useState(spec.start);
  const [mode, setMode] = useState<"一般刻度" | "對數刻度">("一般刻度");
  const t = foldThickness(spec.base, n);
  const x = scale(0, spec.maxN, M.l, W - M.r);
  const logMode = mode === "對數刻度";
  const yLin = scale(0, 200000, H - M.b, M.t);
  const yLog = scale(-2, 6, H - M.b, M.t);
  const y = (v: number) => (logMode ? yLog(Math.log10(v)) : yLin(v));
  const linTicks = [0, 50000, 100000, 150000, 200000];
  const logTicks = [-2, 0, 2, 4, 6];
  const SUP = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶"];
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={
        <>
          <Slider label="對摺幾次 n" value={n} min={0} max={spec.maxN} step={1} onChange={setN} display={`${n} 次`} />
          <Choices label="縱軸" options={["一般刻度", "對數刻度"] as const} value={mode} onChange={setMode} />
        </>
      }
      readout={
        <>
          <p>厚度 ＝ {spec.base} × 2{sup(n)} ＝ {spec.base} × {num(2 ** n)}</p>
          <p className="font-bold">＝ {num(Number(fmt(t, 2)))} 公分{t > spec.limitCm ? "，超過 1 公里" : ""}</p>
        </>
      }
    >
      {logMode ? (
        <Axes x={x} y={yLog} xTicks={range(0, spec.maxN, 4)} yTicks={logTicks} fmtY={(e) => (e === -2 ? "0.01" : e === 0 ? "1" : e === 2 ? "100" : `10${SUP[e]}`)} xLabel="對摺次數" yLabel="厚度（公分）" />
      ) : (
        <Axes x={x} y={yLin} xTicks={range(0, spec.maxN, 4)} yTicks={linTicks} fmtY={(v) => (v === 0 ? "0" : `${v / 1000}k`)} xLabel="對摺次數" yLabel="厚度（公分）" />
      )}
      <line x1={M.l} x2={W - M.r} y1={y(spec.limitCm)} y2={y(spec.limitCm)} className={DEEP} strokeDasharray="6 5" strokeWidth={2} />
      <text x={M.l + 8} y={y(spec.limitCm) - 8} className="fill-accent-deep text-[18px] font-bold">1 公里</text>
      {range(0, spec.maxN, 1).map((i) => (
        <circle key={i} cx={x(i)} cy={y(foldThickness(spec.base, i))} r={i === n ? 8 : 4} className={i === n ? "fill-accent-deep" : "fill-ink"} />
      ))}
    </FigureFrame>
  );
}

function Halving({ spec }: { spec: Of<"halving"> }) {
  const [n, setN] = useState(spec.start);
  const { num: a, den } = halvingSum(n);
  const x = scale(0, 1, 24, W - 24);
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={190}
      controls={<Slider label="剪幾次 n" value={n} min={1} max={spec.maxN} step={1} onChange={setN} display={`${n} 次`} />}
      readout={
        <>
          <p className="font-bold">前 {n} 塊的和 ＝ 1 − 1/{num(den)} ＝ {num(a)}/{num(den)}</p>
          <p>離一整張紙還差 1/{num(den)}</p>
        </>
      }
    >
      <text x={24} y={34} className="fill-ink text-[18px] font-bold">一整張紙 ＝ 1</text>
      <rect x={x(0)} y={48} width={x(1) - x(0)} height={64} className="fill-white stroke-ink" strokeWidth={2} />
      {range(1, n, 1).map((i) => {
        const from = 1 - 1 / 2 ** (i - 1);
        const w = 1 / 2 ** i;
        return (
          <g key={i}>
            <rect x={x(from)} y={48} width={x(w) - x(0)} height={64} className={i % 2 ? "fill-[#ffd2bd] stroke-ink" : "fill-[#f6b294] stroke-ink"} strokeWidth={1.5} />
            {i <= 3 ? <text x={x(from + w / 2)} y={88} textAnchor="middle" className="fill-ink text-[18px] font-bold">1/{2 ** i}</text> : null}
          </g>
        );
      })}
      <text x={x(1)} y={142} textAnchor="end" className="fill-ink text-[18px]">右邊空白 ＝ 1/{num(den)}</text>
    </FigureFrame>
  );
}

function Hole({ spec }: { spec: Of<"hole"> }) {
  const [xv, setX] = useState(spec.xs[0]);
  const x = scale(0, 2, M.l, W - M.r);
  const y = scale(0, 3, H - M.b, M.t);
  const f = holeF(xv);
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={<Choices label="x 取多少" options={spec.xs} value={xv} onChange={setX} />}
      readout={
        <>
          <p>f({xv}) ＝ ({xv}² − 1) ÷ ({xv} − 1) ＝ {fmt(xv)} ＋ 1</p>
          <p className="font-bold">＝ {fmt(f)}，和 2 差 {fmt(Math.abs(f - 2))}</p>
          <p>x ＝ 1 沒有定義，圖上是一個洞。</p>
        </>
      }
    >
      <Axes x={x} y={y} xTicks={range(0, 2, 0.5)} yTicks={range(0, 3, 1)} xLabel="x" yLabel="f(x)" />
      <line x1={x(0)} y1={y(1)} x2={x(2)} y2={y(3)} className={DEEP} strokeWidth={3} />
      <line x1={x(xv)} x2={x(xv)} y1={y(0)} y2={y(f)} className="stroke-[#8a8178]" strokeDasharray="4 4" strokeWidth={2} />
      <circle cx={x(xv)} cy={y(f)} r={5} className="fill-ink" />
      {/* 洞畫在最上面：x 取 0.999 或 1.001 時，點和洞幾乎重疊，洞仍要看得出是空的。 */}
      <circle cx={x(1)} cy={y(2)} r={7} className="fill-white stroke-accent-deep" strokeWidth={3} />
    </FigureFrame>
  );
}

function Can({ spec }: { spec: Of<"can"> }) {
  const [r, setR] = useState(spec.start);
  const V = spec.volume;
  const best = canBestR(V);
  const x = scale(spec.rMin, spec.rMax, M.l, W - M.r);
  const y = scale(0, spec.sMax, H - M.b, M.t);
  // 「最省料」按鈕把 r 四捨五入到 0.01；讀數改用精確的最佳 r，h 才會是 YAML 的 7.64。
  const atBest = Math.abs(r - best) < 0.005;
  const rr = atBest ? best : r;
  const S = canS(V, rr);
  const dS = canDS(V, rr);
  const pts = range(0, 140, 1).map((i) => spec.rMin + ((spec.rMax - spec.rMin) * i) / 140);
  const path = pts.map((t, i) => `${i ? "L" : "M"}${x(t).toFixed(1)},${y(canS(V, t)).toFixed(1)}`).join("");
  const dr = 0.8;
  const trend = atBest ? "導數 ＝ 0，最省料" : dS < 0 ? "導數 ＜ 0，再加大半徑會更省" : "導數 ＞ 0，再加大半徑反而更費";
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={
        <>
          <Slider label="半徑 r（公分）" value={r} min={spec.rMin} max={spec.rMax} step={0.01} onChange={setR} display={fmt(r, 2)} />
          <Choices label="直接跳到" options={["r ＝ 3", "最省料", "r ＝ 5"] as const} value={r === 3 ? "r ＝ 3" : r === 5 ? "r ＝ 5" : Math.abs(r - best) < 0.005 ? "最省料" : ("" as "r ＝ 3")} onChange={(o) => setR(o === "r ＝ 3" ? 3 : o === "r ＝ 5" ? 5 : Math.round(best * 100) / 100)} />
        </>
      }
      readout={
        <>
          <p>高 h ＝ {V} ÷ (πr²) ≈ {fmt(canH(V, rr), 2)} 公分</p>
          <p className="font-bold">表面積 S ≈ {fmt(S, 1)} 平方公分</p>
          <p>S′(r) ≈ {sign(dS, 1)}：{trend}</p>
        </>
      }
    >
      <Axes x={x} y={y} xTicks={range(spec.rMin, spec.rMax, 1)} yTicks={range(0, spec.sMax, 200)} xLabel="半徑 r（公分）" yLabel="表面積 S" />
      <path d={path} fill="none" className={DEEP} strokeWidth={3} />
      <clipPath id={`${spec.id}-plot`}>
        <rect x={x(spec.rMin)} y={y(spec.sMax)} width={x(spec.rMax) - x(spec.rMin)} height={y(0) - y(spec.sMax)} />
      </clipPath>
      <line x1={x(r - dr)} y1={y(S - dS * dr)} x2={x(r + dr)} y2={y(S + dS * dr)} className={INK} strokeWidth={2} strokeDasharray="6 4" clipPath={`url(#${spec.id}-plot)`} />
      <circle cx={x(best)} cy={y(canS(V, best))} r={5} className="fill-white stroke-ink" strokeWidth={2} />
      <circle cx={x(r)} cy={y(S)} r={7} className="fill-ink" />
    </FigureFrame>
  );
}

function BinarySearch({ spec }: { spec: Of<"bsearch"> }) {
  const [target, setTarget] = useState(spec.start);
  const [shown, setShown] = useState(1);
  const guesses = binaryGuesses(target, spec.lo, spec.hi);
  const k = Math.min(shown, guesses.length);
  let lo = spec.lo;
  let hi = spec.hi;
  for (const g of guesses.slice(0, k - 1)) {
    if (g < target) lo = g + 1;
    else hi = g - 1;
  }
  const g = guesses[k - 1];
  const x = scale(spec.lo - 0.5, spec.hi + 0.5, 24, W - 24);
  const verdict = g === target ? "猜中了" : g < target ? "太小" : "太大";
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={170}
      controls={
        <>
          <Slider label="家長心裡想的數" value={target} min={spec.lo} max={spec.hi} step={1} onChange={(v) => { setTarget(v); setShown(1); }} />
          <Slider label="看第幾次猜" value={k} min={1} max={guesses.length} step={1} onChange={setShown} display={`第 ${k} 次`} />
        </>
      }
      readout={
        <>
          <p>範圍 {lo}～{hi}（{hi - lo + 1} 個數），猜中間 {g}：{verdict}</p>
          <p className="font-bold">這個數一共猜了 {guesses.length} 次：{guesses.join("、")}</p>
        </>
      }
    >
      <rect x={x(spec.lo - 0.5)} y={52} width={x(spec.hi + 0.5) - x(spec.lo - 0.5)} height={40} className="fill-[#e4dfd7]" />
      <rect x={x(lo - 0.5)} y={52} width={x(hi + 0.5) - x(lo - 0.5)} height={40} className="fill-[#ffd2bd] stroke-ink" strokeWidth={2} />
      <line x1={x(g)} x2={x(g)} y1={44} y2={100} className={DEEP} strokeWidth={3} />
      <text x={clamp(x(g), 40, W - 40)} y={34} textAnchor="middle" className="fill-accent-deep text-[18px] font-bold">{g}</text>
      <line x1={x(target)} x2={x(target)} y1={92} y2={110} className={INK} strokeWidth={2} />
      {[spec.lo, spec.hi].map((v) => <text key={v} x={x(v)} y={134} textAnchor={v === spec.lo ? "start" : "end"} className="fill-[#3d3830] text-[18px]">{v}</text>)}
    </FigureFrame>
  );
}

function Pixels({ spec }: { spec: Of<"pixels"> }) {
  const [rows, setRows] = useState<string[]>(spec.start);
  const n = rows.length;
  const cell = 30;
  const left = (W - n * cell) / 2;
  const flip = (r: number, c: number) => setRows(rows.map((row, i) => (i === r ? row.slice(0, c) + (row[c] === "1" ? "0" : "1") + row.slice(c + 1) : row)));
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={n * cell + 20}
      controls={
        <fieldset className="min-w-0">
          <legend className="text-sm font-bold">每一行的數字（1 是白、0 是黑）</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {rows.map((row, i) => (
              <label key={i} className="flex min-w-0 items-center gap-2 text-sm font-bold">
                <span className="w-12 shrink-0">第 {i + 1} 行</span>
                <input
                  value={row}
                  inputMode="numeric"
                  maxLength={n}
                  aria-label={`第 ${i + 1} 行的數字`}
                  onChange={(event) => {
                    const v = event.target.value.replace(/[^01]/g, "").slice(0, n);
                    // 還沒打到的格子保留原本的值，不偷偷補 1（會把整行變白）。
                    setRows(rows.map((old, j) => (j === i ? v + old.slice(v.length) : old)));
                  }}
                  className="h-11 w-full min-w-0 border border-[#c0bab2] px-2 font-mono tabular-nums tracking-widest"
                />
              </label>
            ))}
          </div>
        </fieldset>
      }
      readout={<p>{n} × {n} 格要寫 {n * n} 個 0 或 1；這張圖有 {rows.join("").split("").filter((d) => d === "0").length} 個黑格。</p>}
    >
      {rows.map((row, r) =>
        row.split("").map((d, c) => (
          <rect key={`${r}-${c}`} x={left + c * cell} y={10 + r * cell} width={cell} height={cell} className={d === "1" ? "fill-white stroke-[#c0bab2]" : "fill-ink stroke-ink"} onClick={() => flip(r, c)} />
        )),
      )}
    </FigureFrame>
  );
}

export function InteractiveFigure2({ spec }: { spec: FigureSpec }) {
  switch (spec.widget) {
    case "vector": return <Vectors spec={spec} />;
    case "doubling": return <Doubling spec={spec} />;
    case "halving": return <Halving spec={spec} />;
    case "hole": return <Hole spec={spec} />;
    case "can": return <Can spec={spec} />;
    case "bsearch": return <BinarySearch spec={spec} />;
    case "pixels": return <Pixels spec={spec} />;
    default: return null;
  }
}
