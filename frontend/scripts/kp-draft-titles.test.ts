import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadContent } from "../lib/content/load";
import { readHead, scan, unquote } from "./kp-draft-titles.mjs";

const CONTENT = join(process.cwd(), "content");

test("kp-draft-titles 讀到的 id、title、status、學門資料夾和正式 loader 一致（每個點）", () => {
  const { model, errors } = loadContent(CONTENT);
  assert.deepEqual(errors, []);
  assert.ok(model);
  const { points, errors: scanErrors } = scan(join(CONTENT, "knowledge"));
  assert.deepEqual(scanErrors, []);
  const got = new Map(points.map((p) => [p.id, { title: p.title, status: p.status, folder: p.folder }]));
  assert.equal(got.size, model.points.length);
  for (const point of model.points) {
    assert.deepEqual(got.get(point.id), { title: point.title, status: point.status, folder: point.folder }, point.id);
  }
});

test("有草稿時列出它；沒有 status／title 的檔要報錯，不是當成沒有草稿", () => {
  const dir = mkdtempSync(join(tmpdir(), "kp-draft-titles-"));
  try {
    mkdirSync(join(dir, "x", "x.a"), { recursive: true });
    writeFileSync(join(dir, "x", "x.a", "es.yaml"), "# 註解 status: published\nid: x.a@es\ntitle: '草稿：別露出'\nstatus: draft # 還沒寫完\nlinks:\n  title: 不是最上層\n");
    writeFileSync(join(dir, "x", "x.a", "jh.yaml"), "id: x.a@jh\ntitle: \"已發布\"\nstatus: published\n");
    writeFileSync(join(dir, "x", "x.a", "sh.yaml"), "id: x.a@sh\n  title: 縮排的不算\n");
    const { points, errors } = scan(dir);
    assert.deepEqual(
      points.filter((p) => p.status === "draft").map((p) => [p.id, p.folder, p.title]),
      [["x.a@es", "x", "草稿：別露出"]],
    );
    assert.equal(points.length, 2);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /sh\.yaml$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unquote 處理單引號、雙引號與行尾註解", () => {
  assert.equal(unquote(" 'it''s'"), "it's");
  assert.equal(unquote(' "a \\"b\\""'), 'a "b"');
  assert.equal(unquote(" draft # 註解"), "draft");
  assert.equal(readHead("id: a\ntitle: b\n"), null);
});
