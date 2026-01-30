'use client';

import { getIdToken } from '@/lib/auth';
import {
  Wish,
  WishListResponse,
  WishQueryParams,
  UpdateWishStatusRequest,
  CreateComponentFromWishRequest,
  WishStats,
  WishStatsResponse,
} from '@/types/wish';
import { LearningComponent } from '@/types/component';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getIdToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function getWishes(
  params: WishQueryParams = {}
): Promise<WishListResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', params.page.toString());
  }
  if (params.limit) {
    searchParams.set('limit', params.limit.toString());
  }
  if (params.status) {
    searchParams.set('status', params.status);
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }

  const queryString = searchParams.toString();
  const url = `${API_URL}/api/admin/wishes${queryString ? `?${queryString}` : ''}`;

  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Please login');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    throw new Error(`Failed to fetch wishes: ${response.statusText}`);
  }

  return response.json();
}

export async function updateWishStatus(
  wishId: string,
  data: UpdateWishStatusRequest
): Promise<Wish> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/admin/wishes/${wishId}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Please login');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    if (response.status === 404) {
      throw new Error('Wish not found');
    }
    throw new Error(`Failed to update wish status: ${response.statusText}`);
  }

  return response.json();
}

export async function createComponentFromWish(
  wishId: string,
  data: CreateComponentFromWishRequest
): Promise<LearningComponent> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_URL}/api/admin/wishes/${wishId}/create-component`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Please login');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    if (response.status === 404) {
      throw new Error('Wish not found');
    }
    throw new Error(`Failed to create component from wish: ${response.statusText}`);
  }

  return response.json();
}

export async function searchComponents(
  search: string,
  limit: number = 5
): Promise<LearningComponent[]> {
  const searchParams = new URLSearchParams({
    search,
    limit: limit.toString(),
  });

  const url = `${API_URL}/api/components?${searchParams}`;

  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to search components: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data?.components || [];
}

export async function getWishStats(): Promise<WishStats> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/admin/wishes/stats`, { headers });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Please login');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    throw new Error(`Failed to fetch wish stats: ${response.statusText}`);
  }

  const result: WishStatsResponse = await response.json();
  return result.data;
}
