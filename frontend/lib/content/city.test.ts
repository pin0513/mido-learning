import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildCityMap, focusViewBox, footprintsOverlap, presentCityMap } from "./city";
import { loadCatalog } from "./catalog";
import { loadContent } from "./load";
import { publishedEstimatePath } from "../kp/open-path";
import type { ContentModel, KnowledgePoint } from "./types";

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "content");
const { model, errors } = loadContent(contentDir);

function content(): ContentModel {
  assert.equal(errors.length, 0);
  assert.ok(model);
  return model;
}

test("城市索引有 100 棟、142 條先備路、29 個地標、18 塊預定地", () => {
  const map = buildCityMap(content());
  assert.equal(map.buildings.length, 100);
  assert.equal(map.roads.length, 142);
  assert.equal(map.landmarks.length, 29);
  assert.equal(map.lots.length, 18);
  assert.equal(map.lots.filter((lot) => lot.featured).length, 5);
  assert.equal(map.districts.length, 4);
  assert.deepEqual(
    map.districts.map((district) => district.key),
    ["philosophy", "math", "pm-leadership", "it-ai"],
  );
});

test("兩次建置座標相同，而且同一格的建築不重疊", () => {
  const first = buildCityMap(content());
  const second = buildCityMap(content());
  const signature = (map: ReturnType<typeof buildCityMap>) =>
    map.buildings.map((building) => `${building.id}:${building.x}:${building.y}:${building.height}`).join("\n");
  assert.equal(signature(first), signature(second));
  const digest = createHash("sha256").update(signature(first)).digest("hex");
  assert.equal(digest, "734fe2de1bd0bf3c45169aa9a1b6d0cb5d5dda016ce0bfc08686e33cfcd8d47f");
  for (const district of first.districts) {
    for (const stage of first.stages) {
      const count = first.buildings.filter((building) => building.folder === district.key && building.stage === stage.id).length;
      assert.ok(count <= 8, `${district.key}/${stage.id} has ${count}`);
    }
  }
  assert.equal(footprintsOverlap(first.buildings), false);
});

