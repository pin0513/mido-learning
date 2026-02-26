const COOKIE_NAME = 'family_code';
const COOKIE_MAX_AGE = 14 * 24 * 60 * 60; // 14 days in seconds

export function saveFamilyCode(code: string): void {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

export function getFamilyCode(): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=')[1]);
}

export function clearFamilyCode(): void {
  document.cookie = `${COOKIE_NAME}=;path=/;max-age=0`;
}
