// ═══════════════════════════════════════════════════
// Badminton Module — Shared Constants
// ═══════════════════════════════════════════════════

// Court dimensions (meters)
export const COURT_W = 13.4;
export const COURT_H = 6.1;
export const NET_X = COURT_W / 2; // 6.7

// Service lines
export const SHORT_SERVICE_LINE = 1.98; // distance from net
export const LONG_SERVICE_LINE = 0.76;  // distance from back
export const SIDE_MARGIN = 0.46;

// Gravity-breaking tactics: myPosition[i] → oppBestTargets[0], oppFallback[1]
// Indices: 0=FL, 1=FR, 2=ML, 3=MR, 4=BL, 5=BR
export const TACTICS_MAP: [number, number][] = [
  [5, 4], // 0=FL → OBR(5), OBL(4)
  [4, 5], // 1=FR → OBL(4), OBR(5)
  [5, 1], // 2=ML → OBR(5), OFR(1)
  [4, 0], // 3=MR → OBL(4), OFL(0)
  [1, 0], // 4=BL → OFR(1), OFL(0)
  [0, 1], // 5=BR → OFL(0), OFR(1)
];

// Shot types for tactic hints
export const SHOT_TYPES = ['挑球', '過渡球', '抽球', '殺球', '切球'];

// Opponent position labels for tactic hints
export const OPP_POSITION_LABELS = [
  '對方前左', '對方前右', '對方中左',
  '對方中右', '對方後左', '對方後右',
];

// Training interval presets (ms)
export const INTERVAL_PRESETS = [1000, 1500, 2000, 3000, 5000];

// Colors
export const COLORS = {
  courtGreen: '#2d6a2e',
  courtDarkGreen: '#1e4d1f',
  courtLine: '#fff',
  netColor: '#ccc',
  homePrimary: '#1565c0',
  homeSecondary: '#0d47a1',
  awayPrimary: '#c62828',
  awaySecondary: '#b71c1c',
  playerColors: ['#1565c0', '#e53935', '#43a047', '#fb8c00'],
  ballColor: '#fff',
  annotColors: ['#ff0', '#0ff', '#f0f', '#0f0', '#f90', '#09f'],
} as const;

// Max undo stack
export const MAX_UNDO = 60;
