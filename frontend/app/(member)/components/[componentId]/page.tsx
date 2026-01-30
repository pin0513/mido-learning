'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { LearningComponent } from '@/types/component';
import { getComponentById } from '@/lib/api/components';
import { ComponentDetail } from '@/components/learning';
import { Button } from '@/components/ui/Button';

interface PageProps {
  params: Promise<{ componentId: string }>;
}

export default function ComponentDetailPage({ params }: PageProps) {
  const { componentId: id } = use(params);
  const { user } = useAuth();
  const [component, setComponent] = useState<LearningComponent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasTeacherRole, setHasTeacherRole] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (user) {
        try {
          const token = await user.getIdTokenResult();
          const isTeacher = token.claims.teacher === true;
          const isAdmin = token.claims.admin === true;
          setHasTeacherRole(isTeacher || isAdmin);
        } catch {
          setHasTeacherRole(false);
        }
      }
    };
    checkRole();
  }, [user]);

  useEffect(() => {
    const fetchComponent = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getComponentById(id);
        setComponent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchComponent();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Back button skeleton */}
        <div className="h-10 w-32 animate-pulse rounded-md bg-gray-200" />

        {/* Header skeleton */}
        <div className="rounded-lg bg-gray-100 p-6">
          <div className="h-6 w-24 animate-pulse rounded-full bg-gray-200" />
          <div className="mt-3 h-8 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-6 w-1/2 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-4/6 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link href="/components">
          <Button variant="ghost" size="sm">
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            返回列表
          </Button>
        </Link>

        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
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
          <h2 className="mt-4 text-lg font-semibold text-red-800">載入失敗</h2>
          <p className="mt-2 text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!component) {
    return (
      <div className="space-y-6">
        <Link href="/components">
          <Button variant="ghost" size="sm">
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            返回列表
          </Button>
        </Link>

        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-700">找不到元件</h2>
          <p className="mt-2 text-gray-500">此學習元件不存在或已被移除</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/components">
        <Button variant="ghost" size="sm">
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          返回列表
        </Button>
      </Link>

      {/* Component Detail */}
      <ComponentDetail
        component={component}
        showEditButton={hasTeacherRole}
        editHref={`/teacher/components/${component.id}/edit`}
        showMaterialManagement={hasTeacherRole}
      />
    </div>
  );
}
