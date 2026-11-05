"use client";

import { useState } from "react";
import type { FigureSpec } from "@/lib/kp/figures/specs";
import {
  SCALE2, ROT90, SYM_ID, atLeastCount, choose, cooling, coolingTimeTo, diceRolls, fmt, matApply, matMul, matchSticks, mean, probAtMost,
  sign, similarHeight, sumDist, symApply, symFlip, symName, symRotate, type Mat, type Sym, type Vec,
} from "@/lib/kp/figures/math";
import { Axes, Choices, FigureFrame, PlotClip, Slider, range, scale } from "./parts";

const W = 480;
const H = 340;
const M = { l: 64, r: 24, t: 40, b: 64 };
type Of<K extends FigureSpec["widget"]> = Extract<FigureSpec, { widget: K }>;
const pt = (p: Vec) => `(${sign(p[0])}, ${sign(p[1])})`;
/** 長條圖的橫軸刻度：前後各多半格，縱軸才不會壓在第一條長條上。 */
const padTicks = (ts: number[]) => [ts[0] - 0.5, ...ts, ts[ts.length - 1] + 0.5];
const intLabel = (f: (t: number) => string) => (t: number) => (Number.isInteger(t) ? f(t) : "");
const pct = (p: number) => `${fmt(p * 100, 1)}%`;

const MATS: Record<string, Mat | null> = {
  原圖: null,
  "轉 90 度": ROT90,
  "放大 2 倍": SCALE2,
  先轉再放大: matMul(SCALE2, ROT90),
};
const MAT_KEYS = Object.keys(MATS) as (keyof typeof MATS)[];

function Matrix({ spec }: { spec: Of<"matrix"> }) {
  const [key, setKey] = useState<string>("轉 90 度");
  const m = MATS[key];
  const n = spec.range;
  const size = H - M.t - 30;
  const left = (W - size) / 2;
  const x = scale(-n, n, left, left + size);
  const y = scale(-n, n, M.t + size - 10, M.t - 10);
  const before = spec.shape as Vec[];
  const after = m ? before.map((p) => matApply(m, p)) : before;
  const poly = (ps: Vec[]) => ps.map((p) => `${x(p[0])},${y(p[1])}`).join(" ");
  const clip = `${spec.id}-plot`;
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={<Choices label="乘上哪個矩陣" options={MAT_KEYS} value={key} onChange={setKey} />}
      readout={
        <>
          {m ? <p>矩陣第一列 ({sign(m[0])}, {sign(m[1])})、第二列 ({sign(m[2])}, {sign(m[3])})</p> : <p>還沒乘矩陣</p>}
          <p className="font-bold">{before.map((p, i) => `${pt(p)} → ${pt(after[i])}`).join("，")}</p>
        </>
      }
    >
      <Axes x={x} y={y} xTicks={range(-n, n, 1)} yTicks={range(-n, n, 1)} fmtX={(t) => (t % 2 === 0 && t !== 0 ? sign(t) : "")} fmtY={(t) => (t % 2 === 0 && t !== 0 && t !== -n ? sign(t) : "")} />
      <PlotClip id={clip} x0={x(-n)} y0={y(-n)} x1={x(n)} y1={y(n)} />
      <g clipPath={`url(#${clip})`}>
        <polyline points={poly(before)} fill="none" className="stroke-[#6b645c]" strokeWidth={4} strokeDasharray="8 5" />
        <polyline points={poly(after)} fill="none" className="stroke-accent-deep" strokeWidth={5} strokeLinejoin="round" />
        {after.map((p, i) => <circle key={i} cx={x(p[0])} cy={y(p[1])} r={5} className="fill-accent-deep" />)}
      </g>
    </FigureFrame>
  );
}

