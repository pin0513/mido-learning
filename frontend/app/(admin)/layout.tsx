'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

const sidebarItems = [
  { label: 'Admin Dashboard', href: '/admin' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Courses', href: '/admin/courses' },
  { label: 'Analytics', href: '/admin/analytics' },
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
          const token = await user.getIdTokenResult();
          if (token.claims.admin === true) {
            setIsAdmin(true);
          } else {
            router.push('/dashboard');
          }
        } catch {
          router.push('/dashboard');
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
