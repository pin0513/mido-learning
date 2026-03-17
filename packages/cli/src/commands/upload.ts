import { Command } from 'commander';
import { existsSync, statSync } from 'fs';
import { resolve, basename } from 'path';
import inquirer from 'inquirer';
import ora from 'ora';
import { loadConfig } from '../lib/config.js';
import { createComponent, uploadMaterial, updateVisibility } from '../lib/api.js';
import { printSuccess, printError, printStep, printInfo, printJson } from '../lib/output.js';

const CATEGORIES = ['program', 'game', 'music', 'art', 'math', 'science', 'language', 'other'];
const VISIBILITIES = [
  { name: '公開（所有人可見）', value: 'published' },
  { name: '登入可見（需登入帳號）', value: 'login' },
  { name: '私人（僅自己可見）', value: 'private' },
];

export function registerUploadCommand(program: Command): void {
  program
    .command('upload <zip-file>')
    .description('上傳 HTML 教材（ZIP 格式）')
    .option('-t, --title <title>', '教材標題')
    .option('--theme <theme>', '主題')
    .option('-d, --description <desc>', '教材描述')
    .option('-c, --category <cat>', `分類 (${CATEGORIES.join('|')})`)
    .option('--tags <tags>', '標籤（逗號分隔）')
    .option('-v, --visibility <vis>', '可見度 (published|login|private)')
    .option('--component-id <id>', '上傳到既有 Component（跳過建立步驟）')
    .option('-o, --output <mode>', '輸出格式 (human|json)', 'human')
    .option('--no-input', '非互動模式（需提供所有必要參數）')
    .action(async (zipFile: string, opts) => {
      try {
        const config = loadConfig();
        if (!config.auth) {
          printError('尚未登入', '執行 mido auth login');
          process.exit(1);
        }

        // 驗證 ZIP 檔案
        const zipPath = resolve(zipFile);
        if (!existsSync(zipPath)) {
          printError(`找不到檔案：${zipPath}`);
          process.exit(1);
        }
        if (!zipPath.endsWith('.zip')) {
          printError('檔案必須為 .zip 格式');
          process.exit(1);
        }
        const fileSize = statSync(zipPath).size;
        if (fileSize > 50 * 1024 * 1024) {
          printError(`檔案過大 (${(fileSize / 1024 / 1024).toFixed(1)} MB)，上限為 50MB`);
          process.exit(1);
        }

        let componentId = opts.componentId as string | undefined;

        // 如果沒有指定 component-id，建立新的 Component
        if (!componentId) {
          const isInteractive = opts.input !== false && process.stdin.isTTY;
          let title = opts.title as string | undefined;
          let theme = opts.theme as string | undefined;
          let description = opts.description as string | undefined;
          let category = opts.category as string | undefined;
          let tags: string[] = opts.tags ? (opts.tags as string).split(',').map((s: string) => s.trim()) : [];
          let visibility = opts.visibility as string | undefined;

          if (isInteractive) {
            const defaultTitle = basename(zipPath, '.zip');
            const answers = await inquirer.prompt([
              {
                type: 'input',
                name: 'title',
                message: '教材標題:',
                default: defaultTitle,
                when: !title,
                validate: (v: string) => v.trim().length > 0 || '標題不可為空',
              },
              {
                type: 'input',
                name: 'theme',
                message: '主題:',
                default: defaultTitle,
                when: !theme,
              },
              {
                type: 'input',
                name: 'description',
                message: '描述（可選）:',
                when: description === undefined,
              },
              {
                type: 'list',
                name: 'category',
                message: '分類:',
                choices: CATEGORIES,
                default: 'other',
                when: !category,
              },
              {
                type: 'input',
                name: 'tags',
                message: '標籤（逗號分隔，可選）:',
                when: tags.length === 0,
                filter: (v: string) => v,
              },
              {
                type: 'list',
                name: 'visibility',
                message: '可見度:',
                choices: VISIBILITIES,
                default: 'published',
                when: !visibility,
              },
            ]);

            title = title ?? answers.title as string;
            theme = theme ?? answers.theme as string;
            description = description ?? answers.description as string;
            category = category ?? answers.category as string;
            visibility = visibility ?? answers.visibility as string;
            if (tags.length === 0 && answers.tags) {
              tags = (answers.tags as string).split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          } else {
            // 非互動模式：檢查必要欄位
            if (!title) {
              printError('非互動模式需提供 --title', '加上 --title "教材名稱"');
              process.exit(1);
            }
            theme = theme ?? title;
            category = category ?? 'other';
            visibility = visibility ?? 'published';
          }

          // 建立 Component
          printStep('建立教材 Component...');
          const spinner = ora('建立中...').start();

          componentId = await createComponent(config, {
            title: title!,
            theme: theme!,
            description,
            category: category!,
            tags,
          });
          spinner.succeed(`Component 建立完成 (${componentId})`);

          // 設定可見度（建立時預設 private，需要額外更新）
          if (visibility && visibility !== 'private') {
            const visSpinner = ora('設定可見度...').start();
            await updateVisibility(config, componentId, visibility);
            visSpinner.succeed(`可見度設為 ${visibility}`);
          }
        }

        // 上傳 ZIP
        printStep(`上傳 ${basename(zipPath)} (${(fileSize / 1024).toFixed(0)} KB)...`);
        const uploadSpinner = ora('上傳中...').start();
        const result = await uploadMaterial(config, componentId, zipPath);
        uploadSpinner.succeed('上傳完成');

        if (opts.output === 'json') {
          printJson({
            success: true,
            componentId,
            materialId: result.materialId,
            version: result.version,
            filename: result.filename,
            size: result.size,
          });
        } else {
          printSuccess('教材上傳成功！');
          printInfo(`Component ID: ${componentId}`);
          printInfo(`Material ID:  ${result.materialId}`);
          printInfo(`版本:         v${result.version}`);
          printInfo(`檔案:         ${result.filename} (${(result.size / 1024).toFixed(0)} KB)`);
          printInfo(`瀏覽:         https://learn.paulfun.net/components/${componentId}`);
        }
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
