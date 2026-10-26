import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.mido-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/**
 * Node CLI 專用 Firebase Web API Key。
 * 網站金鑰有 HTTP referrer 限制，不能給 CLI 使用，因此不內建預設值。
 */
export const FIREBASE_API_KEY_ENV = 'MIDO_FIREBASE_API_KEY';

// 環境設定
const ENVIRONMENTS = {
  prod: 'https://mido-learning-api-24mwb46hra-de.a.run.app',
  local: 'http://localhost:5199',
} as const;

type Env = keyof typeof ENVIRONMENTS;

export interface CliConfig {
  env: Env;
  apiUrl?: string;
  /** 未設定環境變數時，可從本機設定檔提供 CLI 專用 Firebase API Key。 */
  firebaseApiKey?: string;
  auth?: {
    email: string;
    idToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
    chmodSync(CONFIG_DIR, 0o700);
  }
}

export function loadConfig(): CliConfig {
  ensureConfigDir();
  if (!existsSync(CONFIG_FILE)) {
    return { env: 'prod' };
  }
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as CliConfig;
  } catch {
    return { env: 'prod' };
  }
}

export function saveConfig(config: CliConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  chmodSync(CONFIG_FILE, 0o600);
}

export function getApiUrl(config: CliConfig): string {
  return config.apiUrl ?? ENVIRONMENTS[config.env] ?? ENVIRONMENTS.prod;
}

function nonEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function missingFirebaseApiKeyMessage(): string {
  return [
    '缺少 Firebase API Key。Node CLI 呼叫 Firebase Auth 時必須使用專用金鑰（網站金鑰有 HTTP referrer 限制，無法使用）。',
    `請設定環境變數 ${FIREBASE_API_KEY_ENV}，例如：`,
    `  export ${FIREBASE_API_KEY_ENV}=<your-firebase-api-key>`,
    `或在 ${CONFIG_FILE} 加入 "firebaseApiKey": "<your-firebase-api-key>"。`,
    '環境變數優先於設定檔。',
  ].join('\n');
}

/**
 * 解析 CLI 用的 Firebase Web API Key。
 * 優先順序：MIDO_FIREBASE_API_KEY，其次是設定檔的 firebaseApiKey。
 * 缺少時丟出設定說明，不會回傳或印出金鑰內容。
 */
export function getFirebaseApiKey(config?: CliConfig): string {
  const fromEnv = nonEmpty(process.env[FIREBASE_API_KEY_ENV]);
  if (fromEnv) return fromEnv;

  const fromFile = nonEmpty((config ?? loadConfig()).firebaseApiKey);
  if (fromFile) return fromFile;

  throw new Error(missingFirebaseApiKeyMessage());
}

export function isTokenValid(config: CliConfig): boolean {
  if (!config.auth) return false;
  return Date.now() < config.auth.expiresAt - 60_000; // 1 分鐘緩衝
}

export async function getValidToken(config: CliConfig): Promise<{ token: string; config: CliConfig }> {
  if (!config.auth) {
    throw new Error('尚未登入，請先執行 mido auth login');
  }

  if (isTokenValid(config)) {
    return { token: config.auth.idToken, config };
  }

  const apiKey = getFirebaseApiKey(config);

  // Token 過期，用 refresh token 換新的
  const res = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: config.auth.refreshToken,
      }),
    },
  );

  if (!res.ok) {
    throw new Error('Token 已失效，請重新執行 mido auth login');
  }

  const data = (await res.json()) as {
    id_token: string;
    refresh_token: string;
    expires_in: string;
  };

  config.auth = {
    ...config.auth,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + parseInt(data.expires_in) * 1000,
  };
  saveConfig(config);

  return { token: config.auth.idToken, config };
}