function Shadow({ spec }: { spec: Of<"shadow"> }) {
  const [s, setS] = useState(spec.start);
  const h = similarHeight(spec.personH, spec.personShadow, s);
  const maxH = similarHeight(spec.personH, spec.personShadow, spec.poleShadowMax);
  const x = scale(0, spec.poleShadowMax + 4, M.l, W - M.r);
  const y = scale(0, Math.ceil(maxH), H - M.b, M.t);
  const clip = `${spec.id}-plot`;
  const tri = (x0: number, hh: number, sh: number) => `${x(x0)},${y(0)} ${x(x0)},${y(hh)} ${x(x0 + sh)},${y(0)}`;
  const poleX = 3;
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={<Slider label="旗桿影長（公尺）" value={s} min={spec.poleShadowMin} max={spec.poleShadowMax} step={0.5} onChange={setS} display={`${fmt(s, 1)} 公尺`} />}
      readout={
        <>
          <p>人：高 {fmt(spec.personH * 100)} 公分，影長 {fmt(spec.personShadow * 100)} 公分</p>
          <p className="font-bold">旗桿高 ＝ {fmt(s, 1)} × {fmt(spec.personH * 100)} ÷ {fmt(spec.personShadow * 100)} ＝ {fmt(h, 2)} 公尺</p>
        </>
      }
    >
      <Axes x={x} y={y} xTicks={range(0, spec.poleShadowMax + 4, 1)} yTicks={range(0, Math.ceil(maxH), 2)} fmtX={(t) => (t % 2 === 0 ? String(t) : "")} xLabel="公尺" yLabel="高（公尺）" />
      <PlotClip id={clip} x0={x(0)} y0={y(0)} x1={x(spec.poleShadowMax + 4)} y1={y(Math.ceil(maxH))} />
      <g clipPath={`url(#${clip})`}>
        <polygon points={tri(0.5, spec.personH, spec.personShadow)} className="fill-[#f3d9cc] stroke-ink" strokeWidth={2} />
        <polygon points={tri(poleX, h, s)} className="fill-[#f3d9cc]/60 stroke-accent-deep" strokeWidth={3} />
        <line x1={x(poleX)} x2={x(poleX)} y1={y(0)} y2={y(h)} className="stroke-ink" strokeWidth={5} />
      </g>
    </FigureFrame>
  );
}

const OUTCOMES = ["正正", "正反", "反正", "反反"] as const;
function CoinTree({ spec }: { spec: Of<"cointree"> }) {
  const [pick, setPick] = useState<(typeof OUTCOMES)[number]>("正正");
  const root: Vec = [60, 170];
  const mid = (i: number): Vec => [210, 90 + 160 * i];
  const leaf = (i: number): Vec => [360, 50 + 80 * i];
  const on = (a: string) => pick.startsWith(a);
  const edge = (p: Vec, q: Vec, hot: boolean, label: string, key: string) => (
    <g key={key}>
      <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} className={hot ? "stroke-accent-deep" : "stroke-[#8a8178]"} strokeWidth={hot ? 4 : 2} />
      <text x={(p[0] + q[0]) / 2} y={(p[1] + q[1]) / 2 - 10} textAnchor="middle" className="fill-[#3d3830] text-[18px]">{label}</text>
    </g>
  );
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={<Choices label="看哪一種結果" options={OUTCOMES} value={pick} onChange={setPick} />}
      readout={<p className="font-bold">P({pick}) ＝ 1/2 × 1/2 ＝ 1/4，4 種結果機會相同</p>}
    >
      {[0, 1].map((i) => edge(root, mid(i), on(i ? "反" : "正"), "1/2", `m${i}`))}
      {[0, 1, 2, 3].map((j) => edge(mid(j >> 1), leaf(j), pick === OUTCOMES[j], "1/2", `l${j}`))}
      <circle cx={root[0]} cy={root[1]} r={8} className="fill-ink" />
      {[0, 1].map((i) => <text key={i} x={mid(i)[0]} y={mid(i)[1] + 6} textAnchor="middle" className="fill-ink font-bold text-[18px]" stroke="white" strokeWidth={6} paintOrder="stroke">{i ? "反" : "正"}</text>)}
      {OUTCOMES.map((o, j) => <text key={o} x={leaf(j)[0] + 14} y={leaf(j)[1] + 6} className={`text-[18px] font-bold ${pick === o ? "fill-accent-deep" : "fill-ink"}`}>{o}</text>)}
      <text x={60} y={30} className="fill-[#3d3830] text-[18px]">第一枚</text>
      <text x={250} y={30} className="fill-[#3d3830] text-[18px]">第二枚</text>
    </FigureFrame>
  );
}

