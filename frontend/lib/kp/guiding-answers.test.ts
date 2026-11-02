import assert from "node:assert/strict";
import test from "node:test";
import type { CirclePart } from "../content/types";
import { guidingAnswers } from "./guiding-answers";

function part(qa?: CirclePart["qa"]): CirclePart {
  return { heading: "h", body: [], sources: [], items: [], checklist: [], figures: [], notes: [], qa };
}

test("answers from all three circles, keyed by question, in why/how/what order", () => {
  const answers = guidingAnswers({
    why: part({ question: "Q1", answer: "A1", source: "s" }),
    how: part({ question: "Q2", answer: "A2", source: "s" }),
    what: part({ question: "Q3", answer: "A3", source: "s" }),
  });
  assert.deepEqual([...answers], [["Q1", "A1"], ["Q2", "A2"], ["Q3", "A3"]]);
});

test("how/what answers are kept even when why has none (the dropped case)", () => {
  const answers = guidingAnswers({ why: part(), how: part({ question: "Q2", answer: "A2", source: "s" }), what: undefined });
  assert.deepEqual([...answers], [["Q2", "A2"]]);
});

test("first answer wins for a repeated question; empty answers and missing circles are skipped", () => {
  const answers = guidingAnswers({
    why: part({ question: "Q", answer: "first", source: "s" }),
    how: part({ question: "Q", answer: "second", source: "s" }),
    what: part({ question: "Q9", answer: "", source: "s" }),
  });
  assert.deepEqual([...answers], [["Q", "first"]]);
  assert.equal(guidingAnswers({ why: undefined, how: undefined, what: undefined }).size, 0);
});
