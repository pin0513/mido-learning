'use client';

import { getIdToken } from '@/lib/auth';
import {
  RatingListResponse,
  UserRatingResponse,
  RatingResponse,
  CreateRatingRequest,
  UpdateRatingRequest,
} from '@/types/rating';

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

/**
 * Get all ratings for a component with statistics
 */
export async function getComponentRatings(
  componentId: string
): Promise<RatingListResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_URL}/api/components/${componentId}/ratings`,
    { headers }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Component not found');
    }
    throw new Error(`Failed to fetch ratings: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<RatingListResponse> = await response.json();
  return apiResponse.data;
}

/**
 * Get current user's rating for a component
 */
export async function getMyRating(
  componentId: string
): Promise<UserRatingResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_URL}/api/components/${componentId}/ratings/my`,
    { headers }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Please login');
    }
    throw new Error(`Failed to fetch your rating: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<UserRatingResponse> = await response.json();
  return apiResponse.data;
}

/**
 * Create a rating for a component
 */
export async function createRating(
  componentId: string,
  score: number
): Promise<RatingResponse> {
  const headers = await getAuthHeaders();
  const body: CreateRatingRequest = { score };

  const response = await fetch(
    `${API_URL}/api/components/${componentId}/ratings`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Please login');
    }
    if (response.status === 404) {
      throw new Error('Component not found');
    }
    if (response.status === 409) {
      throw new Error('You have already rated this component');
    }
    throw new Error(`Failed to create rating: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<RatingResponse> = await response.json();
  return apiResponse.data;
}

/**
 * Update current user's rating for a component
 */
export async function updateMyRating(
  componentId: string,
  score: number
): Promise<RatingResponse> {
  const headers = await getAuthHeaders();
  const body: UpdateRatingRequest = { score };

  const response = await fetch(
    `${API_URL}/api/components/${componentId}/ratings/my`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Please login');
    }
    if (response.status === 404) {
      throw new Error('You have not rated this component yet');
    }
    throw new Error(`Failed to update rating: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<RatingResponse> = await response.json();
  return apiResponse.data;
}

/**
 * Rate a component (create or update)
 */
export async function rateComponent(
  componentId: string,
  score: number
): Promise<RatingResponse> {
  try {
    const myRating = await getMyRating(componentId);
    if (myRating.hasRated) {
      return await updateMyRating(componentId, score);
    }
  } catch {
    // If we can't get the rating, try to create one
  }
  return await createRating(componentId, score);
}
