'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ('member' | 'teacher' | 'game_admin' | 'super_admin')[];
  fallbackPath?: string;
}

export function RoleGuard({ children, allowedRoles, fallbackPath = '/dashboard' }: RoleGuardProps) {
  const { user, loading, role, roleLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for both auth and role to load
    if (loading || roleLoading) {
      return;
    }

    // Redirect if not authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // Redirect if role is not allowed
    if (role && !allowedRoles.includes(role)) {
      router.push(fallbackPath);
    }
  }, [user, loading, role, roleLoading, allowedRoles, fallbackPath, router]);

  // Show loading while checking auth
  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">驗證中...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated or not authorized
  if (!user || (role && !allowedRoles.includes(role))) {
    return null;
  }

  return <>{children}</>;
}
