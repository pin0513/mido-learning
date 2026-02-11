/**
 * 角色選擇頁面
 * - 顯示使用者所有角色
 * - 選擇角色後進入技能村
 * - 可建立新角色（最多 5 個）
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useCharacterStore } from '@/stores/characterStore';
import { skillVillageApi } from '@/lib/api-client';
import { Character, CreateCharacterRequest } from '@/types/skill-village/character';
import { ApiResponse } from '@/types/skill-village/game';
import { Button } from '@/components/skill-village/ui/Button';
import { Input } from '@/components/skill-village/ui/Input';
import { LevelBadge } from '@/components/skill-village/ui/LevelBadge';
import { ProgressBar } from '@/components/skill-village/ui/ProgressBar';
import { validateCharacterName, validateCurrencyName } from '@/utils/skill-village/validation';

export default function CharactersPage() {
  const router = useRouter();
  const { switchCharacter } = useAuthStore();
  const { characters, setCharacters, setIsLoading, isLoading } = useCharacterStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    currencyName: '米豆幣',
  });
  const [errors, setErrors] = useState({
    name: null as string | null,
    currencyName: null as string | null,
  });
  const [isCreating, setIsCreating] = useState(false);

  // 載入角色列表
  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    setIsLoading(true);
    try {
      const response: ApiResponse<Character[]> = await skillVillageApi.get(
        '/api/skill-village/characters'
      );

      if (response.success && response.data) {
        setCharacters(response.data);
      }
    } catch (error) {
      console.error('載入角色失敗', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 選擇角色
  const handleSelectCharacter = (characterId: string) => {
    switchCharacter(characterId);
    router.push('/skill-village');
  };

  // 驗證建立角色表單
  const validateCreateForm = (): boolean => {
    const newErrors = {
      name: validateCharacterName(newCharacter.name),
      currencyName: validateCurrencyName(newCharacter.currencyName),
    };

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => error === null);
  };

  // 建立新角色
  const handleCreateCharacter = async () => {
    if (!validateCreateForm()) return;

    setIsCreating(true);
    try {
      const request: CreateCharacterRequest = {
        name: newCharacter.name,
        currencyName: newCharacter.currencyName || '米豆幣',
      };

      const response: ApiResponse<Character> = await skillVillageApi.post(
        '/api/skill-village/characters',
        request
      );

      if (response.success && response.data) {
        // 重新載入角色列表
        await fetchCharacters();

        // 重置表單並關閉 Modal
        setNewCharacter({ name: '', currencyName: '米豆幣' });
        setShowCreateModal(false);
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || '建立角色失敗');
      } else {
        alert('建立角色失敗，請稍後再試');
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入角色中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">選擇你的角色</h1>
          <p className="text-gray-600">在技能村中展開學習冒險</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map((character) => (
            <div
              key={character.id}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => handleSelectCharacter(character.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">{character.name}</h3>
                <LevelBadge level={character.level} size="md" />
              </div>

              <ProgressBar
                current={character.currentLevelExp}
                max={character.nextLevelExp}
                label="經驗值"
                className="mb-4"
              />

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>💰 {character.rewards.available.toLocaleString()} {character.currencyName}</span>
                <span>總經驗: {character.totalExp.toLocaleString()}</span>
              </div>

              <Button variant="primary" size="sm" className="w-full mt-4">
                選擇
              </Button>
            </div>
          ))}

          {/* 建立新角色按鈕 */}
          {characters.length < 5 && (
            <div
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer border-2 border-dashed border-gray-300 flex flex-col items-center justify-center"
              onClick={() => setShowCreateModal(true)}
            >
              <div className="text-6xl mb-4">➕</div>
              <p className="text-gray-600 font-medium">建立新角色</p>
              <p className="text-sm text-gray-500 mt-2">
                ({characters.length}/5)
              </p>
            </div>
          )}
        </div>

        {/* 建立角色 Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">建立新角色</h2>

              <div className="space-y-4">
                <Input
                  label="角色名稱"
                  type="text"
                  placeholder="2-12 字元"
                  value={newCharacter.name}
                  onChange={(e) =>
                    setNewCharacter({ ...newCharacter, name: e.target.value })
                  }
                  error={errors.name}
                />

                <Input
                  label="虛擬貨幣名稱（選填）"
                  type="text"
                  placeholder="預設「米豆幣」"
                  value={newCharacter.currencyName}
                  onChange={(e) =>
                    setNewCharacter({ ...newCharacter, currencyName: e.target.value })
                  }
                  error={errors.currencyName}
                  helperText="你在技能村使用的貨幣名稱"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCreateCharacter}
                  isLoading={isCreating}
                  className="flex-1"
                >
                  建立
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
