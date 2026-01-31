'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

const sidebarItems = [
  { label: '管理控制台', href: '/admin' },
  { label: '用戶管理', href: '/admin/users' },
  { label: '願望池', href: '/admin/wishes' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!loading && !user) {
        router.push('/login');
        return;
      }

      if (user) {
        try {
          const token = await user.getIdTokenResult(true);
          if (token.claims.admin === true) {
            setIsAdmin(true);
          } else {
            router.push('/components');
          }
        } catch {
          router.push('/components');
        }
      }
      setCheckingAdmin(false);
    };

    checkAdminRole();
  }, [user, loading, router, getToken]);

  if (loading || checkingAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar items={sidebarItems} />
        <main className="flex-1 bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
