'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

type ConditionType =
  | 'CompleteCourse'
  | 'CompleteWithStars'
  | 'ReachWpm'
  | 'ReachAccuracy'
  | 'ConsecutivePerfect'
  | 'TotalGamesPlayed'
  | 'TotalStarsCollected';

interface AchievementForm {
  title: string;
  description: string;
  icon: string;
  type: string;
  conditionType: ConditionType;
  courseId?: string;
  minStars?: number;
  minWpm?: number;
  minAccuracy?: number;
  consecutivePerfect?: number;
  totalGames?: number;
  totalStars?: number;
  experienceReward: number;
  coinsReward: number;
  displayOrder: number;
}

export default function NewAchievementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<AchievementForm>({
    title: '',
    description: '',
    icon: '🏆',
    type: 'Milestone',
    conditionType: 'TotalGamesPlayed',
    experienceReward: 100,
    coinsReward: 50,
    displayOrder: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 建立條件物件
      const condition: any = {
        type: form.conditionType,
      };

      switch (form.conditionType) {
        case 'CompleteCourse':
          condition.courseId = form.courseId;
          break;
        case 'CompleteWithStars':
          condition.courseId = form.courseId;
          condition.minStars = form.minStars;
          break;
        case 'ReachWpm':
          condition.minWpm = form.minWpm;
          break;
        case 'ReachAccuracy':
          condition.minAccuracy = form.minAccuracy;
          break;
        case 'ConsecutivePerfect':
          condition.consecutivePerfect = form.consecutivePerfect;
          break;
        case 'TotalGamesPlayed':
          condition.totalGames = form.totalGames;
          break;
        case 'TotalStarsCollected':
          condition.totalStars = form.totalStars;
          break;
      }

      const payload = {
        title: form.title,
        description: form.description,
        icon: form.icon,
        type: form.type,
        condition,
        reward: {
          experience: form.experienceReward,
          coins: form.coinsReward,
        },
        isActive: true,
        displayOrder: form.displayOrder,
      };

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/game-admin/achievements`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        toast.success('成就已建立');
        router.push('/game-admin/achievements');
      } else {
        const error = await response.json();
        toast.error(error.message || '建立失敗');
      }
    } catch (error) {
      console.error('Error creating achievement:', error);
      toast.error('建立失敗');
    } finally {
      setLoading(false);
    }
  };

  const renderConditionFields = () => {
    switch (form.conditionType) {
      case 'CompleteCourse':
        return (
          <div>
            <Label htmlFor="courseId">課程 ID</Label>
            <Input
              id="courseId"
              value={form.courseId || ''}
              onChange={(e) =>
                setForm({ ...form, courseId: e.target.value })
              }
              placeholder="輸入課程 ID"
              required
            />
          </div>
        );

      case 'CompleteWithStars':
        return (
          <>
            <div>
              <Label htmlFor="courseId">課程 ID</Label>
              <Input
                id="courseId"
                value={form.courseId || ''}
                onChange={(e) =>
                  setForm({ ...form, courseId: e.target.value })
                }
                placeholder="輸入課程 ID"
                required
              />
            </div>
            <div>
              <Label htmlFor="minStars">最少星數</Label>
              <Input
                id="minStars"
                type="number"
                min="1"
                max="3"
                value={form.minStars || ''}
                onChange={(e) =>
                  setForm({ ...form, minStars: parseInt(e.target.value) })
                }
                required
              />
            </div>
          </>
        );

      case 'ReachWpm':
        return (
          <div>
            <Label htmlFor="minWpm">最低 WPM</Label>
            <Input
              id="minWpm"
              type="number"
              min="1"
              value={form.minWpm || ''}
              onChange={(e) =>
                setForm({ ...form, minWpm: parseInt(e.target.value) })
              }
              placeholder="例如：60"
              required
            />
          </div>
        );

      case 'ReachAccuracy':
        return (
          <div>
            <Label htmlFor="minAccuracy">最低準確度 (%%)</Label>
            <Input
              id="minAccuracy"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.minAccuracy || ''}
              onChange={(e) =>
                setForm({ ...form, minAccuracy: parseFloat(e.target.value) })
              }
              placeholder="例如：95.0"
              required
            />
          </div>
        );

      case 'ConsecutivePerfect':
        return (
          <div>
            <Label htmlFor="consecutivePerfect">連續完美次數</Label>
            <Input
              id="consecutivePerfect"
              type="number"
              min="1"
              value={form.consecutivePerfect || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  consecutivePerfect: parseInt(e.target.value),
                })
              }
              placeholder="例如：5"
              required
            />
          </div>
        );

      case 'TotalGamesPlayed':
        return (
          <div>
            <Label htmlFor="totalGames">累計遊玩次數</Label>
            <Input
              id="totalGames"
              type="number"
              min="1"
              value={form.totalGames || ''}
              onChange={(e) =>
                setForm({ ...form, totalGames: parseInt(e.target.value) })
              }
              placeholder="例如：10"
              required
            />
          </div>
        );

      case 'TotalStarsCollected':
        return (
          <div>
            <Label htmlFor="totalStars">累計星數</Label>
            <Input
              id="totalStars"
              type="number"
              min="1"
              value={form.totalStars || ''}
              onChange={(e) =>
                setForm({ ...form, totalStars: parseInt(e.target.value) })
              }
              placeholder="例如：50"
              required
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.push('/game-admin/achievements')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        返回成就列表
      </Button>

      <div>
        <h1 className="text-3xl font-bold">新增成就</h1>
        <p className="text-gray-500 mt-1">建立新的遊戲成就</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>基本資訊</CardTitle>
            <CardDescription>設定成就的基本資訊</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">標題</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="例如：打字新手"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="例如：完成第一次打字練習"
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="icon">圖示 (Emoji)</Label>
                <Input
                  id="icon"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="🏆"
                  maxLength={2}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  使用 Emoji 作為成就圖示
                </p>
              </div>

              <div>
                <Label htmlFor="type">成就類型</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GameCompletion">遊戲完成</SelectItem>
                    <SelectItem value="StarCollection">星星收集</SelectItem>
                    <SelectItem value="WinStreak">連勝</SelectItem>
                    <SelectItem value="SkillMastery">技能精通</SelectItem>
                    <SelectItem value="Milestone">里程碑</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="displayOrder">顯示順序</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  min="0"
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm({ ...form, displayOrder: parseInt(e.target.value) })
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  數字越小越前面
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>解鎖條件</CardTitle>
            <CardDescription>設定成就的解鎖條件</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="conditionType">條件類型</Label>
              <Select
                value={form.conditionType}
                onValueChange={(value) =>
                  setForm({ ...form, conditionType: value as ConditionType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CompleteCourse">完成課程</SelectItem>
                  <SelectItem value="CompleteWithStars">
                    完成課程並獲得星數
                  </SelectItem>
                  <SelectItem value="ReachWpm">達到 WPM</SelectItem>
                  <SelectItem value="ReachAccuracy">達到準確度</SelectItem>
                  <SelectItem value="ConsecutivePerfect">
                    連續完美
                  </SelectItem>
                  <SelectItem value="TotalGamesPlayed">
                    累計遊玩次數
                  </SelectItem>
                  <SelectItem value="TotalStarsCollected">
                    累計星數
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {renderConditionFields()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>獎勵</CardTitle>
            <CardDescription>設定成就的獎勵內容</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="experienceReward">經驗值</Label>
                <Input
                  id="experienceReward"
                  type="number"
                  min="0"
                  value={form.experienceReward}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      experienceReward: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="coinsReward">金幣</Label>
                <Input
                  id="coinsReward"
                  type="number"
                  min="0"
                  value={form.coinsReward}
                  onChange={(e) =>
                    setForm({ ...form, coinsReward: parseInt(e.target.value) })
                  }
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/game-admin/achievements')}
          >
            取消
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? '建立中...' : '建立成就'}
          </Button>
        </div>
      </form>
    </div>
  );
}
