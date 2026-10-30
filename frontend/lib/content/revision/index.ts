/**
 * YAML 知識點 ⇄ 資料庫修訂版的轉換器（P1）。規格見 docs/kp-db-restructure.md 第 3、4 節。
 * 不讀檔、不連資料庫、不 import server-only；驗證交給 ../rules。
 */
export {
  checkRecord,
  checkRecords,
  recordRef,
  recordToYaml,
  recordToYamlText,
  yamlText,
  yamlToRecord,
  type YamlToRecordOptions,
} from "./convert";
export { blankComments, extractComments, importAuditEntry, importNotesFor, type ImportAuditEntry } from "./comments";
export { circleToMarkdown, encodeLine, markdownToCircle } from "./markdown";
export {
  ConvertError,
  type KpImportNotes,
  type KpLead,
  type KpRecord,
  type KpRevisionContent,
  type KpSource,
  type KpSourceComment,
  type KpStructure,
} from "./types";
