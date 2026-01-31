'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/auth/AuthProvider';
import { ComponentList, CategoryFilter } from '@/components/learning';
import { Pagination } from '@/components/ui/Pagination';
import { SortSelect, SortOption, defaultSortOptions } from '@/components/ui/SortSelect';
import { Category, LearningComponent, ComponentListResponse } from '@/types/component';
import { getPublicComponents } from '@/lib/api/components';

const ITEMS_PER_PAGE = 8;

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [components, setComponents] = useState<LearningComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOption, setSortOption] = useState<SortOption>(defaultSortOptions[0]);

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: ITEMS_PER_PAGE,
        sortBy: sortOption.sortBy,
        sortOrder: sortOption.sortOrder,
        ...(category !== 'all' && { category }),
      };
      const response: ComponentListResponse = await getPublicComponents(params);
      setComponents(response.components);
      setTotalPages(Math.ceil(response.total / response.limit));
    } catch {
      setComponents([]);
    } finally {
      setLoading(false);
    }
  }, [page, category, sortOption]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const handleCategoryChange = (newCategory: Category | 'all') => {
    setCategory(newCategory);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort);
    setPage(1);
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            歡迎來到{' '}
            <span className="text-blue-600">Mido Learning</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            您的專屬學習平台。立即開始您的學習之旅，透過豐富的課程和互動式學習體驗，解鎖您的潛能。
          </p>
          {!authLoading && (
            <div className="mt-8 flex justify-center gap-4">
              {user ? (
                <>
                  <Link href="/dashboard">
                    <Button size="lg">進入學習中心</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg">免費註冊</Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg">
                      登入
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Learning Components Section */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">公開學習教材</h2>
              <p className="mt-1 text-gray-600">探索我們的精選課程</p>
            </div>
            <div className="flex items-center gap-4">
              <CategoryFilter selected={category} onChange={handleCategoryChange} />
              <SortSelect value={sortOption} onChange={handleSortChange} />
            </div>
          </div>

          <ComponentList
            components={components}
            loading={loading}
            emptyMessage="目前沒有公開的學習教材"
            cardHrefPrefix="/materials"
          />

          {!loading && components.length > 0 && totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}

          {/* Link to Categories */}
          <div className="mt-8 text-center">
            <Link href="/categories" className="text-blue-600 hover:text-blue-800 hover:underline">
              瀏覽所有類別 →
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            為什麼選擇 Mido Learning？
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-8 shadow-sm">
              <div className="mb-4 text-3xl">📚</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                豐富課程
              </h3>
              <p className="text-gray-600">
                提供多元化的課程，幫助您達成學習目標。
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-8 shadow-sm">
              <div className="mb-4 text-3xl">🎯</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                個人化學習
              </h3>
              <p className="text-gray-600">
                根據您的技能和興趣，量身打造學習路徑。
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-8 shadow-sm">
              <div className="mb-4 text-3xl">🏆</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                追蹤進度
              </h3>
              <p className="text-gray-600">
                追蹤您的學習進度，慶祝每一個成就。
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