function Dice({ spec }: { spec: Of<"dice"> }) {
  const [n, setN] = useState(spec.start);
  const rolls = diceRolls(spec.seed, n);
  const counts = [1, 2, 3, 4, 5, 6].map((f) => rolls.filter((r) => r === f).length);
  const yMax = Math.max(4, Math.ceil(Math.max(...diceRolls(spec.seed, spec.maxN).reduce((c, r) => { c[r - 1]++; return c; }, [0, 0, 0, 0, 0, 0])) / 2) * 2);
  const x = scale(0.5, 6.5, M.l, W - M.r);
  const y = scale(0, yMax, H - M.b, M.t);
  const clip = `${spec.id}-plot`;
  const six = counts[5];
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={<Slider label="擲幾次" value={n} min={spec.step} max={spec.maxN} step={spec.step} onChange={setN} display={`${n} 次`} />}
      readout={
        <>
          <p>6 點出現 {six} 次</p>
          <p className="font-bold">相對次數 ＝ {six} ÷ {n} ≈ {fmt(six / n, 3)}（理論 1/6 ≈ 0.167）</p>
        </>
      }
    >
      <Axes x={x} y={y} zeroAxes={false} xTicks={padTicks([1, 2, 3, 4, 5, 6])} fmtX={intLabel(String)} yTicks={range(0, yMax, 2)} xLabel="點數" yLabel="次數" />
      <PlotClip id={clip} x0={x(0.5)} y0={y(0)} x1={x(6.5)} y1={y(yMax)} />
      <g clipPath={`url(#${clip})`}>
        {counts.map((c, i) => <rect key={i} x={x(i + 1) - 18} y={y(c)} width={36} height={y(0) - y(c)} className={i === 5 ? "fill-accent-deep" : "fill-[#c0bab2]"} />)}
        <line x1={x(0.5)} x2={x(6.5)} y1={y(n / 6)} y2={y(n / 6)} className="stroke-ink" strokeWidth={2} strokeDasharray="6 4" />
      </g>
    </FigureFrame>
  );
}

function Binomial({ spec }: { spec: Of<"binomial"> }) {
  const [k, setK] = useState(spec.start);
  const total = 2 ** spec.n;
  const ways = range(0, spec.n, 1).map((j) => choose(spec.n, j));
  const top = Math.ceil(Math.max(...ways) / 50) * 50;
  const x = scale(-0.5, spec.n + 0.5, M.l, W - M.r);
  const y = scale(0, top, H - M.b, M.t);
  const tail = atLeastCount(spec.n, k);
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={<Slider label="正面至少幾次" value={k} min={0} max={spec.n} step={1} onChange={setK} display={`${k} 次`} />}
      readout={
        <>
          <p>{range(k, spec.n, 1).map((j) => choose(spec.n, j)).join(" ＋ ")} ＝ {tail} 種</p>
          <p className="font-bold">P(至少 {k} 次正面) ＝ {tail}/{total.toLocaleString("en-US")} ≈ {pct(tail / total)}</p>
        </>
      }
    >
      <Axes x={x} y={y} zeroAxes={false} xTicks={padTicks(range(0, spec.n, 1))} fmtX={intLabel((t) => (t % 2 === 0 ? String(t) : ""))} yTicks={range(0, top, 50)} fmtY={(t) => (t % 100 === 0 ? String(t) : "")} xLabel="正面次數" yLabel="種數" />
      {ways.map((w, j) => <rect key={j} x={x(j) - 12} y={y(w)} width={24} height={Math.max(0, y(0) - y(w))} className={j >= k ? "fill-accent-deep" : "fill-[#c0bab2]"} />)}
    </FigureFrame>
  );
}

function SumDist({ spec }: { spec: Of<"sumdist"> }) {
  const [d, setD] = useState(spec.start);
  const dist = sumDist(spec.a, spec.b);
  const ts = dist.map(([t]) => t);
  const x = scale(ts[0] - 0.5, ts[ts.length - 1] + 0.5, M.l, W - M.r);
  const y = scale(0, 0.4, H - M.b, M.t);
  const p = probAtMost(dist, d);
  const sixths = (q: number) => `${Math.round(q * 6)}/6`;
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={<Choices label="期限幾天" options={spec.deadlines} value={d} onChange={setD} render={(v) => `${v} 天`} />}
      readout={
        <>
          <p>{dist.map(([t, q]) => `${t} 天 ${sixths(q)}`).join("、")}；平均 {fmt(mean(dist), 2)} 天</p>
          <p className="font-bold">期限 {d} 天準時的機率 ＝ {sixths(p)} ≈ {pct(p)}</p>
        </>
      }
    >
      <Axes x={x} y={y} zeroAxes={false} xTicks={padTicks(ts)} fmtX={intLabel(String)} yTicks={[0, 0.1, 0.2, 0.3, 0.4]} xLabel="總天數 T" yLabel="機率" />
      {dist.map(([t, q]) => <rect key={t} x={x(t) - 26} y={y(q)} width={52} height={y(0) - y(q)} className={t <= d ? "fill-accent-deep" : "fill-[#c0bab2]"} />)}
    </FigureFrame>
  );
}

