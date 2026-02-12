'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Trophy, ArrowRight } from 'lucide-react';

interface AchievementDto {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  reward: {
    experience: number;
    coins: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [achievements, setAchievements] = useState<AchievementDto[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/achievements/my`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const result: ApiResponse<AchievementDto[]> = await response.json();
        setAchievements(result.data);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoadingAchievements(false);
    }
  };

  const unlockedAchievements = achievements.filter((a) => a.isUnlocked);
  const recentlyUnlocked = unlockedAchievements
    .filter((a) => a.unlockedAt)
    .sort((a, b) => {
      const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
      const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Welcome back, {user?.email?.split('@')[0] || 'User'}!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Courses Enrolled</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-sm text-gray-500">Start learning today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Lessons Completed</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-sm text-gray-500">Keep up the good work</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/dashboard/achievements')}
        >
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Achievements
            </h2>
          </CardHeader>
          <CardContent>
            {loadingAchievements ? (
              <p className="text-sm text-gray-500">載入中...</p>
            ) : (
              <>
                <p className="text-3xl font-bold text-purple-600">
                  {unlockedAchievements.length} / {achievements.length}
                </p>
                <p className="text-sm text-gray-500">
                  {unlockedAchievements.length === 0
                    ? 'Unlock your first badge'
                    : `${Math.round((unlockedAchievements.length / achievements.length) * 100)}% completed`}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recently Unlocked Achievements */}
      {recentlyUnlocked.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>最近解鎖的成就</CardTitle>
              <CardDescription>恭喜你的成就！</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/achievements')}
            >
              查看全部
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentlyUnlocked.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200"
                >
                  <div className="text-2xl flex-shrink-0">{achievement.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{achievement.title}</p>
                    <p className="text-xs text-gray-600">{achievement.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>💎 {achievement.reward.experience} XP</span>
                      <span>🪙 {achievement.reward.coins} 金幣</span>
                      {achievement.unlockedAt && (
                        <span className="ml-auto">
                          {new Date(achievement.unlockedAt).toLocaleDateString('zh-TW')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No recent activity. Start a course to begin learning!</p>
        </CardContent>
      </Card>
    </div>
  );
}
