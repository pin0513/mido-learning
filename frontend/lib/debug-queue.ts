/**
 * Debug Queue - 開發環境除錯工具
 *
 * 使用方式：
 * 1. 在瀏覽器 console 輸入：window.__requestQueue.stats()
 * 2. 查看當前 queue 狀態
 */

import { getQueueStats } from './request-queue';
import { apiCache } from './simple-cache';

export function logQueueStats() {
  const stats = getQueueStats();
  console.log('📊 Request Queue Stats:', stats);
}

export function logCacheStats() {
  const stats = apiCache.getStats();
  console.log('💾 API Cache Stats:', stats);
}

export function clearAllCache() {
  apiCache.clear();
  console.log('🗑️ All cache cleared');
}

// 自動每 10 秒記錄一次狀態（開發環境）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  let logInterval: NodeJS.Timeout;

  (window as unknown as Record<string, unknown>).__debugQueue = {
    start: () => {
      logInterval = setInterval(() => {
        const queueStats = getQueueStats();
        if (queueStats.pending > 0 || queueStats.size > 0) {
          console.log('[Queue]', queueStats);
        }
      }, 10000);
      console.log('✅ Queue debug logging started');
    },
    stop: () => {
      if (logInterval) {
        clearInterval(logInterval);
        console.log('⛔ Queue debug logging stopped');
      }
    },
    stats: () => {
      logQueueStats();
      logCacheStats();
    },
    clearCache: clearAllCache,
  };
}
