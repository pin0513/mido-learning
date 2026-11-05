import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { catalogFromModel } from "../content/catalog";
import { loadContent } from "../content/load";
import { v1Circles } from "./v1-circles";

const here = dirname(fileURLToPath(import.meta.url));
const { model } = loadContent(join(here, "..", "..", "content"));
assert.ok(model);
const all = catalogFromModel(model);

test("V1 三圈只畫內容裡寫了的圈，段標用內容的 heading", () => {
  const point = all.points.find((item) => item.why && item.how && item.what);
  assert.ok(point);
  const circles = v1Circles(point, all);
  assert.deepEqual(circles.map((c) => c.kind), ["why", "how", "what"]);
  assert.equal(circles[0].heading, point.why!.heading);
  const kinds = circles.flatMap((c) => c.blocks.map((b) => b.kind));
  assert.ok(!kinds.includes("review") && !kinds.includes("ai"), "V1 別處已有檢核與 AI 分工");
});

test("活動圖保留 title 與 caption，不重複情境內文", () => {
  const point = all.points.find((item) => item.id === "sk.pdca@jh");
  assert.ok(point);
  const scenario = v1Circles(point, all)
    .flatMap((c) => c.blocks)
    .find((b) => b.kind === "scenario");
  assert.ok(scenario && scenario.kind === "scenario");
  assert.ok(scenario.figureId);
  assert.equal(scenario.title, undefined);
  assert.equal(scenario.text, undefined, "情境內文 V1 已有，不重複");
  assert.ok(scenario.caption);
  assert.match(scenario.caption, /^親子共學：親子各跑一輪自己的 PDCA（孩子：讀書方法；大人：運動或睡眠）/);
  assert.doesNotMatch(scenario.caption, /^讀書方法/);
});

test("ma.probmodel 活動圖 caption 不從括號中間斷開", () => {
  const point = all.points.find((item) => item.id === "ma.probmodel@uni");
  assert.ok(point);
  const scenario = v1Circles(point, all)
    .flatMap((c) => c.blocks)
    .find((b) => b.kind === "scenario");
  assert.ok(scenario && scenario.kind === "scenario" && scenario.caption);
  assert.match(scenario.caption, /丟骰子：1–2 點/);
  assert.doesNotMatch(scenario.caption, /^1–2 點/);
});

test("學什麼 checklist 不重複「家長檢核」標題", () => {
  const point = all.points.find((item) => item.what?.checklistTitle === "家長檢核");
  assert.ok(point);
  const checks = v1Circles(point, all)
    .flatMap((c) => c.blocks)
    .filter((b) => b.kind === "checklist");
  assert.ok(checks.length > 0);
  for (const block of checks) {
    if (block.kind === "checklist") assert.notEqual(block.title, "家長檢核");
  }
});

test("沒寫三圈的點，V1 不多畫任何東西", () => {
  const bare = { ...all.points[0] };
  delete bare.why;
  delete bare.how;
  delete bare.what;
  assert.deepEqual(v1Circles(bare, all), []);
});
