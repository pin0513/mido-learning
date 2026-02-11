'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCourses, Course } from '@/lib/api';

export default function GamesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        const data = await getCourses({
          type: 'game',
          status: 'published'
        });
        setCourses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  const filteredCourses = filter === 'all'
    ? courses
    : courses.filter(c => c.gameConfig?.gameType === filter);

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

        {/* Filter */}
        <div className="flex justify-center mb-8 space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            全部遊戲
          </button>
          <button
            onClick={() => setFilter('typing')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              filter === 'typing'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            ⌨️ 英打練習
          </button>
          <button
            onClick={() => setFilter('math')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              filter === 'math'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🔢 數學運算
          </button>
          <button
            onClick={() => setFilter('memory')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              filter === 'memory'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🧠 記憶力
          </button>
        </div>

        {/* Games Grid */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">目前沒有可用的遊戲</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
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
