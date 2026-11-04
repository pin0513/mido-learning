"use client";

import { useRef, useState } from "react";
import type { FigureSpec } from "@/lib/kp/figures/specs";
import { compareHalf, ferrisHeight, ferrisMinutes, fmt, intersect, lineY, quadrant, riemann, secantSlope, sign } from "@/lib/kp/figures/math";
import { Axes, Choices, FigureFrame, Slider, clamp, range, scale, snap, useSvgPoint } from "./parts";

const W = 480;
const H = 340;
const M = { l: 56, r: 24, t: 40, b: 64 };
const INK = "stroke-ink";
const DEEP = "stroke-accent-deep";
const QUAD = ["", "第一象限", "第二象限", "第三象限", "第四象限"] as const;

type Of<K extends FigureSpec["widget"]> = Extract<FigureSpec, { widget: K }>;

function LineKey({ dashed, label }: { dashed?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-bold">
      <svg width="32" height="10" aria-hidden="true">
        <line x1="0" x2="32" y1="5" y2="5" strokeWidth="3" className={dashed ? DEEP : INK} strokeDasharray={dashed ? "7 5" : undefined} />
      </svg>
      {label}
    </span>
  );
}

function Lines({ spec }: { spec: Of<"lines"> }) {
  const [xv, setX] = useState(spec.start);
  const ref = useRef<SVGSVGElement>(null);
  const toSvg = useSvgPoint(ref);
  const x = scale(0, spec.xMax, M.l, W - M.r);
  const y = scale(0, spec.yMax, H - M.b, M.t);
  const [A, B] = spec.lines;
  const cross = intersect(A, B);
  const ya = lineY(A, xv);
  const yb = lineY(B, xv);
  const cheaper = ya === yb ? "兩個方案一樣貴" : `${ya < yb ? A.name : B.name} 較便宜，差 ${fmt(Math.abs(ya - yb))} ${spec.yUnit}`;
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      svgRef={ref}
      onPointer={(event) => {
        const p = toSvg(event);
        if (p) setX(clamp(snap(x.invert(p.x), 5), 0, spec.xMax));
      }}
      controls={
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <LineKey label={`${A.name}：y ＝ ${A.a} ＋ ${A.b}x`} />
            <LineKey dashed label={`${B.name}：y ＝ ${B.a} ＋ ${B.b}x`} />
          </div>
          <Slider label="通話分鐘 x（也可以在圖上拖）" value={xv} min={0} max={spec.xMax} step={5} onChange={setX} display={`${xv} ${spec.xUnit}`} />
        </>
      }
      readout={
        <>
          <p>x ＝ {xv}：{A.name} {fmt(ya)} {spec.yUnit}，{B.name} {fmt(yb)} {spec.yUnit}。</p>
          <p className="font-bold">{cheaper}。</p>
          {cross ? <p className="text-sm">交點 ({fmt(cross.x)}, {fmt(cross.y)})：兩邊剛好一樣。</p> : null}
        </>
      }
    >
      <Axes x={x} y={y} xTicks={range(0, spec.xMax, spec.xStep)} yTicks={range(0, spec.yMax, spec.yStep)} xLabel={spec.xLabel} yLabel={spec.yLabel} />
      <line x1={x(0)} y1={y(lineY(A, 0))} x2={x(spec.xMax)} y2={y(lineY(A, spec.xMax))} className={INK} strokeWidth={3} />
      <line x1={x(0)} y1={y(lineY(B, 0))} x2={x(spec.xMax)} y2={y(lineY(B, spec.xMax))} className={DEEP} strokeWidth={3} strokeDasharray="9 6" />
      {cross ? <circle cx={x(cross.x)} cy={y(cross.y)} r={8} className="fill-white stroke-ink" strokeWidth={2.5} /> : null}
      <line x1={x(xv)} x2={x(xv)} y1={y(0)} y2={M.t} className="stroke-[#8a8178]" strokeDasharray="3 4" />
      <circle cx={x(xv)} cy={y(ya)} r={6} className="fill-ink" />
      <circle cx={x(xv)} cy={y(yb)} r={6} className="fill-accent-deep" />
      <rect x={x(xv) - 22} y={M.t} width={44} height={H - M.t - M.b} fill="transparent" className="cursor-ew-resize" />
    </FigureFrame>
  );
}

