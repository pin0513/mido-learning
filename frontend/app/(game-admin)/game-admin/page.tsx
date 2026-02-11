'use client';

import { useAuth } from '@/hooks/useAuth';

export default function GameAdminDashboard() {
  const { user, role } = useAuth();

  return (
    <div className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">遊戲管理後台</h1>
          <p className="mt-2 text-gray-600">
            歡迎回來，{user?.email}（{role}）
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-3xl">🎮</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      總課程數
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">0</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-3xl">🏆</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      成就數量
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">0</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-3xl">👥</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      活躍玩家
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">0</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-3xl">📊</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      今日遊戲次數
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">0</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">快速操作</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/game-admin/courses/create"
              className="flex items-center p-4 border border-gray-300 rounded-lg hover:border-purple-500 hover:shadow-md transition"
            >
              <div className="flex-shrink-0">
                <div className="text-3xl">➕</div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">建立遊戲課程</h3>
                <p className="text-sm text-gray-500">新增打字、數學或記憶遊戲</p>
              </div>
            </a>

            <a
              href="/game-admin/achievements/create"
              className="flex items-center p-4 border border-gray-300 rounded-lg hover:border-purple-500 hover:shadow-md transition"
            >
              <div className="flex-shrink-0">
                <div className="text-3xl">🏅</div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">建立成就</h3>
                <p className="text-sm text-gray-500">設計新的成就獎勵</p>
              </div>
            </a>

            <a
              href="/game-admin/analytics"
              className="flex items-center p-4 border border-gray-300 rounded-lg hover:border-purple-500 hover:shadow-md transition"
            >
              <div className="flex-shrink-0">
                <div className="text-3xl">📈</div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">查看數據</h3>
                <p className="text-sm text-gray-500">分析玩家表現與遊戲熱度</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
