'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import {
  getAnalyticsStats,
  getMaterialStats,
  getVisitorStats,
  getRecentVisits,
  AnalyticsStats,
  MaterialStats,
  VisitorStats,
  VisitRecord,
} from '@/lib/api/analytics';

export default function AdminPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [materialStats, setMaterialStats] = useState<MaterialStats[]>([]);
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);
  const [recentVisits, setRecentVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [analyticsData, materialsData, visitorsData, recentData] = await Promise.all([
          getAnalyticsStats(),
          getMaterialStats(10),
          getVisitorStats(),
          getRecentVisits(20),
        ]);
        setStats(analyticsData);
        setMaterialStats(materialsData);
        setVisitorStats(visitorsData);
        setRecentVisits(recentData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">管理員儀表板</h1>
        <p className="mt-1 text-gray-600">網站流量與教材統計</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">總訪問次數</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {stats?.totalPageViews.toLocaleString() ?? 0}
            </p>
            <p className="text-sm text-gray-500">首頁歷史累計</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">今日訪問</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {stats?.todayPageViews.toLocaleString() ?? 0}
            </p>
            <p className="text-sm text-gray-500">今日首頁累計</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">教材總瀏覽</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">
              {stats?.totalMaterialViews.toLocaleString() ?? 0}
            </p>
            <p className="text-sm text-gray-500">所有教材累計</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">獨立訪客</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {visitorStats?.uniqueVisitors ?? 0}
            </p>
            <p className="text-sm text-gray-500">
              今日: {visitorStats?.todayUniqueVisitors ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart - Last 7 Days */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">最近 7 天訪問趨勢</h2>
          </CardHeader>
          <CardContent>
            {stats?.last7Days && stats.last7Days.length > 0 ? (
              <div className="space-y-3">
                {stats.last7Days.map((day) => {
                  const maxCount = Math.max(...stats.last7Days.map((d) => d.count), 1);
                  const percentage = (day.count / maxCount) * 100;
                  return (
                    <div key={day.date} className="flex items-center gap-4">
                      <span className="w-20 text-sm text-gray-600">
                        {new Date(day.date).toLocaleDateString('zh-TW', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <div className="flex-1">
                        <div className="h-5 rounded-full bg-gray-100">
                          <div
                            className="h-5 rounded-full bg-blue-500 transition-all"
                            style={{ width: `${Math.max(percentage, 2)}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="w-12 text-right text-sm font-medium text-gray-900">
                        {day.count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">尚無訪問記錄</p>
            )}
          </CardContent>
        </Card>

        {/* Top IPs */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">來源 IP 統計</h2>
          </CardHeader>
          <CardContent>
            {visitorStats?.topIps && visitorStats.topIps.length > 0 ? (
              <div className="space-y-2">
                {visitorStats.topIps.map((ip, index) => (
                  <div
                    key={ip.ipAddress}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : index === 1
                              ? 'bg-gray-200 text-gray-700'
                              : index === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <code className="text-sm text-gray-700">{ip.ipAddress}</code>
                    </div>
                    <span className="text-sm font-medium text-blue-600">{ip.count} 次</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">尚無訪客記錄</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Materials */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">熱門教材排行</h2>
        </CardHeader>
        <CardContent>
          {materialStats.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {materialStats.map((material, index) => (
                <div
                  key={material.componentId}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        index === 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : index === 1
                            ? 'bg-gray-200 text-gray-700'
                            : index === 2
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/materials/${material.componentId}`}
                        className="block truncate font-medium text-gray-900 hover:text-blue-600"
                      >
                        {material.title || '未命名教材'}
                      </Link>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0 text-right">
                    <span className="text-lg font-bold text-blue-600">
                      {material.viewCount.toLocaleString()}
                    </span>
                    <span className="ml-1 text-sm text-gray-500">次</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">尚無教材訪問記錄</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Visits */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">最近訪問記錄</h2>
        </CardHeader>
        <CardContent>
          {recentVisits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-2 text-left font-medium text-gray-500">時間</th>
                    <th className="pb-2 text-left font-medium text-gray-500">類型</th>
                    <th className="pb-2 text-left font-medium text-gray-500">頁面/教材</th>
                    <th className="pb-2 text-left font-medium text-gray-500">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVisits.map((visit) => (
                    <tr key={visit.id} className="border-b border-gray-100">
                      <td className="py-2 text-gray-600">
                        {new Date(visit.visitedAt).toLocaleString('zh-TW', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            visit.pageType === 'homepage'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {visit.pageType === 'homepage' ? '首頁' : '教材'}
                        </span>
                      </td>
                      <td className="py-2 text-gray-900">
                        {visit.pageType === 'homepage' ? (
                          '首頁'
                        ) : visit.componentId ? (
                          <Link
                            href={`/materials/${visit.componentId}`}
                            className="hover:text-blue-600"
                          >
                            {visit.componentTitle || visit.componentId}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2">
                        <code className="text-xs text-gray-500">{visit.ipAddress}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">尚無訪問記錄</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
