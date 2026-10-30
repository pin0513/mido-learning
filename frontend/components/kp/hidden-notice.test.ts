/**
 * 「另有 N 個尚未發布」的合成測試。
 *
 * 真實內容裡連到草稿的已發布點（例如 sk.facilitate@uni → sk.hardtalk@sh）會在 B25–B28 發布後消失，
 * 所以這裡用合成的知識點固定住三個地方的行為，不靠任何一筆真實草稿：
 * 舊版詳細頁（KnowledgePointView 的 LinkedIds）、V2 詳細頁（PointLinks，含 SeqPanel 的先學／後學）與主線頁（LearningPathView）。
 * 每一則都同時查：數字對、草稿的標題與網址不出現、已發布的標題與網址出現；沒有草稿時不出現提示。
 *
 * 元件 import 了 server-only 與 .css：第一行載入 node-stubs（只影響這個測試檔的行程，node --test 每個檔各一個行程）。
 */
import "../../scripts/node-stubs";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildIndexes, catalogFromModel, visibleCatalog, type ContentCatalog } from "../../lib/content/catalog";
import { loadContent } from "../../lib/content/load";
import type { KnowledgePoint, LearningPath } from "../../lib/content/types";
import { knowledgePointPath } from "../../lib/kp/routes";
import { KnowledgePointView } from "./KnowledgePointView";
import { LearningPathView } from "./LearningPathView";
import { PointLinks } from "./v2/PointLinks";
import { SeqPanel } from "./v2/SeqPanel";

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "content");
const { errors, model } = loadContent(contentDir);
assert.deepEqual(errors, []);
assert.ok(model);
const real = catalogFromModel(model);

/** 拿一筆真實的已發布點當形狀範本，把所有連到別點的欄位清空，只留合成的關係。 */
function template(folder: string): KnowledgePoint {
  const found = real.points.find((point) => point.folder === folder && point.status === "published");
  assert.ok(found, folder);
  return found;
}

interface Spec {
  concept: string;
  stage: string;
  title: string;
  status: "published" | "draft";
  prerequisites?: string[];
  related?: string[];
  deeper?: string[];
}

function synth(base: KnowledgePoint, spec: Spec): KnowledgePoint {
  const id = `${spec.concept}@${spec.stage}`;
  return {
    ...base,
    file: `knowledge/${base.folder}/${spec.concept}/${spec.stage}.yaml`,
    id,
    concept: spec.concept,
    stage: spec.stage,
    title: spec.title,
    status: spec.status,
    prerequisites: spec.prerequisites ?? [],
    links: { why: [], how: [], related: spec.related ?? [], deeper: spec.deeper ?? [] },
    linkNotes: "",
    slides: [],
    article: undefined,
    exercise: undefined,
    project: undefined,
    why: undefined,
    how: undefined,
    what: undefined,
    figures: undefined,
  };
}

function catalog(points: KnowledgePoint[], paths: LearningPath[] = []): ContentCatalog {
  return { taxonomy: real.taxonomy, points, paths, indexes: buildIndexes(real.taxonomy, points, paths) };
}

/** 一定只留已發布：不吃 KP_INCLUDE_DRAFTS，測試結果不隨環境改變。 */
function publishedOnly(all: ContentCatalog): ContentCatalog {
  return visibleCatalog(all, false);
}

const math = template("math");
const PRE = synth(math, { concept: "ma.zzpre", stage: "es", title: "合成已發布先備", status: "published" });
const PRE_DRAFT = synth(math, { concept: "ma.zzpredraft", stage: "es", title: "合成草稿先備", status: "draft" });
const REL = synth(math, { concept: "ma.zzrel", stage: "sh", title: "合成已發布相關", status: "published" });
const REL_DRAFT_A = synth(math, { concept: "ma.zzreldrafta", stage: "sh", title: "合成草稿相關甲", status: "draft" });
const REL_DRAFT_B = synth(math, { concept: "ma.zzreldraftb", stage: "uni", title: "合成草稿相關乙", status: "draft" });
const HUB = synth(math, {
  concept: "ma.zzhub",
  stage: "jh",
  title: "合成中心點",
  status: "published",
  prerequisites: [PRE.id, PRE_DRAFT.id],
  related: [REL.id, REL_DRAFT_A.id, REL_DRAFT_B.id],
});
const NEXT_DRAFT = synth(math, { concept: "ma.zznext", stage: "sh", title: "合成草稿後學", status: "draft", prerequisites: [HUB.id] });
const NEXT = synth(math, { concept: "ma.zznextpub", stage: "sh", title: "合成已發布後學", status: "published", prerequisites: [HUB.id] });
const CLEAN = synth(math, { concept: "ma.zzclean", stage: "jh", title: "合成無草稿點", status: "published", prerequisites: [PRE.id], related: [REL.id] });

