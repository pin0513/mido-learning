'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';

interface Wish {
  id: string;
  content: string;
  email?: string;
  status: 'pending' | 'processing' | 'completed' | 'deleted';
  createdAt: string;
}

interface WishListResponse {
  data: Wish[];
  total: number;
  totalPages: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const PAGE_LIMIT = 20;

const STATUS_CONFIG = {
  pending: {
    label: '待處理',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800',
  },
  processing: {
    label: '處理中',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
  },
  completed: {
    label: '已完成',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
  },
  deleted: {
    label: '已刪除',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-800',
  },
};

export default function TeacherWishesPage() {
  const { getToken } = useAuth();

  const [wishes, setWishes] = useState<Wish[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchWishes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError('需要登入驗證');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_LIMIT.toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`${API_URL}/api/wishes/list?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`取得願望清單失敗: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setWishes(data.data.wishes || []);
        setTotal(data.data.total || 0);
        setTotalPages(Math.ceil((data.data.total || 0) / PAGE_LIMIT));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤');
    } finally {
      setLoading(false);
    }
  }, [getToken, page, statusFilter]);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">學習願望池</h1>
        <p className="mt-1 text-gray-600">查看用戶提交的學習願望，了解學習需求</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'processing', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? '全部' : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
          ) : wishes.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-5xl">📭</div>
              <p className="text-gray-500">目前沒有願望</p>
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-500">
                共 {total} 個願望
              </div>

              <div className="space-y-4">
                {wishes.map((wish) => {
                  const statusConfig = STATUS_CONFIG[wish.status];
                  return (
                    <div
                      key={wish.id}
                      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-2 flex items-start justify-between gap-4">
                        <p className="flex-1 text-gray-800">{wish.content}</p>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatDate(wish.createdAt)}</span>
                        {wish.email && (
                          <span className="flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                            {wish.email}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="pt-4">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
