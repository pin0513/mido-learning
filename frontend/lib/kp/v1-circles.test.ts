import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CircleSection } from "../../components/kp/v2/CircleSection";
import { pointRefs } from "../../components/kp/v2/refs";
import { catalogFromModel } from "../content/catalog";
import { loadContent } from "../content/load";
import { v1Circles } from "./v1-circles";

const here = dirname(fileURLToPath(import.meta.url));
const { model } = loadContent(join(here, "..", "..", "content"));
assert.ok(model);
const all = catalogFromModel(model);

function plain(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

test("V1 三圈只畫內容裡寫了的圈，段標用內容的 heading", () => {
  const point = all.points.find((item) => item.why && item.how && item.what);
  assert.ok(point);
  const circles = v1Circles(point, all);
  assert.deepEqual(circles.map((c) => c.kind), ["why", "how", "what"]);
  assert.equal(circles[0].heading, point.why!.heading);
  const kinds = circles.flatMap((c) => c.blocks.map((b) => b.kind));
  assert.ok(!kinds.includes("review") && !kinds.includes("ai"), "V1 別處已有檢核與 AI 分工");
});

test("活動圖不重複情境句，figcaption 只留圖的出處", () => {
  for (const id of ["sk.pdca@jh", "ma.probmodel@uni"] as const) {
    const point = all.points.find((item) => item.id === id);
    assert.ok(point?.scenario, id);
    const scenario = v1Circles(point, all)
      .flatMap((c) => c.blocks)
      .find((b) => b.kind === "scenario");
    assert.ok(scenario && scenario.kind === "scenario", id);
    assert.ok(scenario.figureId, id);
    assert.equal(scenario.title, undefined, id);
    assert.equal(scenario.text, undefined, id);
    assert.equal(scenario.caption, undefined, id);

    const how = v1Circles(point, all).find((c) => c.kind === "how");
    assert.ok(how, id);
    const html = renderToStaticMarkup(
      createElement(CircleSection, {
        circle: how,
        point,
        all,
        visible: all,
        refs: pointRefs(all, all, point.folder),
      }),
    );
    const text = plain(html);
    assert.ok(!text.includes(point.scenario), `${id} 不重複情境`);
    const figure = point.figures?.find((f) => f.id === scenario.figureId);
    assert.ok(figure && "caption" in figure && figure.caption, id);
    assert.ok(text.includes(String(figure.caption)), `${id} 保留出處`);
    assert.match(html, /<figure[\s>]/i, `${id} 有圖`);
    assert.match(html, /<figcaption[\s>]/i, `${id} 有 figcaption`);
  }
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
