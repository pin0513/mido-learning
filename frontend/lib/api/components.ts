'use client';

import { getIdToken } from '@/lib/auth';
import {
  LearningComponent,
  ComponentListResponse,
  ComponentQueryParams,
  CreateComponentRequest,
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

export async function getComponents(
  params: ComponentQueryParams = {}
): Promise<ComponentListResponse> {
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

  const queryString = searchParams.toString();
  const url = `${API_URL}/api/components${queryString ? `?${queryString}` : ''}`;

  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch components: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<ComponentListResponse> = await response.json();
  return apiResponse.data;
}

export async function getComponentById(id: string): Promise<LearningComponent> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/components/${id}`, { headers });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Component not found');
    }
    throw new Error(`Failed to fetch component: ${response.statusText}`);
  }

  return response.json();
}

export async function createComponent(
  data: CreateComponentRequest
): Promise<LearningComponent> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/components`, {
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
    throw new Error(`Failed to create component: ${response.statusText}`);
  }

  return response.json();
}

export async function getMyComponents(
  params: ComponentQueryParams = {}
): Promise<ComponentListResponse> {
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

  const queryString = searchParams.toString();
  const url = `${API_URL}/api/components/my${queryString ? `?${queryString}` : ''}`;

  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch my components: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<ComponentListResponse> = await response.json();
  return apiResponse.data;
}
