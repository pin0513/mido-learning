/**
 * 技能相關類型定義
 */

import { Timestamp } from 'firebase/firestore';

export interface Skill {
  id: string;
  name: string;
  icon: string; // emoji 或圖片 URL
  description: string;
  category: 'language' | 'math' | 'memory' | 'logic';
  status: 'active' | 'coming_soon' | 'disabled';

  // 關卡配置
  levels: Level[];

  // 遊戲特定配置
  gameConfig: {
    type: 'typing' | 'quiz' | 'memory';
    [key: string]: unknown;
  };

  // 經驗值規則
  expRules: {
    baseExp: number;
    timeBonus: number; // 每分鐘額外經驗
    accuracyBonus?: {
      threshold: number; // 0-1
      bonus: number;
    };
    streakBonus?: {
      threshold: number; // 連續完成次數
      bonus: number;
    };
  };

  // 獎勵規則
  rewardRules: {
    minPlayTime: number; // 最少遊玩時間（分鐘）
    rewardRange: [number, number]; // [min, max]
    dailyLimit: number;
    cooldown: number; // 冷卻時間（分鐘）
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Level {
  id: string;
  name: string;
  unlockCondition: {
    characterLevel?: number;
    skillLevel?: number;
  };
  difficulty: number; // 1-5
  expMultiplier: number; // 經驗值倍率
  rewardMultiplier: number; // 獎勵倍率
}
