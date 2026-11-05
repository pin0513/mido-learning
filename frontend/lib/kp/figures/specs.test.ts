import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { binaryGuesses, canBestR, canDS, canH, canS, foldThickness, foldsToExceed, halvingSum, holeF, rowCode, vecAdd, vecLen, vecScale, compareHalf, ferrisHeight, ferrisMinutes, intersect, quadrant, riemann, secantSlope } from "./math";
import { FIGURE_SPECS } from "./specs";

// lib/content 是 server-only，測試直接讀原始 YAML。
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../content/knowledge");
const FOLDERS = ["math", "it-ai", "pm-leadership", "philosophy", "soft-skills", "language"];
const text = (id: string) => {
  const [concept, stage] = id.split("@");
  const file = FOLDERS.map((folder) => join(ROOT, folder, concept, `${stage}.yaml`)).find(existsSync) ?? "";
  assert.ok(existsSync(file), `${id} 不在目錄`);
  return readFileSync(file, "utf8");
};
const spec = <K extends string>(id: string, widget: K) => {
  const found = FIGURE_SPECS[id]?.find((item) => item.widget === widget);
  assert.ok(found, `${id} 沒有 ${widget}`);
  return found as Extract<(typeof FIGURE_SPECS)[string][number], { widget: K }>;
};

test("每個規格都對到已發布的知識點，圖 id 不重複，說明不用羅馬數字", () => {
  const ids = new Set<string>();
  for (const [pointId, specs] of Object.entries(FIGURE_SPECS)) {
    assert.match(text(pointId), /^status: published$/m, pointId);
    for (const item of specs) {
      assert.ok(!ids.has(item.id), item.id);
      ids.add(item.id);
      for (const field of [item.title, item.desc, item.caption]) {
        assert.ok(field.length > 0);
        assert.doesNotMatch(field, /\b(?:II|III|IV|VI)\b|[ⅠⅡⅢⅣⅤ]/, `${item.id} 用了羅馬數字`);
        assert.doesNotMatch(field, /『[^』]*「/, `${item.id} 引號層次錯`);
      }
    }
  }
});

test("ma.coord：交點 (50, 300) 和原文一致", () => {
  const s = spec("ma.coord@jh", "lines");
  const [A, B] = s.lines;
  assert.deepEqual(intersect(A, B), { x: 50, y: 300 });
  const t = text("ma.coord@jh");
  for (const piece of ["y ＝ 200 ＋ 2x", "y ＝ 100 ＋ 4x", "(50, 300)", "A 是 200、300、400，B 是 100、300、500"]) assert.ok(t.includes(piece), piece);
  assert.ok(Math.max(A.a + A.b * s.xMax, B.a + B.b * s.xMax) <= s.yMax, "線不能超出縱軸");
  assert.equal(quadrant(3, 2), 1);
  assert.equal(quadrant(-3, 2), 2);
  assert.equal(quadrant(-3, -2), 3);
  assert.equal(quadrant(3, -2), 4);
  assert.equal(quadrant(0, 2), 0);
});

test("ma.quadratic：表格值", () => {
  const s = spec("ma.quadratic@jh", "parabola");
  assert.equal(s.xs.map((x) => x * x).join("、"), "9、4、1、0、1、4、9");
  assert.ok(text("ma.quadratic@jh").includes("y 是 9、4、1、0、1、4、9"));
  assert.ok(!s.coefficients.includes(0));
});

test("ma.rate：割線斜率 3、2.1、2.01、2.001", () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
  near(secantSlope(1, 1), 3);
  near(secantSlope(1, 0.1), 2.1);
  near(secantSlope(1, 0.01), 2.01);
  near(secantSlope(1, 0.001), 2.001);
  const t = text("ma.rate@sh");
  for (const piece of ["＝ 3 公尺／秒", "＝ 2.1", "是 2.01", "是 2.001"]) assert.ok(t.includes(piece), piece);
});

test("ma.integral：4 段 3／5，8 段 3.5／4.5，準確 4", () => {
  const s = spec("ma.integral@uni", "riemann");
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
  near(riemann(s.k, s.T, 4).left, 3);
  near(riemann(s.k, s.T, 4).right, 5);
  near(riemann(s.k, s.T, 8).left, 3.5);
  near(riemann(s.k, s.T, 8).right, 4.5);
  assert.equal((s.T * s.k * s.T) / 2, 4);
  const t = text("ma.integral@uni");
  for (const piece of ["＝ 3 公尺", "＝ 5 公尺", "3.5 和 4.5 公尺", "4 − 0 ＝ 4 公尺"]) assert.ok(t.includes(piece), piece);
});

