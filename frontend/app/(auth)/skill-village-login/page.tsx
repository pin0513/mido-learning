/**
 * 技能村登入頁面
 * - 支援使用者名稱或 Email 登入
 * - 登入成功後導向角色選擇或技能村
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/skill-village/ui/Input';
import { Button } from '@/components/skill-village/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { skillVillageApi } from '@/lib/api-client';
import { ApiResponse } from '@/types/skill-village/game';
import Link from 'next/link';

export default function SkillVillageLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [formData, setFormData] = useState({
    identifier: '', // 使用者名稱或 Email
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState({
    identifier: null as string | null,
    password: null as string | null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // 驗證表單
  const validateForm = (): boolean => {
    const newErrors = {
      identifier: !formData.identifier ? '請輸入使用者名稱或 Email' : null,
      password: !formData.password ? '請輸入密碼' : null,
    };

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => error === null);
  };

  // 提交登入
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response: ApiResponse<{
        token: string;
        characters: Array<{ id: string; name: string }>;
      }> = await skillVillageApi.post('/api/skill-village/auth/login', {
        identifier: formData.identifier,
        password: formData.password,
      });

      if (response.success && response.data) {
        const { token, characters } = response.data;

        if (characters.length === 1) {
          // 只有一個角色，直接登入並導向技能村
          login(token, characters[0].id);
          router.push('/skill-village');
        } else if (characters.length > 1) {
          // 多個角色，導向選擇頁面
          login(token, '');
          router.push('/characters');
        } else {
          setServerError('該帳號尚未建立角色');
        }
      } else {
        setServerError(response.message || '登入失敗');
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        setServerError(axiosError.response?.data?.message || '登入失敗，請檢查帳號密碼');
      } else {
        setServerError('登入失敗，請稍後再試');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🏰 技能村登入
          </h1>
          <p className="text-base text-gray-600">歡迎回到你的學習冒險！</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {serverError}
            </div>
          )}

          <Input
            label="使用者名稱 / Email"
            type="text"
            placeholder="輸入你的使用者名稱或 Email"
            value={formData.identifier}
            onChange={(e) =>
              setFormData({ ...formData, identifier: e.target.value })
            }
            error={errors.identifier}
            autoComplete="username"
          />

          <Input
            label="密碼"
            type="password"
            placeholder="輸入密碼"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            error={errors.password}
            autoComplete="current-password"
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={formData.rememberMe}
              onChange={(e) =>
                setFormData({ ...formData, rememberMe: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700">
              記住我
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full"
          >
            登入
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            還沒有帳號？{' '}
            <Link
              href="/register/simple"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              快速註冊
            </Link>
          </p>
          <p className="text-sm text-gray-500">
            忘記密碼？請聯絡管理員
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p className="font-medium">💡 登入提示</p>
            <p>遊戲註冊帳號使用「使用者名稱」登入</p>
            <p>完整註冊帳號使用「Email」登入</p>
          </div>
        </div>
      </div>
  );
}