function Quadrant({ spec }: { spec: Of<"quadrant"> }) {
  const [[px, py], setP] = useState<[number, number]>(spec.start);
  const ref = useRef<SVGSVGElement>(null);
  const toSvg = useSvgPoint(ref);
  const n = spec.range;
  const size = H - M.t - M.b + 20;
  const left = (W - size) / 2 + 10;
  const x = scale(-n, n, left, left + size);
  const y = scale(-n, n, M.t - 10 + size, M.t - 10);
  const q = quadrant(px, py);
  const regions: [number, number, number][] = [[1, 0, n], [2, -n, n], [3, -n, 0], [4, 0, 0]];
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      svgRef={ref}
      onPointer={(event) => {
        const p = toSvg(event);
        if (p) setP([clamp(Math.round(x.invert(p.x)), -n, n), clamp(Math.round(y.invert(p.y)), -n, n)]);
      }}
      controls={
        <>
          <Slider label="x 坐標（左右）" value={px} min={-n} max={n} step={1} onChange={(v) => setP([v, py])} display={sign(px)} />
          <Slider label="y 坐標（上下）" value={py} min={-n} max={n} step={1} onChange={(v) => setP([px, v])} display={sign(py)} />
        </>
      }
      readout={
        <>
          <p className="text-2xl font-black tabular-nums">({sign(px)}, {sign(py)})</p>
          <p className="font-bold">{q === 0 ? (px === 0 && py === 0 ? "原點，在坐標軸上，不屬於任何象限" : "在坐標軸上，不屬於任何象限") : QUAD[q]}</p>
          <p className="text-sm">x {px > 0 ? "是正" : px < 0 ? "是負" : "是 0"}，y {py > 0 ? "是正" : py < 0 ? "是負" : "是 0"}。</p>
        </>
      }
    >
      {regions.map(([k, rx, ry]) => (
        <rect key={k} x={x(rx)} y={y(ry)} width={x(n) - x(0)} height={y(0) - y(n)} className={k === q ? "fill-[#ffe9df]" : "fill-transparent"} />
      ))}
      <Axes x={x} y={y} xTicks={range(-n, n, 1)} yTicks={range(-n, n, 1)} fmtX={(v) => (v % 5 === 0 && v !== 0 ? sign(v) : "")} fmtY={(v) => (v === n ? sign(v) : "")} />
      <text x={x(n) + 8} y={y(0) + 5} className="fill-ink text-[18px] font-bold">x</text>
      <text x={x(0) - 5} y={y(n) - 8} textAnchor="end" className="fill-ink text-[18px] font-bold">y</text>
      <line x1={x(px)} x2={x(px)} y1={y(0)} y2={y(py)} className={DEEP} strokeDasharray="4 4" strokeWidth={2} />
      <line x1={x(0)} x2={x(px)} y1={y(py)} y2={y(py)} className={DEEP} strokeDasharray="4 4" strokeWidth={2} />
      <circle cx={x(px)} cy={y(py)} r={14} className="fill-accent-deep/20" />
      <circle cx={x(px)} cy={y(py)} r={8} className="fill-accent-deep cursor-grab" />
    </FigureFrame>
  );
}

const curve = (f: (t: number) => number, from: number, to: number, x: (v: number) => number, y: (v: number) => number, steps = 120) =>
  range(0, steps, 1).map((i, k) => { const t = from + ((to - from) * i) / steps; return `${k ? "L" : "M"}${x(t).toFixed(1)},${y(f(t)).toFixed(1)}`; }).join("");