test("ma.trig：30°、90°、210°、270° 的高度", () => {
  const s = spec("ma.trig@sh", "ferris");
  const h = (deg: number) => Math.round(ferrisHeight(s.center, s.radius, deg) * 1e9) / 1e9;
  assert.deepEqual([30, 90, 210, 270].map(h), [17, 22, 7, 2]);
  assert.equal((30 / 360) * s.periodMin * 60, 40);
  const t = text("ma.trig@sh");
  for (const piece of ["高 17 公尺", "高 22 公尺", "高 7 公尺", "高 2 公尺", "每 40 秒轉 30 度"]) assert.ok(t.includes(piece), piece);
});

test("ma.trig：橫軸是時間（分鐘），週期 8 分鐘", () => {
  const s = spec("ma.trig@sh", "ferris");
  const t = text("ma.trig@sh");
  assert.ok(t.includes("畫圖的橫軸用時間"));
  assert.ok(t.includes("週期 8 分鐘"));
  assert.match(s.xLabel, /時間/);
  assert.match(s.xLabel, /分鐘/);
  assert.equal(s.periodMin, 8);
  assert.deepEqual(s.minuteTicks, [0, 2, 4, 6, 8]);
  assert.equal(s.minuteTicks.at(-1), s.periodMin, "橫軸要畫滿一個週期");
  assert.deepEqual([0, 90, 180, 270, 360].map((d) => ferrisMinutes(d, s.periodMin)), s.minuteTicks);
  const h = (min: number) => Math.round(ferrisHeight(s.center, s.radius, (min / s.periodMin) * 360) * 1e9) / 1e9;
  assert.deepEqual([0, 2, 4, 6].map(h), [12, 22, 12, 2]);
  assert.ok(t.includes("t ＝ 0、2、4、6 時高度 12、22、12、2"));
  assert.equal(h(0), h(s.periodMin), "8 分鐘後回到原高度");
});

test("ma.fraction、ma.algebra、ma.pythag：數字和原文一致", () => {
  const f = spec("ma.fraction@es", "fraction");
  for (const d of f.denominators) assert.equal(compareHalf(d / 2, d), "＝", `${d / 2}/${d} 應等於 1/2`);
  assert.equal(compareHalf(3, 4), "＞");
  assert.equal(compareHalf(1, 4), "＜");
  assert.equal(compareHalf(3, 8), "＜");
  assert.equal(compareHalf(5, 8), "＞");
  const ft = text("ma.fraction@es");
  assert.ok(ft.includes("2/4 ＝ 1/2"));
  assert.ok(ft.includes("3/4 > 2/4"));
  assert.ok(ft.includes("1/8 < 1/4 < 1/2"));
  assert.deepEqual(f.denominators, [2, 4, 8]);
  const b = spec("ma.algebra@jh", "barmodel");
  const x = b.fee / (b.price - b.cost);
  assert.equal(x, 30);
  assert.equal(b.price * x, 750);
  assert.equal(b.fee + b.cost * x, 750);
  assert.ok(text("ma.algebra@jh").includes("25x ＝ 300 ＋ 15x"));
  const p = spec("ma.pythag@jh", "pythag");
  assert.equal(p.start[0] ** 2 + p.start[1] ** 2, 25);
  assert.ok(text("ma.pythag@jh").includes("9 ＋ 16 ＝ 25 ＝ 5²"));
});

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test("ma.vector：(3, 0) ＋ (0, 4) ＝ (3, 4)、長度 5，兩倍 (6, 8)、長度 10", () => {
  const s = spec("ma.vector@sh", "vector");
  const sum = vecAdd(s.u, s.v);
  assert.deepEqual(sum, [3, 4]);
  assert.equal(vecLen(sum), 5);
  assert.deepEqual(vecScale(2, sum), [6, 8]);
  assert.equal(vecLen(vecScale(2, sum)), 10);
  assert.equal(vecLen([2, 3, 6]), 7);
  assert.ok(vecScale(Math.max(...s.ks), sum).every((c) => c <= s.range[1]), "兩倍的和向量要畫得下");
  assert.ok(text("ma.vector@sh").includes("(3, 0) ＋ (0, 4) ＝ (3, 4)、長度 5、2 × (3, 4) ＝ (6, 8)、長度 10"));
});

