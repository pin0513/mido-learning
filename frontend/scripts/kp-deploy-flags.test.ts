import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FOLDER_FLAG, flagEnv } from "../e2e/folder-flags";
import { DEFAULT_WORKFLOW, parseFlagList, readFlags } from "./kp-deploy-flags.mjs";

const source = readFileSync(DEFAULT_WORKFLOW, "utf8");

test("deploy-frontend.yml 的 KP_BUILD_FLAGS、KP_RUNTIME_FLAGS 讀得到，列同一組旗標", () => {
  const build = parseFlagList(readFlags(source, "KP_BUILD_FLAGS"));
  const runtime = parseFlagList(readFlags(source, "KP_RUNTIME_FLAGS"));
  assert.deepEqual(build.map(([name]) => name).sort(), runtime.map(([name]) => name).sort());
  // 學門旗標都要在清單裡，不然 build 時那個學門一定是關的。
  for (const flag of ["KP_ENABLED", ...Object.values(FOLDER_FLAG)]) assert.ok(build.some(([name]) => name === flag), flag);
  // 正式站不開 V2（docs/kp-db-restructure.md 第 17.5 節）。
  assert.equal(flagEnv(readFlags(source, "KP_BUILD_FLAGS")).KP_DETAIL_V2_ENABLED, "false");
  assert.equal(flagEnv(readFlags(source, "KP_RUNTIME_FLAGS")).KP_DETAIL_V2_ENABLED, "false");
});

test("讀不到、重複或格式不對就報錯，不回傳空字串", () => {
  assert.equal(readFlags("env:\n  KP_BUILD_FLAGS: \"KP_ENABLED=true,KP_HOME_ENABLED=false\" # 註解\n", "KP_BUILD_FLAGS"), "KP_ENABLED=true,KP_HOME_ENABLED=false");
  assert.throws(() => readFlags("env:\n  OTHER: x\n", "KP_BUILD_FLAGS"), /剛好一行/);
  assert.throws(() => readFlags("env:\n  KP_BUILD_FLAGS: KP_ENABLED=true\n  KP_BUILD_FLAGS: KP_ENABLED=false\n", "KP_BUILD_FLAGS"), /剛好一行/);
  assert.throws(() => readFlags("env:\n  KP_BUILD_FLAGS:\n", "KP_BUILD_FLAGS"), /空的/);
  assert.throws(() => parseFlagList("KP_ENABLED=yes"), /KP_\*=true\|false/);
  assert.throws(() => parseFlagList("FOO=true"), /KP_\*=true\|false/);
  assert.throws(() => parseFlagList("KP_ENABLED=true, KP_HOME_ENABLED=true"), /KP_\*=true\|false/);
});

test("flagEnv：沒給清單就是旗標全關", () => {
  assert.deepEqual(flagEnv(undefined), {});
  assert.deepEqual(flagEnv(""), {});
  assert.deepEqual(flagEnv("KP_ENABLED=true,KP_YUWEN_ENABLED=false"), { KP_ENABLED: "true", KP_YUWEN_ENABLED: "false" });
});
