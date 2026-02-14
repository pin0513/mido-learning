/**
 * 遊戲相關類型定義
 */

export interface GameSession {
  sessionId: string;
  skillId: string;
  levelId: string;
}

export interface GamePerformance {
  playTime: number; // 分鐘
  accuracy: number; // 0-1
  wpm?: number; // 打字速度（英打專用）
  challengeCount?: number; // 挑戰次數
  [key: string]: number | undefined;
}

export interface GameCompleteRequest {
  characterId: string;
  skillId: string;
  levelId: string;
  performance: GamePerformance;
  metadata?: {
    ip?: string;
    userAgent: string;
    sessionId: string;
    startTime: number;
    endTime: number;
  };
}

export interface GameResult {
  expGained: number;
  rewardEarned: number;
  levelUp: boolean;
  newLevel: number;
  skillLevelUp: boolean;
  newSkillLevel: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}
