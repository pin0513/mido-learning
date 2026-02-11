/**
 * 遊戲註冊頁面（簡易註冊）
 * - 使用者名稱 + 密碼
 * - 註冊成功後自動登入
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/skill-village/ui/Input';
import { Button } from '@/components/skill-village/ui/Button';
import {
  validateUsername,
  validateSimplePassword,
  validateCharacterName,
} from '@/utils/skill-village/validation';
import { useAuthStore } from '@/stores/authStore';
import { skillVillageApi } from '@/lib/api-client';
import { ApiResponse } from '@/types/skill-village/game';
import Link from 'next/link';

export default function SimpleRegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    characterName: '',
  });

  const [errors, setErrors] = useState({
    username: null as string | null,
    password: null as string | null,
    confirmPassword: null as string | null,
    characterName: null as string | null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // 表單驗證
  const validateForm = (): boolean => {
    const newErrors = {
      username: validateUsername(formData.username),
      password: validateSimplePassword(formData.password),
      confirmPassword:
        formData.password !== formData.confirmPassword
          ? '兩次密碼輸入不一致'
          : null,
      characterName: validateCharacterName(formData.characterName),
    };

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => error === null);
  };

  // 提交註冊
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response: ApiResponse<{ token: string; characterId: string }> =
        await skillVillageApi.post('/api/skill-village/auth/register-simple', {
          username: formData.username,
          password: formData.password,
          characterName: formData.characterName,
        });

      if (response.success && response.data) {
        const { token, characterId } = response.data;

        // 登入並導向技能村
        login(token, characterId);
        router.push('/skill-village');
      } else {
        setServerError(response.message || '註冊失敗');
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        setServerError(axiosError.response?.data?.message || '註冊失敗，請稍後再試');
      } else {
        setServerError('註冊失敗，請稍後再試');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            🎮 快速註冊
          </h1>
          <p className="text-sm sm:text-base text-gray-600">加入技能村，開始學習冒險！</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm sm:text-base">
              {serverError}
            </div>
          )}

          <Input
            label="使用者名稱"
            type="text"
            placeholder="英文、數字、底線（4-16 字元）"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            error={errors.username}
            autoComplete="username"
          />

          <Input
            label="密碼"
            type="password"
            placeholder="4-8 字元"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            error={errors.password}
            autoComplete="new-password"
          />

          <Input
            label="確認密碼"
            type="password"
            placeholder="再次輸入密碼"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          <Input
            label="角色名稱"
            type="text"
            placeholder="你在技能村的名字（2-12 字元）"
            value={formData.characterName}
            onChange={(e) =>
              setFormData({ ...formData, characterName: e.target.value })
            }
            error={errors.characterName}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full"
          >
            立即註冊
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm sm:text-base text-gray-600">
            已經有帳號？{' '}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium underline-offset-2 hover:underline">
              登入
            </Link>
          </p>
          <p className="text-sm sm:text-base text-gray-600">
            或使用{' '}
            <Link href="/register/full" className="text-indigo-600 hover:text-indigo-700 font-medium underline-offset-2 hover:underline">
              Email 完整註冊
            </Link>
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs sm:text-sm text-gray-500 text-center leading-relaxed">
            ⚠️ 簡易註冊無法使用忘記密碼功能<br/>
            建議使用 Email 註冊以確保帳號安全
          </p>
        </div>
      </div>
    </div>
  );
}
