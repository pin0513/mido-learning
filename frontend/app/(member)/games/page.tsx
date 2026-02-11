'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCourses, Course } from '@/lib/api';

export default function GamesPage() {
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

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        const data = await getCourses({
          type: 'game',
          status: 'published',
          search: searchQuery || undefined,
          minLevel,
          maxLevel,
          priceFilter: priceFilter !== 'all' ? priceFilter : undefined,
          sortBy: sortBy as any,
        });

        // Client-side game type filter
        const filtered = gameTypeFilter === 'all'
          ? data
          : data.filter(c => c.gameConfig?.gameType === gameTypeFilter);

        setCourses(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, [searchQuery, minLevel, maxLevel, priceFilter, sortBy, gameTypeFilter]);

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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎮 遊戲學習中心
          </h1>
          <p className="text-xl text-gray-600">
            透過遊戲提升技能，邊玩邊學習！
          </p>
        </div>

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
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                全部遊戲
              </button>
              <button
                onClick={() => setGameTypeFilter('typing')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  gameTypeFilter === 'typing'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ⌨️ 英打練習
              </button>
              <button
                onClick={() => setGameTypeFilter('math')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  gameTypeFilter === 'math'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🔢 數學運算
              </button>
              <button
                onClick={() => setGameTypeFilter('memory')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  gameTypeFilter === 'memory'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                onChange={(e) => setPriceFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
