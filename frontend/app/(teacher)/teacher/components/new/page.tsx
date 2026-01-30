'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreateComponentRequest } from '@/types/component';
import { createComponent } from '@/lib/api/components';
import { ComponentForm } from '@/components/learning';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default function NewComponentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateComponentRequest) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createComponent(data);
      router.push(`/components/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立失敗，請稍後再試');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back button */}
      <Link href="/teacher/components">
        <Button variant="ghost" size="sm">
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          返回我的元件
        </Button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">建立新元件</h1>
        <p className="mt-1 text-gray-600">填寫以下資訊建立新的學習元件</p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 flex-shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">元件資訊</h2>
        </CardHeader>
        <CardContent>
          <ComponentForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </CardContent>
      </Card>
    </div>
  );
}
