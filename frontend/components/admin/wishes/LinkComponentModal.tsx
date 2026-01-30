'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wish } from '@/types/wish';
import { LearningComponent, CATEGORY_CONFIG } from '@/types/component';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { searchComponents } from '@/lib/api/wishes';

interface LinkComponentModalProps {
  wish: Wish;
  isOpen: boolean;
  onClose: () => void;
  onLink: (wishId: string, componentId: string) => Promise<void>;
  isLoading: boolean;
}

export function LinkComponentModal({
  wish,
  isOpen,
  onClose,
  onLink,
  isLoading,
}: LinkComponentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [components, setComponents] = useState<LearningComponent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedComponent, setSelectedComponent] =
    useState<LearningComponent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setComponents([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results = await searchComponents(searchQuery.trim(), 10);
      setComponents(results);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to search components'
      );
      setComponents([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [handleSearch]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setComponents([]);
      setSelectedComponent(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedComponent) return;

    await onLink(wish.id, selectedComponent.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div className="relative w-full max-w-lg rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              連結現有學習元件
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
            >
              <span className="sr-only">關閉</span>
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 px-6 py-4">
              {/* Original Wish Content */}
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">原始願望：</span>
                  {wish.content}
                </p>
              </div>

              {/* Search */}
              <div>
                <label
                  htmlFor="search"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  搜尋學習元件
                </label>
                <Input
                  id="search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="輸入關鍵字搜尋..."
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Search Results */}
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  </div>
                ) : components.length > 0 ? (
                  components.map((component) => {
                    const categoryConfig = CATEGORY_CONFIG[component.category];
                    const isSelected = selectedComponent?.id === component.id;

                    return (
                      <button
                        key={component.id}
                        type="button"
                        onClick={() => setSelectedComponent(component)}
                        className={`w-full rounded-md border p-3 text-left transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {component.title}
                            </p>
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                              {component.description}
                            </p>
                          </div>
                          <span
                            className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${categoryConfig.badgeClass}`}
                          >
                            {categoryConfig.label}
                          </span>
                        </div>
                        {component.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {component.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                              >
                                {tag}
                              </span>
                            ))}
                            {component.tags.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{component.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })
                ) : searchQuery.trim() ? (
                  <p className="py-4 text-center text-sm text-gray-500">
                    找不到符合條件的學習元件
                  </p>
                ) : (
                  <p className="py-4 text-center text-sm text-gray-500">
                    輸入關鍵字搜尋學習元件
                  </p>
                )}
              </div>

              {/* Selected Component Display */}
              {selectedComponent && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">已選擇：</span>
                    {selectedComponent.title}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading || !selectedComponent}>
                {isLoading ? '連結中...' : '確認連結'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
