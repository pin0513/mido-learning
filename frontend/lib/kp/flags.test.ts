import assert from "node:assert/strict";
import test from "node:test";
import { isKpEnabled, isSoftSkillsEnabled, isYuwenEnabled } from "./flags";

const KEYS = ["KP_ENABLED", "KP_YUWEN_ENABLED", "KP_SOFTSKILLS_ENABLED"] as const;

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