function Parabola({ spec }: { spec: Of<"parabola"> }) {
  const [a, setA] = useState(1);
  const ymax = Math.max(...spec.coefficients.map(Math.abs)) * 9;
  const x = scale(-3, 3, M.l, W - M.r);
  const y = scale(-ymax, ymax, H - M.b, M.t);
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={<Choices label="係數 a" options={spec.coefficients} value={a} onChange={setA} render={(v) => sign(v)} />}
      readout={
        <>
          <p className="font-bold">y ＝ {a === 1 ? "" : a === -1 ? "−" : sign(a)}x²：開口{a > 0 ? "向上，最低點" : "向下，最高點"} (0, 0)</p>
          <table className="mt-2 w-full table-fixed text-center text-sm tabular-nums">
            <tbody>
              <tr><th scope="row" className="w-8 text-left">x</th>{spec.xs.map((v) => <td key={v}>{sign(v)}</td>)}</tr>
              <tr><th scope="row" className="text-left">y</th>{spec.xs.map((v) => <td key={v}>{sign(a * v * v)}</td>)}</tr>
            </tbody>
          </table>
        </>
      }
    >
      <Axes x={x} y={y} xTicks={range(-3, 3, 1)} yTicks={range(-ymax, ymax, ymax / 3)} fmtX={sign} fmtY={sign} xLabel="x" yLabel="y" />
      {a !== 1 ? <path d={curve((t) => t * t, -3, 3, x, y)} fill="none" className="stroke-[#b8b0a6]" strokeWidth={2} strokeDasharray="5 5" /> : null}
      <path d={curve((t) => a * t * t, -3, 3, x, y)} fill="none" className={DEEP} strokeWidth={3} />
      {spec.xs.map((v) => <circle key={v} cx={x(v)} cy={y(a * v * v)} r={5} className="fill-ink" />)}
    </FigureFrame>
  );
}

function Secant({ spec }: { spec: Of<"secant"> }) {
  const [h, setH] = useState(spec.hs[0]);
  const t0 = spec.t0;
  const x = scale(0, 2, M.l, W - M.r);
  const y = scale(0, 5, H - M.b, M.t);
  const m = secantSlope(t0, h);
  const lineAt = (slope: number, t: number) => t0 * t0 + slope * (t - t0);
  const t1 = t0 + h;
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-2"><LineKey label="割線" /><LineKey dashed label="t ＝ 1 的切線（斜率 2）" /></div>
          <Choices label="時間間隔 h（秒）" options={spec.hs} value={h} onChange={setH} />
        </>
      }
      readout={
        <>
          <p>從 t ＝ {t0} 到 {fmt(t1)}：位置從 {fmt(t0 * t0)} 到 {fmt(t1 * t1, 6)} 公尺。</p>
          <p className="font-bold">平均速度（割線斜率）＝ 2 ＋ h ＝ {fmt(m)} 公尺／秒</p>
        </>
      }
    >
      <defs><clipPath id={`clip-${spec.id}`}><rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} /></clipPath></defs>
      <Axes x={x} y={y} xTicks={range(0, 2, 0.5)} yTicks={range(0, 5, 1)} xLabel="t（秒）" yLabel="s（公尺）" />
      <g clipPath={`url(#clip-${spec.id})`}>
        <path d={curve((t) => t * t, 0, 2, x, y)} fill="none" className="stroke-[#8a8178]" strokeWidth={3} />
        <line x1={x(0)} y1={y(lineAt(2, 0))} x2={x(2)} y2={y(lineAt(2, 2))} className={DEEP} strokeWidth={2.5} strokeDasharray="8 6" />
        <line x1={x(0)} y1={y(lineAt(m, 0))} x2={x(2)} y2={y(lineAt(m, 2))} className={INK} strokeWidth={3} />
      </g>
      <circle cx={x(t0)} cy={y(t0 * t0)} r={6} className="fill-ink" />
      <circle cx={x(t1)} cy={y(t1 * t1)} r={6} className="fill-white stroke-ink" strokeWidth={2.5} />
    </FigureFrame>
  );
}

