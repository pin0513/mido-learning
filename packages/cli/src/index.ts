#!/usr/bin/env node

import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth.js';
import { registerUploadCommand } from './commands/upload.js';
import { registerListCommand } from './commands/list.js';

const program = new Command();

program
  .name('mido')
  .description('MIDO Learning CLI — 教材上傳與管理工具')
  .version('1.0.0');

registerAuthCommands(program);
registerUploadCommand(program);
registerListCommand(program);

program.parse();
