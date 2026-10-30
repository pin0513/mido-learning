import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import Ajv, { type AnySchema } from "ajv";
import { parse } from "yaml";
import { loadContent, walkYaml } from "../load";
import { checkPaths, checkPoint, checkPoints, findPromiseWording, type KpDocument, type RuleContext } from "./index";

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "content");

function context(): RuleContext {
  const { model } = loadContent(contentDir);
  assert.ok(model);
  const schema = JSON.parse(readFileSync(join(contentDir, "schema", "knowledge-point.schema.json"), "utf8")) as AnySchema;
  const validateSchema = new Ajv({ allErrors: true, strict: true }).compile(schema);
  const ids = (file: string) => new Set((parse(readFileSync(join(contentDir, file), "utf8")) as { ids?: string[] }).ids ?? []);
  return { taxonomy: model.taxonomy, validateSchema, sourcesBackfill: ids("sources-backfill.yaml"), circleBackfill: ids("golden-circle-backfill.yaml") };
}

/** 模擬資料庫文件：只有物件，沒有檔案位置。 */
function dbDocs(): KpDocument[] {
  return walkYaml(join(contentDir, "knowledge")).map((file) => {
    const raw = parse(readFileSync(file, "utf8")) as { id: string };
    return { ref: `knowledge_points/${raw.id}/revisions/1`, raw };
  });
}

test("沒有檔案位置的文件（資料庫形式）跑同一套規則，錯誤與警告數和 YAML 相同", () => {
  const ctx = context();
  const fromYaml = loadContent(contentDir);
  const fromDb = checkPoints(dbDocs(), ctx);
  assert.deepEqual(fromDb.errors, []);
  assert.equal(fromDb.warnings.length, fromYaml.warnings.length);
  assert.equal(fromDb.points.length, fromYaml.model?.points.length);
  const byId = new Map(fromYaml.model?.points.map((point) => [point.id, point]));
  for (const point of fromDb.points) {
    const yamlPoint = byId.get(point.id);
    assert.ok(yamlPoint);
    // 學門資料夾由學科樹推出，必須和 YAML 所在資料夾一致。
    assert.deepEqual({ ...point, file: yamlPoint.file }, yamlPoint);
  }
});

test("資料庫形式不檢查檔名，但 id 規則照樣擋", () => {
  const ctx = context();
  const [doc] = dbDocs();
  assert.ok(doc);
  const raw = structuredClone(doc.raw) as Record<string, unknown>;
  const level = String((raw.stage as { level: string }).level);
  raw.id = `${String(raw.concept)}@${level === "uni" ? "es" : "uni"}`;
  const result = checkPoint({ ref: "db", raw }, ctx);
  assert.ok(result.errors.some((error) => error.includes("id 必須是")), result.errors.join("\n"));
  assert.ok(!result.errors.some((error) => error.includes("檔名必須是")));
});

test("YAML 形式的位置檢查沿用原本訊息", () => {
  const ctx = context();
  const file = walkYaml(join(contentDir, "knowledge"))[0];
  assert.ok(file);
  const rel = relative(contentDir, file);
  const raw = parse(readFileSync(file, "utf8"));
  const result = checkPoint({ ref: rel, raw, location: { wellFormed: true, folder: "wrong", conceptDir: "x", stageFile: "es" } }, ctx);
  assert.ok(result.errors.some((error) => error.includes("檔名必須是")));
  assert.ok(result.errors.some((error) => error.includes("應放在 knowledge/")));
});

test("承諾用語：時間與效果的保證會被找到", () => {
  for (const text of ["每天練習，三天學會注音", "保證進步", "照著做一定能考上", "10 分鐘就能看懂", "成績提升 30%", "馬上學會"]) {
    assert.equal(findPromiseWording({ idea: text }).length, 1, text);
  }
});

test("承諾用語：有示意、本站建議、引文或否定就不算", () => {
  for (const text of [
    "示意：三天學會注音",
    "本站建議每天 10 分鐘，兩週就能看懂",
    "研究指出，練習三週後就能提升",
    "看過一萬隻白天鵝，還是不能保證天鵝都是白的？",
    "前提可能「guarantee the truth」，也就是保證結論為真",
    "反覆重讀不一定能提升表現",
    "40 分鐘內完成",
  ]) {
    assert.deepEqual(findPromiseWording({ idea: text }), [], text);
  }
  assert.deepEqual(findPromiseWording({ sources: [{ supports: "保證進步" }], est_time: { school: "三天學會" } }), []);
});

test("承諾用語只出警告，不出錯誤", () => {
  const ctx = context();
  const [doc] = dbDocs();
  assert.ok(doc);
  const base = checkPoint(doc, ctx);
  const raw = { ...(doc.raw as Record<string, unknown>), scenario: "保證三天學會" };
  const result = checkPoint({ ref: doc.ref, raw }, ctx);
  assert.deepEqual(result.errors, base.errors);
  assert.equal(result.warnings.length, base.warnings.length + 1);
  assert.match(result.warnings.at(-1) ?? "", /scenario 有承諾用語「保證」/);
});

test("主線規則吃記憶體物件", () => {
  const ctx = context();
  const { points } = checkPoints(dbDocs(), ctx);
  const [first, second] = points.filter((point) => point.folder === "pm-leadership").sort((a, b) => (ctx.taxonomy.stages.get(a.stage)?.rank ?? 0) - (ctx.taxonomy.stages.get(b.stage)?.rank ?? 0));
  assert.ok(first && second);
  const ok = checkPaths([{ ref: "learning_paths/pm", docId: "pm", raw: { id: "pm", title: "t", paths: [{ id: "p", title: "t", knowledge_points: [first.id, second.id] }] } }], ctx.taxonomy, points);
  assert.equal(ok.paths.length, 1);
  const bad = checkPaths([{ ref: "learning_paths/pm", docId: "pm", raw: { id: "pm", title: "t", paths: [{ id: "p", title: "t", knowledge_points: [first.id, "zz.none@es"] }] } }], ctx.taxonomy, points);
  assert.ok(bad.errors.some((error) => error.includes("指向不存在的 id（zz.none@es）")));
  assert.deepEqual(checkPaths([{ ref: "x", docId: "x", raw: [] }], ctx.taxonomy, points).errors, ["x: 無法解析主線"]);
});
