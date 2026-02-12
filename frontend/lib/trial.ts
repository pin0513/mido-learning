/**
 * 試玩模式管理
 * - 訪客可試玩 5 次
 * - 使用 cookie 追蹤，1 小時有效期
 */

const TRIAL_COOKIE_NAME = 'game_trial';
const MAX_TRIAL_COUNT = 5;
const TRIAL_DURATION_MS = 60 * 60 * 1000; // 1 小時

interface TrialData {
  count: number;
  expiresAt: number;
}

/**
 * 從 cookie 讀取試玩資料
 */
function getTrialData(): TrialData | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  const trialCookie = cookies.find(c => c.trim().startsWith(`${TRIAL_COOKIE_NAME}=`));

  if (!trialCookie) return null;

  try {
    const value = trialCookie.split('=')[1];
    const data = JSON.parse(decodeURIComponent(value));

    // 檢查是否過期
    if (Date.now() > data.expiresAt) {
      deleteTrialCookie();
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * 儲存試玩資料到 cookie
 */
function setTrialData(data: TrialData): void {
  if (typeof document === 'undefined') return;

  const value = encodeURIComponent(JSON.stringify(data));
  const expires = new Date(data.expiresAt).toUTCString();

  document.cookie = `${TRIAL_COOKIE_NAME}=${value}; expires=${expires}; path=/`;
}

/**
 * 刪除試玩 cookie
 */
function deleteTrialCookie(): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${TRIAL_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

/**
 * 初始化試玩資料（首次試玩時）
 */
function initTrialData(): TrialData {
  const data: TrialData = {
    count: MAX_TRIAL_COUNT,
    expiresAt: Date.now() + TRIAL_DURATION_MS,
  };
  setTrialData(data);
  return data;
}

/**
 * 取得剩餘試玩次數
 */
export function getTrialRemainingCount(): number {
  const data = getTrialData();
  return data ? data.count : MAX_TRIAL_COUNT;
}

/**
 * 檢查是否還有試玩次數
 */
export function hasTrialRemaining(): boolean {
  return getTrialRemainingCount() > 0;
}

/**
 * 消耗一次試玩機會
 * @returns 消耗後剩餘次數
 */
export function consumeTrial(): number {
  let data = getTrialData();

  if (!data) {
    data = initTrialData();
  }

  if (data.count > 0) {
    data.count -= 1;
    setTrialData(data);
  }

  return data.count;
}

/**
 * 重置試玩次數（用於登入後）
 */
export function resetTrial(): void {
  deleteTrialCookie();
}

/**
 * 取得試玩過期時間
 */
export function getTrialExpiresAt(): Date | null {
  const data = getTrialData();
  return data ? new Date(data.expiresAt) : null;
}
