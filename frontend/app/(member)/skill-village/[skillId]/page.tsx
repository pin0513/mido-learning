/**
 * 技能遊戲頁面
 * - 選擇難度
 * - 開始遊戲
 * - 顯示遊戲結果
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCharacterStore } from '@/stores/characterStore';
import { useSkillsStore } from '@/stores/skillsStore';
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/components/skill-village/ui/Button';
import { LevelBadge } from '@/components/skill-village/ui/LevelBadge';

export default function SkillGamePage() {
  const router = useRouter();
  const params = useParams();
  const skillId = params?.skillId as string;

  const { currentCharacter } = useCharacterStore();
  const { getSkillById } = useSkillsStore();
  const skill = getSkillById(skillId);

  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  useEffect(() => {
    if (!currentCharacter) {
      router.push('/characters');
      return;
    }

    if (!skill) {
      router.push('/skill-village');
      return;
    }
  }, [currentCharacter, skill, router]);

  if (!skill || !currentCharacter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  const handleStartGame = () => {
    if (!selectedLevel) return;

    // 根據技能類型導向不同的遊戲頁面
    if (skill.gameConfig.type === 'typing') {
      router.push(`/games/typing?skillId=${skillId}&levelId=${selectedLevel}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <button
            onClick={() => router.push('/skill-village')}
            className="text-gray-600 hover:text-gray-800 mb-4"
          >
            ← 返回技能村
          </button>

          <div className="text-center">
            <div className="text-6xl mb-4">{skill.icon}</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {skill.name}
            </h1>
            <p className="text-gray-600">{skill.description}</p>
          </div>
        </div>

        {/* Level Selection */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            選擇難度
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {skill.levels.map((level) => {
              const requiredLevel = level.unlockCondition.characterLevel || 0;
              const isUnlocked = currentCharacter.level >= requiredLevel;

              return (
                <div
                  key={level.id}
                  className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                    selectedLevel === level.id
                      ? 'border-blue-500 bg-blue-50'
                      : isUnlocked
                      ? 'border-gray-300 hover:border-blue-300'
                      : 'border-gray-200 opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => isUnlocked && setSelectedLevel(level.id)}
                >
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {level.name}
                    </h3>

                    {isUnlocked ? (
                      <>
                        <div className="flex justify-center items-center gap-2 mb-3">
                          <span className="text-sm text-gray-600">難度:</span>
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-4 rounded ${
                                  i < level.difficulty
                                    ? 'bg-yellow-400'
                                    : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          <p>經驗倍率: {level.expMultiplier}x</p>
                          <p>獎勵倍率: {level.rewardMultiplier}x</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">
                        🔒 需要 Lv {requiredLevel} 解鎖
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Button
              variant="primary"
              size="lg"
              onClick={handleStartGame}
              disabled={!selectedLevel}
              className="min-w-[200px]"
            >
              開始遊戲
            </Button>
          </div>
        </div>

        {/* Skill Progress */}
        {currentCharacter.skillProgress?.[skillId] && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              你的進度
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {currentCharacter.skillProgress[skillId].skillLevel}
                </div>
                <div className="text-sm text-gray-600">技能等級</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {currentCharacter.skillProgress[skillId].playCount}
                </div>
                <div className="text-sm text-gray-600">練習次數</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {currentCharacter.skillProgress[skillId].totalPlayTime}
                </div>
                <div className="text-sm text-gray-600">總時間（分）</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {currentCharacter.skillProgress[skillId].streak}
                </div>
                <div className="text-sm text-gray-600">連續完成</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
