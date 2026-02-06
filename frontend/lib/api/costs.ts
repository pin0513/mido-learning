'use client';

import { getIdToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ServiceCost {
  serviceName: string;
  displayName: string;
  cost: number;
  percentage: number;
}

export interface GcpCostSummary {
  currentMonthTotal: number;
  previousMonthTotal: number;
  changePercent: number;
  currency: string;
  lastUpdated: string;
  topServices: ServiceCost[];
}

export interface ServiceCostDetail {
  serviceName: string;
  displayName: string;
  currentMonthCost: number;
  previousMonthCost: number;
  changePercent: number;
}

export interface MonthlyCost {
  month: string;
  totalCost: number;
  services: ServiceCost[];
}

/**
 * Get GCP cost summary (admin only)
 */
export async function getGcpCostSummary(): Promise<GcpCostSummary> {
  const token = await getIdToken();
  const response = await fetch(`${API_URL}/api/admin/costs/summary`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch GCP cost summary');
  }

  const apiResponse: ApiResponse<GcpCostSummary> = await response.json();
  return apiResponse.data;
}

/**
 * Get GCP service breakdown (admin only)
 */
export async function getGcpServiceBreakdown(): Promise<ServiceCostDetail[]> {
  const token = await getIdToken();
  const response = await fetch(`${API_URL}/api/admin/costs/breakdown`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch GCP service breakdown');
  }

  const apiResponse: ApiResponse<ServiceCostDetail[]> = await response.json();
  return apiResponse.data;
}

/**
 * Get GCP cost history (admin only)
 */
export async function getGcpCostHistory(months = 6): Promise<MonthlyCost[]> {
  const token = await getIdToken();
  const response = await fetch(`${API_URL}/api/admin/costs/history?months=${months}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch GCP cost history');
  }

  const apiResponse: ApiResponse<MonthlyCost[]> = await response.json();
  return apiResponse.data;
}
