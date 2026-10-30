import type { ValidateFunction } from "ajv";
import type { KnowledgePoint, LearningPath, Taxonomy } from "../types";

/**
 * 規則執行時需要的參考資料。分類與 108 代碼仍是 Git 裡的參考資料（2026-10-30 決定），
 * 由呼叫端讀好傳進來；規則包本身不讀檔、不連資料庫。
 */
export interface RuleContext {
  taxonomy: Taxonomy;
  /** 用 content/schema/knowledge-point.schema.json 編好的 Ajv 驗證函式。 */
  validateSchema: ValidateFunction;
  /** sources-backfill.yaml 的 id：來源規則暫時只出警告。 */
  sourcesBackfill: ReadonlySet<string>;
  /** golden-circle-backfill.yaml 的 id：黃金圈規則暫時只出警告。 */
  circleBackfill: ReadonlySet<string>;
}

/** 檔案位置。只有 YAML 有；資料庫文件不帶，學門資料夾改由學科樹推出。 */
export interface KpLocation {
  /** 路徑是不是 knowledge/<學門>/<concept>/<階段>.yaml 的形狀。 */
  wellFormed: boolean;
  folder: string;
  conceptDir: string;
  stageFile: string;
}

/** 一份待驗證的知識點：符合 schema 形狀的普通物件。 */
export interface KpDocument {
  /** 訊息開頭用的名稱。YAML 是 content/ 底下的相對路徑，資料庫可用 knowledge_points/<id>/revisions/<n>。 */
  ref: string;
  raw: unknown;
  location?: KpLocation;
}

export interface RuleResult {
  errors: string[];
  warnings: string[];
}

export interface PointResult extends RuleResult {
  /** 通過 schema 與形狀檢查就有值（其他規則有錯也照樣讀出來，與原本的載入器相同）。 */
  point: KnowledgePoint | null;
}

export interface PointsResult extends RuleResult {
  points: KnowledgePoint[];
}

/** 一份主線文件：content/paths/<學門>.yaml，或之後的 learning_paths。 */
export interface PathDocument {
  ref: string;
  /** 檔名（不含 .yaml）或文件 id，必須等於 raw.id。 */
  docId: string | undefined;
  raw: unknown;
}

export interface PathsResult {
  errors: string[];
  paths: LearningPath[];
}
