'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';

type UserRole = 'admin' | 'teacher' | 'member' | 'guest';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '系統管理員',
  teacher: '老師',
  member: '一般用戶',
  guest: '訪客',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  teacher: 'bg-green-100 text-green-800',
  member: 'bg-blue-100 text-blue-800',
  guest: 'bg-gray-100 text-gray-600',
};

export function Header() {
  const { user, signOut, loading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setRoleLoading(true);
      // Force refresh token to get latest custom claims
      user.getIdTokenResult(true).then((token) => {
        if (token.claims.admin) {
          setUserRole('admin');
        } else if (token.claims.teacher) {
          setUserRole('teacher');
        } else {
          setUserRole('member');
        }
        setRoleLoading(false);
      }).catch(() => {
        setUserRole('member');
        setRoleLoading(false);
      });
    } else {
      setUserRole('guest');
    }
  }, [user]);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold text-blue-600">
          Mido Learning
        </Link>

        <nav className="hidden space-x-8 md:flex">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            首頁
          </Link>
          {user && (
            <>
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                學習中心
              </Link>
              {(userRole === 'admin' || userRole === 'teacher') && (
                <Link href="/teacher/components" className="text-gray-600 hover:text-gray-900">
                  教材管理
                </Link>
              )}
              {userRole === 'admin' && (
                <Link href="/admin/users" className="text-gray-600 hover:text-gray-900">
                  用戶管理
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="h-10 w-20 animate-pulse rounded bg-gray-200" />
          ) : user ? (
            <>
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-gray-600 sm:inline">{user.email}</span>
                {roleLoading ? (
                  <span className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                ) : (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[userRole]}`}
                  >
                    {ROLE_LABELS[userRole]}
                  </span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                登出
              </Button>
            </>
          ) : (
            <>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS.guest}`}
              >
                {ROLE_LABELS.guest}
              </span>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  登入
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">註冊</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