test("ma.function：摺 10 次 10.24 公分，超過 1 公里要 24 次", () => {
  const s = spec("ma.function@sh", "doubling");
  near(foldThickness(s.base, 10), 10.24);
  assert.equal(foldsToExceed(s.base, s.limitCm), 24);
  assert.equal(2 ** 23, 8388608);
  assert.equal(2 ** 24, 16777216);
  near(foldThickness(s.base, 23) / 100, 838.8608, 1e-6);
  near(foldThickness(s.base, 24) / 100, 1677.7216, 1e-6);
  assert.equal(s.maxN, 24);
  assert.ok(foldThickness(s.base, s.maxN) < 200000, "一般刻度上限 200,000 公分要畫得下");
  const t = text("ma.function@sh");
  assert.ok(t.includes("0.01 × 1,024 ＝ 10.24 公分、超過 1 公里要 24 次"));
  assert.ok(t.includes("2²³ ＝ 8,388,608、2²⁴ ＝ 16,777,216"));
});

test("ma.sequence：剪 5 次 31/32，1/2¹⁰ ＝ 1/1,024", () => {
  assert.deepEqual(halvingSum(5), { num: 31, den: 32 });
  assert.equal(halvingSum(10).den, 1024);
  let sum = 0;
  for (let i = 1; i <= 5; i += 1) sum += 1 / 2 ** i;
  near(sum, 31 / 32);
  const t = text("ma.sequence@sh");
  assert.ok(t.includes("1/2 ＋ 1/4 ＋ 1/8 ＋ 1/16 ＋ 1/32 ＝ 31/32、1/2¹⁰ ＝ 1/1,024"));
  assert.equal(spec("ma.sequence@sh", "halving").start, 5);
});

test("ma.limit：表上的 6 個值，x ＝ 1 沒有定義", () => {
  const s = spec("ma.limit@uni", "hole");
  const values = s.xs.map((x) => Math.round(holeF(x) * 1e9) / 1e9);
  assert.deepEqual(values, [1.9, 1.99, 1.999, 2.001, 2.01, 2.1]);
  for (const x of s.xs) near(Math.abs(holeF(x) - 2), Math.abs(x - 1), 1e-9);
  assert.ok(Number.isNaN(holeF(1)));
  assert.ok(text("ma.limit@uni").includes("x ＝ 0.9、0.99、0.999 時 f(x) 是 1.9、1.99、1.999；x ＝ 1.1、1.01、1.001 時是 2.1、2.01、2.001"));
});

test("ma.derivative：r ≈ 3.82、h ≈ 7.64、S ≈ 274.9，r ＝ 3 和 5 比較大", () => {
  const s = spec("ma.derivative@uni", "can");
  const r = canBestR(s.volume);
  assert.equal(r.toFixed(2), "3.82");
  assert.equal(canH(s.volume, r).toFixed(2), "7.64");
  near(canH(s.volume, r), 2 * r, 1e-9);
  assert.equal(canS(s.volume, r).toFixed(1), "274.9");
  near(canDS(s.volume, r), 0, 1e-9);
  assert.equal(canS(s.volume, 3).toFixed(1), "289.9");
  assert.equal(canS(s.volume, 5).toFixed(1), "297.1");
  assert.ok(canDS(s.volume, 3) < 0 && canDS(s.volume, 5) > 0);
  assert.ok(canS(s.volume, s.rMin) < s.sMax && canS(s.volume, s.rMax) < s.sMax, "曲線要畫得下");
  const t = text("ma.derivative@uni");
  assert.ok(t.includes("r ＝ 3 時 S ≈ 289.9，r ≈ 3.82 時 S ≈ 274.9，r ＝ 5 時 S ≈ 297.1"));
  assert.ok(t.includes("S(r) ＝ 2πr² ＋ 700 ÷ r"));
});

test("it.algo：1 到 100 每次猜中間，最多 7 次", () => {
  const s = spec("it.algo@jh", "bsearch");
  let worst = 0;
  for (let n = s.lo; n <= s.hi; n += 1) {
    const g = binaryGuesses(n, s.lo, s.hi);
    assert.equal(g.at(-1), n, `${n} 要猜中`);
    worst = Math.max(worst, g.length);
  }
  assert.equal(worst, 7);
  assert.deepEqual(binaryGuesses(50, 1, 100), [50]);
  assert.ok(text("it.algo@jh").includes("在 7 次內猜中 1 到 100 的數字"));
});

test("it.data：8 × 8，1 是白、0 是黑", () => {
  const s = spec("it.data@es", "pixels");
  assert.equal(s.start.length, 8);
  for (const row of s.start) assert.match(row, /^[01]{8}$/);
  assert.equal(rowCode([true, false, true]), "101");
  const t = text("it.data@es");
  assert.ok(t.includes("8 × 8 的方格紙"));
  assert.ok(t.includes("1 代表白、0 代"));
});
