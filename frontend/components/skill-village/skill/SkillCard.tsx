/**
 * 技能卡片元件
 */

import React from 'react';
import { Skill } from '@/types/skill-village/skill';
import { SkillProgress } from '@/types/skill-village/character';
import { LevelBadge } from '../ui/LevelBadge';
import { ProgressBar } from '../ui/ProgressBar';
import { Button } from '../ui/Button';

interface SkillCardProps {
  skill: Skill;
  characterLevel: number;
  skillProgress?: SkillProgress;
  onStart: () => void;
}

export const SkillCard: React.FC<SkillCardProps> = ({
  skill,
  characterLevel,
  skillProgress,
  onStart,
}) => {
  // 檢查是否解鎖
  const firstLevel = skill.levels[0];
  const requiredLevel = firstLevel.unlockCondition.characterLevel || 0;
  const isUnlocked = characterLevel >= requiredLevel;

  // 計算技能下一等級所需經驗（簡易計算）
  const nextSkillLevelExp = (skillProgress?.skillLevel || 1) * 100;

  return (
    <div
      className={`bg-white rounded-xl shadow-lg p-6 transition-all ${
        isUnlocked
          ? 'hover:shadow-xl cursor-pointer'
          : 'opacity-60 cursor-not-allowed'
      }`}
    >
      {/* 技能圖示與名稱 */}
      <div className="text-center mb-4">
        <div className="text-6xl mb-2">{skill.icon}</div>
        <h3 className="text-xl font-bold text-gray-800">{skill.name}</h3>
        <p className="text-sm text-gray-600 mt-1">{skill.description}</p>
      </div>

      {isUnlocked ? (
        <>
          {/* 技能等級 */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">技能等級</span>
            <LevelBadge level={skillProgress?.skillLevel || 1} size="sm" />
          </div>

          {/* 技能經驗進度條 */}
          <ProgressBar
            current={skillProgress?.skillExp || 0}
            max={nextSkillLevelExp}
            showPercentage={false}
            className="mb-4"
          />

          {/* 統計資訊 */}
          <div className="grid grid-cols-2 gap-2 mb-4 text-sm text-gray-600">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-semibold text-gray-800">
                {skillProgress?.playCount || 0}
              </div>
              <div className="text-xs">練習次數</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-semibold text-gray-800">
                {skillProgress?.totalPlayTime || 0} 分鐘
              </div>
              <div className="text-xs">總時間</div>
            </div>
          </div>

          {/* 最佳成績 */}
          {skillProgress?.bestScore && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="text-xs text-yellow-800 font-medium mb-1">
                🏆 最佳成績
              </div>
              <div className="text-sm text-gray-700">
                {skillProgress.bestScore.wpm && (
                  <span>速度: {skillProgress.bestScore.wpm} WPM</span>
                )}
                {skillProgress.bestScore.accuracy !== undefined && (
                  <span className="ml-3">
                    正確率: {(skillProgress.bestScore.accuracy * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 開始練習按鈕 */}
          <Button variant="primary" size="md" onClick={onStart} className="w-full">
            開始練習
          </Button>
        </>
      ) : (
        /* 未解鎖狀態 */
        <div className="text-center py-6">
          <div className="text-gray-500 mb-2">🔒</div>
          <p className="text-sm text-gray-600">
            需要 <span className="font-semibold">Lv {requiredLevel}</span> 解鎖
          </p>
        </div>
      )}
    </div>
  );
};
