'use client';

import { getIdToken } from '@/lib/auth';
import {
  Material,
  MaterialListResponse,
  MaterialManifest,
  UploadMaterialResponse,
} from '@/types/material';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getIdToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function getMaterials(componentId: string): Promise<Material[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/components/${componentId}/materials`, {
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch materials: ${response.statusText}`);
  }

  const apiResponse: { success: boolean; data: MaterialListResponse } = await response.json();
  return apiResponse.data.materials;
}

export async function uploadMaterial(
  componentId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadMaterialResponse> {
  const token = await getIdToken();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error('Invalid response format'));
        }
      } else if (xhr.status === 401) {
        reject(new Error('Unauthorized: Please login'));
      } else if (xhr.status === 403) {
        reject(new Error('Forbidden: Teacher or admin role required'));
      } else if (xhr.status === 413) {
        reject(new Error('File too large: Maximum size is 50MB'));
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', `${API_URL}/api/components/${componentId}/materials`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export async function getMaterialManifest(materialId: string): Promise<MaterialManifest> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/materials/${materialId}/manifest`, {
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Material not found');
    }
    throw new Error(`Failed to fetch manifest: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<MaterialManifest> = await response.json();
  return apiResponse.data;
}

export function getDownloadUrl(materialId: string): string {
  return `${API_URL}/api/materials/${materialId}/download`;
}

export async function deleteMaterial(materialId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/materials/${materialId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Please login');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Teacher or admin role required');
    }
    if (response.status === 404) {
      throw new Error('Material not found');
    }
    throw new Error(`Failed to delete material: ${response.statusText}`);
  }
}
