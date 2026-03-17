import chalk from 'chalk';

const isInteractive = process.stdout.isTTY ?? false;
const noColor = !!process.env['NO_COLOR'];

function c(fn: (s: string) => string, text: string): string {
  return noColor ? text : fn(text);
}

export function printSuccess(msg: string): void {
  console.error(c(chalk.green, '✓') + ' ' + msg);
}

export function printError(msg: string, suggestion?: string): void {
  console.error(c(chalk.red, '✗') + ' ' + msg);
  if (suggestion) {
    console.error(c(chalk.gray, '  → ') + suggestion);
  }
}

export function printWarning(msg: string): void {
  console.error(c(chalk.yellow, '⚠') + ' ' + msg);
}

export function printStep(msg: string): void {
  if (isInteractive) {
    console.error(c(chalk.cyan, '▸') + ' ' + msg);
  }
}

export function printInfo(msg: string): void {
  console.error(c(chalk.gray, '  ') + msg);
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(rows: Record<string, string | number>[]): void {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const widths = keys.map((k) =>
    Math.max(k.length, ...rows.map((r) => String(r[k]).length)),
  );

  // Header
  const header = keys.map((k, i) => k.padEnd(widths[i])).join('  ');
  console.log(c(chalk.bold, header));
  console.log(widths.map((w) => '─'.repeat(w)).join('──'));

  // Rows
  for (const row of rows) {
    console.log(keys.map((k, i) => String(row[k]).padEnd(widths[i])).join('  '));
  }
}
