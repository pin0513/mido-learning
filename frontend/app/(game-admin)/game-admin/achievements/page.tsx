'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trophy, Plus, MoreVertical, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: string;
  condition: {
    type: string;
    courseId?: string;
    minStars?: number;
    minWpm?: number;
    minAccuracy?: number;
    consecutivePerfect?: number;
    totalGames?: number;
    totalStars?: number;
  };
  reward: {
    experience: number;
    coins: number;
  };
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export default function AchievementsPage() {
  const router = useRouter();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, [activeOnly]);

  const loadAchievements = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/game-admin/achievements?activeOnly=${activeOnly}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const result: ApiResponse<Achievement[]> = await response.json();
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

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這個成就嗎？')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/game-admin/achievements/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success('成就已刪除');
        loadAchievements();
      } else {
        toast.error('刪除失敗');
      }
    } catch (error) {
      console.error('Error deleting achievement:', error);
      toast.error('刪除失敗');
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/game-admin/achievements/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isActive: !currentState,
          }),
        }
      );

      if (response.ok) {
        toast.success(`成就已${!currentState ? '啟用' : '停用'}`);
        loadAchievements();
      } else {
        toast.error('操作失敗');
      }
    } catch (error) {
      console.error('Error toggling achievement:', error);
      toast.error('操作失敗');
    }
  };

  const getConditionDisplay = (achievement: Achievement) => {
    const { type, condition } = achievement;
    const c = condition;

    switch (c.type) {
      case 'CompleteCourse':
        return `完成課程 ${c.courseId}`;
      case 'CompleteWithStars':
        return `完成課程 ${c.courseId} 並獲得 ${c.minStars} 星`;
      case 'ReachWpm':
        return `達到 ${c.minWpm} WPM`;
      case 'ReachAccuracy':
        return `達到 ${c.minAccuracy}% 準確度`;
      case 'ConsecutivePerfect':
        return `連續 ${c.consecutivePerfect} 次完美`;
      case 'TotalGamesPlayed':
        return `累計遊玩 ${c.totalGames} 次`;
      case 'TotalStarsCollected':
        return `累計獲得 ${c.totalStars} 星`;
      default:
        return '-';
    }
  };

  const getTypeDisplay = (type: string) => {
    const types: Record<string, string> = {
      GameCompletion: '遊戲完成',
      StarCollection: '星星收集',
      WinStreak: '連勝',
      SkillMastery: '技能精通',
      Milestone: '里程碑',
    };
    return types[type] || type;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">成就管理</h1>
          <p className="text-gray-500 mt-1">
            管理遊戲成就系統，設定解鎖條件與獎勵
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeOnly ? 'outline' : 'secondary'}
            onClick={() => setActiveOnly(!activeOnly)}
          >
            {activeOnly ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                顯示全部
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                只顯示啟用
              </>
            )}
          </Button>
          <Button onClick={() => router.push('/game-admin/achievements/new')}>
            <Plus className="w-4 h-4 mr-2" />
            新增成就
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>成就列表</CardTitle>
          <CardDescription>
            目前共有 {achievements.length} 個成就
          </CardDescription>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">尚未建立任何成就</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/game-admin/achievements/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                建立第一個成就
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>順序</TableHead>
                  <TableHead>圖示</TableHead>
                  <TableHead>標題</TableHead>
                  <TableHead>類型</TableHead>
                  <TableHead>條件</TableHead>
                  <TableHead>獎勵</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {achievements.map((achievement) => (
                  <TableRow key={achievement.id}>
                    <TableCell>{achievement.displayOrder}</TableCell>
                    <TableCell>
                      <div className="text-2xl">{achievement.icon}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{achievement.title}</div>
                      <div className="text-sm text-gray-500">
                        {achievement.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTypeDisplay(achievement.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {getConditionDisplay(achievement)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>💎 {achievement.reward.experience} XP</div>
                        <div>🪙 {achievement.reward.coins} 金幣</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={achievement.isActive ? 'default' : 'secondary'}
                      >
                        {achievement.isActive ? '啟用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/game-admin/achievements/${achievement.id}/edit`
                              )
                            }
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            編輯
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleActive(
                                achievement.id,
                                achievement.isActive
                              )
                            }
                          >
                            {achievement.isActive ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                停用
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                啟用
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(achievement.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            刪除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
