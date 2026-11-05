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
