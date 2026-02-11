'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';

export default function GameAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={['game_admin', 'super_admin']} fallbackPath="/dashboard">
      <div className="min-h-screen bg-gray-100">
        {/* Game Admin Navigation */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-xl font-bold text-purple-600">
                    🎮 遊戲管理後台
                  </span>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <a
                    href="/game-admin"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    總覽
                  </a>
                  <a
                    href="/game-admin/courses"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    課程管理
                  </a>
                  <a
                    href="/game-admin/achievements"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    成就管理
                  </a>
                  <a
                    href="/game-admin/analytics"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    數據分析
                  </a>
                </div>
              </div>
              <div className="flex items-center">
                <a
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  返回前台
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main>{children}</main>
      </div>
    </RoleGuard>
  );
}
