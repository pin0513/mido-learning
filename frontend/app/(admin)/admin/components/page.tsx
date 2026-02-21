'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  LearningComponent,
  Visibility,
  Category,
  getCategoryConfig,
  VISIBILITY_CONFIG,
  CATEGORY_CONFIG,
} from '@/types/component';
import { getAllComponents, updateComponentVisibility, deleteComponent } from '@/lib/api/components';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { StarRating } from '@/components/ui/StarRating';
import { VisibilityBadge, VisibilitySelect } from '@/components/ui/VisibilitySelect';
import { SortSelect, SortOption, defaultSortOptions } from '@/components/ui/SortSelect';

const ITEMS_PER_PAGE = 20;

export default function AdminComponentsPage() {
  const [components, setComponents] = useState<LearningComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [visibility, setVisibility] = useState<Visibility | 'all'>('all');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>(defaultSortOptions[0]);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVisibility, setEditVisibility] = useState<Visibility>('private');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadComponents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit: ITEMS_PER_PAGE,
        sortBy: sortOption.sortBy,
        sortOrder: sortOption.sortOrder,
        ...(visibility !== 'all' && { visibility }),
        ...(category !== 'all' && { category }),
      };
      const data = await getAllComponents(params);
      setComponents(data.components);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load components');
    } finally {
      setLoading(false);
    }
  }, [page, visibility, category, sortOption]);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  const handleVisibilityChange = async () => {
    if (!editingId || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateComponentVisibility(editingId, { visibility: editVisibility });
      setEditingId(null);
      loadComponents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update visibility');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteComponent(id);
      setShowDeleteConfirm(null);
      loadComponents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete component');
    } finally {
      setIsDeleting(false);
    }
  };

  const startEditing = (component: LearningComponent) => {
    setEditingId(component.id);
    setEditVisibility(component.visibility || 'private');
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">教材管理</h1>
          <p className="mt-1 text-gray-600">管理所有學習教材</p>
        </div>
        <Link href="/admin/components/new">
          <Button>
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增教材
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-sm text-gray-600">可見性</label>
          <select
            value={visibility}
            onChange={(e) => {
              setVisibility(e.target.value as Visibility | 'all');
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">全部</option>
            <option value="published">公開</option>
            <option value="login">登入可見</option>
            <option value="private">私有</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">類別</label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as Category | 'all');
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">全部</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">排序</label>
          <SortSelect value={sortOption} onChange={setSortOption} />
        </div>

        <div className="ml-auto">
          <p className="text-sm text-gray-600">
            共 <span className="font-semibold">{total}</span> 個教材
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">確認刪除</h3>
            <p className="mt-2 text-gray-600">
              確定要刪除此教材嗎？此操作無法復原。
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isDeleting}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={isDeleting}
              >
                {isDeleting ? '刪除中...' : '確認刪除'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                教材
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                類別
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                可見性
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                評分
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                建立者
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-4">
                    <div className="h-6 animate-pulse rounded bg-gray-200" />
                  </td>
                </tr>
              ))
            ) : components.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  沒有找到教材
                </td>
              </tr>
            ) : (
              components.map((component) => {
                const config = getCategoryConfig(component.category);
                const creatorName =
                  typeof component.createdBy === 'object'
                    ? component.createdBy?.displayName
                    : component.createdBy;

                return (
                  <tr key={component.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{component.title}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {component.description}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs ${config.badgeClass}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {editingId === component.id ? (
                        <div className="flex items-center gap-2">
                          <VisibilitySelect
                            value={editVisibility}
                            onChange={setEditVisibility}
                            disabled={isUpdating}
                          />
                          <Button
                            size="sm"
                            onClick={handleVisibilityChange}
                            disabled={isUpdating}
                          >
                            {isUpdating ? '...' : '儲存'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            disabled={isUpdating}
                          >
                            取消
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(component)}
                          className="hover:underline"
                        >
                          <VisibilityBadge visibility={component.visibility || 'private'} />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <StarRating
                        rating={component.ratingAverage || 0}
                        count={component.ratingCount || 0}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {creatorName || '-'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/materials/${component.id}`}>
                          <Button size="sm" variant="ghost">
                            檢視
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setShowDeleteConfirm(component.id)}
                        >
                          刪除
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
