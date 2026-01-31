'use client';

import { useState, useEffect, useCallback } from 'react';
import { LearningComponent, ComponentListResponse } from '@/types/component';
import { getComponents } from '@/lib/api/components';
import { CategoryFilter, ComponentList } from '@/components/learning';
import { Pagination } from '@/components/ui/Pagination';

const ITEMS_PER_PAGE = 12;

export default function ComponentsPage() {
  const [components, setComponents] = useState<LearningComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit: ITEMS_PER_PAGE,
        ...(category !== 'all' && { category }),
      };

      const response: ComponentListResponse = await getComponents(params);
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">教材清單</h1>
          <p className="mt-1 text-gray-600">探索各種學習資源</p>
        </div>
        <CategoryFilter selected={category} onChange={handleCategoryChange} />
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
      <ComponentList components={components} loading={loading} emptyMessage="目前沒有教材" />

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
