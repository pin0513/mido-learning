import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Spelling } from "../../components/kp/v2/figures/Spelling";
import { ToneChart } from "../../components/kp/v2/figures/ToneChart";
import { catalogFromModel } from "../content/catalog";
import { loadContent } from "../content/load";
import type { ContentCatalog } from "../content/catalog";
import type { KnowledgePoint, SpellingFigure, ToneChartFigure } from "../content/types";
import { buildCircles } from "./circle";

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, "..", "..", "content");
const fixtureFile = join(here, "fixtures", "zh.zhuyin.es.proposed.yaml");

function catalog(): ContentCatalog {
  const { errors, model } = loadContent(contentDir);
  assert.deepEqual(errors, []);
  assert.ok(model);
  return catalogFromModel(model);
}

const shared = catalog();

function point(id: string): KnowledgePoint {
  const found = shared.indexes.byId.get(id);
  assert.ok(found, id);
  return found;
}

test("未轉換的點用既有欄位組三圈", () => {
  const found = point("pm.breakdown@es");
  const built = buildCircles(found, shared);
  assert.equal(built.converted, false);
  assert.deepEqual(built.circles.map((circle) => circle.kind), ["why", "how", "what"]);
  assert.equal(built.circles[0].heading, "為什麼學");
  assert.equal(built.circles[0].converted, false);
  assert.equal(built.circles[0].blocks[0]?.kind, "questions");
  assert.equal(built.circles[1].blocks.some((block) => block.kind === "scenario"), true);
  assert.equal(built.circles[1].blocks.some((block) => block.kind === "ai"), true);
  assert.equal(built.circles[2].blocks.some((block) => block.kind === "links"), true);
  assert.equal(JSON.stringify(built).includes("在家"), false);
});

test("只補一圈時，那一圈用新欄位，其餘沿用舊欄位", () => {
  const found = point("pm.breakdown@es");
  const partial: KnowledgePoint = {
    ...found,
    why: {
      heading: "先問為什麼",
      body: ["因為想學會拆。"],
      sources: [],
      items: [],
      checklist: [],
      figures: [],
      notes: [],
    },
  };
  const built = buildCircles(partial, shared);
  assert.equal(built.converted, false);
  assert.equal(built.circles[0].converted, true);
  assert.equal(built.circles[0].heading, "先問為什麼");
  assert.equal(built.circles[0].blocks[0]?.kind, "paragraphs");
  assert.equal(built.circles[1].converted, false);
  assert.equal(built.circles[2].converted, false);
});

test("exercise 與目標、檢核相同時不重複，What 空了就放補強句", () => {
  const found = point("pm.breakdown@es");
  const duplicated: KnowledgePoint = {
    ...found,
    goal: "會做",
    review: "做得到",
    exercise: "目標：會做　檢核：做得到",
    article: undefined,
    project: undefined,
    game: undefined,
    aiPrompt: undefined,
    slides: [],
    links: { why: [], how: [], related: [], deeper: [] },
  };
  const empty = buildCircles(duplicated, shared);
  assert.deepEqual(empty.circles[2].blocks, [{ kind: "placeholder", text: "這一圈內容補強中" }]);

  const kept = buildCircles({ ...duplicated, exercise: "自己出三題" }, shared);
  const formats = kept.circles[2].blocks.find((block) => block.kind === "formats");
  assert.ok(formats && formats.kind === "formats");
  assert.equal(formats.items.some((item) => item.label === "練習" && item.text === "自己出三題"), true);
});

test("完整轉換的夾具走出黃金圈，而且不把 exercise 再塞進 What", () => {
  const live = readFileSync(join(contentDir, "knowledge", "language", "zh.zhuyin", "es.yaml"), "utf8");
  assert.equal(/^why:/m.test(live), false);
  const dir = mkdtempSync(join(tmpdir(), "kp-circle-"));
  try {
    cpSync(contentDir, dir, { recursive: true });
    writeFileSync(join(dir, "knowledge", "language", "zh.zhuyin", "es.yaml"), readFileSync(fixtureFile, "utf8"));
    for (const name of ["sources-backfill.yaml", "golden-circle-backfill.yaml"]) {
      const file = join(dir, name);
      writeFileSync(file, readFileSync(file, "utf8").replace(/\r?\n  - zh\.zhuyin@es\r?\n?/, "\n"));
    }
    const loaded = loadContent(dir);
    assert.deepEqual(loaded.errors, []);
    assert.ok(loaded.model);
    const model = catalogFromModel(loaded.model);
    const zhuyin = model.indexes.byId.get("zh.zhuyin@es");
    assert.ok(zhuyin);
    const built = buildCircles(zhuyin, model);
    assert.equal(built.converted, true);
    assert.equal(built.circles[0].heading, "看懂一個字怎麼念");
    assert.equal(built.circles[0].blocks.some((block) => block.kind === "figureQa"), true);
    assert.equal(built.circles[0].blocks.some((block) => block.kind === "uses"), true);
    const howKinds = built.circles[1].blocks.map((block) => block.kind);
    assert.deepEqual(howKinds, ["paragraphs", "methods", "checklist", "scenario", "review", "ai"]);
    const scenario = built.circles[1].blocks.find((block) => block.kind === "scenario");
    assert.ok(scenario && scenario.kind === "scenario");
    assert.equal(scenario.figureId, "how-flow");
    assert.equal(scenario.title, "親子共學：玩「注音傳話」");
    const whatIds = built.circles[2].blocks.map((block) => (block.kind === "figure" ? block.id : block.kind));
    assert.deepEqual(whatIds, ["what-symbols", "what-spelling", "what-tones"]);
    const tones = built.circles[2].blocks[2];
    assert.ok(tones && tones.kind === "figure" && tones.notes && tones.notes.length === 4);
    assert.equal(built.circles[2].blocks.some((block) => block.kind === "formats"), false);
    assert.equal(JSON.stringify(built).includes(zhuyin.exercise ?? "不會出現"), false);

    const spelling = zhuyin.figures?.find((figure): figure is SpellingFigure => figure.type === "spelling");
    const chart = zhuyin.figures?.find((figure): figure is ToneChartFigure => figure.type === "tone_chart");
    assert.ok(spelling && chart);
    const spellingHtml = renderToStaticMarkup(createElement(Spelling, { figure: spelling }));
    const toneHtml = renderToStaticMarkup(createElement(ToneChart, { figure: chart }));
    assert.match(spellingHtml, /M9 7 L19 21/);
    assert.equal(spellingHtml.includes(">ˋ<"), false);
    assert.match(toneHtml, /M7 8 L14 20 L21 8/);
    assert.match(toneHtml, /M10 22 Q 26 46 54 14/);
    assert.equal(toneHtml.includes(">ˇ<"), false);
    assert.match(spellingHtml, /v2-only-d/);
    assert.match(spellingHtml, /v2-only-m/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
