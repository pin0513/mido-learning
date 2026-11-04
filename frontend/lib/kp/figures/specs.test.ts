import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareHalf, ferrisHeight, ferrisMinutes, intersect, quadrant, riemann, secantSlope } from "./math";
import { FIGURE_SPECS } from "./specs";

// lib/content 是 server-only，測試直接讀原始 YAML。
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../content/knowledge/math");
const text = (id: string) => {
  const [concept, stage] = id.split("@");
  const file = join(ROOT, concept, `${stage}.yaml`);
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
