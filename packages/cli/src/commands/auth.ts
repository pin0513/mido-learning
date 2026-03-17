import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import {
  loadConfig,
  saveConfig,
  getFirebaseApiKey,
  isTokenValid,
  getApiUrl,
} from '../lib/config.js';
import { printSuccess, printError, printInfo, printJson } from '../lib/output.js';

interface FirebaseSignInResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  displayName?: string;
}

export function registerAuthCommands(program: Command): void {
  const auth = program
    .command('auth')
    .description('認證管理');

  auth
    .command('login')
    .description('以 Email/Password 登入')
    .option('-e, --email <email>', 'Email')
    .option('-o, --output <mode>', '輸出格式 (human|json)', 'human')
    .action(async (opts: { email?: string; output: string }) => {
      try {
        const config = loadConfig();

        // 互動式輸入
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'email',
            message: 'Email:',
            when: !opts.email,
            validate: (v: string) => v.includes('@') || '請輸入有效的 Email',
          },
          {
            type: 'password',
            name: 'password',
            message: 'Password:',
            mask: '*',
          },
        ]);

        const email = opts.email ?? answers.email as string;
        const password = answers.password as string;

        const spinner = ora('登入中...').start();

        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${getFirebaseApiKey()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              returnSecureToken: true,
            }),
          },
        );

        if (!res.ok) {
          spinner.stop();
          const err = (await res.json()) as { error?: { message?: string } };
          const msg = err.error?.message ?? 'Unknown error';
          if (msg.includes('EMAIL_NOT_FOUND') || msg.includes('INVALID_PASSWORD') || msg.includes('INVALID_LOGIN_CREDENTIALS')) {
            printError('登入失敗：Email 或密碼錯誤');
          } else if (msg.includes('TOO_MANY_ATTEMPTS')) {
            printError('嘗試次數過多，請稍後再試');
          } else {
            printError(`登入失敗：${msg}`);
          }
          process.exit(1);
        }

        const data = (await res.json()) as FirebaseSignInResponse;
        spinner.stop();

        config.auth = {
          email: data.email,
          idToken: data.idToken,
          refreshToken: data.refreshToken,
          expiresAt: Date.now() + parseInt(data.expiresIn) * 1000,
        };
        saveConfig(config);

        if (opts.output === 'json') {
          printJson({ success: true, email: data.email, env: config.env });
        } else {
          printSuccess(`登入成功：${data.email}`);
          printInfo(`環境：${config.env} (${getApiUrl(config)})`);
        }
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });

  auth
    .command('status')
    .description('查看目前登入狀態')
    .option('-o, --output <mode>', '輸出格式 (human|json)', 'human')
    .action((opts: { output: string }) => {
      const config = loadConfig();

      if (!config.auth) {
        if (opts.output === 'json') {
          printJson({ loggedIn: false });
        } else {
          printError('尚未登入', '執行 mido auth login 登入');
        }
        return;
      }

      const valid = isTokenValid(config);
      const result = {
        loggedIn: true,
        email: config.auth.email,
        env: config.env,
        apiUrl: getApiUrl(config),
        tokenValid: valid,
        expiresAt: new Date(config.auth.expiresAt).toISOString(),
      };

      if (opts.output === 'json') {
        printJson(result);
      } else {
        printSuccess(`已登入：${config.auth.email}`);
        printInfo(`環境：${config.env} (${getApiUrl(config)})`);
        printInfo(`Token：${valid ? '有效' : '已過期（下次操作會自動 refresh）'}`);
      }
    });

  auth
    .command('logout')
    .description('登出')
    .action(() => {
      const config = loadConfig();
      delete config.auth;
      saveConfig(config);
      printSuccess('已登出');
    });

  auth
    .command('env <environment>')
    .description('切換環境 (prod|local)')
    .action((env: string) => {
      if (env !== 'prod' && env !== 'local') {
        printError('無效環境，可選：prod, local');
        process.exit(1);
      }
      const config = loadConfig();
      config.env = env;
      saveConfig(config);
      printSuccess(`已切換到 ${env} 環境`);
      printInfo(getApiUrl(config));
    });
}