function Riemann({ spec }: { spec: Of<"riemann"> }) {
  const [n, setN] = useState(spec.ns[0]);
  const [side, setSide] = useState<"開頭" | "結尾">("開頭");
  const vmax = spec.k * spec.T;
  const x = scale(0, spec.T, M.l, W - M.r);
  const y = scale(0, vmax, H - M.b, M.t);
  const dt = spec.T / n;
  const sums = riemann(spec.k, spec.T, n);
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={
        <>
          <Choices label="切成幾段" options={spec.ns} value={n} onChange={setN} />
          <Choices label="每段用哪一刻的速度" options={["開頭", "結尾"] as const} value={side} onChange={setSide} />
        </>
      }
      readout={
        <>
          <p>每段 {fmt(dt, 4)} 秒。用開頭的速度估 <b className="tabular-nums">{fmt(sums.left)}</b> 公尺，用結尾的速度估 <b className="tabular-nums">{fmt(sums.right)}</b> 公尺。</p>
          <p className="font-bold">準確距離 ＝ 三角形面積 ＝ ½ × {spec.T} × {vmax} ＝ {fmt((spec.T * vmax) / 2)} 公尺</p>
        </>
      }
    >
      <Axes x={x} y={y} xTicks={range(0, spec.T, 0.5)} yTicks={range(0, vmax, 1)} xLabel="t（秒）" yLabel="v（公尺／秒）" />
      {range(0, n - 1, 1).map((i) => {
        const v = spec.k * (side === "開頭" ? i : i + 1) * dt;
        return <rect key={i} x={x(i * dt)} y={y(v)} width={x(dt) - x(0)} height={y(0) - y(v)} className="fill-[#ffd2bd] stroke-accent-deep" strokeWidth={n > 16 ? 0.5 : 1} />;
      })}
      <line x1={x(0)} y1={y(0)} x2={x(spec.T)} y2={y(vmax)} className={INK} strokeWidth={3} />
    </FigureFrame>
  );
}

function Ferris({ spec }: { spec: Of<"ferris"> }) {
  const [deg, setDeg] = useState(30);
  const top = spec.center + spec.radius + 2;
  const y = scale(0, top, H - M.b, M.t);
  const px = y(0) - y(1);
  const cx = 24 + spec.radius * px;
  const g = scale(0, spec.periodMin, cx + spec.radius * px + 64, W - M.r);
  const hgt = ferrisHeight(spec.center, spec.radius, deg);
  const rad = (deg * Math.PI) / 180;
  const carX = cx + spec.radius * px * Math.cos(rad);
  const minutes = ferrisMinutes(deg, spec.periodMin);
  const seconds = minutes * 60;
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={<Slider label="轉了幾度 θ" value={deg} min={0} max={360} step={spec.stepDeg} onChange={setDeg} display={`${deg}°`} />}
      readout={
        <>
          <p>轉 {deg}° 約經過 {fmt(seconds / 60, 2)} 分鐘（{fmt(seconds)} 秒）。</p>
          <p className="font-bold">高度 ＝ {spec.center} ＋ {spec.radius} × sin {deg}° ＝ {fmt(hgt, 2)} 公尺</p>
        </>
      }
    >
      <line x1={8} x2={cx + spec.radius * px + 8} y1={y(0)} y2={y(0)} className={INK} strokeWidth={2} />
      <circle cx={cx} cy={y(spec.center)} r={spec.radius * px} fill="none" className="stroke-[#8a8178]" strokeWidth={2} />
      <line x1={cx} y1={y(spec.center)} x2={cx} y2={y(0)} className="stroke-[#8a8178]" strokeWidth={2} />
      <line x1={cx} y1={y(spec.center)} x2={carX} y2={y(hgt)} className={INK} strokeWidth={2} />
      <line x1={carX} x2={g(minutes)} y1={y(hgt)} y2={y(hgt)} className="stroke-[#8a8178]" strokeDasharray="3 4" />
      <Axes x={g} y={y} xTicks={spec.minuteTicks} yTicks={[0, 2, 12, 22]} fmtY={(v) => (v === 0 ? "" : String(v))} xLabel={spec.xLabel} yLabel="高度（公尺）" />
      <path d={curve((t) => ferrisHeight(spec.center, spec.radius, (t / spec.periodMin) * 360), 0, spec.periodMin, g, y)} fill="none" className={DEEP} strokeWidth={3} />
      <circle cx={carX} cy={y(hgt)} r={8} className="fill-accent-deep" />
      <circle cx={g(minutes)} cy={y(hgt)} r={6} className="fill-ink" />
    </FigureFrame>
  );
}

