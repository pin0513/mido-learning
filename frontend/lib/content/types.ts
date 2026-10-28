export const CORE_CODES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"] as const;
export const STAGE_IDS = ["es", "jh", "sh", "uni"] as const;
export const LAYER_IDS = ["essence", "foundation", "advanced", "applied"] as const;
export const AUDIENCE_IDS = ["kid", "adult", "family"] as const;

export type CoreCode = (typeof CORE_CODES)[number];
export type StageId = (typeof STAGE_IDS)[number];
export type AudienceId = (typeof AUDIENCE_IDS)[number];
export type KnowledgeStatus = "draft" | "review" | "published";

export interface StageInfo {
  id: string;
  name: string;
  grades: number[];
  /** 108 課綱學習階段。國小 1–3、國中 4、高中 5。大學是空的。 */
  learningStages: number[];
  curriculum108: boolean;
  rank: number;
}

/** 學科樹的縱向層級：本質 → 基礎 → 進階 → 應用。和階段是兩條軸，都要能單獨瀏覽。 */
export interface LayerInfo {
  id: string;
  name: string;
  /** 簡稱。詳細頁的「層級」用這個字，這一輪還沒有接到畫面上。 */
  shortName: string;
  role: string;
}

export interface CurriculumCode {
  code: string;
  stage: number;
  text: string;
  sourceUrl: string;
  sourcePage: number;
}

export interface KnowledgeSource {
  id?: string;
  title: string;
  publisher: string;
  url: string;
  accessed: string;
  kind: string;
  supports: string;
}

export interface CircleItem {
  title: string;
  text: string;
  example?: string;
  code?: string;
}

export interface CirclePart {
  heading: string;
  body: string[];
  sources: string[];
  items: CircleItem[];
  checklist: string[];
  figures: string[];
  notes: string[];
  activityFigure?: string;
  qa?: { question: string; answer: string; source: string };
}

export interface KnowledgeFigure {
  id: string;
  type: string;
  source?: string;
}

export interface CoreCompetencyInfo {
  code: string;
  facet: string;
  name: string;
}

export interface DisciplineNode {
  id: string;
  name: string;
  layer: string;
  summary?: string;
  idPrefix?: string;
  contentFolder?: string;
  children: DisciplineNode[];
}

export interface Taxonomy {
  stages: Map<string, StageInfo>;
  stageList: StageInfo[];
  layers: Set<string>;
  layerList: LayerInfo[];
  curriculumCodes: Map<string, CurriculumCode>;
  domains: Set<string>;
  coreCodes: Set<string>;
  coreCompetencies: CoreCompetencyInfo[];
  issues: Set<string>;
  generalist: Set<string>;
  specialist: Set<string>;
  crosscutting: Set<string>;
  formatIds: Set<string>;
  roots: DisciplineNode[];
}

export interface KnowledgeLinks {
  why: string[];
  how: string[];
  related: string[];
  deeper: string[];
}

export interface KnowledgePoint {
  file: string;
  id: string;
  concept: string;
  title: string;
  status: KnowledgeStatus;
  version: string;
  disciplinePath: string[];
  layer: string;
  crosscutting: string[];
  folder: string;
  stage: string;
  grades: number[];
  curriculum108?: {
    domains: string[];
    coreCompetencies: string[];
    issues: string[];
    performances?: string[];
    contents?: string[];
  };
  estTime?: { school: string; source: string };
  why?: CirclePart;
  how?: CirclePart;
  what?: CirclePart;
  /** 只有 YAML 真的寫了才掛上，避免既有頁面的資料形狀被空陣列改掉。 */
  figures?: KnowledgeFigure[];
  sources?: KnowledgeSource[];
  toVerify: boolean;
  verifyNotes: string[];
  prerequisites: string[];
  links: KnowledgeLinks;
  linkNotes: string;
  specialist: string[];
  generalist: string[];
  delegable: string[];
  humanExperience: string[];
  idea: string;
  /** 選填。一句目標。 */
  goal?: string;
  /** 選填。家長看得到的檢核。 */
  review?: string;
  guidingQuestions: string[];
  scenario: string;
  slides: string[];
  article?: string;
  exercise?: string;
  project?: string;
  aiPrompt?: string;
  game?: string;
  audience: AudienceId[];
  authors: string[];
  updated: string;
}

export interface LearningPath {
  id: string;
  title: string;
  disciplineFolder: string;
  disciplineTitle: string;
  knowledgePointIds: string[];
  colearn?: string;
}

export interface ContentModel {
  taxonomy: Taxonomy;
  points: KnowledgePoint[];
  paths: LearningPath[];
}

export interface PathNeighbor {
  pathId: string;
  pathTitle: string;
  disciplineFolder: string;
  disciplineTitle: string;
  colearn?: string;
  previousId: string | null;
  nextId: string | null;
}

export interface ContentIndexes {
  byId: Map<string, KnowledgePoint>;
  byDiscipline: Map<string, KnowledgePoint[]>;
  byStage: Map<string, KnowledgePoint[]>;
  byLayer: Map<string, KnowledgePoint[]>;
  byCompetency: Map<string, KnowledgePoint[]>;
  /** 誰把這個 id 列為先備。 */
  requiredBy: Map<string, string[]>;
  /** 這筆知識點在每條主線上的前一筆與後一筆（只計目前看得到的知識點）。 */
  neighbors: Map<string, PathNeighbor[]>;
  pathsById: Map<string, LearningPath>;
  pathsByDiscipline: Map<string, LearningPath[]>;
}
