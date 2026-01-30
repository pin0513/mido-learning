'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { UserTable, User } from '@/components/admin/UserTable';
import { UserFilters } from '@/components/admin/UserFilters';
import { Pagination } from '@/components/admin/Pagination';
import { Role } from '@/components/admin/RoleSelect';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const PAGE_LIMIT = 20;
const PROTECTED_ADMIN_EMAIL = 'pin0513@gmail.com';

interface UsersResponse {
  success: boolean;
  data: {
    users: User[];
    total: number;
    page: number;
    limit: number;
  };
}

export default function AdminUsersPage() {
  const { getToken } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ uid: string; email: string } | null>(null);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const fetchUsers = useCallback(async () => {
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

      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }

      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`${API_URL}/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`取得用戶失敗: ${response.status}`);
      }

      const data: UsersResponse = await response.json();

      if (data.success) {
        setUsers(data.data.users);
        setTotal(data.data.total);
      } else {
        throw new Error('取得用戶失敗');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤');
    } finally {
      setLoading(false);
    }
  }, [getToken, page, roleFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const handleRoleChange = async (uid: string, newRole: Role) => {
    setUpdatingUserId(uid);

    try {
      const token = await getToken();
      if (!token) {
        setError('需要登入驗證');
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/users/${uid}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error(`更新角色失敗: ${response.status}`);
      }

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.uid === uid ? { ...user, role: newRole } : user
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新角色失敗');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteClick = (uid: string, email: string) => {
    if (email === PROTECTED_ADMIN_EMAIL) {
      setError('此用戶為系統管理員，無法刪除');
      return;
    }
    setDeleteConfirm({ uid, email });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    const { uid, email } = deleteConfirm;

    if (email === PROTECTED_ADMIN_EMAIL) {
      setError('此用戶為系統管理員，無法刪除');
      setDeleteConfirm(null);
      return;
    }

    setDeletingUserId(uid);
    setDeleteConfirm(null);

    try {
      const token = await getToken();
      if (!token) {
        setError('需要登入驗證');
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/users/${uid}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`刪除用戶失敗: ${response.status}`);
      }

      // Remove from list
      setUsers((prevUsers) => prevUsers.filter((user) => user.uid !== uid));
      setTotal((prev) => prev - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除用戶失敗');
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">用戶管理</h1>
        <p className="mt-1 text-gray-600">管理用戶帳號與角色</p>
      </div>

      <Card>
        <CardHeader>
          <UserFilters
            search={search}
            onSearchChange={setSearch}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-500">
                顯示 {users.length} 筆，共 {total} 位用戶
              </div>

              <UserTable
                users={users}
                onRoleChange={handleRoleChange}
                onDelete={handleDeleteClick}
                updatingUserId={updatingUserId}
                deletingUserId={deletingUserId}
              />

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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">確認刪除用戶</h3>
            <p className="mt-2 text-gray-600">
              您確定要刪除用戶 <strong>{deleteConfirm.email}</strong> 嗎？此操作無法復原。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
