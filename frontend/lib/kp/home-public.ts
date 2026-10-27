import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { isSoftSkillsEnabled } from "./flags";

const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "content", "home-disciplines.yaml");

/** 學門總圖公開哪些學門。設了 KP_HOME_DISCIPLINES 就用它，否則讀 content/home-disciplines.yaml。 */
export function publicDisciplineIds(): string[] {
  const override = process.env.KP_HOME_DISCIPLINES?.trim();
  const raw = override
    ? override.split(",").map((item) => item.trim()).filter((item) => item.length > 0)
    : readDisciplineFile();
  if (isSoftSkillsEnabled()) return raw;
  return raw.filter((id) => id !== "soft-skills" && id !== "language");
}

function readDisciplineFile(): string[] {
  const doc = parse(readFileSync(FILE, "utf8")) as { disciplines?: unknown };
  if (!doc || !Array.isArray(doc.disciplines)) {
    throw new Error("content/home-disciplines.yaml 缺少 disciplines");
  }
  return doc.disciplines.filter((item): item is string => typeof item === "string" && item.length > 0);
}
