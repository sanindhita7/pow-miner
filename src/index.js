#!/usr/bin/env node

// ─── POW Miner CLI — Entry Point ──────────────────────────────────
// Usage:
//   node src/index.js --wallet ADDR1,ADDR2 --threads 4
//   node src/index.js ADDR1 ADDR2
//   (or set WALLETS in .env)

import dotenv from 'dotenv';
import chalk from 'chalk';
import { Config } from './models/Config.js';
import { ApiService } from './services/ApiService.js';
import { HashService } from './services/HashService.js';
import { TerminalView } from './views/TerminalView.js';
import { MiningController } from './controllers/MiningController.js';
import { Logger } from './utils/Logger.js';

// Load .env
dotenv.config();

// ── Show help ──
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${chalk.bold('POW Miner')} — CLI Mining Tool for $POW Solana Memecoin

${chalk.bold('Usage:')}
  node src/index.js [options] [wallet1] [wallet2] ...

${chalk.bold('Options:')}
  --wallet <addr1,addr2>   Solana wallet address(es), comma-separated
  --server <url>           Mining server URL (default: https://mine.powsolmeme.com)
  --threads <n>            Number of worker threads (default: auto-detect)
  --log <file>             Log file path
  --help, -h               Show this help

${chalk.bold('Environment (.env):')}
  WALLETS=addr1,addr2
  SERVER_URL=https://mine.powsolmeme.com
  THREADS=4
  LOG_FILE=logs/pow-miner.log

${chalk.bold('Examples:')}
  node src/index.js FBZar4gQ8S6BfkNVMN76ERKvSXzVeKiThZ3yEbZ1qtGt
  node src/index.js --wallet ADDR1,ADDR2 --threads 8
  node src/index.js --wallet ADDR1 --log mining.log
`);
  process.exit(0);
}

// ── Build config ──
const config = Config.fromArgs();
const errors = config.validate();

if (errors.length > 0) {
  console.log();
  console.log(chalk.red.bold('  ✗ Configuration Error'));
  for (const err of errors) {
    console.log(chalk.red(`    · ${err}`));
  }
  console.log();
  console.log(chalk.gray('  Run with --help for usage instructions.'));
  console.log();
  process.exit(1);
}

// ── Wire up MVC ──
const logger      = new Logger({ logFile: config.logFile });
const api         = new ApiService(config.serverUrl);
const hashService = new HashService(config.threads);
const view        = new TerminalView(logger);

const controller = new MiningController({
  config,
  api,
  hashService,
  view,
  logger,
});

// ── Start mining ──
controller.start().catch(err => {
  logger.error(`Fatal: ${err.message || err}`);
  process.exit(1);
});
