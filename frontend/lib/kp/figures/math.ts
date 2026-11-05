/** 互動圖用到的純計算。圖和單元測試共用，數字只在這裡算一次。 */

export interface Line { name: string; a: number; b: number }

/** y = a + b·x */
export const lineY = (line: Line, x: number) => line.a + line.b * x;

/** 兩條直線的交點；平行時回傳 null。 */
export function intersect(p: Line, q: Line): { x: number; y: number } | null {
  if (p.b === q.b) return null;
  const x = (q.a - p.a) / (p.b - q.b);
  return { x, y: lineY(p, x) };
}

/** 象限：軸上回傳 0。 */
export function quadrant(x: number, y: number): 0 | 1 | 2 | 3 | 4 {
  if (x === 0 || y === 0) return 0;
  if (x > 0) return y > 0 ? 1 : 4;
  return y > 0 ? 2 : 3;
}

/** f(t)=t² 從 t0 到 t0+h 的割線斜率。 */
export const secantSlope = (t0: number, h: number) => ((t0 + h) ** 2 - t0 ** 2) / h;

/** v(t)=k·t 在 [0, T] 切 n 段的左和、右和。 */
export function riemann(k: number, T: number, n: number): { left: number; right: number } {
  const dt = T / n;
  let left = 0;
  let right = 0;
  for (let i = 0; i < n; i += 1) {
    left += k * (i * dt) * dt;
    right += k * ((i + 1) * dt) * dt;
  }
  return { left, right };
}

/** 摩天輪：轉 θ 度時離地高度。 */
export const ferrisHeight = (center: number, radius: number, deg: number) => center + radius * Math.sin((deg * Math.PI) / 180);

/** 顯示用：去掉浮點誤差，最多 3 位小數。 */
/** 摩天輪轉了 deg 度時經過幾分鐘；一圈 periodMin 分鐘。 */
export const ferrisMinutes = (deg: number, periodMin: number) => (deg / 360) * periodMin;

/** k/d 和 1/2 比大小，回傳要顯示的符號。 */
export const compareHalf = (k: number, d: number): "＜" | "＝" | "＞" => (2 * k === d ? "＝" : 2 * k > d ? "＞" : "＜");

export function fmt(value: number, digits = 3): string {
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/** 頁面用的數字寫法：負號用「−」。 */
export const sign = (value: number, digits = 3) => fmt(value, digits).replace("-", "−");

// ── Batch 2 ──
export type Vec = [number, number];
export const vecAdd = (u: Vec, v: Vec): Vec => [u[0] + v[0], u[1] + v[1]];
export const vecScale = (k: number, u: Vec): Vec => [k * u[0], k * u[1]];
export const vecLen = (u: number[]) => Math.sqrt(u.reduce((s, c) => s + c * c, 0));

/** 紙厚 base 公分，對摺 n 次後的厚度。 */
export const foldThickness = (base: number, n: number) => base * 2 ** n;
/** 第一次超過 limit 公分要摺幾次。 */
export function foldsToExceed(base: number, limit: number) {
  let n = 0;
  while (foldThickness(base, n) <= limit) n += 1;
  return n;
}

/** 1/2 ＋ 1/4 ＋ … ＋ 1/2ⁿ ＝ (2ⁿ − 1)/2ⁿ，回傳分子分母。 */
export const halvingSum = (n: number) => ({ num: 2 ** n - 1, den: 2 ** n });

/** (x² − 1) ÷ (x − 1)，x ＝ 1 沒有定義。 */
export const holeF = (x: number) => (x === 1 ? Number.NaN : (x * x - 1) / (x - 1));

/** 容量 V 的圓柱罐：表面積、導數、高、最省料半徑。 */
export const canS = (V: number, r: number) => 2 * Math.PI * r * r + (2 * V) / r;
export const canDS = (V: number, r: number) => 4 * Math.PI * r - (2 * V) / (r * r);
export const canH = (V: number, r: number) => V / (Math.PI * r * r);
export const canBestR = (V: number) => Math.cbrt(V / (2 * Math.PI));

/** 每次猜範圍中間（取整數），回傳每一次猜的數。 */
export function binaryGuesses(target: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    out.push(mid);
    if (mid === target) break;
    if (mid < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return out;
}

/** 像素一行：true 是白（1），false 是黑（0）。 */
export const rowCode = (row: boolean[]) => row.map((white) => (white ? "1" : "0")).join("");

/**
 * 覆寫模式：每行永遠是 n 格。打進的 0／1 從變動的位置開始蓋過原本的格子；
 * 刪除（退格、清空）不刪格子、不讓後面的格子往前移，只把游標移到變動的位置。
 */
export function overwriteRow(old: string, raw: string, caret: number): { row: string; caret: number } {
  let start = 0;
  while (start < old.length && start < raw.length && raw[start] === old[start]) start++;
  start = Math.min(start, caret);
  const typed = raw.slice(start, Math.max(start, caret)).replace(/[^01]/g, "").slice(0, old.length - start);
  return { row: old.slice(0, start) + typed + old.slice(start + typed.length), caret: start + typed.length };
}

/* ---------- Batch 3 ---------- */

/** 2 × 2 矩陣 [a, b, c, d]（第一列 a b、第二列 c d）乘上點 (x, y)。 */
export type Mat = [number, number, number, number];
export const matApply = (m: Mat, p: Vec): Vec => [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]];
export const matMul = (m: Mat, n: Mat): Mat => [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3]];
export const ROT90: Mat = [0, -1, 1, 0];
export const SCALE2: Mat = [2, 0, 0, 2];

