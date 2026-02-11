/**
 * 表單驗證工具
 */

/**
 * 驗證使用者名稱（遊戲註冊）
 * - 長度 4-16 字元
 * - 僅允許英文、數字、底線
 */
export function validateUsername(username: string): string | null {
  if (!username) {
    return '使用者名稱不能為空';
  }

  if (username.length < 4 || username.length > 16) {
    return '使用者名稱長度必須在 4-16 字元之間';
  }

  const validPattern = /^[a-zA-Z0-9_]+$/;
  if (!validPattern.test(username)) {
    return '使用者名稱只能包含英文、數字和底線';
  }

  return null;
}

/**
 * 驗證密碼（遊戲註冊）
 * - 長度 4-8 字元
 * - 可包含英文、數字
 */
export function validateSimplePassword(password: string): string | null {
  if (!password) {
    return '密碼不能為空';
  }

  if (password.length < 4 || password.length > 8) {
    return '密碼長度必須在 4-8 字元之間';
  }

  const validPattern = /^[a-zA-Z0-9]+$/;
  if (!validPattern.test(password)) {
    return '密碼只能包含英文和數字';
  }

  return null;
}

/**
 * 驗證密碼（完整註冊）
 * - 長度至少 8 字元
 */
export function validateFullPassword(password: string): string | null {
  if (!password) {
    return '密碼不能為空';
  }

  if (password.length < 8) {
    return '密碼長度至少需要 8 字元';
  }

  return null;
}

/**
 * 驗證 Email
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email 不能為空';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return 'Email 格式不正確';
  }

  return null;
}

/**
 * 驗證角色名稱
 * - 長度 2-12 字元
 */
export function validateCharacterName(name: string): string | null {
  if (!name) {
    return '角色名稱不能為空';
  }

  if (name.length < 2 || name.length > 12) {
    return '角色名稱長度必須在 2-12 字元之間';
  }

  return null;
}

/**
 * 驗證虛擬貨幣名稱
 * - 長度 2-8 字元
 */
export function validateCurrencyName(name: string): string | null {
  if (!name) {
    return '虛擬貨幣名稱不能為空';
  }

  if (name.length < 2 || name.length > 8) {
    return '虛擬貨幣名稱長度必須在 2-8 字元之間';
  }

  return null;
}
