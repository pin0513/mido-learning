/**
 * 技能村首頁（會員）
 * - 顯示角色資訊
 * - 顯示所有技能卡片
 * - 點擊技能卡片進入遊戲
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useSkillsStore } from '@/stores/skillsStore';
import { skillVillageApi } from '@/lib/api-client';
import { Character } from '@/types/skill-village/character';
import { Skill } from '@/types/skill-village/skill';
import { ApiResponse } from '@/types/skill-village/game';
import { LevelBadge } from '@/components/skill-village/ui/LevelBadge';
import { ProgressBar } from '@/components/skill-village/ui/ProgressBar';
import { SkillCard } from '@/components/skill-village/skill/SkillCard';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function SkillVillagePage() {
  const router = useRouter();
  const { currentCharacterId, isAuthenticated } = useAuthStore();
  const { currentCharacter, setCurrentCharacter, setIsLoading, isLoading } =
    useCharacterStore();
  const { skills, setSkills, setIsLoading: setSkillsLoading } = useSkillsStore();

  const [error, setError] = useState<string | null>(null);

  // 檢查認證狀態
  useEffect(() => {
    if (!isAuthenticated || !currentCharacterId) {
      router.push('/skill-village-login');
    }
  }, [isAuthenticated, currentCharacterId, router]);

  // 載入角色資料
  useEffect(() => {
    if (currentCharacterId) {
      fetchCharacter();
      fetchSkills();
    }
  }, [currentCharacterId]);

  const fetchCharacter = async () => {
    setIsLoading(true);
    try {
      const response: ApiResponse<Character> = await skillVillageApi.get(
        `/api/skill-village/characters/${currentCharacterId}`
      );

      if (response.success && response.data) {
        setCurrentCharacter(response.data);
      } else {
        setError('無法載入角色資料');
      }
    } catch (error) {
      console.error('載入角色失敗', error);
      setError('載入角色失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSkills = async () => {
    setSkillsLoading(true);
    try {
      // 從 Firestore 直接讀取 skills collection
      const skillsQuery = query(
        collection(db, 'skills'),
        where('status', '==', 'active')
      );

      const querySnapshot = await getDocs(skillsQuery);
      const skillsData: Skill[] = [];

      querySnapshot.forEach((doc) => {
        skillsData.push({ id: doc.id, ...doc.data() } as Skill);
      });

      setSkills(skillsData);
    } catch (error) {
      console.error('載入技能失敗', error);
      setError('載入技能失敗，請稍後再試');
    } finally {
      setSkillsLoading(false);
    }
  };

  const handleStartSkill = (skillId: string) => {
    router.push(`/skill-village/${skillId}`);
  };

  if (isLoading || !currentCharacter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <p className="text-xl text-red-600 font-semibold">{error}</p>
          <button
            onClick={() => router.push('/characters')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回角色選擇
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 角色資訊卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-3 sm:gap-4 md:gap-6">
            {/* 角色頭像與名稱 */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-4xl">
                👤
              </div>
            </div>

            {/* 角色資訊 */}
            <div className="flex-1 w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {currentCharacter.name}
                </h2>
                <LevelBadge level={currentCharacter.level} size="lg" />
              </div>

              {/* 經驗值進度條 */}
              <ProgressBar
                current={currentCharacter.currentLevelExp}
                max={currentCharacter.nextLevelExp}
                label="經驗值"
                className="mb-4"
              />

              {/* 統計資訊 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {currentCharacter.totalExp.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">總經驗</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {currentCharacter.rewards.available.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    💰 {currentCharacter.currencyName}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Object.keys(currentCharacter.skillProgress || {}).length}
                  </div>
                  <div className="text-sm text-gray-600">已解鎖技能</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {currentCharacter.rewards.totalEarned.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">累計獎勵</div>
                </div>
              </div>
            </div>

            {/* 設定按鈕 */}
            <div className="flex-shrink-0">
              <button
                onClick={() => router.push('/profile/settings')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ⚙️ 設定
              </button>
            </div>
          </div>
        </div>

        {/* 技能卡片列表 */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">🎯 技能訓練場</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {skills.length > 0 ? (
            skills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                characterLevel={currentCharacter.level}
                skillProgress={currentCharacter.skillProgress?.[skill.id]}
                onStart={() => handleStartSkill(skill.id)}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">🚧</div>
              <p className="text-xl text-gray-600">尚無可用技能</p>
              <p className="text-sm text-gray-500 mt-2">
                敬請期待更多精彩內容！
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