function Cooling({ spec }: { spec: Of<"cooling"> }) {
  const [half, setHalf] = useState(spec.start);
  const tMax = 30;
  const x = scale(0, tMax, M.l, W - M.r);
  const y = scale(20, 90, H - M.b, M.t);
  const path = range(0, tMax, 0.5).map((t, i) => `${i ? "L" : "M"}${x(t).toFixed(1)},${y(cooling(spec.room, spec.diff, half, t)).toFixed(1)}`).join("");
  const when = coolingTimeTo(spec.room, spec.diff, half, spec.target);
  const clip = `${spec.id}-plot`;
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={<Slider label="溫差減半要幾分鐘" value={half} min={spec.halfMin} max={spec.halfMax} step={1} onChange={setHalf} display={`${half} 分`} />}
      readout={
        <>
          <p>k ＝ ln 2 ÷ {half} ≈ {fmt(Math.LN2 / half, 3)}</p>
          <p className="font-bold">降到 {spec.target}°C 要 {fmt(when, 1)} 分鐘</p>
        </>
      }
    >
      <Axes x={x} y={y} xTicks={range(0, tMax, 5)} yTicks={range(20, 90, 10)} fmtY={(t) => (t % 20 === 0 ? String(t) : "")} xLabel="分鐘" yLabel="溫度（°C）" />
      <PlotClip id={clip} x0={x(0)} y0={y(20)} x1={x(tMax)} y1={y(90)} />
      <g clipPath={`url(#${clip})`}>
        <line x1={x(0)} x2={x(tMax)} y1={y(spec.target)} y2={y(spec.target)} className="stroke-[#8a8178]" strokeWidth={2} strokeDasharray="6 4" />
        <path d={path} fill="none" className="stroke-accent-deep" strokeWidth={3} />
        {spec.data.map(([t, v]) => <circle key={t} cx={x(t)} cy={y(v)} r={5} className="fill-ink" />)}
      </g>
    </FigureFrame>
  );
}

function Bars({ spec }: { spec: Of<"bars"> }) {
  const [votes, setVotes] = useState(spec.items.map(([, v]) => v));
  const x = scale(-0.5, spec.items.length - 0.5, M.l, W - M.r);
  const y = scale(0, spec.max, H - M.b, M.t);
  const bump = (i: number, d: number) => setVotes(votes.map((v, j) => (j === i ? Math.min(spec.max, Math.max(0, v + d)) : v)));
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={H}
      controls={
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
          {spec.items.map(([name], i) => (
            <div key={name} role="group" aria-label={`${name}的票數`} className="flex items-center gap-2 text-sm font-bold">
              <span className="w-10 shrink-0">{name}</span>
              <button type="button" aria-label={`${name}減 1 票`} onClick={() => bump(i, -1)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-ink text-base">−</button>
              <span className="w-12 whitespace-nowrap text-center tabular-nums">{votes[i]} {spec.unit}</span>
              <button type="button" aria-label={`${name}加 1 票`} onClick={() => bump(i, 1)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-ink text-base">＋</button>
            </div>
          ))}
        </div>
      }
      readout={<p className="font-bold">{spec.items.map(([name], i) => `${name} ${votes[i]} ${spec.unit}`).join("、")}，共 {votes.reduce((s, v) => s + v, 0)} {spec.unit}</p>}
    >
      <Axes x={x} y={y} zeroAxes={false} xTicks={padTicks(spec.items.map((_, i) => i))} yTicks={range(0, spec.max, 1)} fmtX={intLabel((i) => spec.items[i]?.[0] ?? "")} fmtY={(t) => (t % 2 === 0 ? String(t) : "")} yLabel={`${spec.unit}數`} />
      {votes.map((v, i) => <rect key={i} x={x(i) - 28} y={y(v)} width={56} height={y(0) - y(v)} className="fill-accent-deep" />)}
    </FigureFrame>
  );
}

function OddSquare({ spec }: { spec: Of<"oddsquare"> }) {
  const [n, setN] = useState(spec.start);
  const cell = Math.floor(280 / spec.maxN);
  const left = (W - spec.maxN * cell) / 2;
  const top = 20;
  const odds = range(1, n, 1).map((k) => 2 * k - 1);
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={spec.maxN * cell + 40}
      controls={<Slider label="前幾個奇數 n" value={n} min={1} max={spec.maxN} step={1} onChange={setN} display={`n ＝ ${n}`} />}
      readout={
        <>
          <p>{odds.join(" ＋ ")} ＝ {n * n}</p>
          <p className="font-bold">＝ {n}²；最外圈 L 形是 2 × {n} − 1 ＝ {2 * n - 1} 塊</p>
        </>
      }
    >
      {range(0, n - 1, 1).flatMap((r) =>
        range(0, n - 1, 1).map((c) => (
          <rect key={`${r}-${c}`} x={left + c * cell} y={top + r * cell} width={cell} height={cell} className={Math.max(r, c) === n - 1 && n > 1 ? "fill-accent-deep stroke-white" : "fill-[#c0bab2] stroke-white"} strokeWidth={2} />
        )),
      )}
    </FigureFrame>
  );
}

