'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import {
  WishList,
  WishStatusTabs,
  WishSearch,
  CreateComponentModal,
  LinkComponentModal,
} from '@/components/admin/wishes';
import {
  Wish,
  WishStatus,
  CreateComponentFromWishRequest,
} from '@/types/wish';
import {
  getWishes,
  updateWishStatus,
  createComponentFromWish,
} from '@/lib/api/wishes';

const PAGE_LIMIT = 20;

export default function AdminWishesPage() {
  const { getToken } = useAuth();

  // List state
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<WishStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  // Action state
  const [loadingWishId, setLoadingWishId] = useState<string | null>(null);

  // Modal state
  const [createModalWish, setCreateModalWish] = useState<Wish | null>(null);
  const [linkModalWish, setLinkModalWish] = useState<Wish | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWishes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await getWishes({
        page,
        limit: PAGE_LIMIT,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
      });

      setWishes(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [getToken, page, statusFilter, search]);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  // Action handlers
  const handleStartProcessing = async (wish: Wish) => {
    setLoadingWishId(wish.id);
    try {
      await updateWishStatus(wish.id, { status: 'processing' });
      await fetchWishes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoadingWishId(null);
    }
  };

  const handleDelete = async (wish: Wish) => {
    if (!confirm('確定要刪除這個願望嗎？')) return;

    setLoadingWishId(wish.id);
    try {
      await updateWishStatus(wish.id, { status: 'deleted' });
      await fetchWishes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete wish');
    } finally {
      setLoadingWishId(null);
    }
  };

  const handleCreateComponent = (wish: Wish) => {
    setCreateModalWish(wish);
  };

  const handleLinkComponent = (wish: Wish) => {
    setLinkModalWish(wish);
  };

  const handleCreateComponentSubmit = async (
    wishId: string,
    data: CreateComponentFromWishRequest
  ) => {
    setIsSubmitting(true);
    try {
      await createComponentFromWish(wishId, data);
      setCreateModalWish(null);
      await fetchWishes();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create component'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkComponentSubmit = async (
    wishId: string,
    componentId: string
  ) => {
    setIsSubmitting(true);
    try {
      await updateWishStatus(wishId, {
        status: 'completed',
        linkedComponentId: componentId,
      });
      setLinkModalWish(null);
      await fetchWishes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link component');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">願望池管理</h1>
          <p className="mt-1 text-gray-600">
            管理使用者提交的學習願望，建立或連結教材
          </p>
        </div>
        <Link
          href="/admin/wishes/stats"
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          View Stats
        </Link>
      </div>

      <Card>
        {/* Status Tabs */}
        <CardHeader>
          <WishStatusTabs
            activeStatus={statusFilter}
            onStatusChange={setStatusFilter}
          />
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search */}
          <div className="max-w-md">
            <WishSearch value={search} onChange={setSearch} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 underline hover:text-red-700"
              >
                關閉
              </button>
            </div>
          )}

          {/* Wish List */}
          <WishList
            wishes={wishes}
            isLoading={loading}
            currentPage={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
            onStartProcessing={handleStartProcessing}
            onDelete={handleDelete}
            onCreateComponent={handleCreateComponent}
            onLinkComponent={handleLinkComponent}
            loadingWishId={loadingWishId}
          />
        </CardContent>
      </Card>

      {/* Create Component Modal */}
      {createModalWish && (
        <CreateComponentModal
          wish={createModalWish}
          isOpen={!!createModalWish}
          onClose={() => setCreateModalWish(null)}
          onSubmit={handleCreateComponentSubmit}
          isLoading={isSubmitting}
        />
      )}

      {/* Link Component Modal */}
      {linkModalWish && (
        <LinkComponentModal
          wish={linkModalWish}
          isOpen={!!linkModalWish}
          onClose={() => setLinkModalWish(null)}
          onLink={handleLinkComponentSubmit}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}
