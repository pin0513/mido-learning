import assert from "node:assert/strict";
import test from "node:test";
import { folderLaunched, FOLDER_FLAG } from "../../e2e/folder-flags";
import { isFolderLaunched } from "../content/catalog";

// B28 第 4 輪（P3）：e2e/folder-flags.ts 抄了 isFolderLaunched 的學門旗標，這裡確認兩邊沒有漂移。
const KEYS = ["KP_ENABLED", "KP_SOFTSKILLS_ENABLED", "KP_YUWEN_ENABLED"] as const;
const FOLDERS = ["soft-skills", "language", "math", "it-ai", "philosophy", "pm-leadership", "no-such-folder"];

test("e2e 的學門旗標和 isFolderLaunched 在每種旗標組合都一致", () => {
  const previous = new Map(KEYS.map((key) => [key, process.env[key]]));
  try {
    for (let mask = 0; mask < 1 << KEYS.length; mask += 1) {
      KEYS.forEach((key, i) => {
        if (mask & (1 << i)) process.env[key] = "true";
        else delete process.env[key];
      });
      for (const folder of FOLDERS) {
        assert.equal(folderLaunched(folder, process.env), isFolderLaunched(folder), `${folder} mask=${mask}`);
      }
    }
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("e2e 的旗標表只列有旗標的學門", () => {
  assert.deepEqual(Object.keys(FOLDER_FLAG).sort(), ["language", "soft-skills"]);
});
