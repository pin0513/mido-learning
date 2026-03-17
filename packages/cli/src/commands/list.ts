import { Command } from 'commander';
import ora from 'ora';
import { loadConfig } from '../lib/config.js';
import { listMyComponents, deleteComponent } from '../lib/api.js';
import { printSuccess, printError, printJson, printTable, printInfo } from '../lib/output.js';

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('列出我的教材')
    .option('-p, --page <n>', '頁碼', '1')
    .option('-l, --limit <n>', '每頁筆數', '20')
    .option('-o, --output <mode>', '輸出格式 (human|json)', 'human')
    .action(async (opts: { page: string; limit: string; output: string }) => {
      try {
        const config = loadConfig();
        if (!config.auth) {
          printError('尚未登入', '執行 mido auth login');
          process.exit(1);
        }

        const spinner = ora('查詢中...').start();
        const { components, total } = await listMyComponents(
          config,
          parseInt(opts.page),
          parseInt(opts.limit),
        );
        spinner.stop();

        if (opts.output === 'json') {
          printJson({ components, total, page: parseInt(opts.page) });
          return;
        }

        if (components.length === 0) {
          printInfo('尚無教材，使用 mido upload <zip> 開始上傳');
          return;
        }

        const visLabel = (v: string | null) => {
          if (v === 'published') return '公開';
          if (v === 'login') return '登入';
          if (v === 'private') return '私人';
          return v ?? '公開';
        };

        printTable(
          components.map((c) => ({
            ID: c.id.slice(0, 12) + '...',
            標題: c.title.length > 25 ? c.title.slice(0, 24) + '…' : c.title,
            分類: c.category,
            可見度: visLabel(c.visibility),
            教材數: c.materialCount,
            建立時間: new Date(c.createdAt).toLocaleDateString('zh-TW'),
          })),
        );
        printInfo(`共 ${total} 筆（第 ${opts.page} 頁）`);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });

  program
    .command('delete <component-id>')
    .description('刪除教材 Component')
    .option('-f, --force', '跳過確認')
    .option('-o, --output <mode>', '輸出格式 (human|json)', 'human')
    .action(async (componentId: string, opts: { force?: boolean; output: string }) => {
      try {
        const config = loadConfig();
        if (!config.auth) {
          printError('尚未登入', '執行 mido auth login');
          process.exit(1);
        }

        if (!opts.force && process.stdin.isTTY) {
          const { default: inquirer } = await import('inquirer');
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `確定要刪除 ${componentId}？此操作無法復原。`,
              default: false,
            },
          ]);
          if (!confirm) {
            printInfo('已取消');
            return;
          }
        }

        const spinner = ora('刪除中...').start();
        await deleteComponent(config, componentId);
        spinner.stop();

        if (opts.output === 'json') {
          printJson({ success: true, deleted: componentId });
        } else {
          printSuccess(`已刪除 ${componentId}`);
        }
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
