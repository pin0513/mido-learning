'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRecentGameSessions, GameSession } from '@/lib/api';
import { getAuth } from 'firebase/auth';

export default function CharacterDashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Get user info
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          setUserEmail(user.email || '');
        }

        // Load recent game sessions
        const data = await getRecentGameSessions(10);
        setSessions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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

  // Calculate statistics
  const totalGames = sessions.length;
  const avgScore = totalGames > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / totalGames)
    : 0;
  const avgAccuracy = totalGames > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.accuracy, 0) / totalGames * 10) / 10
    : 0;
  const totalStars = sessions.reduce((sum, s) => sum + s.stars, 0);
  const avgWpm = sessions.filter(s => s.wpm).length > 0
    ? Math.round(sessions.filter(s => s.wpm).reduce((sum, s) => sum + (s.wpm || 0), 0) / sessions.filter(s => s.wpm).length)
    : 0;

  const getStarColor = (stars: number) => {
    if (stars >= 3) return 'text-yellow-500';
    if (stars >= 2) return 'text-yellow-400';
    return 'text-gray-400';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">角色小後台</h1>
          <p className="mt-2 text-gray-600">查看你的學習進度和遊戲紀錄</p>
        </div>

        {/* User Profile Card */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center space-x-6">
            <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center text-4xl">
              👤
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{userEmail || '學習者'}</h2>
              <div className="flex items-center space-x-6">
                <div>
                  <p className="text-sm opacity-80">等級</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
                <div>
                  <p className="text-sm opacity-80">經驗值</p>
                  <p className="text-2xl font-bold">0 / 100</p>
                </div>
                <div>
                  <p className="text-sm opacity-80">金幣</p>
                  <p className="text-2xl font-bold">💰 0</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-white/20 rounded-full h-3">
            <div className="bg-white rounded-full h-3" style={{ width: '0%' }}></div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl mb-2">🎮</div>
            <div className="text-sm text-gray-500">遊戲次數</div>
            <div className="text-2xl font-bold text-gray-900">{totalGames}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-sm text-gray-500">平均分數</div>
            <div className="text-2xl font-bold text-gray-900">{avgScore}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-sm text-gray-500">平均正確率</div>
            <div className="text-2xl font-bold text-gray-900">{avgAccuracy}%</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-sm text-gray-500">總星數</div>
            <div className="text-2xl font-bold text-gray-900">{totalStars}</div>
          </div>
        </div>

        {/* Recent Games Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">最近遊戲紀錄</h2>
            {totalGames > 0 && (
              <button
                onClick={() => router.push('/games')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                繼續遊戲 →
              </button>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-gray-600 mb-6">還沒有遊戲紀錄</p>
              <button
                onClick={() => router.push('/games')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                開始第一場遊戲
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {session.courseTitle || session.courseId}
                        </h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded">
                          Level {session.level}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded">
                          {session.gameType}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">分數</p>
                          <p className="font-bold text-gray-900">{session.score}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">正確率</p>
                          <p className="font-bold text-gray-900">{session.accuracy.toFixed(1)}%</p>
                        </div>
                        {session.wpm && (
                          <div>
                            <p className="text-gray-500">WPM</p>
                            <p className="font-bold text-gray-900">{session.wpm.toFixed(0)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-500">時間</p>
                          <p className="font-bold text-gray-900">{session.timeSpent}s</p>
                        </div>
                        <div>
                          <p className="text-gray-500">星級</p>
                          <p className={`font-bold text-2xl ${getStarColor(session.stars)}`}>
                            {'⭐'.repeat(session.stars)}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(session.createdAt).toLocaleString('zh-TW')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Stats */}
        {avgWpm > 0 && (
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">打字遊戲統計</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">平均 WPM</p>
                <p className="text-3xl font-bold text-blue-600">{avgWpm}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">最高 WPM</p>
                <p className="text-3xl font-bold text-blue-600">
                  {Math.max(...sessions.filter(s => s.wpm).map(s => s.wpm || 0)).toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">打字遊戲次數</p>
                <p className="text-3xl font-bold text-blue-600">
                  {sessions.filter(s => s.wpm).length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
