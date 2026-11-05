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
  | (Base & { widget: "pixels"; start: string[] })
  | (Base & { widget: "matrix"; shape: [number, number][]; range: number })
  | (Base & { widget: "shadow"; personH: number; personShadow: number; poleShadowMin: number; poleShadowMax: number; start: number })
  | (Base & { widget: "cointree" })
  | (Base & { widget: "dice"; seed: number; maxN: number; step: number; start: number })
  | (Base & { widget: "binomial"; n: number; start: number })
  | (Base & { widget: "sumdist"; a: [number, number][]; b: [number, number][]; deadlines: number[]; start: number })
  | (Base & { widget: "cooling"; room: number; diff: number; data: [number, number][]; halfMin: number; halfMax: number; start: number; target: number })
  | (Base & { widget: "bars"; items: [string, number][]; max: number; unit: string })
  | (Base & { widget: "oddsquare"; maxN: number; start: number })
  | (Base & { widget: "matches"; maxN: number; start: number })
  | (Base & { widget: "dihedral" });

export const FIGURE_SPECS: Record<string, FigureSpec[]> = {
  "ma.linalg@uni": [
    {
      id: "linalg-matrix",
      widget: "matrix",
      title: "同一個 L 形，乘上不同的矩陣",
      desc: "方格紙上的 L 形由 (1, 0)、(0, 0)、(0, 2) 連成。逆時針轉 90 度的矩陣第一列 (0, −1)、第二列 (1, 0)：(1, 0) 變成 (0, 1)，(0, 2) 變成 (−2, 0)。放大 2 倍的矩陣第一列 (2, 0)、第二列 (0, 2)；先轉再放大，等於乘上兩個矩陣的乘積。",
      caption: "數字是示意，本站整理。",
      shape: [[1, 0], [0, 0], [0, 2]], range: 4,
    },
  ],
  "ma.similar@jh": [
    {
      id: "similar-shadow",
      widget: "shadow",
      title: "量影子，算旗桿高",
      desc: "同一時間，身高 160 公分的人影長 120 公分。太陽光可看成平行，人和旗桿都垂直地面，兩個三角形相似，高和影長的比相同：旗桿影長 6 公尺時，旗桿高 6 × 160 ÷ 120 ＝ 8 公尺。拉動旗桿影長，高度跟著按同一個比例變。",
      caption: "數字是示意，本站整理。",
      personH: 1.6, personShadow: 1.2, poleShadowMin: 1, poleShadowMax: 9, start: 6,
    },
  ],
  "ma.prob@jh": [
    {
      id: "prob-tree",
      widget: "cointree",
      title: "兩枚銅板的樹狀圖",
      desc: "第一枚銅板正或反，第二枚也是正或反，樹狀圖畫出兩層共 4 種結果，每種機會相同。兩枚都正面只有 1 種，機率是 1/2 × 1/2 ＝ 1/4。",
      caption: "本站整理。",
    },
    {
      id: "prob-dice",
      widget: "dice",
      title: "擲越多次，相對次數越接近 1/6",
      desc: "相對次數 ＝ 次數 ÷ 總次數。拉動擲的次數，看 6 點出現幾次、相對次數是多少；擲得越多，相對次數通常越接近 1/6 ≈ 0.167。前面擲出什麼，不會改變下一次的機率。",
      caption: "擲骰結果是電腦用固定亂數種子模擬的示意，不是真實紀錄。",
      seed: 20261105, maxN: 60, step: 6, start: 60,
    },
  ],
  "ma.stats@sh": [
    {
      id: "stats-binomial",
      widget: "binomial",
      title: "公正銅板丟 10 次，正面幾次",
      desc: "假設銅板公正，丟 10 次的結果共 2¹⁰ ＝ 1,024 種，剛好 k 次正面有 C(10, k) 種。9 次以上正面有 10 ＋ 1 ＝ 11 種，機率 11/1,024，約 1%：很少見，讓公正的說法值得懷疑，但不是證明它錯。",
      caption: "數字是示意。",
      n: 10, start: 9,
    },
  ],
  "ma.probmodel@uni": [
    {
      id: "probmodel-sum",
      widget: "sumdist",
      title: "總天數 T ＝ A ＋ B 的分布",
      desc: "A 是 2 或 3 天，各 1/2；B 是 1、2 或 3 天，各 1/3；兩者獨立。T 的分布是 3 天 1/6、4 天 1/3、5 天 1/3、6 天 1/6，平均 E(T) ＝ 4.5 天。期限 5 天時準時的機率是 5/6 ≈ 83%；期限放寬到 6 天，準時的機率就是 1。",
      caption: "數字是示意，本站整理。",
      a: [[2, 1 / 2], [3, 1 / 2]], b: [[1, 1 / 3], [2, 1 / 3], [3, 1 / 3]], deadlines: [4, 5, 6], start: 5,
    },
  ],
  "ma.diffeq@uni": [
    {
      id: "diffeq-cooling",
      widget: "cooling",
      title: "熱水冷卻：溫差每隔同樣時間乘同一個倍數",
      desc: "室溫 25°C，牛頓冷卻定律 dT/dt ＝ −k(T − 25) 的解是 T ＝ 25 ＋ 60 × e^(−kt)。示意數據 85、77.2、70.5、64.6、59.5、55°C 是每 2 分鐘記一次，溫差 10 分鐘剛好減半，所以 k ＝ ln 2 ÷ 10 ≈ 0.069；降到 40°C 時溫差 15，是 60 的四分之一，要 20 分鐘。拉動「溫差減半要幾分鐘」，看曲線和數據合不合。",
      caption: "數據是示意。",
      room: 25, diff: 60, data: [[0, 85], [2, 77.2], [4, 70.5], [6, 64.6], [8, 59.5], [10, 55]], halfMin: 4, halfMax: 20, start: 10, target: 40,
    },
  ],
  "ma.data@es": [
    {
      id: "data-fruit",
      widget: "bars",
      title: "最喜歡的水果長條圖",
      desc: "一格代表 1 票，長條越高票越多：蘋果 9 票、葡萄 7 票、香蕉 5 票、芭樂 0 票。芭樂 0 票也要在橫軸寫出來，只是長條高度是 0。按加減改票數，長條跟著變。",
      caption: "票數是示意。",
      items: [["蘋果", 9], ["葡萄", 7], ["香蕉", 5], ["芭樂", 0]], max: 12, unit: "票",
    },
  ],
  "ma.proof@sh": [
    {
      id: "proof-odd",
      widget: "oddsquare",
      title: "前 n 個奇數的和是 n²",
      desc: "1 ＝ 1²，1 ＋ 3 ＝ 2²，1 ＋ 3 ＋ 5 ＝ 3²。k × k 的正方形外面補一圈 L 形的 2k ＋ 1 塊，就變成 (k ＋ 1) × (k ＋ 1)。這是歸納法第二步的圖；只看幾個例子還不夠，要兩步都寫出來才是證明。",
      caption: "本站整理。",
      maxN: 8, start: 4,
    },
  ],
  "ma.pattern@es": [
    {
      id: "pattern-matches",
      widget: "matches",
      title: "火柴棒排三角形",
      desc: "火柴棒連著排三角形：1 個三角形 3 支、2 個 5 支、3 個 7 支、4 個 9 支，第 5 個要 11 支。第一個用 3 支，之後每多一個三角形，只要再加 2 支，因為有一邊和前一個共用。",
      caption: "支數依課程手冊的火柴棒例子。",
      maxN: 6, start: 4,
    },
  ],
  "ma.beauty@uni": [
    {
      id: "beauty-square",
      widget: "dihedral",
      title: "正方形的 8 種對稱",
      desc: "正方形可以轉 0、90、180、270 度，共 4 種；也可以沿兩條對角線、兩條對邊中點的連線翻，共 4 種，合起來 8 種。按「轉 90 度」和「左右翻」接連做，結果一定還是這 8 種之一；先轉 90 度再轉 90 度等於轉 180 度，沿同一條線翻兩次等於不動。",
      caption: "依 Judson 的書，本站整理。",
    },
  ],
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
