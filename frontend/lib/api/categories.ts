'use client';

import { getIdToken } from '@/lib/auth';
import { ComponentListResponse, ComponentQueryParams } from '@/types/component';

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

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
}

export interface CategoryListResponse {
  categories: CategoryInfo[];
}

/**
 * Get all available categories
 */
export async function getCategories(): Promise<CategoryListResponse> {
  const response = await fetch(`${API_URL}/api/categories`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<CategoryListResponse> = await response.json();
  return apiResponse.data;
}

export interface SuggestionsResponse {
  categories: string[];
  tags: string[];
}

/**
 * Get category and tag suggestions (for autocomplete)
 */
export async function getSuggestions(): Promise<SuggestionsResponse> {
  const response = await fetch(`${API_URL}/api/categories/suggestions`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<SuggestionsResponse> = await response.json();
  return apiResponse.data;
}

/**
 * Get components for a specific category
 */
export async function getCategoryComponents(
  category: string,
  params: Omit<ComponentQueryParams, 'category'> = {}
): Promise<ComponentListResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', params.page.toString());
  }
  if (params.limit) {
    searchParams.set('limit', params.limit.toString());
  }
  if (params.tags) {
    searchParams.set('tags', params.tags);
  }
  if (params.sortBy) {
    searchParams.set('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    searchParams.set('sortOrder', params.sortOrder);
  }

  const queryString = searchParams.toString();
  const url = `${API_URL}/api/categories/${category}/components${queryString ? `?${queryString}` : ''}`;

  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Category '${category}' not found`);
    }
    throw new Error(`Failed to fetch category components: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<ComponentListResponse> = await response.json();
  return apiResponse.data;
}
