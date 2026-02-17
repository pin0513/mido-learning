/**
 * Request Queue - 控制 API 請求併發數量與頻率
 *
 * 功能：
 * 1. 限制同時最多 6 個並發請求
 * 2. 限制每秒最多 10 個請求
 * 3. 防止觸發 Firebase rate limit (100 次/分鐘)
 */

import PQueue from 'p-queue';

// 建立全局 queue
const queue = new PQueue({
  concurrency: 6,        // 同時最多 6 個請求
  interval: 1000,        // 時間間隔：1 秒
  intervalCap: 10,       // 每秒最多 10 個請求
});

const MAX_RETRIES = 3;

/**
 * 帶 429 指數退避重試的 fetch
 */
async function fetchWithBackoff(
  input: RequestInfo | URL,
  init?: RequestInit,
  attempt = 0
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 429 && attempt < MAX_RETRIES) {
    // 優先使用伺服器回傳的 Retry-After，否則指數退避 (1s, 2s, 4s)
    const retryAfter = response.headers.get('Retry-After');
    const delay = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : Math.pow(2, attempt) * 1000;

    await new Promise<void>(resolve => setTimeout(resolve, delay));
    return fetchWithBackoff(input, init, attempt + 1);
  }

  return response;
}

/**
 * 使用 queue 控制的 fetch（含 429 自動重試）
 * 替代原生 fetch，自動排隊等待
 */
export async function queuedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return queue.add(() => fetchWithBackoff(input, init));
}

/**
 * 取得 queue 統計資訊（方便除錯）
 */
export function getQueueStats() {
  return {
    pending: queue.pending,     // 等待中的請求數量
    size: queue.size,           // queue 大小
    isPaused: queue.isPaused,   // 是否暫停
  };
}

/**
 * 清空 queue（通常不需要，除非緊急情況）
 */
export function clearQueue() {
  queue.clear();
}

/**
 * 暫停 queue（測試用）
 */
export function pauseQueue() {
  queue.pause();
}

/**
 * 恢復 queue（測試用）
 */
export function resumeQueue() {
  queue.start();
}

// 在開發環境下，將 queue 掛載到 window 方便除錯
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__requestQueue = {
    stats: getQueueStats,
    clear: clearQueue,
    pause: pauseQueue,
    resume: resumeQueue,
  };
}
