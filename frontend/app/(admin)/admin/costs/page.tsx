'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import {
  getGcpCostSummary,
  getGcpServiceBreakdown,
  getGcpCostHistory,
  GcpCostSummary,
  ServiceCostDetail,
  MonthlyCost,
} from '@/lib/api/costs';

export default function CostsPage() {
  const [summary, setSummary] = useState<GcpCostSummary | null>(null);
  const [breakdown, setBreakdown] = useState<ServiceCostDetail[]>([]);
  const [history, setHistory] = useState<MonthlyCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [summaryData, breakdownData, historyData] = await Promise.all([
          getGcpCostSummary(),
          getGcpServiceBreakdown(),
          getGcpCostHistory(6),
        ]);
        setSummary(summaryData);
        setBreakdown(breakdownData);
        setHistory(historyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cost data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
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

  const maxHistoryCost = Math.max(...history.map((m) => m.totalCost), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">GCP 費用管理</h1>
        <p className="mt-1 text-gray-600">
          最後更新：
          {summary?.lastUpdated
            ? new Date(summary.lastUpdated).toLocaleString('zh-TW')
            : '-'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">本月費用</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              ${summary?.currentMonthTotal.toFixed(2) ?? '0.00'}
            </p>
            <p className="text-sm text-gray-500">{summary?.currency ?? 'USD'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">上月費用</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-600">
              ${summary?.previousMonthTotal.toFixed(2) ?? '0.00'}
            </p>
            <p className="text-sm text-gray-500">{summary?.currency ?? 'USD'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">月增率</h2>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${
                (summary?.changePercent ?? 0) > 0
                  ? 'text-red-600'
                  : (summary?.changePercent ?? 0) < 0
                    ? 'text-green-600'
                    : 'text-gray-600'
              }`}
            >
              {(summary?.changePercent ?? 0) > 0 ? '+' : ''}
              {summary?.changePercent.toFixed(1) ?? '0.0'}%
            </p>
            <p className="text-sm text-gray-500">相較上月</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Cost Ranking */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">服務費用排行（本月）</h2>
        </CardHeader>
        <CardContent>
          {summary?.topServices && summary.topServices.length > 0 ? (
            <div className="space-y-3">
              {summary.topServices.map((service) => (
                <div key={service.serviceName} className="flex items-center gap-4">
                  <span className="w-36 truncate text-sm text-gray-700">
                    {service.displayName}
                  </span>
                  <div className="flex-1">
                    <div className="h-5 rounded-full bg-gray-100">
                      <div
                        className="h-5 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.max(service.percentage, 2)}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="w-20 text-right text-sm font-medium text-gray-900">
                    ${service.cost.toFixed(2)}
                  </span>
                  <span className="w-14 text-right text-sm text-gray-500">
                    {service.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">尚無費用記錄</p>
          )}
        </CardContent>
      </Card>

      {/* Service Breakdown Table */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">服務明細比較</h2>
        </CardHeader>
        <CardContent>
          {breakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-2 text-left font-medium text-gray-500">服務</th>
                    <th className="pb-2 text-right font-medium text-gray-500">本月</th>
                    <th className="pb-2 text-right font-medium text-gray-500">上月</th>
                    <th className="pb-2 text-right font-medium text-gray-500">變化</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((service) => (
                    <tr key={service.serviceName} className="border-b border-gray-100">
                      <td className="py-2 text-gray-900">{service.displayName}</td>
                      <td className="py-2 text-right font-medium text-gray-900">
                        ${service.currentMonthCost.toFixed(2)}
                      </td>
                      <td className="py-2 text-right text-gray-600">
                        ${service.previousMonthCost.toFixed(2)}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            service.changePercent > 0
                              ? 'bg-red-100 text-red-700'
                              : service.changePercent < 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {service.changePercent > 0 ? '+' : ''}
                          {service.changePercent.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">尚無費用記錄</p>
          )}
        </CardContent>
      </Card>

      {/* Monthly History Chart */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">月度費用趨勢</h2>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((month) => {
                const percentage = (month.totalCost / maxHistoryCost) * 100;
                return (
                  <div key={month.month} className="flex items-center gap-4">
                    <span className="w-20 text-sm text-gray-600">{month.month}</span>
                    <div className="flex-1">
                      <div className="h-5 rounded-full bg-gray-100">
                        <div
                          className="h-5 rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${Math.max(percentage, 2)}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="w-20 text-right text-sm font-medium text-gray-900">
                      ${month.totalCost.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">尚無歷史記錄</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
