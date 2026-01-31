'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';

const sidebarItems = [
  { label: '我的教材', href: '/teacher/components' },
  { label: '新增教材', href: '/teacher/components/upload' },
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
            router.push('/components');
          }
        } catch {
          router.push('/components');
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
        <main className="flex-1 bg-gray-50 p-4 md:p-6">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