const POINTS = [PRE, PRE_DRAFT, REL, REL_DRAFT_A, REL_DRAFT_B, HUB, NEXT_DRAFT, NEXT, CLEAN];
const DRAFTS = POINTS.filter((point) => point.status === "draft");
const PATH_MIXED: LearningPath = {
  id: "ma.zzpath",
  title: "合成主線",
  disciplineFolder: "math",
  disciplineTitle: "數學",
  knowledgePointIds: [PRE.id, PRE_DRAFT.id, HUB.id, NEXT_DRAFT.id, NEXT.id],
};
const PATH_ALL_DRAFT: LearningPath = { ...PATH_MIXED, id: "ma.zzpathdraft", title: "合成草稿主線", knowledgePointIds: [PRE_DRAFT.id, NEXT_DRAFT.id] };
const PATH_CLEAN: LearningPath = { ...PATH_MIXED, id: "ma.zzpathclean", title: "合成乾淨主線", knowledgePointIds: [PRE.id, HUB.id] };

const all = catalog(POINTS, [PATH_MIXED, PATH_ALL_DRAFT, PATH_CLEAN]);
const visible = publishedOnly(all);

function href(point: KnowledgePoint): string {
  return knowledgePointPath(point.concept, point.stage);
}

function assertNoDraft(html: string, drafts: KnowledgePoint[] = DRAFTS) {
  for (const draft of drafts) {
    assert.equal(html.includes(draft.title), false, `${draft.id} 標題外洩`);
    assert.equal(html.includes(`href="${href(draft)}"`), false, `${draft.id} 連結外洩`);
  }
}

function assertShown(html: string, points: KnowledgePoint[]) {
  for (const point of points) {
    assert.ok(html.includes(point.title), `${point.id} 標題該出現`);
    assert.ok(html.includes(`href="${href(point)}"`), `${point.id} 連結該出現`);
  }
}

function count(html: string, text: string): number {
  return html.split(text).length - 1;
}

test("合成內容的前提：草稿真的被過濾、已發布的都在", () => {
  assert.deepEqual(
    visible.points.map((point) => point.id).sort(),
    POINTS.filter((point) => point.status === "published").map((point) => point.id).sort(),
  );
  assert.equal(DRAFTS.length, 4);
});

test("舊版詳細頁：先備與連結各寫出草稿筆數，不露出草稿標題與網址", () => {
  const html = renderToStaticMarkup(createElement(KnowledgePointView, { point: HUB, all, visible }));
  // 先備 1 筆草稿、相關 2 筆草稿，分開寫。
  assert.equal(count(html, "另有 1 個知識點尚未發布"), 1);
  assert.equal(count(html, "另有 2 個知識點尚未發布"), 1);
  assert.equal(count(html, "尚未發布"), 2);
  assertShown(html, [PRE, REL, NEXT]);
  // 「把這裡當先備」只列看得到的點；草稿後學整筆不出現（舊版不計數）。
  assertNoDraft(html);
});

test("舊版詳細頁：沒有草稿時不出現「尚未發布」", () => {
  const html = renderToStaticMarkup(createElement(KnowledgePointView, { point: CLEAN, all, visible }));
  assert.equal(html.includes("尚未發布"), false);
  assertShown(html, [PRE, REL]);
});

test("V2 PointLinks：只寫筆數，不帶草稿標題與網址", () => {
  const related = renderToStaticMarkup(
    createElement(PointLinks, { ids: HUB.links.related, all, visible, currentFolder: "math", empty: "" }),
  );
  assert.equal(count(related, "另有 2 個尚未發布"), 1);
  assertShown(related, [REL]);
  assertNoDraft(related);

  // 全部都是草稿：沒有任何連結，只剩提示；不能落到 empty 文字。
  const onlyDrafts = renderToStaticMarkup(
    createElement(PointLinks, { ids: [REL_DRAFT_A.id, REL_DRAFT_B.id], all, visible, currentFolder: "math", empty: "沒有" }),
  );
  assert.equal(count(onlyDrafts, "另有 2 個尚未發布"), 1);
  assert.equal(onlyDrafts.includes("沒有"), false);
  assert.equal(onlyDrafts.includes("href="), false);

  const clean = renderToStaticMarkup(
    createElement(PointLinks, { ids: [REL.id], all, visible, currentFolder: "math", empty: "" }),
  );
  assert.equal(clean.includes("尚未發布"), false);
});

