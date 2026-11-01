'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCourses, Course } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTrial } from '@/hooks/useTrial';

/** 防抖 hook：延遲更新 value，避免每次按鍵就觸發 API */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function GamesPage() {
  const { user } = useAuth();
  const { remainingCount, hasRemaining } = useTrial();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [gameTypeFilter, setGameTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minLevel, setMinLevel] = useState<number | undefined>(undefined);
  const [maxLevel, setMaxLevel] = useState<number | undefined>(undefined);
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // 搜尋防抖：300ms 後才觸發 API
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        const data = await getCourses({
          type: 'game',
          status: 'published',
          search: debouncedSearch || undefined,
          minLevel,
          maxLevel,
          priceFilter: priceFilter !== 'all' ? priceFilter : undefined,
          sortBy: sortBy as 'price_asc' | 'price_desc' | 'level_asc' | 'level_desc' | 'newest' | 'oldest',
          gameType: gameTypeFilter !== 'all' ? (gameTypeFilter as 'typing' | 'math' | 'memory') : undefined,
        });
        setCourses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, [debouncedSearch, minLevel, maxLevel, priceFilter, sortBy, gameTypeFilter]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleMinLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setMinLevel(value ? parseInt(value) : undefined);
  };

  const handleMaxLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setMaxLevel(value ? parseInt(value) : undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎮 遊戲學習中心
          </h1>
          <p className="text-xl text-gray-600">
            透過遊戲提升技能，邊玩邊學習！
          </p>
        </div>

        {/* Trial Mode Banner */}
        {!user && (
          <div className={`max-w-3xl mx-auto mb-8 rounded-lg p-6 ${
            hasRemaining
              ? 'bg-blue-50 border-2 border-blue-200'
              : 'bg-red-50 border-2 border-red-200'
          }`}>
            {hasRemaining ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl">🎮</span>
                  <h3 className="text-lg font-bold text-blue-900">試玩模式</h3>
                </div>
                <p className="text-blue-700 mb-3">
                  您還有 <span className="text-2xl font-bold text-blue-600">{remainingCount}</span> 次免費試玩機會
                </p>
                <p className="text-sm text-blue-600 mb-4">
                  試玩次數將在 1 小時後重置
                </p>
                <Link href="/register">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition">
                    免費註冊，無限暢玩 + 累積成就 🏆
                  </button>
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl">⏰</span>
                  <h3 className="text-lg font-bold text-red-900">試玩次數已用完</h3>
                </div>
                <p className="text-red-700 mb-4">
                  您的試玩機會已經用完囉！
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/register">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition">
                      立即註冊，繼續遊玩 🚀
                    </button>
                  </Link>
                  <Link href="/login">
                    <button className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition">
                      已有帳號？登入
                    </button>
                  </Link>
                </div>
                <p className="text-sm text-red-600 mt-3">
                  試玩次數將在 1 小時後重置
                </p>
              </div>
            )}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          {/* Search Bar */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 搜尋遊戲
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="輸入關鍵字搜尋標題或描述..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Game Type Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              遊戲類型
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setGameTypeFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  gameTypeFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                全部遊戲
              </button>
              <button
                onClick={() => setGameTypeFilter('typing')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  gameTypeFilter === 'typing'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                ⌨️ 英打練習
              </button>
              <button
                onClick={() => setGameTypeFilter('math')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  gameTypeFilter === 'math'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                🔢 數學運算
              </button>
              <button
                onClick={() => setGameTypeFilter('memory')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  gameTypeFilter === 'memory'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                🧠 記憶力
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Difficulty Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最低難度
              </label>
              <select
                value={minLevel || ''}
                onChange={handleMinLevelChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">不限</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                  <option key={level} value={level}>Lv.{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最高難度
              </label>
              <select
                value={maxLevel || ''}
                onChange={handleMaxLevelChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">不限</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                  <option key={level} value={level}>Lv.{level}</option>
                ))}
              </select>
            </div>

            {/* Price Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                價格篩選
              </label>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value as 'all' | 'free' | 'paid')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">全部</option>
                <option value="free">💚 免費</option>
                <option value="paid">💎 付費</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                排序方式
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">🆕 最新</option>
                <option value="oldest">🕰️ 最舊</option>
                <option value="price_asc">💰 價格低→高</option>
                <option value="price_desc">💎 價格高→低</option>
                <option value="level_asc">📊 難度低→高</option>
                <option value="level_desc">🔥 難度高→低</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-center text-gray-600">
          找到 <span className="font-bold text-blue-600">{courses.length}</span> 個遊戲
        </div>

        {/* Games Grid */}
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg mb-2">找不到符合條件的遊戲</p>
            <p className="text-gray-400 text-sm">試試調整搜尋條件</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden"
              >
                <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl">
                      {course.gameConfig?.gameType === 'typing' && '⌨️'}
                      {course.gameConfig?.gameType === 'math' && '🔢'}
                      {course.gameConfig?.gameType === 'memory' && '🧠'}
                      {!course.gameConfig?.gameType && '🎮'}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-bold">
                      Lv.{course.gameConfig?.level}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {course.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-500">
                        ⏱️ {course.gameConfig?.timeLimit}秒
                      </span>
                      {course.gameConfig?.targetWPM && (
                        <span className="text-gray-500">
                          🎯 {course.gameConfig.targetWPM} WPM
                        </span>
                      )}
                    </div>
                    {course.price === 0 ? (
                      <span className="text-green-600 font-bold">免費</span>
                    ) : (
                      <span className="text-blue-600 font-bold">
                        ${course.price}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