/** 相似三角形：人高 ÷ 人影 ＝ 旗桿高 ÷ 旗桿影。 */
export const similarHeight = (personH: number, personShadow: number, poleShadow: number) => (poleShadow * personH) / personShadow;

/** 固定種子的骰子模擬（線性同餘），同一個種子每次結果都一樣。 */
export function diceRolls(seed: number, n: number): number[] {
  let s = seed >>> 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out.push(1 + Math.floor((s / 2 ** 32) * 6));
  }
  return out;
}

/** 組合數 C(n, k)。 */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return Math.round(c);
}
/** 公正銅板丟 n 次，至少 k 次正面的種數（分母是 2ⁿ）。 */
export const atLeastCount = (n: number, k: number) => range0(n + 1).filter((j) => j >= k).reduce((s, j) => s + choose(n, j), 0);
const range0 = (n: number) => Array.from({ length: n }, (_, i) => i);

/** 兩個獨立的離散分布相加：回傳 T 的每個值和機率。 */
export function sumDist(a: [number, number][], b: [number, number][]): [number, number][] {
  const m = new Map<number, number>();
  for (const [x, p] of a) for (const [y, q] of b) m.set(x + y, (m.get(x + y) ?? 0) + p * q);
  return [...m.entries()].sort((u, v) => u[0] - v[0]);
}
export const probAtMost = (d: [number, number][], limit: number) => d.filter(([t]) => t <= limit).reduce((s, [, p]) => s + p, 0);
export const mean = (d: [number, number][]) => d.reduce((s, [t, p]) => s + t * p, 0);

/** 牛頓冷卻：T(t) ＝ room ＋ diff × 2^(−t / half)，half 是溫差減半的分鐘數（k ＝ ln 2 ÷ half）。 */
export const cooling = (room: number, diff: number, half: number, t: number) => room + diff * 2 ** (-t / half);
export const coolingTimeTo = (room: number, diff: number, half: number, target: number) => half * Math.log2(diff / (target - room));

/** 火柴棒連排 n 個三角形：回傳每一支的兩端（底邊點 (j, 0)，頂點 (j ＋ 0.5, 1)）。 */
export function matchSticks(n: number): [Vec, Vec][] {
  const b = (j: number): Vec => [j, 0];
  const t = (j: number): Vec => [j + 0.5, 1];
  const out: [Vec, Vec][] = [];
  for (let k = 0; k <= n; k++) out.push(k % 2 === 0 ? [b(k / 2), t(k / 2)] : [t((k - 1) / 2), b((k + 1) / 2)]);
  for (let j = 0; j < Math.ceil(n / 2); j++) out.push([b(j), b(j + 1)]);
  for (let j = 0; j < Math.floor(n / 2); j++) out.push([t(j), t(j + 1)]);
  return out;
}

/** 正方形的對稱：先沿鉛直中線翻 flip 次，再逆時針轉 r × 90 度。 */
export interface Sym { r: 0 | 1 | 2 | 3; flip: boolean }
export const SYM_ID: Sym = { r: 0, flip: false };
export const symRotate = (s: Sym): Sym => ({ r: ((s.r + 1) % 4) as Sym["r"], flip: s.flip });
/** 再沿鉛直中線翻一次：F ∘ R^r ∘ F^f ＝ R^(−r) ∘ F^(f＋1)。 */
export const symFlip = (s: Sym): Sym => ({ r: ((4 - s.r) % 4) as Sym["r"], flip: !s.flip });
export const symApply = (s: Sym, p: Vec): Vec => {
  let q: Vec = s.flip ? [-p[0], p[1]] : p;
  for (let i = 0; i < s.r; i++) q = matApply(ROT90, q);
  return q;
};
const AXES = ["鉛直中線", "\\ 對角線", "水平中線", "/ 對角線"];
export const symName = (s: Sym) => (s.flip ? `沿${AXES[s.r]}翻` : `轉 ${s.r * 90} 度`);
