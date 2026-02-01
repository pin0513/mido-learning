'use client';

import { getIdToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface DailyStats {
  date: string;
  count: number;
}

export interface AnalyticsStats {
  totalPageViews: number;
  todayPageViews: number;
  totalMaterialViews: number;
  last7Days: DailyStats[];
}

export interface MaterialStats {
  componentId: string;
  title: string | null;
  viewCount: number;
}

export interface IpVisitCount {
  ipAddress: string;
  count: number;
}

export interface VisitorStats {
  uniqueVisitors: number;
  todayUniqueVisitors: number;
  topIps: IpVisitCount[];
}

export interface VisitRecord {
  id: string;
  pageType: string;
  componentId: string | null;
  componentTitle: string | null;
  ipAddress: string;
  visitedAt: string;
}

/**
 * Record a page view (anonymous)
 */
export async function recordPageView(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/analytics/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Silently fail - analytics should not break the app
  }
}

/**
 * Record a material view (anonymous)
 */
export async function recordMaterialView(componentId: string): Promise<void> {
  try {
    await fetch(`${API_URL}/api/analytics/material/${componentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Silently fail
  }
}

/**
 * Get analytics stats (admin only)
 */
export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  const token = await getIdToken();
  const response = await fetch(`${API_URL}/api/analytics/stats`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch analytics stats');
  }

  const apiResponse: ApiResponse<AnalyticsStats> = await response.json();
  return apiResponse.data;
}

/**
 * Get material stats (admin only)
 */
export async function getMaterialStats(limit = 20): Promise<MaterialStats[]> {
  const token = await getIdToken();
  const response = await fetch(`${API_URL}/api/analytics/materials?limit=${limit}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch material stats');
  }

  const apiResponse: ApiResponse<MaterialStats[]> = await response.json();
  return apiResponse.data;
}

/**
 * Get visitor stats (admin only)
 */
export async function getVisitorStats(): Promise<VisitorStats> {
  const token = await getIdToken();
  const response = await fetch(`${API_URL}/api/analytics/visitors`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch visitor stats');
  }

  const apiResponse: ApiResponse<VisitorStats> = await response.json();
  return apiResponse.data;
}

/**
 * Get recent visits (admin only)
 */
export async function getRecentVisits(limit = 50): Promise<VisitRecord[]> {
  const token = await getIdToken();
  const response = await fetch(`${API_URL}/api/analytics/recent?limit=${limit}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch recent visits');
  }

  const apiResponse: ApiResponse<VisitRecord[]> = await response.json();
  return apiResponse.data;
}
