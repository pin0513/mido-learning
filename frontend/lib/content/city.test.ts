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
  // B20 發布專案管理 uni 5 點後，這 5 棟各多 8（已發布），digest 跟著變；座標不變。
  // B21 發布哲學 es 5 點後，這 5 棟也各多 8，digest 再變；座標不變。
  // B22 發布哲學 jh 6 點後，這 6 棟也各多 8，digest 再變；座標不變。
  // B23 發布哲學 sh 7 點後，這 7 棟也各多 8，digest 再變；座標不變。
  // B24 發布哲學 uni 6 點後，這 6 棟也各多 8，digest 再變；座標不變。
  assert.equal(digest, "9f5387e1fdb292bcd4210427d54c5d129f9441fe16e76b52fd743d6d94f728eb");
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
  // B24 發布哲學 uni 6 點後，地圖上的 100 棟全部已發布，真地圖沒有草稿可查。
  // 草稿外洩與匿名的檢查改在合成內容上跑：把這 6 點在記憶體裡改回草稿（不動內容檔），其餘斷言照舊。
  assert.equal(map.buildings.filter((building) => building.status !== "published").length, 0);
  assert.equal(shown.buildings.filter((building) => building.status === "draft").length, 0);
  assert.equal(JSON.stringify(shown).includes("draft-"), false);
  const B24 = new Set(["ph.epistem@uni", "ph.philsci@uni", "ph.formal@uni", "ph.applied@uni", "ph.complex@uni", "ph.aimind@uni"]);
  const draftedMap = buildCityMap({
    ...source,
    points: source.points.map((point) => (B24.has(point.id) ? { ...point, status: "draft" as const } : point)),
  });
  assert.equal(draftedMap.buildings.filter((building) => building.status !== "published").length, 6);
  const draftedShown = presentCityMap(draftedMap);
  const draftIds = new Set(draftedMap.buildings.filter((building) => building.status !== "published").map((building) => building.id));
  const draftConcepts = new Set(draftedMap.buildings.filter((building) => building.status !== "published").map((building) => building.concept));
  const blob = JSON.stringify(draftedShown);
  for (const id of draftIds) assert.equal(blob.includes(id), false, id);
  // 路線 id 沿用概念名（ph.logic）。發布 ph.reason 後這條路線會留在地圖上，不是草稿概念外洩。
  const pathIds = new Set(draftedShown.landmarks.map((landmark) => landmark.id));
  for (const concept of draftConcepts) {
    if (pathIds.has(concept)) continue;
    assert.equal(blob.includes(`"${concept}"`), false, concept);
  }
  const hidden = draftedShown.buildings.find((building) => building.status === "draft");
  assert.ok(hidden);
  assert.match(hidden.id, /^draft-\d+$/);
  assert.equal(hidden.concept, "");
  assert.equal(hidden.href, "");
  assert.equal(hidden.title, "");
  assert.equal(hidden.idea, "");
  assert.equal(draftedShown.buildings.filter((building) => building.status === "draft").length, draftIds.size);
  assert.equal(draftedShown.buildings.find((building) => building.id === "pm.breakdown@es")?.title, "大事拆成小事");
  assert.ok(draftedShown.roads.every((road) => !draftIds.has(road.from) && !draftIds.has(road.to)));
  assert.ok(draftedShown.bridges.every((bridge) => !draftIds.has(bridge.from) && !draftIds.has(bridge.to)));
  // 合成草稿時，大學站不顯示，7 條哲學路線退回 3 站（B23 的狀態）。
  assert.deepEqual(draftedShown.landmarks.find((landmark) => landmark.id === "ph.logic")?.stops, ["ph.reason@es", "ph.argument@jh", "ph.logic@sh"]);
  assert.equal(shown.buildings.find((building) => building.id === "pm.breakdown@es")?.title, "大事拆成小事");
  // B11 發布數學 es／jh 12 點後，數學的 7 條路線（ma.algebra、ma.beauty、ma.change、ma.data、ma.geometry、ma.model、ma.proof）各有 es＋jh 兩站已發布，跟著顯示。
  // B14 發布資訊與 AI es／jh 12 點後，資訊與 AI 的 8 條路線（it.collab、it.creative、it.ct、it.data、it.literacy、it.ml、it.net、it.prog）各有 es＋jh 兩站已發布，也跟著顯示。
  // B17 發布專案管理 es 5 點後，專案管理的 6 條路線（pm.goal、pm.lead、pm.reflect、pm.risk、pm.schedule、pm.team）各有國小一站已發布，也跟著顯示；pm.lead 與 pm.team 都從 pm.roles@es 出發。
  // B18 發布專案管理 jh 5 點後，路線數不變（6 條都已顯示），每條各多國中一站；pm.team 與 pm.reflect 都經過 pm.team@jh。
  // B19 發布專案管理 sh 5 點後，路線數仍不變，每條各多高中一站（大學站仍是草稿，不顯示）；pm.reflect 與 pm.risk 都接到 pm.agile@sh。
  // B20 發布專案管理 uni 5 點後，專案管理 24 點全部發布：路線數不變，每條各多大學一站；pm.team 與 pm.lead 都到 pm.org@uni。
  // B21 發布哲學 es 5 點後，多顯示 6 條哲學路線（ph.ai、ph.critical、ph.epistemology、ph.ethics、ph.inquiry、ph.systems），各只有國小一站；ph.ai 與 ph.critical 都從 ph.fact@es 出發。
  // B22 發布哲學 jh 6 點後，路線數不變，7 條哲學路線各多國中一站；ph.ai 與 ph.epistemology 都經過 ph.evidence@jh。
  // B23 發布哲學 sh 7 點後，路線數不變，7 條哲學路線各多高中一站（大學站仍是草稿，不顯示）。
  // B24 發布哲學 uni 6 點後，路線數不變，7 條哲學路線各多大學一站；ph.critical 與 ph.inquiry 都到 ph.philsci@uni。
  assert.equal(shown.landmarks.length, 29);
  const shownStops = (id: string) => {
    const found = shown.landmarks.find((landmark) => landmark.id === id);
    assert.ok(found, id);
    return found.stops;
  };
  assert.deepEqual(shownStops("pm.team"), ["pm.roles@es", "pm.team@jh", "pm.conflict@sh", "pm.org@uni"]);
  assert.deepEqual(shownStops("pm.goal"), ["pm.goal@es", "pm.project@jh", "pm.stakeholder@sh", "pm.business@uni"]);
  assert.deepEqual(shownStops("pm.lead"), ["pm.roles@es", "pm.lead@jh", "pm.style@sh", "pm.org@uni"]);
  assert.deepEqual(shownStops("pm.reflect"), ["pm.retro@es", "pm.team@jh", "pm.agile@sh", "pm.aiteam@uni"]);
  assert.deepEqual(shownStops("pm.risk"), ["pm.planb@es", "pm.risk@jh", "pm.agile@sh", "pm.complexity@uni"]);
  assert.deepEqual(shownStops("pm.schedule"), ["pm.sequence@es", "pm.gantt@jh", "pm.cpm@sh", "pm.schedule@uni"]);
  const shownEstimate = shown.landmarks.find((landmark) => landmark.id === "pm.estimate");
  assert.ok(shownEstimate);
  assert.deepEqual(shownEstimate.stops, ["pm.breakdown@es", "pm.triangle@jh", "pm.estimate@sh", "pm.evm@uni"]);
  const shownLogic = shown.landmarks.find((landmark) => landmark.id === "ph.logic");
  assert.ok(shownLogic);
  assert.deepEqual(shownLogic.stops, ["ph.reason@es", "ph.argument@jh", "ph.logic@sh", "ph.formal@uni"]);
  assert.deepEqual(shownStops("ph.inquiry"), ["ph.question@es", "ph.hypothesis@jh", "ph.science@sh", "ph.philsci@uni"]);
  assert.deepEqual(shownStops("ph.critical"), ["ph.fact@es", "ph.fallacy@jh", "ph.bias@sh", "ph.philsci@uni"]);
  assert.deepEqual(shownStops("ph.ai"), ["ph.fact@es", "ph.evidence@jh", "ph.aijudge@sh", "ph.aimind@uni"]);
  assert.deepEqual(shownStops("ph.epistemology"), ["ph.know@es", "ph.evidence@jh", "ph.tok@sh", "ph.epistem@uni"]);
  assert.deepEqual(shownStops("ph.ethics"), ["ph.fair@es", "ph.ethics@jh", "ph.ethicstheory@sh", "ph.applied@uni"]);
  assert.deepEqual(shownStops("ph.systems"), ["ph.parts@es", "ph.feedback@jh", "ph.systems@sh", "ph.complex@uni"]);
  // B18 發布 pm.project@jh 後，有名字的草稿改用 pm.stakeholder@sh；B19 發布它後，改用 pm.business@uni；B20 專案管理全部發布，地圖上的草稿只剩哲學，改用 ph.systems@sh；B23 發布它後，改用它的下一階草稿 ph.complex@uni。
  // B24 發布 ph.complex@uni 後，真地圖沒有草稿；有名字的草稿改在上面的合成內容裡查 ph.complex@uni，真地圖上它帶標題與網址。
  assert.equal(presentCityMap(map, true).buildings.find((building) => building.id === "ph.complex@uni")?.title, "複雜性思維與模型的限度");
  const identified = presentCityMap(draftedMap, true);
  const namedDraft = identified.buildings.find((building) => building.id === "ph.complex@uni");
  assert.ok(namedDraft);
  assert.equal(namedDraft.status, "draft");
  assert.equal(namedDraft.title, "");
  assert.equal(namedDraft.href, "/kp/ph.complex/uni");
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
  // B17 發布 pm.goal@es、pm.sequence@es 後，它們以已發布先備出現；B18 發布 pm.project@jh 後，pm.triangle@jh 的兩個先備都已發布。
  // B20 發布 pm.schedule@uni 後，這條主線的先備全部已發布；草稿先備只算筆數的情形改用下面的合成目錄檢查。哲學草稿的標題不會出現。
  // B21 發布 ph.parts@es 後，改用它的下一階草稿 ph.feedback@jh；B22 發布 ph.feedback@jh 後，改用仍是草稿的 ph.science@sh。
  // B23 發布哲學 sh 7 點後，這三個改用同一條路線上仍是草稿的大學點 ph.philsci@uni、ph.formal@uni、ph.complex@uni。
  // B24 發布哲學 uni 6 點後，地圖上沒有草稿；改用接在這條主線上、仍是草稿的軟實力點：sk.issuetree@jh（先備 pm.breakdown@es）、sk.decide@sh（先備 pm.triangle@jh）、sk.a3@uni（links.related pm.business@uni，跟 pm.evm@uni 同一階）。
  // B26 發布 sk.issuetree@jh 後拿掉它；sk.decide@sh 也以 sk.issuetree@jh 為先備，仍是草稿。
  // B27 發布 sk.decide@sh 後拿掉它；sk.a3@uni（先備 sk.decide@sh）仍是草稿。
  for (const title of ["一頁問題報告：帶團隊從問題到行動"]) {
    assert.equal(blob.includes(title), false, title);
  }
  assert.deepEqual(brief.stops[0].prerequisites, [{ title: "目標：我們想完成什麼？", href: "/kp/pm.goal/es" }]);
  assert.equal(brief.stops[0].hiddenPrerequisites, 0);
  assert.deepEqual(brief.stops[1].prerequisites, [
    { title: "什麼是「專案」？", href: "/kp/pm.project/jh" },
    { title: "先做什麼、後做什麼", href: "/kp/pm.sequence/es" },
  ]);
  assert.equal(brief.stops[1].hiddenPrerequisites, 0);
  assert.deepEqual(brief.stops[3].prerequisites, [
    { title: "WBS 與三點估算", href: "/kp/pm.estimate/sh" },
    { title: "排程與資源最佳化", href: "/kp/pm.schedule/uni" },
  ]);
  assert.equal(brief.stops[3].hiddenPrerequisites, 0);
  assert.equal(brief.stops[2].question.length > 0, true);
  assert.ok(brief.colearn.includes("大事拆成小事"));
  assert.ok(brief.colearn.includes("星星與箭頭"));

  // 先備還是草稿時只算筆數、不帶標題：把 pm.schedule@uni 在合成目錄裡改回草稿（不動內容檔）。
  const catalog = loadCatalog();
  const byId = new Map(catalog.indexes.byId);
  const schedule = byId.get("pm.schedule@uni");
  assert.ok(schedule);
  byId.set("pm.schedule@uni", { ...schedule, status: "draft" });
  const drafted = publishedEstimatePath({ ...catalog, indexes: { ...catalog.indexes, byId } });
  assert.ok(drafted);
  assert.deepEqual(drafted.stops[3].prerequisites, [{ title: "WBS 與三點估算", href: "/kp/pm.estimate/sh" }]);
  assert.equal(drafted.stops[3].hiddenPrerequisites, 1);
  assert.equal(JSON.stringify(drafted).includes("排程與資源最佳化"), false);
});
