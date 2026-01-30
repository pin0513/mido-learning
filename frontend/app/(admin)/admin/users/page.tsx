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

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required');
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
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data: UsersResponse = await response.json();

      if (data.success) {
        setUsers(data.data.users);
        setTotal(data.data.total);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
        setError('Authentication required');
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
        throw new Error(`Failed to update role: ${response.status}`);
      }

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.uid === uid ? { ...user, role: newRole } : user
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-gray-600">Manage user accounts and roles</p>
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
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-500">
                Showing {users.length} of {total} users
              </div>

              <UserTable
                users={users}
                onRoleChange={handleRoleChange}
                updatingUserId={updatingUserId}
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
    </div>
  );
}
