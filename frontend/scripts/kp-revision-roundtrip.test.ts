import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { walkYaml } from "../lib/content/load";
import { parse } from "yaml";
import { yamlToRecord } from "../lib/content/revision";
import { CONTENT_DIR, checkComments, runRoundTrip } from "./kp-revision-roundtrip";

test("每一個知識點 YAML → 修訂版 → YAML 無損，V2 主欄與側欄一字不差", (t) => {
  const report = runRoundTrip();
  assert.deepEqual(report.failures, []);
  assert.equal(report.total, walkYaml(join(CONTENT_DIR, "knowledge")).length);
  assert.ok(report.total > 0);
  assert.equal(report.dataLossless, report.total);
  assert.equal(report.renderIdentical, report.total);
  assert.equal(report.revisionErrors, report.yamlErrors);
  assert.equal(report.revisionWarnings, report.yamlWarnings);
  assert.ok(report.filesWithComments > 0);
  assert.equal(report.commentsCaptured, report.commentLines + report.inlineComments);
  t.diagnostic(
    `註解：${report.filesWithComments} 個檔、${report.commentLines} 行以 # 開頭，逐字抽到 ${report.commentsCaptured} 筆（行尾 ${report.inlineComments}）`,
  );
  t.diagnostic(
    `${report.total} 點資料無損、${report.renderedPages} 頁主欄與側欄相同；警告 ${report.yamlWarnings} → ${report.revisionWarnings}`,
  );
});

test("比對抓得到差異：改一個字就會報出來", () => {
  const report = runRoundTrip({
    mutate: (record) => {
      if (record.kpId === "pm.agile@sh" && record.revision.why) {
        record.revision.why = record.revision.why.replace("先做小版本", "先做大版本");
      }
      if (record.kpId === "pm.breakdown@es" && record.revision.sources?.[0]) {
        record.revision.sources[0].publisher += "（改）";
      }
      return record;
    },
  });
  const text = report.failures.join("\n");
  assert.match(text, /pm\.agile\/sh\.yaml: YAML → 修訂版 → YAML 的資料不同/);
  assert.match(text, /pm\.agile@sh（含草稿）: 主欄不同/);
  assert.match(text, /pm\.breakdown@es（含草稿）: 側欄不同/);
  assert.equal(report.dataLossless, report.total - 2);
  assert.equal(report.renderIdentical, report.total - 2);
});

test("註解比對抓得到漏抽與改字", () => {
  const file = walkYaml(join(CONTENT_DIR, "knowledge")).find((path) => /^\s*#/m.test(readFileSync(path, "utf8")));
  assert.ok(file);
  const text = readFileSync(file, "utf8");
  const raw = parse(text);
  const record = yamlToRecord(raw, "x", { sourceText: text });
  assert.deepEqual(checkComments(text, raw, record), []);
  const notes = record.revision.importNotes;
  assert.ok(notes && notes.comments.length > 0);

  const dropped = structuredClone(record);
  dropped.revision.importNotes?.comments.splice(0, 1);
  const missing = checkComments(text, raw, dropped);
  assert.ok(missing.includes(`第 ${notes.comments[0].line} 行的註解沒抽到`));
  assert.ok(missing.includes("挖掉抽到的註解後，原文還有註解"));

  const edited = structuredClone(record);
  const first = edited.revision.importNotes?.comments[0];
  assert.ok(first);
  first.text += "（改）";
  assert.match(checkComments(text, raw, edited).join("\n"), /不是這段註解/);
});
