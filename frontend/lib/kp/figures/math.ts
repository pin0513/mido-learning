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
export function fmt(value: number, digits = 3): string {
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/** 頁面用的數字寫法：負號用「−」。 */
export const sign = (value: number, digits = 3) => fmt(value, digits).replace("-", "−");
