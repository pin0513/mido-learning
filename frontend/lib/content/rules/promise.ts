/**
 * 承諾用語：學習時間與效果的保證（「三天學會」「保證進步」「成績提升 30%」）。
 * 2026-10-30 決定先當警告，不擋 CI、不擋發布。之後要升級成錯誤，只要把呼叫端改推到 errors。
 *
 * 同一個字串裡有「示意」「本站建議」，或帶出處（「」引文、根據、研究、調查、統計、指出），就不算承諾。
 * 掃描範圍是讀者看得到的文字；sources、id、代碼、連結、驗證備註、est_time（schema 已要求帶 source）不掃。
 */
import { isRecord } from "./util";

const EFFECT = "(?:學會|看懂|聽懂|讀懂|搞懂|上手|掌握|精通|進步|提升|提高|見效|記住|背熟|背完|考上|考好|變好|改善)";
const NUMBER = "(?:[0-9０-９]+(?:\\.[0-9]+)?|[一二兩三四五六七八九十百半幾]+)";
const DURATION = "(?:秒|分鐘|小時|天|日|週|周|星期|個月|年)";

export const PROMISE_PATTERNS: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  { id: "guarantee", pattern: /(?<![不沒未無難].{0,2})(?:保證|包準|包會|穩上|必上)/u },
  { id: "certain-effect", pattern: new RegExp(`(?<![不沒未無難].{0,2})(?:一定|絕對|肯定|必定)(?:能|會|可以)?${EFFECT}`, "u") },
  { id: "fast-effect", pattern: new RegExp(`(?:馬上|立刻|立即|輕鬆|快速|很快)(?:就)?(?:能|會|可以)?${EFFECT}`, "u") },
  {
    id: "time-effect",
    pattern: new RegExp(`${NUMBER}\\s*${DURATION}(?:內|之內|以內|後)?(?:就)?(?:能|可以|會|即可|便能)?${EFFECT}`, "u"),
  },
  {
    id: "quantified-effect",
    pattern: new RegExp(`(?:提升|提高|增加|進步|成長)\\s*(?:[0-9０-９.]+\\s*(?:%|％|倍|分)|[一二三四五六七八九十兩]+\\s*(?:成|倍))`, "u"),
  },
];

const HEDGES = /示意|本站建議|「[^」]+」|根據|研究|調查|統計|指出/u;

/** 不掃的欄位：結構、代碼、出處本身、內部備註。 */
const SKIP_KEYS = new Set([
  "id",
  "concept",
  "status",
  "version",
  "updated",
  "authors",
  "discipline",
  "stage",
  "curriculum_108",
  "links",
  "prerequisites",
  "sources",
  "source",
  "est_time",
  "verify_notes",
  "to_verify",
  "competency",
  "audience",
  "type",
  "code",
]);

export interface PromiseHit {
  /** 欄位路徑，例如 how.body[2]。 */
  field: string;
  match: string;
  rule: string;
}

export function findPromiseWording(raw: unknown): PromiseHit[] {
  const hits: PromiseHit[] = [];
  const visit = (value: unknown, field: string): void => {
    if (typeof value === "string") {
      if (HEDGES.test(value)) return;
      for (const { id, pattern } of PROMISE_PATTERNS) {
        const found = pattern.exec(value);
        if (found) {
          hits.push({ field, match: found[0], rule: id });
          return;
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${field}[${index}]`));
      return;
    }
    if (isRecord(value)) {
      for (const [key, child] of Object.entries(value)) {
        if (SKIP_KEYS.has(key)) continue;
        visit(child, field ? `${field}.${key}` : key);
      }
    }
  };
  visit(raw, "");
  return hits;
}

export function checkPromiseWording(ref: string, raw: unknown): string[] {
  return findPromiseWording(raw).map(
    (hit) => `${ref}: ${hit.field} 有承諾用語「${hit.match}」，請加「示意」「本站建議」或附上來源（警告）`,
  );
}
