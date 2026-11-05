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
  for (const block of circles.flatMap((c) => c.blocks)) {
    if (block.kind === "scenario") assert.ok(block.figureId && !block.text, "情境文字 V1 已有，只留活動圖");
  }
});

test("沒寫三圈的點，V1 不多畫任何東西", () => {
  const bare = { ...all.points[0] };
  delete bare.why;
  delete bare.how;
  delete bare.what;
  assert.deepEqual(v1Circles(bare, all), []);
});
