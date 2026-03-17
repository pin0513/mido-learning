import { readFileSync, statSync } from 'fs';
import { basename } from 'path';
import { getApiUrl, getValidToken, type CliConfig } from './config.js';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

interface CreateComponentResponse {
  id: string;
}

interface ComponentListResponse {
  components: ComponentItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ComponentItem {
  id: string;
  title: string;
  theme: string;
  description: string;
  category: string;
  tags: string[];
  visibility: string | null;
  materialCount: number;
  createdAt: string;
}

interface MaterialUploadResponse {
  success: boolean;
  data: {
    materialId: string;
    version: number;
    filename: string;
    size: number;
  };
}

async function authHeaders(config: CliConfig): Promise<Record<string, string>> {
  const { token } = await getValidToken(config);
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function authJsonHeaders(config: CliConfig): Promise<Record<string, string>> {
  const { token } = await getValidToken(config);
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function createComponent(
  config: CliConfig,
  body: {
    title: string;
    theme: string;
    description?: string;
    category: string;
    tags?: string[];
  },
): Promise<string> {
  const apiUrl = getApiUrl(config);
  const headers = await authJsonHeaders(config);
  const res = await fetch(`${apiUrl}/api/components`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 401) throw new Error('認證失敗，請重新登入 (mido auth login)');
  if (res.status === 403) throw new Error('權限不足：需要 Teacher 或 Admin 角色');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`建立教材失敗 (${res.status}): ${text}`);
  }

  const json = (await res.json()) as ApiResponse<CreateComponentResponse>;
  return json.data.id;
}

export async function updateVisibility(
  config: CliConfig,
  componentId: string,
  visibility: string,
): Promise<void> {
  const apiUrl = getApiUrl(config);
  const headers = await authJsonHeaders(config);
  const res = await fetch(`${apiUrl}/api/components/${componentId}/visibility`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ visibility }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`更新可見度失敗 (${res.status}): ${text}`);
  }
}

export async function uploadMaterial(
  config: CliConfig,
  componentId: string,
  zipPath: string,
): Promise<{ materialId: string; version: number; filename: string; size: number }> {
  const apiUrl = getApiUrl(config);
  const { token } = await getValidToken(config);

  const fileBuffer = readFileSync(zipPath);
  const fileSize = statSync(zipPath).size;
  const filename = basename(zipPath);

  // Build multipart/form-data manually (Node.js native)
  const boundary = '----MidoCLI' + Date.now().toString(36);
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/zip\r\n\r\n`,
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, fileBuffer, footer]);

  const res = await fetch(`${apiUrl}/api/components/${componentId}/materials`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'X-Expected-Size': fileSize.toString(),
    },
    body,
  });

  if (res.status === 401) throw new Error('認證失敗，請重新登入');
  if (res.status === 403) throw new Error('權限不足：需要 Teacher 或 Admin 角色');
  if (res.status === 413) throw new Error('檔案過大：上限為 50MB');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`上傳失敗 (${res.status}): ${text}`);
  }

  const json = (await res.json()) as MaterialUploadResponse;
  return json.data;
}

export async function listMyComponents(
  config: CliConfig,
  page = 1,
  limit = 20,
): Promise<{ components: ComponentItem[]; total: number }> {
  const apiUrl = getApiUrl(config);
  const headers = await authHeaders(config);
  const url = `${apiUrl}/api/components/my?page=${page}&limit=${limit}&sortBy=createdAt&sortOrder=desc`;
  const res = await fetch(url, { headers });

  if (res.status === 401) throw new Error('認證失敗，請重新登入');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`取得列表失敗 (${res.status}): ${text}`);
  }

  const json = (await res.json()) as ApiResponse<ComponentListResponse>;
  return { components: json.data.components, total: json.data.total };
}

export async function deleteComponent(
  config: CliConfig,
  componentId: string,
): Promise<void> {
  const apiUrl = getApiUrl(config);
  const headers = await authHeaders(config);
  const res = await fetch(`${apiUrl}/api/components/${componentId}`, {
    method: 'DELETE',
    headers,
  });

  if (res.status === 401) throw new Error('認證失敗，請重新登入');
  if (res.status === 403) throw new Error('權限不足');
  if (res.status === 404) throw new Error('教材不存在');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`刪除失敗 (${res.status}): ${text}`);
  }
}
