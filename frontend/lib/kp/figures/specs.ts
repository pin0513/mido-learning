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
  | (Base & { widget: "pythag"; start: [number, number]; max: number })
  | (Base & { widget: "vector"; u: [number, number]; v: [number, number]; ks: number[]; range: [number, number] })
  | (Base & { widget: "doubling"; base: number; maxN: number; start: number; limitCm: number })
  | (Base & { widget: "halving"; maxN: number; start: number })
  | (Base & { widget: "hole"; xs: number[] })
  | (Base & { widget: "can"; volume: number; rMin: number; rMax: number; sMax: number; start: number })
  | (Base & { widget: "bsearch"; lo: number; hi: number; start: number })
  | (Base & { widget: "pixels"; start: string[] });

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
  "ma.vector@sh": [
    {
      id: "vector-add",
      widget: "vector",
      title: "向量頭接尾，相加看位移",
      desc: "u 是往東 3 格 (3, 0)，v 是往北 4 格 (0, 4)。把 v 的尾巴接在 u 的頭，從起點指到終點的就是 u ＋ v ＝ (3, 4)，長度 √(9 ＋ 16) ＝ 5。乘 2 倍得到 (6, 8)，方向不變、長度變成 10。",
      caption: "地磚格數是示意。",
      u: [3, 0], v: [0, 4], ks: [1, 2], range: [-2, 10],
    },
  ],
  "ma.function@sh": [
    {
      id: "function-fold",
      widget: "doubling",
      title: "對摺一次，厚度乘 2",
      desc: "紙厚 0.01 公分，摺 n 次厚度是 0.01 × 2ⁿ 公分。摺 10 次是 10.24 公分；摺 23 次約 838 公尺，摺 24 次約 1,678 公尺，第一次超過 1 公里。一般刻度前面幾乎貼著橫軸、最後突然衝高；對數刻度上每摺一次升高一樣多，變成一直線。",
      caption: "紙厚是課程手冊的示意數字。",
      base: 0.01, maxN: 24, start: 10, limitCm: 100000,
    },
  ],
  "ma.sequence@sh": [
    {
      id: "sequence-halves",
      widget: "halving",
      title: "一直剪一半，加起來不會超過一張紙",
      desc: "第一刀留下 1/2，第二刀 1/4，第三刀 1/8，排成一列。剪 5 次的總和是 31/32，還差 1/32；剪 n 次的總和是 1 − 1/2ⁿ，空白一直變小，但永遠不會超過一整張紙。",
      caption: "本站整理。",
      maxN: 10, start: 5,
    },
  ],
  "ma.limit@uni": [
    {
      id: "limit-hole",
      widget: "hole",
      title: "x 靠近 1，f(x) 靠近 2",
      desc: "f(x) ＝ (x² − 1) ÷ (x − 1)，x ≠ 1 時等於 x ＋ 1，圖是一條直線，但在 x ＝ 1 有一個洞。x ＝ 0.9、0.99、0.999 時 f(x) 是 1.9、1.99、1.999；x ＝ 1.1、1.01、1.001 時是 2.1、2.01、2.001。和 2 的差剛好等於 x 和 1 的差。",
      caption: "數字是示意，本站整理。",
      xs: [0.9, 0.99, 0.999, 1.001, 1.01, 1.1],
    },
  ],
  "ma.derivative@uni": [
    {
      id: "derivative-can",
      widget: "can",
      title: "半徑多少，罐子最省料",
      desc: "裝 350 立方公分的圓柱罐，表面積 S(r) ＝ 2πr² ＋ 700 ÷ r。r ＝ 3 時 S ≈ 289.9，r ＝ 5 時 S ≈ 297.1；導數為 0 的 r ≈ 3.82 公分時最小，S ≈ 274.9、h ≈ 7.64 公分。虛線是那一點的切線，斜率就是導數。",
      caption: "數字是示意，本站整理。",
      volume: 350, rMin: 1, rMax: 8, sMax: 800, start: 3,
    },
  ],
  "it.algo@jh": [
    {
      id: "algo-bsearch",
      widget: "bsearch",
      title: "每次猜中間，範圍少一半",
      desc: "家長心裡想一個 1 到 100 的數，孩子每次猜範圍的中間，家長只說太大或太小。每猜一次，剩下的數最多只有一半；1 到 100 的任何一個數，最多 7 次就猜中。",
      caption: "7 次是本站整理。",
      lo: 1, hi: 100, start: 37,
    },
  ],
  "it.data@es": [
    {
      id: "data-pixels",
      widget: "pixels",
      title: "一行數字，畫出一行像素",
      desc: "8 × 8 的方格，1 代表白、0 代表黑。每一行寫成 8 個 0 或 1，只看數字就能把圖畫回來；改一個數字，圖上就有一格變色，點圖上的格子也會改數字。",
      caption: "規則依 CS Unplugged，圖案是示意。",
      start: ["11111111", "11000011", "10111101", "01011010", "01111110", "01011010", "10100101", "11000011"],
    },
  ],
};

export const figureSpecsFor = (pointId: string): FigureSpec[] => FIGURE_SPECS[pointId] ?? [];