test("V2 學習順序：先學與後學都把草稿算進筆數", () => {
  const html = renderToStaticMarkup(createElement(SeqPanel, { point: HUB, all, visible }));
  // 先學 1 筆（PRE_DRAFT）、後學 1 筆（NEXT_DRAFT，後學讀完整內容的 requiredBy，所以會計數）。
  assert.equal(count(html, "另有 1 個尚未發布"), 2);
  assertShown(html, [PRE, NEXT]);
  assertNoDraft(html);
});

test("主線頁：寫出隱藏筆數，草稿不列、不連；全部是草稿時另有提示", () => {
  const mixed = renderToStaticMarkup(createElement(LearningPathView, { path: PATH_MIXED, all, visible }));
  assert.equal(count(mixed, "還有 2 筆尚未發布，正式站先不列出。"), 1);
  assertShown(mixed, [PRE, HUB, NEXT]);
  assertNoDraft(mixed);

  const drafts = renderToStaticMarkup(createElement(LearningPathView, { path: PATH_ALL_DRAFT, all, visible }));
  assert.equal(count(drafts, "還有 2 筆尚未發布，正式站先不列出。"), 1);
  assert.ok(drafts.includes("這條主線的知識點都還沒發布。"));
  assertNoDraft(drafts);

  const clean = renderToStaticMarkup(createElement(LearningPathView, { path: PATH_CLEAN, all, visible }));
  assert.equal(clean.includes("尚未發布"), false);
});

test("帶草稿的內容（KP_INCLUDE_DRAFTS）就不出現提示，證明數字來自草稿過濾", () => {
  const withDrafts = visibleCatalog(all, true);
  const v1 = renderToStaticMarkup(createElement(KnowledgePointView, { point: HUB, all, visible: withDrafts }));
  assert.equal(v1.includes("尚未發布"), false);
  assert.ok(v1.includes(PRE_DRAFT.title));
  const v2 = renderToStaticMarkup(createElement(SeqPanel, { point: HUB, all, visible: withDrafts }));
  assert.equal(v2.includes("尚未發布"), false);
  const path = renderToStaticMarkup(createElement(LearningPathView, { path: PATH_MIXED, all, visible: withDrafts }));
  assert.equal(path.includes("尚未發布"), false);
});

test("溝通與解決問題旗標打開時，跨學門的軟實力草稿仍只算筆數（只靠草稿過濾）", () => {
  const saved = { kp: process.env.KP_ENABLED, soft: process.env.KP_SOFTSKILLS_ENABLED };
  process.env.KP_ENABLED = "true";
  process.env.KP_SOFTSKILLS_ENABLED = "true";
  try {
    const soft = template("soft-skills");
    const skPub = synth(soft, { concept: "sk.zzpub", stage: "jh", title: "合成已發布軟實力", status: "published" });
    const skDraft = synth(soft, { concept: "sk.zzdraft", stage: "sh", title: "合成草稿軟實力", status: "draft" });
    const hub = synth(math, { concept: "ma.zzskhub", stage: "jh", title: "合成跨學門點", status: "published", related: [skPub.id, skDraft.id] });
    const skAll = catalog([skPub, skDraft, hub]);
    const skVisible = publishedOnly(skAll);
    const v1 = renderToStaticMarkup(createElement(KnowledgePointView, { point: hub, all: skAll, visible: skVisible }));
    assert.equal(count(v1, "另有 1 個知識點尚未發布"), 1);
    assertShown(v1, [skPub]);
    assertNoDraft(v1, [skDraft]);
    const v2 = renderToStaticMarkup(
      createElement(PointLinks, { ids: hub.links.related, all: skAll, visible: skVisible, currentFolder: "math", empty: "" }),
    );
    assert.equal(count(v2, "另有 1 個尚未發布"), 1);
    assertShown(v2, [skPub]);
    assertNoDraft(v2, [skDraft]);
  } finally {
    if (saved.kp === undefined) delete process.env.KP_ENABLED;
    else process.env.KP_ENABLED = saved.kp;
    if (saved.soft === undefined) delete process.env.KP_SOFTSKILLS_ENABLED;
    else process.env.KP_SOFTSKILLS_ENABLED = saved.soft;
  }
});
