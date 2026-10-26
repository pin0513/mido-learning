import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildCityMap, footprintsOverlap } from "./city";
import { loadContent } from "./load";
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
  assert.equal(digest, "59ac1c366d3e4935bc2a014cb4095e61822e6cd7ec47a23d7cb91f972ecb4d85");
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
  assert.equal(breakdown.dependents, source.points.filter((point) => point.prerequisites.includes("pm.breakdown@es")).length);
  assert.equal(breakdown.height, 10 + breakdown.dependents * 7);
  assert.equal(breakdown.href, "/kp/pm.breakdown/es");
  assert.equal(map.buildings.filter((building) => building.aesthetics).length, 2);
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
