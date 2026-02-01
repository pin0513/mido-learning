'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/auth/AuthProvider';
import { ComponentList, CategoryFilter } from '@/components/learning';
import { Pagination } from '@/components/ui/Pagination';
import { SortSelect, SortOption, defaultSortOptions } from '@/components/ui/SortSelect';
import { LearningComponent, ComponentListResponse } from '@/types/component';
import { getPublicComponents } from '@/lib/api/components';
import { recordPageView } from '@/lib/api/analytics';

const ITEMS_PER_PAGE = 8;

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [components, setComponents] = useState<LearningComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOption, setSortOption] = useState<SortOption>(defaultSortOptions[0]);

  // Record page view on mount
  useEffect(() => {
    recordPageView();
  }, []);

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
      setComponents(response.components || []);
      setTotalPages(Math.ceil((response.total || 0) / (response.limit || ITEMS_PER_PAGE)));
    } catch {
      setComponents([]);
    } finally {
      setLoading(false);
    }
  }, [page, category, sortOption]);

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

  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort);
    setPage(1);
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-blue-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
            {/* Text Content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="mb-4 flex items-center justify-center gap-3 lg:justify-start">
                <Image
                  src="/images/logo.png"
                  alt="Mido Learning Logo"
                  width={64}
                  height={64}
                  className="rounded-lg"
                />
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                  <span className="text-blue-600">Mido Learning</span>
                </h1>
              </div>
              <p className="mx-auto mt-4 max-w-xl text-xl text-gray-500 lg:mx-0">
                AI 教案與投影片示範網站
              </p>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 lg:mx-0">
                這裡沒有宏大的夢想，只有一位好奇爸爸用 AI 工具探索世界的小小實驗。
                希望有一天，能做出讓孩子看得懂、用得上、學得會的知識內容。
              </p>
              {!authLoading && (
                <div className="mt-8 flex justify-center gap-4 lg:justify-start">
                  {user ? (
                    <>
                      <Link href="/components">
                        <Button size="lg">瀏覽教材</Button>
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

            {/* Hero Image */}
            <div className="flex-shrink-0">
              <Image
                src="/images/hero-bg.png"
                alt="父子一起學習"
                width={500}
                height={300}
                className="rounded-lg shadow-lg"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Learning Components Section */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">公開學習資源</h2>
              <p className="mt-1 text-gray-600">探索精選的學習內容</p>
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
            這個網站在做什麼？
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-8 shadow-sm">
              <div className="mb-4 text-3xl">🤖</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                AI 生成教案
              </h3>
              <p className="text-gray-600">
                嘗試用 AI 工具製作教學內容，探索 AI 輔助教育的可能性。
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-8 shadow-sm">
              <div className="mb-4 text-3xl">👶</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                親子友善
              </h3>
              <p className="text-gray-600">
                希望做出孩子也能理解的知識內容，用簡單的方式解釋複雜的概念。
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-8 shadow-sm">
              <div className="mb-4 text-3xl">🧪</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                實驗精神
              </h3>
              <p className="text-gray-600">
                這是一個實驗場域，記錄著一位爸爸學習 AI 的旅程。
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