function Matches({ spec }: { spec: Of<"matches"> }) {
  const [n, setN] = useState(spec.start);
  const sticks = matchSticks(n);
  const unit = Math.min(110, (W - 40) / ((spec.maxN + 1) / 2));
  const left = 20;
  const base = 150;
  const px = (p: Vec): Vec => [left + p[0] * unit, base - p[1] * unit * 0.87];
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={180}
      controls={<Slider label="排幾個三角形" value={n} min={1} max={spec.maxN} step={1} onChange={setN} display={`${n} 個`} />}
      readout={<p className="font-bold">{n} 個三角形用 3 ＋ 2 × {n - 1} ＝ {sticks.length} 支</p>}
    >
      {sticks.map(([p, q], i) => {
        const [a, b] = [px(p), px(q)];
        return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="stroke-[#a8641e]" strokeWidth={6} strokeLinecap="round" />;
      })}
    </FigureFrame>
  );
}

const CORNERS: Vec[] = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
const CORNER_COLORS = ["fill-accent-deep", "fill-ink", "fill-[#3f7a5a]", "fill-[#2f5d8a]"];
function Dihedral({ spec }: { spec: Of<"dihedral"> }) {
  const [s, setS] = useState<Sym>(SYM_ID);
  const [seen, setSeen] = useState<string[]>([symName(SYM_ID)]);
  const go = (next: Sym) => {
    setS(next);
    if (!seen.includes(symName(next))) setSeen([...seen, symName(next)]);
  };
  const c = W / 2;
  const mid = 150;
  const k = 90;
  const at = (p: Vec): Vec => [c + p[0] * k, mid - p[1] * k];
  return (
    <FigureFrame
      {...spec}
      width={W}
      height={300}
      controls={
        <div role="group" aria-label="對正方形做什麼" className="flex flex-wrap gap-2">
          {[
            ["轉 90 度", () => go(symRotate(s))],
            ["左右翻", () => go(symFlip(s))],
            ["回到原位", () => setS(SYM_ID)],
          ].map(([label, act]) => (
            <button key={label as string} type="button" onClick={act as () => void} className="inline-flex min-h-11 items-center justify-center rounded-full border border-ink px-4 text-sm font-bold">
              {label as string}
            </button>
          ))}
        </div>
      }
      readout={
        <>
          <p className="font-bold">現在等於：{symName(s)}</p>
          <p>已經找到 {seen.length} / 8 種</p>
        </>
      }
    >
      <rect x={c - k} y={mid - k} width={2 * k} height={2 * k} className="fill-[#f3f0ea] stroke-[#c0bab2]" strokeWidth={2} strokeDasharray="6 4" />
      <polygon points={CORNERS.map((p) => at(symApply(s, p)).join(",")).join(" ")} className="fill-[#f3d9cc] stroke-ink" strokeWidth={3} />
      {CORNERS.map((p, i) => {
        const [qx, qy] = at(symApply(s, p));
        return (
          <g key={i}>
            <circle cx={qx} cy={qy} r={16} className={CORNER_COLORS[i]} />
            <text x={qx} y={qy + 6} textAnchor="middle" className="fill-white text-[18px] font-bold">{i + 1}</text>
          </g>
        );
      })}
    </FigureFrame>
  );
}

export function InteractiveFigure3({ spec }: { spec: FigureSpec }) {
  switch (spec.widget) {
    case "matrix": return <Matrix spec={spec} />;
    case "shadow": return <Shadow spec={spec} />;
    case "cointree": return <CoinTree spec={spec} />;
    case "dice": return <Dice spec={spec} />;
    case "binomial": return <Binomial spec={spec} />;
    case "sumdist": return <SumDist spec={spec} />;
    case "cooling": return <Cooling spec={spec} />;
    case "bars": return <Bars spec={spec} />;
    case "oddsquare": return <OddSquare spec={spec} />;
    case "matches": return <Matches spec={spec} />;
    case "dihedral": return <Dihedral spec={spec} />;
    default: return null;
  }
}