test("主線站序跟內容一致，高度等於被依賴數", () => {
  const source = content();
  const map = buildCityMap(source);
  const estimate = map.landmarks.find((path) => path.id === "pm.estimate");
  assert.ok(estimate);
  assert.deepEqual(estimate.stops, ["pm.breakdown@es", "pm.triangle@jh", "pm.estimate@sh", "pm.evm@uni"]);
  assert.equal(estimate.colearn, true);
  const breakdown = map.buildings.find((building) => building.id === "pm.breakdown@es");
  assert.ok(breakdown);
  assert.equal(
    breakdown.dependents,
    source.points.filter((point) => point.folder !== "soft-skills" && point.prerequisites.includes("pm.breakdown@es")).length,
  );
  assert.equal(breakdown.height, 16 + breakdown.dependents * 9 + 8);
  assert.equal(breakdown.href, "/kp/pm.breakdown/es");
  const shown = presentCityMap(map);
  const draftIds = new Set(map.buildings.filter((building) => building.status !== "published").map((building) => building.id));
  const draftConcepts = new Set(map.buildings.filter((building) => building.status !== "published").map((building) => building.concept));
  const blob = JSON.stringify(shown);
  for (const id of draftIds) assert.equal(blob.includes(id), false, id);
  // 路線 id 沿用概念名（ph.logic）。發布 ph.reason 後這條路線會留在地圖上，不是草稿概念外洩。
  const pathIds = new Set(shown.landmarks.map((landmark) => landmark.id));
  for (const concept of draftConcepts) {
    if (pathIds.has(concept)) continue;
    assert.equal(blob.includes(`"${concept}"`), false, concept);
  }
  const hidden = shown.buildings.find((building) => building.status === "draft");
  assert.ok(hidden);
  assert.match(hidden.id, /^draft-\d+$/);
  assert.equal(hidden.concept, "");
  assert.equal(hidden.href, "");
  assert.equal(hidden.title, "");
  assert.equal(hidden.idea, "");
  assert.equal(shown.buildings.filter((building) => building.status === "draft").length, draftIds.size);
  assert.equal(shown.buildings.find((building) => building.id === "pm.breakdown@es")?.title, "大事拆成小事");
  assert.ok(shown.roads.every((road) => !draftIds.has(road.from) && !draftIds.has(road.to)));
  assert.ok(shown.bridges.every((bridge) => !draftIds.has(bridge.from) && !draftIds.has(bridge.to)));
  // B11 發布數學 es／jh 12 點後，數學的 7 條路線（ma.algebra、ma.beauty、ma.change、ma.data、ma.geometry、ma.model、ma.proof）各有 es＋jh 兩站已發布，跟著顯示。
  // B14 發布資訊與 AI es／jh 12 點後，資訊與 AI 的 8 條路線（it.collab、it.creative、it.ct、it.data、it.literacy、it.ml、it.net、it.prog）各有 es＋jh 兩站已發布，也跟著顯示。
  assert.equal(shown.landmarks.length, 17);
  const shownEstimate = shown.landmarks.find((landmark) => landmark.id === "pm.estimate");
  assert.ok(shownEstimate);
  assert.deepEqual(shownEstimate.stops, ["pm.breakdown@es", "pm.triangle@jh", "pm.estimate@sh", "pm.evm@uni"]);
  const shownLogic = shown.landmarks.find((landmark) => landmark.id === "ph.logic");
  assert.ok(shownLogic);
  assert.deepEqual(shownLogic.stops, ["ph.reason@es"]);
  const identified = presentCityMap(map, true);
  const namedDraft = identified.buildings.find((building) => building.id === "pm.goal@es");
  assert.ok(namedDraft);
  assert.equal(namedDraft.title, "");
  assert.equal(namedDraft.href, "/kp/pm.goal/es");
  assert.equal(map.buildings.filter((building) => building.aesthetics).length, 2);
});

test("只選環路時視野縮到那一圈", () => {
  const map = buildCityMap(content());
  assert.equal(focusViewBox(map, null, null), "0 0 1100 1100");
  const ring = focusViewBox(map, null, 0).split(" ").map(Number);
  assert.ok(ring[2] < 1000);
  assert.ok(ring[0] > 0 && ring[1] > 0);
  const district = focusViewBox(map, 0, null).split(" ").map(Number);
  assert.ok(district[2] < 1000);
});

test("新增一筆知識點不用改程式就會排上地圖", () => {
  const source = content();
  const sample = source.points.find((point) => point.id === "ma.number@es");
  assert.ok(sample);
  const extra: KnowledgePoint = {
    ...sample,
    id: "ma.extra@es",
    concept: "ma.extra",
    title: "多出來的一棟",
    prerequisites: [],
    file: "extra.yaml",
  };
  const map = buildCityMap({ ...source, points: [...source.points, extra] });
  assert.equal(map.buildings.length, 101);
  assert.ok(map.buildings.some((building) => building.id === "ma.extra@es"));
  assert.equal(footprintsOverlap(map.buildings), false);
});

test("開放主線只帶已發布標題", () => {
  const brief = publishedEstimatePath(loadCatalog());
  assert.ok(brief);
  assert.deepEqual(
    brief.stops.map((stop) => stop.title),
    ["大事拆成小事", "時間、金錢、品質的取捨", "WBS 與三點估算", "實獲值管理（EVM）"],
  );
  const blob = JSON.stringify(brief);
  for (const title of ["目標：我們想完成什麼", "什麼是「專案」", "先做什麼、後做什麼"]) {
    assert.equal(blob.includes(title), false, title);
  }
  assert.ok(brief.stops[0].hiddenPrerequisites >= 1);
  assert.equal(brief.stops[0].prerequisites.length, 0);
  assert.equal(brief.stops[2].question.length > 0, true);
  assert.ok(brief.colearn.includes("大事拆成小事"));
});
