'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCategories, CategoryInfo } from '@/lib/api/categories';
import { CATEGORY_CONFIG, getCategoryConfig } from '@/types/component';

const categoryIcons: Record<string, string> = {
  adult: '👨‍🎓',
  kid: '👶',
  Programming: '💻',
  Language: '🌍',
  Science: '🔬',
  Art: '🎨',
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data.categories);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">學習類別</h1>
        <p className="mt-2 text-gray-600">探索各種學習領域，找到適合您的教材</p>
      </div>

      {/* Categories Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const config = getCategoryConfig(category.id);
          const icon = categoryIcons[category.id] || '📚';

          return (
            <Link
              key={category.id}
              href={`/categories/${category.id}`}
              className="group block"
            >
              <article
                className={`
                  h-full rounded-lg border-2 p-6 transition-all
                  hover:shadow-lg hover:scale-[1.02]
                  ${config.borderClass} ${config.bgClass}
                `}
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{icon}</span>
                  <div className="flex-1">
                    <h2
                      className={`text-xl font-semibold ${config.textClass} group-hover:underline`}
                    >
                      {category.name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {category.description}
                    </p>
                  </div>
                  <svg
                    className={`h-5 w-5 ${config.textClass} opacity-0 transition-opacity group-hover:opacity-100`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      {/* Back to Home */}
      <div className="mt-8 text-center">
        <Link
          href="/"
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
          返回首頁
        </Link>
      </div>
    </div>
  );
}
