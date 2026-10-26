import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  FIREBASE_API_KEY_ENV,
  getFirebaseApiKey,
  getValidToken,
  type CliConfig,
} from '../src/lib/config.ts';

const PLACEHOLDER = '<your-firebase-api-key>';

function baseConfig(overrides: Partial<CliConfig> = {}): CliConfig {
  return { env: 'prod', ...overrides };
}

describe('getFirebaseApiKey', () => {
  const previous = process.env[FIREBASE_API_KEY_ENV];

  beforeEach(() => {
    delete process.env[FIREBASE_API_KEY_ENV];
  });

  afterEach(() => {
    if (previous === undefined) delete process.env[FIREBASE_API_KEY_ENV];
    else process.env[FIREBASE_API_KEY_ENV] = previous;
  });

  it('throws setup instructions when the key is missing', () => {
    assert.throws(
      () => getFirebaseApiKey(baseConfig()),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, new RegExp(FIREBASE_API_KEY_ENV));
        assert.match(err.message, /export MIDO_FIREBASE_API_KEY=/);
        assert.match(err.message, /firebaseApiKey/);
        assert.match(err.message, /config\.json/);
        assert.match(err.message, /HTTP referrer/);
        assert.equal(err.message.includes(PLACEHOLDER), true);
        assert.doesNotMatch(err.message, /AIza[0-9A-Za-z_-]{10,}/);
        return true;
      },
    );
  });

  it('treats a blank environment variable as missing', () => {
    process.env[FIREBASE_API_KEY_ENV] = '   ';
    assert.throws(() => getFirebaseApiKey(baseConfig({ firebaseApiKey: '  ' })), /MIDO_FIREBASE_API_KEY/);
  });

  it('reads the environment variable', () => {
    process.env[FIREBASE_API_KEY_ENV] = 'from-env';
    assert.equal(getFirebaseApiKey(baseConfig()), 'from-env');
  });

  it('reads firebaseApiKey from config when the environment variable is unset', () => {
    assert.equal(
      getFirebaseApiKey(baseConfig({ firebaseApiKey: 'from-config' })),
      'from-config',
    );
  });

  it('prefers the environment variable over the config file', () => {
    process.env[FIREBASE_API_KEY_ENV] = 'from-env';
    assert.equal(
      getFirebaseApiKey(baseConfig({ firebaseApiKey: 'from-config' })),
      'from-env',
    );
  });
});

describe('getValidToken', () => {
  const previous = process.env[FIREBASE_API_KEY_ENV];
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    delete process.env[FIREBASE_API_KEY_ENV];
    globalThis.fetch = async () => {
      throw new Error('fetch should not be called');
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env[FIREBASE_API_KEY_ENV];
    else process.env[FIREBASE_API_KEY_ENV] = previous;
  });

  it('returns a still-valid token without a Firebase API key', async () => {
    const config = baseConfig({
      auth: {
        email: 'teacher@example.com',
        idToken: 'still-good',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 120_000,
      },
    });

    const result = await getValidToken(config);
    assert.equal(result.token, 'still-good');
  });

  it('refuses to refresh an expired token when the key is missing', async () => {
    const config = baseConfig({
      auth: {
        email: 'teacher@example.com',
        idToken: 'stale',
        refreshToken: 'refresh',
        expiresAt: 0,
      },
    });

    await assert.rejects(() => getValidToken(config), (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /MIDO_FIREBASE_API_KEY/);
      assert.doesNotMatch(err.message, /fetch should not be called/);
      return true;
    });
  });
});

describe('source', () => {
  it('does not embed a Google API key', () => {
    const configPath = fileURLToPath(new URL('../src/lib/config.ts', import.meta.url));
    const authPath = fileURLToPath(new URL('../src/commands/auth.ts', import.meta.url));
    const combined = readFileSync(configPath, 'utf8') + readFileSync(authPath, 'utf8');
    assert.doesNotMatch(combined, /AIza[0-9A-Za-z_-]{10,}/);
  });
});
