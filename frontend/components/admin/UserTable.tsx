'use client';

import { RoleSelect, Role } from './RoleSelect';
import { Button } from '@/components/ui/Button';

// Protected admin email that cannot be deleted
const PROTECTED_ADMIN_EMAIL = 'pin0513@gmail.com';

export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  role: Role;
  createdAt: string;
  lastLoginAt: string | null;
}

interface UserTableProps {
  users: User[];
  onRoleChange: (uid: string, role: Role) => void;
  onDelete?: (uid: string, email: string) => void;
  updatingUserId: string | null;
  deletingUserId?: string | null;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function UserTable({
  users,
  onRoleChange,
  onDelete,
  updatingUserId,
  deletingUserId,
}: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">找不到用戶。</p>
      </div>
    );
  }

  const isProtectedUser = (email: string) => email === PROTECTED_ADMIN_EMAIL;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              電子郵件
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              角色
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              建立時間
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              最後登入
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {users.map((user) => (
            <tr key={user.uid} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{user.email}</span>
                    {isProtectedUser(user.email) && (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        系統管理員
                      </span>
                    )}
                  </div>
                  {user.displayName && (
                    <div className="text-sm text-gray-500">{user.displayName}</div>
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <RoleSelect
                  value={user.role}
                  onChange={(role) => onRoleChange(user.uid, role)}
                  disabled={updatingUserId === user.uid}
                />
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {formatDate(user.createdAt)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {formatDate(user.lastLoginAt)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                {onDelete && !isProtectedUser(user.email) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(user.uid, user.email)}
                    disabled={deletingUserId === user.uid}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    {deletingUserId === user.uid ? (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </Button>
                )}
                {isProtectedUser(user.email) && (
                  <span className="text-xs text-gray-400">受保護</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
