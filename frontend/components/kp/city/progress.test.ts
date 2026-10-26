import assert from "node:assert/strict";
import { test } from "node:test";
import { demoProgress, emptyStoredProgress, toSnapshot, together } from "./progress";

test("範例進度標明是假資料，兩人一起到過的建築才算共學", () => {
  const snap = demoProgress.read();
  assert.match(snap.notice, /範例資料/);
  assert.equal(snap.child.at, "pm.breakdown@es");
  assert.equal(snap.adult.at, "pm.estimate@sh");
  assert.equal(together(snap, "pm.breakdown@es"), true);
  assert.equal(together(snap, "pm.estimate@sh"), false);
});

test("本機記號轉成 snapshot，清成空的就不再共學", () => {
  const stored = emptyStoredProgress();
  stored.adultName = "爸爸";
  stored.childName = "小明";
  stored.childAt = "ma.number@es";
  stored.adultVisited = ["ma.number@es"];
  const snap = toSnapshot(stored);
  assert.equal(snap.kind, "local");
  assert.equal(snap.adult.name, "爸爸");
  assert.doesNotMatch(snap.notice, /範例資料/);
  assert.equal(together(snap, "ma.number@es"), true);
  assert.equal(together(toSnapshot(emptyStoredProgress()), "ma.number@es"), false);
});
