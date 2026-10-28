import assert from "node:assert/strict";
import test from "node:test";
import { loadCatalog } from "../content/catalog";
import { buildHomeDiagram } from "./home-diagram";
import { publicDisciplineIds } from "./home-public";
import { canonicalLanguageBranch, readHomeState } from "./home-state";

function params(query: Record<string, string>) {
  return { get: (name: string) => query[name] ?? null };
}

test("舊的 b=en 與 b=ja 對到新的線", () => {
  assert.equal(canonicalLanguageBranch("en"), "en-talk");
  assert.equal(canonicalLanguageBranch("ja"), "ja-read");
  assert.equal(canonicalLanguageBranch("en-talk"), null);
  assert.equal(canonicalLanguageBranch("basic"), null);
  assert.equal(canonicalLanguageBranch(null), null);
});

test("語文的線：沒有 b、舊網址、未知值都落到對的線", () => {
  const model = buildHomeDiagram(loadCatalog(), publicDisciplineIds(), true, true);
  const state = (query: Record<string, string>) => readHomeState(model, params(query));
  assert.equal(state({ d: "language" }).branchId, "basic");
  assert.equal(state({ d: "language", b: "en" }).branchId, "en-talk");
  assert.equal(state({ d: "language", b: "ja" }).branchId, "ja-read");
  assert.equal(state({ d: "language", b: "xyz" }).branchId, "basic");
  assert.equal(state({ d: "language", b: "talk" }).branchId, "basic");
  assert.equal(state({ d: "language", b: "write" }).branchId, "write");
  assert.equal(state({ d: "soft-skills", b: "basic" }).branchId, "talk");
  assert.equal(state({ d: "soft-skills" }).branchId, "talk");
  assert.equal(state({ d: "soft-skills", b: "emp" }).branchId, "emp");
});

test("語文沒上線時，d=language 回到預設學門", () => {
  const model = buildHomeDiagram(loadCatalog(), publicDisciplineIds(), true, false);
  const state = readHomeState(model, params({ d: "language", b: "en" }));
  assert.notEqual(state.disciplineId, "language");
  assert.equal(state.disciplineId, model.defaultDisciplineId);
  assert.equal(model.disciplines.find((item) => item.id === "language")?.ready, false);
});
