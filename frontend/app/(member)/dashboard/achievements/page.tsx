'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Lock, Check, Gift } from 'lucide-react';
import { toast } from 'sonner';

interface AchievementDto {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: string;
  condition: {
    type: string;
    [key: string]: string | number | undefined;
  };
  reward: {
    experience: number;
    coins: number;
  };
  isActive: boolean;
  displayOrder: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  currentProgress?: number;
  targetProgress?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [sortBy, setSortBy] = useState<'order' | 'unlockedAt'>('order');

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const token = localStorage.getItem('token');
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
      } else {
        toast.error('載入成就失敗');
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
      toast.error('載入成就失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (achievementId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/achievements/${achievementId}/claim`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success('獎勵已領取！');
        loadAchievements();
      } else {
        toast.error('領取失敗');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('領取失敗');
    }
  };

  const getConditionDisplay = (achievement: AchievementDto) => {
    const { condition } = achievement;

    switch (condition.type) {
      case 'CompleteCourse':
        return `完成課程 ${condition.courseId}`;
      case 'CompleteWithStars':
        return `完成課程並獲得 ${condition.minStars} 星`;
      case 'ReachWpm':
        return `達到 ${condition.minWpm} WPM`;
      case 'ReachAccuracy':
        return `達到 ${condition.minAccuracy}% 準確度`;
      case 'ConsecutivePerfect':
        return `連續 ${condition.consecutivePerfect} 次完美`;
      case 'TotalGamesPlayed':
        return `累計遊玩 ${condition.totalGames} 次`;
      case 'TotalStarsCollected':
        return `累計獲得 ${condition.totalStars} 星`;
      default:
        return '-';
    }
  };

  const getProgress = (achievement: AchievementDto) => {
    if (!achievement.currentProgress || !achievement.targetProgress) {
      return null;
    }
    return (achievement.currentProgress / achievement.targetProgress) * 100;
  };

  const filteredAchievements = achievements
    .filter((a) => {
      if (filter === 'unlocked') return a.isUnlocked;
      if (filter === 'locked') return !a.isUnlocked;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'unlockedAt') {
        if (!a.unlockedAt) return 1;
        if (!b.unlockedAt) return -1;
        return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
      }
      return a.displayOrder - b.displayOrder;
    });

  const stats = {
    total: achievements.length,
    unlocked: achievements.filter((a) => a.isUnlocked).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">我的成就</h1>
        <p className="text-gray-600">
          已解鎖 {stats.unlocked} / {stats.total} 個成就
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">總成就數</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已解鎖</p>
                <p className="text-2xl font-bold text-green-600">{stats.unlocked}</p>
              </div>
              <Check className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">完成率</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0}%
                </p>
              </div>
              <Trophy className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={filter} onValueChange={(value) => setFilter(value as 'all' | 'unlocked' | 'locked')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部成就</SelectItem>
            <SelectItem value="unlocked">已解鎖</SelectItem>
            <SelectItem value="locked">未解鎖</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'order' | 'unlockedAt')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="order">依順序排序</SelectItem>
            <SelectItem value="unlockedAt">依解鎖時間</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Achievements Grid */}
      {filteredAchievements.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">沒有符合條件的成就</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAchievements.map((achievement) => (
            <Card
              key={achievement.id}
              className={
                achievement.isUnlocked
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'opacity-75'
              }
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">
                    {achievement.isUnlocked ? achievement.icon : '🔒'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-lg">
                        {achievement.title}
                      </h3>
                      {achievement.isUnlocked && (
                        <Badge variant="default" className="flex-shrink-0">
                          <Check className="w-3 h-3 mr-1" />
                          已解鎖
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {achievement.description}
                    </p>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-500">條件：</span>
                        <span className="font-medium">
                          {getConditionDisplay(achievement)}
                        </span>
                      </div>

                      {!achievement.isUnlocked && getProgress(achievement) !== null && (
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>進度</span>
                            <span>
                              {achievement.currentProgress} / {achievement.targetProgress}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${getProgress(achievement)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center">
                          💎 {achievement.reward.experience} XP
                        </span>
                        <span className="flex items-center">
                          🪙 {achievement.reward.coins} 金幣
                        </span>
                      </div>

                      {achievement.isUnlocked && achievement.unlockedAt && (
                        <p className="text-xs text-gray-500">
                          解鎖時間：
                          {new Date(achievement.unlockedAt).toLocaleDateString('zh-TW', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
