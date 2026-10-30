import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { walkYaml } from "../lib/content/load";
import { CONTENT_DIR, runRoundTrip } from "./kp-revision-roundtrip";

test("每一個知識點 YAML → 修訂版 → YAML 無損，V2 主欄與側欄一字不差", (t) => {
  const report = runRoundTrip();
  assert.deepEqual(report.failures, []);
  assert.equal(report.total, walkYaml(join(CONTENT_DIR, "knowledge")).length);
  assert.ok(report.total > 0);
  assert.equal(report.dataLossless, report.total);
  assert.equal(report.renderIdentical, report.total);
  assert.equal(report.revisionErrors, report.yamlErrors);
  assert.equal(report.revisionWarnings, report.yamlWarnings);
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
