import assert from "node:assert/strict";
import test from "node:test";
import { isKpDetailV2Enabled, isKpEnabled, isSoftSkillsEnabled, isYuwenEnabled } from "./flags";

const KEYS = ["KP_ENABLED", "KP_YUWEN_ENABLED", "KP_SOFTSKILLS_ENABLED", "KP_DETAIL_V2_ENABLED"] as const;

function withEnv(values: Partial<Record<(typeof KEYS)[number], string | undefined>>, run: () => void) {
  const previous = new Map(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("語文旗標只有兩個都是 true 才算開", () => {
  withEnv({ KP_ENABLED: "true", KP_YUWEN_ENABLED: "true" }, () => {
    assert.equal(isYuwenEnabled(), true);
    assert.equal(isKpEnabled(), true);
  });
  withEnv({ KP_ENABLED: "true" }, () => {
    assert.equal(isYuwenEnabled(), false);
  });
  withEnv({ KP_YUWEN_ENABLED: "true" }, () => {
    assert.equal(isYuwenEnabled(), false);
    assert.equal(isKpEnabled(), false);
  });
  withEnv({ KP_ENABLED: "true", KP_YUWEN_ENABLED: "false" }, () => {
    assert.equal(isYuwenEnabled(), false);
  });
  withEnv({ KP_ENABLED: "true", KP_SOFTSKILLS_ENABLED: "true" }, () => {
    assert.equal(isSoftSkillsEnabled(), true);
    assert.equal(isYuwenEnabled(), false);
  });
});

test("詳細頁 V2 只有 KP 與 V2 都是 true 才算開", () => {
  withEnv({ KP_ENABLED: "true", KP_DETAIL_V2_ENABLED: "true" }, () => {
    assert.equal(isKpDetailV2Enabled(), true);
  });
  withEnv({ KP_DETAIL_V2_ENABLED: "true" }, () => {
    assert.equal(isKpDetailV2Enabled(), false);
    assert.equal(isKpEnabled(), false);
  });
  withEnv({ KP_ENABLED: "true" }, () => {
    assert.equal(isKpDetailV2Enabled(), false);
  });
  withEnv({}, () => {
    assert.equal(isKpDetailV2Enabled(), false);
  });
  withEnv({ KP_ENABLED: "true", KP_DETAIL_V2_ENABLED: "false" }, () => {
    assert.equal(isKpDetailV2Enabled(), false);
  });
});
