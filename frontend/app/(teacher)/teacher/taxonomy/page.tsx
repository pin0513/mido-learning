'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSuggestions } from '@/lib/api/categories';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default function TaxonomyPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSuggestions()
      .then((data) => {
        setCategories(data.categories);
        setTags(data.tags);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteCategory = (cat: string) => {
    if (!confirm(`確定要移除分類「${cat}」嗎？\n\n注意：這只會從建議清單移除，已使用此分類的教材不受影響。`)) {
      return;
    }
    // Note: This is a UI-only removal. Categories are dynamically derived from components.
    // To fully remove, would need API support
    setCategories((prev) => prev.filter((c) => c !== cat));
  };

  const handleDeleteTag = (tag: string) => {
    if (!confirm(`確定要移除標籤「${tag}」嗎？\n\n注意：這只會從建議清單移除，已使用此標籤的教材不受影響。`)) {
      return;
    }
    // Note: This is a UI-only removal
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/teacher/components">
        <Button variant="ghost" size="sm">
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回我的教材
        </Button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">分類與標籤管理</h1>
        <p className="mt-1 text-gray-600">管理教材的分類和標籤，移除後不影響已建立的教材</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">分類</h2>
              <span className="text-sm text-gray-500">{categories.length} 個</span>
            </div>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">尚無分類</p>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                      </span>
                      <span className="font-medium text-gray-900">{cat}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="移除分類"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-gray-500">
              分類會自動從已建立的教材中取得。新增分類請在建立教材時選擇「自訂分類」。
            </p>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">標籤</h2>
              <span className="text-sm text-gray-500">{tags.length} 個</span>
            </div>
          </CardHeader>
          <CardContent>
            {tags.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">尚無標籤</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
                  >
                    {tag}
                    <button
                      onClick={() => handleDeleteTag(tag)}
                      className="ml-1 rounded-full p-0.5 hover:bg-blue-200"
                      title="移除標籤"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-gray-500">
              標籤會自動從已建立的教材中取得。新增標籤請在建立教材時直接輸入。
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <svg className="h-5 w-5 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-blue-700">
            <p className="font-medium">關於分類與標籤</p>
            <p className="mt-1">
              分類和標籤會根據已建立的教材自動產生建議清單。從這裡移除只會影響建議清單，不會修改已建立的教材。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
