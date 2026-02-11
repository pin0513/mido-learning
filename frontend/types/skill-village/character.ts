/**
 * 角色相關類型定義
 */

import { Timestamp } from 'firebase/firestore';

export interface Character {
  id: string;

  // 帳號資訊
  accountType: 'guest' | 'simple' | 'full';
  userId?: string; // full 類型才有 (Firebase Auth UID)
  username?: string; // simple 類型才有

  // 角色資訊
  name: string;
  avatar?: string; // 預設頭像或自訂
  currencyName: string; // 虛擬貨幣名稱，預設「米豆幣」

  // 等級與經驗
  level: number;
  totalExp: number;
  currentLevelExp: number; // 當前等級的經驗值
  nextLevelExp: number; // 升級所需經驗值

  // 各技能進度（動態欄位）
  skillProgress: {
    [skillId: string]: SkillProgress;
  };

  // 獎勵資訊
  rewards: {
    totalEarned: number;
    available: number;
    redeemed: number;
    lastRewardAt?: Timestamp;
  };

  // 狀態
  status: 'active' | 'suspended';
  isAdmin?: boolean;

  // 時間戳
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface SkillProgress {
  skillLevel: number;
  skillExp: number;
  playCount: number;
  totalPlayTime: number; // 分鐘
  lastPlayedAt: Timestamp;
  streak: number; // 連續完成次數
  bestScore?: {
    accuracy?: number;
    wpm?: number;
    [key: string]: number | undefined;
  };
}

export interface CreateCharacterRequest {
  name: string;
  currencyName?: string;
}

export interface UpdateCharacterRequest {
  name?: string;
  currencyName?: string;
}
