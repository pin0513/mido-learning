'use client';

import { getIdToken } from '@/lib/auth';
import { queuedFetch } from '@/lib/request-queue';
import { apiCache } from '@/lib/simple-cache';
import {
  LearningComponent,
  ComponentListResponse,
  ComponentQueryParams,
  CreateComponentRequest,
  UpdateComponentRequest,
  UpdateVisibilityRequest,
} from '@/types/component';

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

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

function buildQueryString(params: ComponentQueryParams): string {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', params.page.toString());
  }
  if (params.limit) {
    searchParams.set('limit', params.limit.toString());
  }
  if (params.category) {
    searchParams.set('category', params.category);
  }
  if (params.tags) {
    searchParams.set('tags', params.tags);
  }
  if (params.visibility) {
    searchParams.set('visibility', params.visibility);
  }
  if (params.sortBy) {
    searchParams.set('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    searchParams.set('sortOrder', params.sortOrder);
  }
  if (params.createdBy) {
    searchParams.set('createdBy', params.createdBy);
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }

  return searchParams.toString();
}

/**
 * Get public components (no auth required)
 */
export async function getPublicComponents(
  params: ComponentQueryParams = {}
): Promise<ComponentListResponse> {
  const queryString = buildQueryString(params);
  const cacheKey = `public-components-${queryString}`;

  // 檢查快取
  const cached = apiCache.get<ComponentListResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${API_URL}/api/components/public${queryString ? `?${queryString}` : ''}`;

  const response = await queuedFetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch public components: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<ComponentListResponse> = await response.json();

  // 快取結果
  apiCache.set(cacheKey, apiResponse.data);

  return apiResponse.data;
}

/**
 * Get components for logged-in users
 */
export async function getComponents(
  params: ComponentQueryParams = {}
): Promise<ComponentListResponse> {
  const queryString = buildQueryString(params);
  const cacheKey = `components-${queryString}`;

  // 檢查快取
  const cached = apiCache.get<ComponentListResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${API_URL}/api/components${queryString ? `?${queryString}` : ''}`;

  const headers = await getAuthHeaders();
  const response = await queuedFetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch components: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<ComponentListResponse> = await response.json();

  // 快取結果
  apiCache.set(cacheKey, apiResponse.data);

  return apiResponse.data;
}

/**
 * Get component by ID
 */
export async function getComponentById(id: string): Promise<LearningComponent> {
  const headers = await getAuthHeaders();
  const response = await queuedFetch(`${API_URL}/api/components/${id}`, { headers });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Component not found');
    }
    if (response.status === 403) {
      throw new Error('Access denied');
    }
    throw new Error(`Failed to fetch component: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<LearningComponent> = await response.json();
  return apiResponse.data;
}

/**
 * Create a new component
 */
export async function createComponent(
  data: CreateComponentRequest
): Promise<{ id: string }> {
  const headers = await getAuthHeaders();
  const response = await queuedFetch(`${API_URL}/api/components`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Please login');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Teacher or admin role required');
    }
    const errorResponse = await response.json().catch(() => null);
    const errorMessage = errorResponse?.message || response.statusText;
    throw new Error(`Failed to create component: ${errorMessage}`);
  }

  const apiResponse: ApiResponse<{ id: string }> = await response.json();
  return apiResponse.data;
}

/**
 * Update a component
 */
export async function updateComponent(
  id: string,
  data: UpdateComponentRequest
): Promise<LearningComponent> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/components/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Please login');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: You do not have permission to update this component');
    }
    if (response.status === 404) {
      throw new Error('Component not found');
    }
    throw new Error(`Failed to update component: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<LearningComponent> = await response.json();
  return apiResponse.data;
}

/**
 * Update component visibility
 */
export async function updateComponentVisibility(
  id: string,
  data: UpdateVisibilityRequest
): Promise<LearningComponent> {
  const headers = await getAuthHeaders();
  const response = await queuedFetch(`${API_URL}/api/components/${id}/visibility`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Please login');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: You do not have permission to update this component');
    }
    if (response.status === 404) {
      throw new Error('Component not found');
    }
    throw new Error(`Failed to update visibility: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<LearningComponent> = await response.json();
  return apiResponse.data;
}

/**
 * Delete a component
 */
export async function deleteComponent(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/components/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Please login');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: You do not have permission to delete this component');
    }
    if (response.status === 404) {
      throw new Error('Component not found');
    }
    throw new Error(`Failed to delete component: ${response.statusText}`);
  }
}

/**
 * Get current user's components
 */
export async function getMyComponents(
  params: ComponentQueryParams = {}
): Promise<ComponentListResponse> {
  const queryString = buildQueryString(params);
  const cacheKey = `my-components-${queryString}`;

  // 檢查快取
  const cached = apiCache.get<ComponentListResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${API_URL}/api/components/my${queryString ? `?${queryString}` : ''}`;

  const headers = await getAuthHeaders();
  const response = await queuedFetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch my components: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<ComponentListResponse> = await response.json();

  // 快取結果
  apiCache.set(cacheKey, apiResponse.data);

  return apiResponse.data;
}

/**
 * Get all components (admin only)
 */
export async function getAllComponents(
  params: ComponentQueryParams = {}
): Promise<ComponentListResponse> {
  const queryString = buildQueryString(params);
  const cacheKey = `all-components-${queryString}`;

  // 檢查快取
  const cached = apiCache.get<ComponentListResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${API_URL}/api/components/all${queryString ? `?${queryString}` : ''}`;

  const headers = await getAuthHeaders();
  const response = await queuedFetch(url, { headers });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Please login');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    throw new Error(`Failed to fetch all components: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<ComponentListResponse> = await response.json();

  // 快取結果
  apiCache.set(cacheKey, apiResponse.data);

  return apiResponse.data;
}
