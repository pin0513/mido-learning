'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

const sidebarItems = [
  { label: '學習中心', href: '/dashboard' },
  { label: '我的元件', href: '/teacher/components' },
  { label: '上傳教材', href: '/teacher/components/upload' },
  { label: '願望池', href: '/teacher/wishes' },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasTeacherRole, setHasTeacherRole] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const checkTeacherRole = async () => {
      if (!loading && !user) {
        router.push('/login');
        return;
      }

      if (user) {
        try {
          const token = await user.getIdTokenResult(true);
          const isTeacher = token.claims.teacher === true;
          const isAdmin = token.claims.admin === true;

          if (isTeacher || isAdmin) {
            setHasTeacherRole(true);
          } else {
            router.push('/dashboard');
          }
        } catch {
          router.push('/dashboard');
        }
      }
      setCheckingRole(false);
    };

    checkTeacherRole();
  }, [user, loading, router]);

  if (loading || checkingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user || !hasTeacherRole) {
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
