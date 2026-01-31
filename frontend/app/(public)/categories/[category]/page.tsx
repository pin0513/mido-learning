'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { getCategoryComponents } from '@/lib/api/categories';
import { LearningComponent, getCategoryConfig } from '@/types/component';
import { ComponentCard } from '@/components/learning/ComponentCard';
import { SortSelect, SortOption, defaultSortOptions } from '@/components/ui/SortSelect';
import { Pagination } from '@/components/ui/Pagination';

const categoryNames: Record<string, string> = {
  adult: '大人學',
  kid: '小人學',
  Programming: '程式設計',
  Language: '語言學習',
  Science: '自然科學',
  Art: '藝術創作',
};

const categoryDescriptions: Record<string, string> = {
  adult: '專為成人設計的進階學習課程',
  kid: '趣味互動的兒童學習內容',
  Programming: '從入門到進階的程式設計課程',
  Language: '探索世界各地的語言',
  Science: '發現自然科學的奧秘',
  Art: '釋放創意的藝術課程',
};

export default function CategoryComponentsPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);
  const config = getCategoryConfig(category);

  const [components, setComponents] = useState<LearningComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>(defaultSortOptions[0]);
  const limit = 12;

  useEffect(() => {
    const loadComponents = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getCategoryComponents(category, {
          page,
          limit,
          sortBy: sortOption.sortBy,
          sortOrder: sortOption.sortOrder,
        });
        setComponents(data.components);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load components');
      } finally {
        setLoading(false);
      }
    };

    loadComponents();
  }, [category, page, sortOption]);

  const totalPages = Math.ceil(total / limit);
  const categoryName = categoryNames[category] || category;
  const categoryDescription = categoryDescriptions[category] || '';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="text-gray-500 hover:text-blue-600">
              首頁
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li>
            <Link href="/categories" className="text-gray-500 hover:text-blue-600">
              類別
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li className={config.textClass}>{categoryName}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className={`mb-8 rounded-lg border-2 p-6 ${config.borderClass} ${config.bgClass}`}>
        <h1 className={`text-3xl font-bold ${config.textClass}`}>{categoryName}</h1>
        <p className="mt-2 text-gray-600">{categoryDescription}</p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-gray-600">
          共 <span className="font-semibold">{total}</span> 個教材
        </p>
        <SortSelect value={sortOption} onChange={setSortOption} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      ) : components.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">尚無教材</h3>
          <p className="mt-2 text-gray-500">此類別目前沒有可用的教材</p>
        </div>
      ) : (
        <>
          {/* Components Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {components.map((component) => (
              <ComponentCard
                key={component.id}
                component={component}
                href={`/materials/${component.id}`}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Back links */}
      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/categories"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          返回類別列表
        </Link>
      </div>
    </div>
  );
}