function Fraction({ spec }: { spec: Of<"fraction"> }) {
  const [d, setD] = useState(4);
  const [k, setK] = useState(3);
  const kk = Math.min(k, d);
  const x = scale(0, 1, 24, W - 24);
  const bar = (top: number, parts: number, filled: number, label: string) => (
    <g>
      <text x={24} y={top - 10} className="fill-ink text-[18px] font-bold">{label}</text>
      {range(0, parts - 1, 1).map((i) => (
        <g key={i}>
          <rect x={x(i / parts)} y={top} width={x(1 / parts) - x(0)} height={56} className={i < filled ? "fill-[#ffd2bd] stroke-ink" : "fill-white stroke-ink"} strokeWidth={2} />
          <text x={x((i + 0.5) / parts)} y={top + 34} textAnchor="middle" className="fill-ink text-[18px] tabular-nums">1/{parts}</text>
        </g>
      ))}
    </g>
  );
  const cmp = compareHalf(kk, d);
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={260}
      controls={
        <>
          <Choices label="平分成幾份" options={spec.denominators} value={d} onChange={(v) => { setD(v); setK(Math.min(k, v)); }} />
          <Slider label="塗幾份" value={kk} min={0} max={d} step={1} onChange={setK} display={`${kk} 份`} />
        </>
      }
      readout={
        <>
          <p className="text-2xl font-black tabular-nums">{kk}/{d}</p>
          <p>是 {kk} 個 1/{d}。和 1/2 比：{kk}/{d} {cmp} 1/2。</p>
        </>
      }
    >
      {bar(44, d, kk, `平分成 ${d} 份，塗 ${kk} 份`)}
      {bar(170, 2, 1, "對照：1/2")}
    </FigureFrame>
  );
}

const STEPS = ["列式", "同減 15x", "除以 10", "驗算"] as const;

function BarModel({ spec }: { spec: Of<"barmodel"> }) {
  const [step, setStep] = useState<(typeof STEPS)[number]>(STEPS[0]);
  const s = STEPS.indexOf(step);
  const xv = spec.fee / (spec.price - spec.cost);
  const total = spec.price * xv;
  const x = scale(0, total, 24, W - 24);
  const common = spec.cost * xv;
  const rest = (spec.price - spec.cost) * xv;
  const seg = (top: number, from: number, len: number, label: string, faded: boolean, key: string) => (
    <g key={key} opacity={faded ? 0.35 : 1}>
      <rect x={x(from)} y={top} width={x(len) - x(0)} height={52} className={faded ? "fill-[#e4dfd7] stroke-ink" : "fill-[#ffd2bd] stroke-ink"} strokeWidth={2} strokeDasharray={faded ? "6 4" : undefined} />
      <text x={x(from + len / 2)} y={top + 32} textAnchor="middle" className="fill-ink text-[19px] font-bold">{label}</text>
    </g>
  );
  const fade = s >= 1;
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={250}
      controls={<Choices label="步驟" options={STEPS} value={step} onChange={setStep} />}
      readout={
        <p className="font-bold">
          {s === 0 ? `收入 ${spec.price}x ＝ 支出 ${spec.fee} ＋ ${spec.cost}x` : null}
          {s === 1 ? `兩條都扣掉一樣長的 ${spec.cost}x：${spec.price - spec.cost}x ＝ ${spec.fee}` : null}
          {s === 2 ? `${spec.price - spec.cost} 個 x 一共 ${spec.fee}，一個 x ＝ ${spec.fee} ÷ ${spec.price - spec.cost} ＝ ${xv}` : null}
          {s === 3 ? `${spec.price} × ${xv} ＝ ${total}，${spec.fee} ＋ ${spec.cost} × ${xv} ＝ ${spec.fee + spec.cost * xv}，兩邊相等` : null}
        </p>
      }
    >
      <text x={24} y={34} className="fill-ink text-[18px] font-bold">收入{s === 3 ? `　${total} 元` : ""}</text>
      {seg(46, 0, common, `${spec.cost}x`, fade, "ic")}
      {s === 2
        ? range(0, spec.price - spec.cost - 1, 1).map((i) => seg(46, common + i * xv, xv, i === 0 ? "x" : "", false, `p${i}`))
        : seg(46, common, rest, s === 3 ? `${spec.price - spec.cost} × ${xv}` : `${spec.price - spec.cost}x`, false, "ir")}
      <text x={24} y={146} className="fill-ink text-[18px] font-bold">支出{s === 3 ? `　${spec.fee + common} 元` : ""}</text>
      {seg(158, 0, common, `${spec.cost}x`, fade, "ec")}
      {seg(158, common, spec.fee, `${spec.fee}`, false, "ef")}
    </FigureFrame>
  );
}

