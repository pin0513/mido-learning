import type { AudienceId, KnowledgeStatus } from "../types";

/**
 * 資料庫形式的知識點（docs/kp-db-restructure.md 第 3 節）。
 *
 * - `KpRecord` 是轉換器的輸出：`knowledge_points/{kpId}` 上的 id 與狀態，加上一份修訂版內容。
 * - `KpRevisionContent` 是 `knowledge_points/{kpId}/revisions/{n}` 裡和內容有關的欄位。
 *   n、修訂版狀態、validation、作者 uid、發布者與時間等由 API 寫，不在轉換器的範圍。
 *
 * 所有欄位都是 JSON 值：沒有 undefined、沒有陣列直接套陣列，可以原樣寫進 Firestore。
 * 選填欄位「沒寫」與「寫了空陣列」是兩回事，轉換時兩者都保留。
 */
export interface KpRecord {
  /** 文件 id，等於 YAML 的 id（例如 pm.agile@sh）。 */
  kpId: string;
  /** 知識點的狀態（YAML 的 status），存在 knowledge_points/{kpId}.status。 */
  status: KnowledgeStatus;
  revision: KpRevisionContent;
}

export interface KpRevisionContent {
  structure: KpStructure;
  lead: KpLead;
  /** 第 4 節的 Markdown。YAML 沒有這一圈就沒有這個欄位。 */
  why?: string;
  how?: string;
  what?: string;
  /** 沿用 YAML 圖的 JSON 結構，原樣保存。 */
  figures?: Record<string, unknown>[];
  /** 沿用 YAML 來源的欄位。核對紀錄（verifiedBy、verifiedAt）由 API 在發布時加，不在這裡。 */
  sources?: KpSource[];
}

export interface KpStructure {
  concept: string;
  title: string;
  /** YAML 的 version（字串，例如 "0.2"）。 */
  version: string;
  discipline: { path: string[]; layer: string; crosscutting: string[] };
  stage: { level: string; grades?: number[] };
  /** 只存代碼；代碼文字從 Git 的參考資料查。大學沒有這個欄位。 */
  curriculum108?: {
    domains: string[];
    coreCompetencies: string[];
    issues: string[];
    performances?: string[];
    contents?: string[];
  };
  toVerify: boolean;
  verifyNotes: string[];
  prerequisites: string[];
  links: { why: string[]; how: string[]; related: string[]; deeper: string[] };
  linkNotes: string;
  competency: { specialist: string[]; generalist: string[] };
  ai: { delegable: string[]; humanExperience: string[] };
  audience?: AudienceId[];
  estTime?: { school: string; source: string };
  /** 教材形式。slides 之後由 kp_material_links 取代；這一階段原樣保存。 */
  formats: {
    slides: string[];
    article?: string;
    exercise?: string;
    project?: string;
    aiPrompt?: string;
    game?: string;
  };
  authors: string[];
  /** YYYY-MM-DD。 */
  updated: string;
}

export interface KpLead {
  idea: string;
  goal?: string;
  scenario: string;
  review?: string;
  guidingQuestions: string[];
}

export interface KpSource {
  id?: string;
  title: string;
  publisher: string;
  url: string;
  accessed: string;
  kind: string;
  supports: string;
}

/** 轉換失敗（YAML 有轉換器不認得的欄位，或 Markdown 寫錯）。訊息開頭是文件名稱。 */
export class ConvertError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join("\n"));
    this.name = "ConvertError";
  }
}
