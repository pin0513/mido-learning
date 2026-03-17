import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.mido-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

// Firebase Web API Key（公開值，用於 REST Auth API）
const FIREBASE_API_KEY = 'AIzaSyC36zbChe174ZzwN9c_fgBKntq5JSUdF84';

// 環境設定
const ENVIRONMENTS = {
  prod: 'https://mido-learning-api-24mwb46hra-de.a.run.app',
  local: 'http://localhost:5199',
} as const;

type Env = keyof typeof ENVIRONMENTS;

export interface CliConfig {
  env: Env;
  apiUrl?: string;
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

export function getFirebaseApiKey(): string {
  return FIREBASE_API_KEY;
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

  // Token 過期，用 refresh token 換新的
  const res = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
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
