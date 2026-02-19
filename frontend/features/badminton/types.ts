// ═══════════════════════════════════════════════════
// Badminton Module — Shared Types
// Self-contained: zero external dependencies
// ═══════════════════════════════════════════════════

export type HomeSide = 'left' | 'right';
export type CourtType = 'singles' | 'doubles';
export type TrainMode = 'seq' | 'random' | 'manual' | 'tactic';
export type ZoneKey = 'front' | 'mid' | 'back';
export type DrawMode = 'draw' | 'place' | 'erase';
export type LineDash = 'solid' | 'dashed';
export type EntityType = 'player' | 'ball' | 'annot';

export interface TrainPosition {
  id: string;
  x: number;
  y: number;
  zone: ZoneKey;
  label: string;
}

export interface OppPosition {
  id: string;
  x: number;
  y: number;
}

export interface Zones {
  front: boolean;
  mid: boolean;
  back: boolean;
}

export interface TacticHint {
  shot: string;
  opp: string;
  label: string;
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface StrokeData {
  points: StrokePoint[];
  color: string;
  width: number;
  dash: LineDash;
}

export interface EntityData {
  x: number;
  y: number;
  placed: boolean;
  strokes: StrokeData[];
  color: string;
  label: string;
}

export type UndoActionType = 'stroke' | 'place' | 'erase-marker' | 'erase-stroke';

export interface UndoAction {
  type: UndoActionType;
  entityIndex: number;
  entityType: EntityType;
  data: unknown;
}
