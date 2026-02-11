'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourseById, Course } from '@/lib/api';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourse() {
      try {
        setLoading(true);
        const data = await getCourseById(courseId);
        setCourse(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [courseId]);

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

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || '課程不存在'}</p>
          <button
            onClick={() => router.push('/games')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回遊戲列表
          </button>
        </div>
      </div>
    );
  }

  const getGameIcon = (gameType?: string) => {
    switch (gameType) {
      case 'typing':
        return '⌨️';
      case 'math':
        return '🔢';
      case 'memory':
        return '🧠';
      default:
        return '🎮';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/games')}
          className="mb-6 text-blue-600 hover:text-blue-700 flex items-center"
        >
          ← 返回遊戲列表
        </button>

        {/* Hero Section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="relative h-64 bg-gradient-to-br from-blue-500 to-purple-600">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-9xl">{getGameIcon(course.gameConfig?.gameType)}</span>
            </div>
            <div className="absolute top-6 right-6">
              <span className="bg-white text-blue-600 px-4 py-2 rounded-full text-lg font-bold">
                Level {course.gameConfig?.level}
              </span>
            </div>
          </div>

          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>
            <p className="text-xl text-gray-600 mb-6">{course.description}</p>

            {/* Game Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl mb-2">⏱️</div>
                <div className="text-sm text-gray-500">時間限制</div>
                <div className="text-lg font-bold">{course.gameConfig?.timeLimit}秒</div>
              </div>

              {course.gameConfig?.targetWPM && (
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="text-sm text-gray-500">目標 WPM</div>
                  <div className="text-lg font-bold">{course.gameConfig.targetWPM}</div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl mb-2">📝</div>
                <div className="text-sm text-gray-500">題目數量</div>
                <div className="text-lg font-bold">{course.gameConfig?.questions.length}</div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl mb-2">💰</div>
                <div className="text-sm text-gray-500">價格</div>
                <div className="text-lg font-bold text-green-600">
                  {course.price === 0 ? '免費' : `$${course.price}`}
                </div>
              </div>
            </div>

            {/* Game Rules */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">🎮 遊戲規則</h2>
              <div className="bg-blue-50 p-6 rounded-lg space-y-3">
                <p className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>在時間限制內完成所有題目</span>
                </p>
                {course.gameConfig?.targetWPM && (
                  <p className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>目標達到 {course.gameConfig.targetWPM} WPM 以上</span>
                  </p>
                )}
                <p className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>正確率越高，獲得的星級越高</span>
                </p>
                <p className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>連續正確可以獲得 Combo 加分</span>
                </p>
              </div>
            </div>

            {/* Rewards */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">🏆 獎勵機制</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">⭐</div>
                  <div className="font-bold">1 星</div>
                  <div className="text-sm text-gray-600">完成遊戲</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">⭐⭐</div>
                  <div className="font-bold">2 星</div>
                  <div className="text-sm text-gray-600">正確率 ≥ 85%</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">⭐⭐⭐</div>
                  <div className="font-bold">3 星</div>
                  <div className="text-sm text-gray-600">正確率 ≥ 95%</div>
                </div>
              </div>
              <div className="mt-4 bg-green-50 p-4 rounded-lg">
                <p className="text-center text-sm text-gray-700">
                  完成遊戲可獲得 <span className="font-bold text-blue-600">經驗值</span> 與{' '}
                  <span className="font-bold text-yellow-600">金幣</span>！
                </p>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={() => router.push(`/courses/${courseId}/play`)}
              className="w-full py-4 bg-blue-600 text-white text-xl font-bold rounded-lg hover:bg-blue-700 transition-colors"
            >
              🎮 開始遊戲
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