function Pythag({ spec }: { spec: Of<"pythag"> }) {
  const [a, setA] = useState(spec.start[0]);
  const [b, setB] = useState(spec.start[1]);
  const [way, setWay] = useState<"第一種" | "第二種">("第一種");
  const side = 260;
  const s = side / (a + b);
  const o = { x: (W - side) / 2, y: 30 };
  const P = (u: number, v: number) => `${(o.x + u * s).toFixed(1)},${(o.y + side - v * s).toFixed(1)}`;
  const L = a + b;
  const tris1 = [[[0, 0], [a, 0], [0, b]], [[a, 0], [L, 0], [L, a]], [[L, a], [L, L], [b, L]], [[b, L], [0, L], [0, b]]];
  const tris2 = [[[a, 0], [L, 0], [L, a]], [[a, 0], [a, a], [L, a]], [[0, a], [a, a], [0, L]], [[a, a], [a, L], [0, L]]];
  const c2 = a * a + b * b;
  const label = (u: number, v: number, text: string, big: boolean) => (big ? <text x={o.x + u * s} y={o.y + side - v * s + 6} textAnchor="middle" className="fill-ink text-[19px] font-bold">{text}</text> : null);
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H - 20}
      controls={
        <>
          <Slider label="股 a" value={a} min={1} max={spec.max} step={1} onChange={setA} />
          <Slider label="股 b" value={b} min={1} max={spec.max} step={1} onChange={setB} />
          <Choices label="擺法" options={["第一種", "第二種"] as const} value={way} onChange={setWay} />
        </>
      }
      readout={
        <>
          <p>大正方形邊長 a ＋ b ＝ {L}，面積 {L * L}；4 個三角形共 {2 * a * b}。</p>
          <p className="font-bold">{way === "第一種" ? `空出 c² ＝ ${L * L} − ${2 * a * b} ＝ ${c2}` : `空出 a² ＋ b² ＝ ${a * a} ＋ ${b * b} ＝ ${c2}`}</p>
          <p>所以 c² ＝ {c2}，c ＝ {Number.isInteger(Math.sqrt(c2)) ? Math.sqrt(c2) : `√${c2} ≈ ${fmt(Math.sqrt(c2), 2)}`}。</p>
        </>
      }
    >
      <rect x={o.x} y={o.y} width={side} height={side} className="fill-[#ffe9df] stroke-ink" strokeWidth={2} />
      {(way === "第一種" ? tris1 : tris2).map((t, i) => <polygon key={i} points={t.map(([u, v]) => P(u, v)).join(" ")} className="fill-white stroke-ink" strokeWidth={2} />)}
      {way === "第一種" ? label(L / 2, L / 2, "c²", s * Math.sqrt(c2) > 44) : (<>{label(a / 2, a / 2, "a²", a * s > 36)}{label(a + b / 2, a + b / 2, "b²", b * s > 36)}</>)}
      <text x={o.x + (a * s) / 2} y={o.y + side + 24} textAnchor="middle" className="fill-ink text-[18px] font-bold">a</text>
      <text x={o.x + a * s + (b * s) / 2} y={o.y + side + 24} textAnchor="middle" className="fill-ink text-[18px] font-bold">b</text>
    </FigureFrame>
  );
}

export function InteractiveFigure({ spec }: { spec: FigureSpec }) {
  switch (spec.widget) {
    case "lines": return <Lines spec={spec} />;
    case "quadrant": return <Quadrant spec={spec} />;
    case "parabola": return <Parabola spec={spec} />;
    case "secant": return <Secant spec={spec} />;
    case "riemann": return <Riemann spec={spec} />;
    case "ferris": return <Ferris spec={spec} />;
    case "fraction": return <Fraction spec={spec} />;
    case "barmodel": return <BarModel spec={spec} />;
    case "pythag": return <Pythag spec={spec} />;
  }
}
