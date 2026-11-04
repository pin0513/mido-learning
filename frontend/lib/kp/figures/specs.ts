/**
 * 每個知識點的互動圖規格（宣告式）。以 point id 為鍵；頁面「動手看圖」依這裡畫圖。
 * 文字說明（desc）把圖講一遍，不會操作或看不到圖也讀得懂；數字必須和該點原文一致（specs.test.ts 會檢查）。
 */
import type { Line } from "./math";

interface Base {
  id: string;
  title: string;
  /** 圖的文字說明：給螢幕閱讀器，也印在圖下。 */
  desc: string;
  /** 圖說：來源或「數字是示意」。 */
  caption: string;
}

export type FigureSpec =
  | (Base & { widget: "lines"; lines: [Line, Line]; xMax: number; yMax: number; xStep: number; yStep: number; xLabel: string; yLabel: string; xUnit: string; yUnit: string; start: number })
  | (Base & { widget: "quadrant"; range: number; start: [number, number] })
  | (Base & { widget: "parabola"; coefficients: number[]; xs: number[] })
  | (Base & { widget: "secant"; t0: number; hs: number[] })
  | (Base & { widget: "riemann"; k: number; T: number; ns: number[] })
  | (Base & { widget: "ferris"; center: number; radius: number; periodMin: number; stepDeg: number; xLabel: string; minuteTicks: number[] })
  | (Base & { widget: "fraction"; denominators: number[] })
  | (Base & { widget: "barmodel"; fee: number; cost: number; price: number })
  | (Base & { widget: "pythag"; start: [number, number]; max: number });

export const FIGURE_SPECS: Record<string, FigureSpec[]> = {
  "ma.coord@jh": [
    {
      id: "coord-plans",
      widget: "lines",
      title: "兩個方案畫成兩條直線",
      desc: "橫軸是通話分鐘 x，縱軸是月費 y。方案 A：y ＝ 200 ＋ 2x；方案 B：y ＝ 100 ＋ 4x。兩條直線交在 (50, 300)：少於 50 分鐘 B 較便宜，多於 50 分鐘 A 較便宜。",
      caption: "方案是本站整理，數字是示意。",
      lines: [{ name: "方案 A", a: 200, b: 2 }, { name: "方案 B", a: 100, b: 4 }],
      xMax: 100, yMax: 500, xStep: 25, yStep: 100,
      xLabel: "通話（分鐘）", yLabel: "月費（元）", xUnit: "分鐘", yUnit: "元", start: 30,
    },
    {
      id: "coord-quadrant",
      widget: "quadrant",
      title: "拖一個點，讀坐標和象限",
      desc: "平面直角坐標系：橫軸是 x 軸、縱軸是 y 軸，兩軸把平面分成四個象限。右上是第一象限（x、y 都是正），逆時針依序是第二、三、四象限；點在軸上時不屬於任何象限。",
      caption: "象限、縱軸、橫軸依數學領綱 G-7-1。",
      range: 5, start: [3, 2],
    },
  ],
  "ma.quadratic@jh": [
    {
      id: "quad-a",
      widget: "parabola",
      title: "y ＝ ax² 的開口",
      desc: "x 取 −3 到 3。a ＝ 1 時 y 是 9、4、1、0、1、4、9，開口向上、最低點 (0, 0)；a ＝ −1 時每個 y 變成相反數，開口向下、最高點 (0, 0)。a 的絕對值越大，曲線越窄。",
      caption: "表格值同本頁；a 的其他值是本站加的對照。",
      coefficients: [-2, -1, -0.5, 0.5, 1, 2], xs: [-3, -2, -1, 0, 1, 2, 3],
    },
  ],
  "ma.rate@sh": [
    {
      id: "rate-secant",
      widget: "secant",
      title: "割線慢慢變成切線",
      desc: "位置 s ＝ t²。從 t ＝ 1 到 t ＝ 1 ＋ h 的割線斜率是 2 ＋ h：h ＝ 1 時是 3，h ＝ 0.1 時是 2.1，h ＝ 0.01 時是 2.01。h 越小越接近 2，也就是 t ＝ 1 那一瞬間的速度。",
      caption: "示意模型 s ＝ t²，數字同本頁。",
      t0: 1, hs: [1, 0.5, 0.1, 0.01, 0.001],
    },
  ],
  "ma.integral@uni": [
    {
      id: "integral-rects",
      widget: "riemann",
      title: "長方形越切越細",
      desc: "速度 v ＝ 2t，t 從 0 到 2 秒。切 4 段時，用每段開頭的速度估 3 公尺、用結尾的速度估 5 公尺；切 8 段時是 3.5 和 4.5 公尺。準確的距離是三角形面積 4 公尺，夾在兩個估計中間。",
      caption: "示意數字同本頁。",
      k: 2, T: 2, ns: [4, 8, 16, 32],
    },
  ],
  "ma.trig@sh": [
    {
      id: "trig-ferris",
      widget: "ferris",
      title: "車廂轉到哪，高度畫到哪",
      desc: "摩天輪中心離地 12 公尺、半徑 10 公尺，從正右方逆時針轉。離地高度 ＝ 12 ＋ 10 × sin θ：30° 是 17 公尺，90° 是 22 公尺，210° 是 7 公尺，270° 是 2 公尺。橫軸是時間：一圈 8 分鐘，每 2 分鐘轉 90°；高度在 2 到 22 公尺之間上下，畫出來是正弦波，週期 8 分鐘。",
      caption: "摩天輪的數字是示意。",
      center: 12, radius: 10, periodMin: 8, stepDeg: 30, xLabel: "時間（分鐘）", minuteTicks: [0, 2, 4, 6, 8],
    },
  ],
  "ma.fraction@es": [
    {
      id: "fraction-bar",
      widget: "fraction",
      title: "把一條紙平分",
      desc: "同一條紙平分成 2、4、8 份，一份分別是 1/2、1/4、1/8，份數越多每份越小。分成 4 份塗 3 份是 3/4；2/4 和 1/2 塗的長度一樣，所以 2/4 ＝ 1/2。",
      caption: "例子是本站整理。",
      denominators: [2, 4, 8],
    },
  ],
  "ma.algebra@jh": [
    {
      id: "algebra-bars",
      widget: "barmodel",
      title: "用線段圖解 25x ＝ 300 ＋ 15x",
      desc: "收入是 x 杯各 25 元，支出是攤位費 300 元加 x 杯各 15 元。兩條線段都扣掉 15x，剩下 10x ＝ 300，所以 x ＝ 30；驗算兩邊都是 750 元。",
      caption: "數字是示意。",
      fee: 300, cost: 15, price: 25,
    },
  ],
  "ma.pythag@jh": [
    {
      id: "pythag-puzzle",
      widget: "pythag",
      title: "同一個大正方形，兩種擺法",
      desc: "邊長 a ＋ b 的大正方形裡放 4 個兩股 a、b 的直角三角形。第一種擺法空出邊長 c 的正方形，第二種空出邊長 a 和 b 的兩個正方形；空出的面積一樣，所以 c² ＝ a² ＋ b²。例如 a ＝ 3、b ＝ 4 時，9 ＋ 16 ＝ 25 ＝ 5²。",
      caption: "拼圖證明是本站整理。",
      start: [3, 4], max: 8,
    },
  ],
};

export const figureSpecsFor = (pointId: string): FigureSpec[] => FIGURE_SPECS[pointId] ?? [];
