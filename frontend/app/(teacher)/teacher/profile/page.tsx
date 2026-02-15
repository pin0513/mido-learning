'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function TeacherProfilePage() {
  const { user, loading } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-700">請先登入</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">個人資料</h1>
        <p className="mt-1 text-gray-600">查看您的帳號資訊</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">帳號資訊</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500">登入狀態</div>
                <div className="mt-1 text-base text-gray-900">✅ 已登入</div>
              </div>
            </div>

            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500">Email</div>
                <div className="mt-1 text-base text-gray-900">{user.email || '(無)'}</div>
              </div>
            </div>

            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500">顯示名稱</div>
                <div className="mt-1 text-base text-gray-900">
                  {user.displayName || user.email?.split('@')[0] || '(無)'}
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500">
                  使用者 ID (UID)
                  <span className="ml-2 text-xs text-gray-400">用於識別教材擁有者</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm text-gray-900">
                    {user.uid}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(user.uid)}
                  >
                    {copied ? '✓ 已複製' : '複製'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500">Email 驗證狀態</div>
                <div className="mt-1 text-base text-gray-900">
                  {user.emailVerified ? '✅ 已驗證' : '❌ 未驗證'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">💡 關於教材管理</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong className="text-gray-900">為什麼有些教材在首頁看得到，但在「教材管理」看不到？</strong>
            </p>
            <p>
              教材管理頁面只會顯示 <strong className="text-blue-600">您建立的教材</strong>（建立者 UID 與您的 UID 相同）。
            </p>
            <p>
              如果某個教材：
            </p>
            <ul className="list-inside list-disc space-y-1 pl-4">
              <li>在首頁顯示 = 該教材設定為「公開」(published)</li>
              <li>在教材管理不顯示 = 該教材不是由您的帳號建立</li>
            </ul>
            <p className="mt-4">
              <strong className="text-gray-900">如何查看所有教材？</strong>
            </p>
            <p>
              • 如果您是管理員，可以在 <a href="/admin" className="text-blue-600 hover:underline">管理後台</a> 查看所有教材<br/>
              • 如果需要管理其他人建立的教材，請聯絡管理員轉移所有權
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
