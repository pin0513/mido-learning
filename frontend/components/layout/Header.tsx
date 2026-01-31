'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <header className="border-b border-gray-200 bg-white relative z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-blue-600">
          <Image
            src="/images/logo.png"
            alt="Mido Learning"
            width={32}
            height={32}
            className="rounded"
          />
          <span className="hidden sm:inline">Mido Learning</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden space-x-8 md:flex">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            首頁
          </Link>
          {user && (
            <>
              <Link href="/components" className="text-gray-600 hover:text-gray-900">
                教材清單
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
          {/* Desktop User Info */}
          {loading ? (
            <div className="h-10 w-20 animate-pulse rounded bg-gray-200" />
          ) : user ? (
            <div className="hidden items-center space-x-4 md:flex">
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-gray-600 lg:inline">{user.email}</span>
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
            </div>
          ) : (
            <div className="hidden items-center space-x-4 md:flex">
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
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
          >
            <span className="sr-only">開啟選單</span>
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="space-y-1 px-4 py-3">
            <Link
              href="/"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              首頁
            </Link>
            {user && (
              <>
                <Link
                  href="/components"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  教材清單
                </Link>
                {(userRole === 'admin' || userRole === 'teacher') && (
                  <Link
                    href="/teacher/components"
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    教材管理
                  </Link>
                )}
                {userRole === 'admin' && (
                  <Link
                    href="/admin/users"
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    用戶管理
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile User Info */}
          <div className="border-t border-gray-200 px-4 py-3">
            {loading ? (
              <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
            ) : user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{user.email}</span>
                  {!roleLoading && (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[userRole]}`}
                    >
                      {ROLE_LABELS[userRole]}
                    </span>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={signOut} className="w-full">
                  登出
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">
                    登入
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full">註冊</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
