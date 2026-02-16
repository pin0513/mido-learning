/**
 * Simple Cache - 簡單的記憶體快取
 *
 * 功能：
 * 1. 快取 API 回應，避免重複請求
 * 2. 支援 TTL（Time To Live），過期自動清除
 * 3. 支援手動清除特定快取或全部快取
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private ttl: number;

  constructor(ttlMs = 30000) {
    this.ttl = ttlMs; // 預設 30 秒
  }

  /**
   * 取得快取資料
   * @param key 快取鍵
   * @returns 快取的資料，若不存在或過期則回傳 null
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      // 過期，刪除快取
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 設定快取資料
   * @param key 快取鍵
   * @param data 要快取的資料
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 刪除特定快取
   * @param key 快取鍵
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清除過期的快取（定期清理）
   */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 取得快取統計資訊
   */
  getStats() {
    return {
      size: this.cache.size,
      ttl: this.ttl,
    };
  }
}

/**
 * 全局 API 快取實例
 * TTL: 30 秒（可調整）
 */
export const apiCache = new SimpleCache(30000);

// 定期清理過期快取（每分鐘執行一次）
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanupExpired();
  }, 60000);
}

// 在開發環境下，將 cache 掛載到 window 方便除錯
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__apiCache = {
    stats: () => apiCache.getStats(),
    clear: () => apiCache.clear(),
    get: (key: string) => apiCache.get(key),
  };
}
