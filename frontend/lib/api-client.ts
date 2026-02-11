/**
 * API Client 配置（用於技能村系統）
 */

import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

// 創建專用於技能村的 API client
export const skillVillageApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 10000,
});

// 請求攔截器：加入 JWT Token
skillVillageApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 回應攔截器：統一錯誤處理
skillVillageApi.interceptors.response.use(
  (response) => response.data, // 提取 data
  (error) => {
    if (error.response?.status === 401) {
      // Token 過期，自動登出
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
