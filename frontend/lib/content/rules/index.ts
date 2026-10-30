/**
 * kp-rules：知識點規則包。
 *
 * 輸入是記憶體裡、符合 content/schema/knowledge-point.schema.json 形狀的普通物件；
 * 不讀檔、不連資料庫、不 import server-only。YAML 載入器（../load.ts）、CI 驗證腳本、
 * 以及之後的 kp-rules 服務與 API 草稿／送審／發布都用同一份。規格見 docs/kp-db-restructure.md。
 *
 * - checkPoint：單點規則（儲存草稿、送審時跑）
 * - checkPoints：逐點規則＋重複 id、補件清單、引用存在、先備循環（發布時跑）
 * - checkPaths：主線順序（發布、改主線時跑）
 */
export { checkPaths, checkPoints, checkReferences, findCycles } from "./catalog";
export { circleHasContent, readCircle, readFigures, readSources } from "./normalize";
export { EXCLUDED_DOMAINS, ajvMessages, checkPoint, resolvePath } from "./point";
export { PROMISE_PATTERNS, checkPromiseWording, findPromiseWording, type PromiseHit } from "./promise";
export type {
  KpDocument,
  KpLocation,
  PathDocument,
  PathsResult,
  PointResult,
  PointsResult,
  RuleContext,
  RuleResult,
} from "./types";
export { asStringArray, isRecord, optionalString } from "./util";
