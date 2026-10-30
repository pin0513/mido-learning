/**
 * V2 詳細頁「審閱狀態」的合成測試（B26，PM 要求）。
 *
 * 真實內容裡「未轉換＋待核對」的頁只剩 sk.hypo@uni（e2e 的 kp-detail-v2.spec.ts 還在查），
 * 「未轉換、不待核對」已沒有真實樣本；sk.hypo@uni 發布後，e2e 那一列會改成已轉換。
 * 這裡用合成的知識點固定住三種組合，不靠任何一筆真實草稿：
 * 未轉換＋待核對（內容補強中、待核對、要核對的地方都出現）、未轉換＋不待核對（只有內容補強中）、已轉換＋不待核對（兩個標示都沒有）。
 *
 * 元件 import 了 server-only 與 .css：第一行載入 node-stubs（只影響這個測試檔的行程）。
 */
import "../../../scripts/node-stubs";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogFromModel } from "../../../lib/content/catalog";
import { loadContent } from "../../../lib/content/load";
import type { KnowledgePoint } from "../../../lib/content/types";
import { KpDetailV2 } from "./KpDetailV2";

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "content");
const { errors, model } = loadContent(contentDir);
assert.deepEqual(errors, []);
assert.ok(model);
const real = catalogFromModel(model);

/** 拿一筆真實的、已轉換的已發布點當形狀範本。 */
const base = real.points.find((point) => point.folder === "soft-skills" && point.status === "published" && point.why && point.how && point.what && !point.toVerify);
assert.ok(base, "需要一筆已轉換、不待核對的已發布軟實力點當範本");

function synth(converted: boolean, toVerify: boolean): KnowledgePoint {
  const concept = `sk.synth${converted ? "c" : "u"}${toVerify ? "v" : "n"}`;
  return {
    ...base!,
    id: `${concept}@uni`,
    concept,
    stage: "uni",
    file: `knowledge/soft-skills/${concept}/uni.yaml`,
    title: `合成的審閱狀態樣本 ${concept}`,
    toVerify,
    verifyNotes: toVerify ? ["合成的待核對說明"] : [],
    why: converted ? base!.why : undefined,
    how: converted ? base!.how : undefined,
    what: converted ? base!.what : undefined,
  };
}

function render(point: KnowledgePoint): string {
  const catalog = { ...real, points: [...real.points, point], indexes: { ...real.indexes, byId: new Map([...real.indexes.byId, [point.id, point]]) } };
  return renderToStaticMarkup(createElement(KpDetailV2, { point, all: catalog, visible: catalog }));
}

test("未轉換＋待核對：內容補強中、待核對與要核對的地方都出現", () => {
  const html = render(synth(false, true));
  assert.match(html, /data-converted="no"/);
  assert.match(html, /<span class="v2-status">待核對<\/span>/);
  assert.match(html, /<span class="v2-status v2-status-muted">內容補強中<\/span>/);
  assert.ok(html.includes("要核對的地方（1）"));
  // RichText 會把最後兩個字包進不斷行的 span，所以只比前段。
  assert.ok(html.includes("合成的待核對"));
});

test("未轉換＋不待核對：只有內容補強中", () => {
  const html = render(synth(false, false));
  assert.match(html, /data-converted="no"/);
  assert.match(html, /<span class="v2-status v2-status-muted">內容補強中<\/span>/);
  assert.equal(html.includes(">待核對<"), false);
  assert.equal(html.includes("要核對的地方"), false);
});

test("已轉換＋不待核對：兩個標示都沒有", () => {
  const html = render(synth(true, false));
  assert.match(html, /data-converted="yes"/);
  assert.equal(html.includes("內容補強中"), false);
  assert.equal(html.includes(">待核對<"), false);
});
