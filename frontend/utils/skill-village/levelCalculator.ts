/**
 * 等級計算工具
 *
 * 規則：
 * - Lv 1-999: expForNextLevel = currentLevel * 100
 * - Lv 1000: 不再升級
 */

export interface LevelInfo {
  currentLevel: number;
  currentLevelExp: number;
  nextLevelExp: number;
  totalExp: number;
  progress: number; // 0-1
}

/**
 * 計算角色等級資訊
 */
export function calculateLevel(totalExp: number): LevelInfo {
  if (totalExp === 0) {
    return {
      currentLevel: 1,
      currentLevelExp: 0,
      nextLevelExp: 100,
      totalExp: 0,
      progress: 0,
    };
  }

  let level = 1;
  let expAccumulated = 0;

  // 計算當前等級
  while (level < 1000 && expAccumulated + (level * 100) <= totalExp) {
    expAccumulated += level * 100;
    level++;
  }

  // 如果已達到 Lv 1000
  if (level >= 1000) {
    return {
      currentLevel: 1000,
      currentLevelExp: totalExp - expAccumulated,
      nextLevelExp: 0, // 不再升級
      totalExp,
      progress: 1,
    };
  }

  // 當前等級的經驗值
  const currentLevelExp = totalExp - expAccumulated;
  const nextLevelExp = level * 100;
  const progress = currentLevelExp / nextLevelExp;

  return {
    currentLevel: level,
    currentLevelExp,
    nextLevelExp,
    totalExp,
    progress,
  };
}

/**
 * 計算升級所需經驗值
 */
export function expForNextLevel(currentLevel: number): number {
  if (currentLevel >= 1000) return 0;
  return currentLevel * 100;
}

/**
 * 計算達到目標等級所需總經驗值
 */
export function totalExpForLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0;

  let totalExp = 0;
  for (let level = 1; level < targetLevel; level++) {
    totalExp += level * 100;
  }

  return totalExp;
}
