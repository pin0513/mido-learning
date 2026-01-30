'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getWishStats } from '@/lib/api/wishes';
import { WishStats, WISH_STATUS_CONFIG, WishStatus } from '@/types/wish';

export default function WishStatsPage() {
  const [stats, setStats] = useState<WishStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getWishStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        <p className="font-medium">Error loading statistics</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const maxTrendCount = Math.max(...stats.weeklyTrend.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/admin" className="hover:text-violet-600">
              Admin
            </Link>
            <span>/</span>
            <Link href="/admin/wishes" className="hover:text-violet-600">
              Wishes
            </Link>
            <span>/</span>
            <span className="text-gray-900">Stats</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Wish Statistics</h1>
        </div>
        <Link
          href="/admin/wishes"
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Wishes
        </Link>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Count */}
        <div className="rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-violet-100">Total Wishes</p>
              <p className="mt-2 text-4xl font-bold">{stats.totalCount}</p>
            </div>
            <div className="rounded-full bg-white/20 p-3">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        {(['pending', 'processing', 'completed'] as WishStatus[]).map((status) => {
          const config = WISH_STATUS_CONFIG[status];
          const count = stats.byStatus[status] || 0;
          return (
            <div
              key={status}
              className={`rounded-xl border ${config.borderClass} ${config.bgClass} p-6 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${config.textClass}`}>{config.label}</p>
                  <p className={`mt-2 text-4xl font-bold ${config.textClass}`}>{count}</p>
                </div>
                <StatusIcon status={status} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Completion Rate */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
          <div className="mt-4 flex items-end gap-4">
            <p className="text-3xl font-bold text-gray-900">
              {(stats.completionRate * 100).toFixed(1)}%
            </p>
            <div className="flex-1">
              <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${stats.completionRate * 100}%` }}
                />
              </div>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {stats.byStatus.completed || 0} completed out of{' '}
            {stats.totalCount - (stats.byStatus.deleted || 0)} active wishes
          </p>
        </div>

        {/* Average Processing Time */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Avg. Processing Time</h3>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">
              {stats.avgProcessingTimeHours.toFixed(1)}
            </p>
            <span className="text-lg text-gray-500">hours</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {stats.avgProcessingTimeHours > 24
              ? `~${Math.round(stats.avgProcessingTimeHours / 24)} days to complete a wish`
              : 'Average time from pending to completed'}
          </p>
        </div>

        {/* Deleted Count */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Deleted Wishes</h3>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{stats.byStatus.deleted || 0}</p>
            <span className="text-lg text-gray-500">
              ({((stats.byStatus.deleted || 0) / (stats.totalCount || 1) * 100).toFixed(1)}%)
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">Wishes marked as not processable</p>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Weekly Trend</h3>
        <p className="text-sm text-gray-500">New wishes in the last 7 days</p>

        <div className="mt-6 flex items-end justify-between gap-2" style={{ height: '200px' }}>
          {stats.weeklyTrend.map((day, index) => {
            const height = maxTrendCount > 0 ? (day.count / maxTrendCount) * 100 : 0;
            const isToday = index === stats.weeklyTrend.length - 1;

            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{day.count}</span>
                <div
                  className={`w-full rounded-t-lg transition-all duration-300 ${
                    isToday ? 'bg-violet-500' : 'bg-violet-200'
                  }`}
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
                <span className="text-xs text-gray-500">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: WishStatus }) {
  const iconClasses = `h-8 w-8 ${WISH_STATUS_CONFIG[status].textClass}`;

  switch (status) {
    case 'pending':
      return (
        <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'processing':
      return (
        <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      );
    case 'completed':
      return (
        <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    default:
      return null;
  }
}
