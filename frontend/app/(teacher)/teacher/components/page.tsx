'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { LearningComponent, ComponentListResponse } from '@/types/component';
import { getMyComponents } from '@/lib/api/components';
import { CategoryFilter, ComponentList } from '@/components/learning';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';

const ITEMS_PER_PAGE = 12;

export default function TeacherComponentsPage() {
  const { user } = useAuth();
  const [components, setComponents] = useState<LearningComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          setIsAdmin(tokenResult.claims.admin === true);
        } catch (error) {
          console.error('Failed to check admin status:', error);
        }
      }
    };
    checkAdmin();
  }, [user]);

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit: ITEMS_PER_PAGE,
        ...(category !== 'all' && { category }),
      };

      const response: ComponentListResponse = await getMyComponents(params);
      setComponents(response.components);
      setTotalPages(Math.ceil(response.total / response.limit));
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Admin Notice */}
      {isAdmin && (
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-blue-900">
              🔴 管理員模式：您目前可以看到<strong>所有教材</strong>（不只是您建立的）
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的教材</h1>
          <p className="mt-1 text-gray-600">
            {isAdmin ? '管理所有教材（管理員權限）' : '管理您建立的教材'}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CategoryFilter selected={category} onChange={handleCategoryChange} />
          <div className="flex gap-2">
            <Link href="/teacher/taxonomy">
              <Button variant="outline">
                <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                分類標籤
              </Button>
            </Link>
            <Link href="/teacher/components/upload">
              <Button>
                <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                新增教材
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-red-500"
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
          <button
            onClick={fetchComponents}
            className="mt-2 text-sm text-red-600 underline hover:text-red-800"
          >
            重試
          </button>
        </div>
      )}

      {/* Component List */}
      <ComponentList
        components={components}
        loading={loading}
        emptyMessage="您尚未建立任何教材"
        cardHrefPrefix="/components"
      />

      {/* Empty state with CTA */}
      {!loading && components.length === 0 && !error && (
        <div className="mt-4 text-center">
          <Link href="/teacher/components/upload">
            <Button size="lg">
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              建立您的第一個教材
            </Button>
          </Link>
        </div>
      )}

      {/* Pagination */}
      {!loading && components.length > 0 && (
        <div className="pt-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
