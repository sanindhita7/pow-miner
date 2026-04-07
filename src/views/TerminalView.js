import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';
import Table from 'cli-table3';
import { BANNER_ART } from '../utils/constants.js';

// ─── TerminalView ──────────────────────────────────────────────────
// Beautiful terminal output with gradients, boxes, tables, and
// color-coded status updates.

const COLORS = {
  primary:   '#7C3AED',   // Purple
  secondary: '#F59E0B',   // Amber
  accent:    '#06B6D4',   // Cyan
  success:   '#10B981',   // Emerald
  warning:   '#F59E0B',   // Amber
  error:     '#EF4444',   // Red
  payout:    '#EC4899',   // Pink
  muted:     '#6B7280',   // Gray
  dim:       '#374151',   // Dark gray
};

const powGradient  = gradient(['#7C3AED', '#EC4899', '#F59E0B']);
const goldGradient = gradient(['#F59E0B', '#EF4444', '#EC4899']);

export class TerminalView {
  /** @type {import('../utils/Logger.js').Logger} */
  #logger;

  /**
   * @param {import('../utils/Logger.js').Logger} logger
   */
  constructor(logger) {
    this.#logger = logger;
  }

  /** Display the startup banner */
  showBanner() {
    console.log();
    console.log(powGradient(BANNER_ART));
    console.log(chalk.hex(COLORS.dim)('           ─────────────────────────────────────────'));
    console.log(chalk.hex(COLORS.muted).bold('                      By @bagusmaulana1337'));
    console.log(chalk.hex(COLORS.dim)('           ─────────────────────────────────────────'));
    console.log(chalk.hex(COLORS.muted).bold('           ⛏  Proof of Work · Solana Memecoin Miner'));
    console.log(chalk.hex(COLORS.dim)('           ─────────────────────────────────────────'));
    console.log();
  }

  /**
   * Display configuration box
   * @param {import('../models/Config.js').Config} config
   */
  showConfig(config) {
    const lines = [];
    for (const w of config.wallets) {
      const short = w.length > 16 ? `${w.slice(0, 6)}...${w.slice(-4)}` : w;
      lines.push(`  ${chalk.hex(COLORS.muted)('Wallet')}    ${chalk.white.bold(short)}  ${chalk.hex(COLORS.dim)(w)}`);
    }
    lines.push(`  ${chalk.hex(COLORS.muted)('Server')}    ${chalk.hex(COLORS.accent)(config.serverUrl)}`);
    lines.push(`  ${chalk.hex(COLORS.muted)('Threads')}   ${chalk.white.bold(config.threads)} CPU cores`);
    if (config.logFile) {
      lines.push(`  ${chalk.hex(COLORS.muted)('Log File')}  ${chalk.hex(COLORS.dim)(config.logFile)}`);
    }

    const content = lines.join('\n');
    console.log(boxen(content, {
      title: chalk.hex(COLORS.primary).bold(' ⚙  Config '),
      titleAlignment: 'left',
      padding: { top: 0, bottom: 0, left: 0, right: 1 },
      margin: { top: 0, bottom: 0, left: 2, right: 2 },
      borderStyle: 'round',
      borderColor: COLORS.primary,
      dimBorder: true,
    }));
    console.log();
  }

  /**
   * Display network stats box
   * @param {import('../models/NetworkStats.js').NetworkStats} stats
   */
  showNetworkStats(stats) {
    const table = new Table({
      chars: {
        'top': '─', 'top-mid': '┬', 'top-left': '', 'top-right': '',
        'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '', 'bottom-right': '',
        'left': '', 'left-mid': '', 'mid': '─', 'mid-mid': '┼',
        'right': '', 'right-mid': '', 'middle': ' │ '
      },
      style: { head: [], border: [] },
    });

    table.push([
      `${chalk.hex(COLORS.accent)('⛏')} Miners: ${chalk.white.bold(stats.activeMiners.toLocaleString())}`,
      `${chalk.hex(COLORS.secondary)('◆')} Era: ${chalk.white.bold(stats.era)}`,
      `${chalk.hex(COLORS.success)('⬡')} Reward: ${chalk.greenBright.bold(stats.rewardTokens + ' $POW')}`,
      `${chalk.hex(COLORS.payout)('★')} Difficulty: ${chalk.white.bold(stats.difficulty)}`,
    ]);

    table.push([
      `${chalk.hex(COLORS.muted)('Payouts:')} ${chalk.white(stats.getFormattedPayouts())}`,
      `${chalk.hex(COLORS.muted)('Mined:')} ${chalk.white(stats.getFormattedTokensMined())}`,
      `${chalk.hex(COLORS.muted)('Shares/Payout:')} ${chalk.white(stats.sharesNeeded)}`,
      `${chalk.hex(COLORS.muted)('Halving:')} ${chalk.white(stats.rewardHalvingEnabled ? 'On' : 'Off')}`,
    ]);

    console.log(boxen(table.toString(), {
      title: chalk.hex(COLORS.accent).bold(' 📊 Network '),
      titleAlignment: 'left',
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      margin: { top: 0, bottom: 0, left: 2, right: 2 },
      borderStyle: 'round',
      borderColor: COLORS.accent,
      dimBorder: true,
    }));
    console.log();
  }

  /**
   * Show mining status for a wallet
   * @param {import('../models/MinerState.js').MinerState} state
   * @param {object} opts
   */
  showMiningStatus(state, opts = {}) {
    const pct = state.getProgressPercent();
    const barWidth = 30;
    const filled = Math.round(barWidth * pct / 100);
    const empty = barWidth - filled;

    const progressBar =
      chalk.hex(COLORS.success)('█'.repeat(filled)) +
      chalk.hex(COLORS.dim)('░'.repeat(empty));

    const lines = [
      `  ${chalk.hex(COLORS.muted)('Wallet')}     ${chalk.white.bold(state.getShortWallet())}`,
      `  ${chalk.hex(COLORS.muted)('Status')}     ${this.#statusIcon(state.status)} ${this.#statusText(state.status)}`,
      `  ${chalk.hex(COLORS.muted)('Shares')}     ${chalk.white.bold(state.sharesFound)} found · ${chalk.greenBright.bold(state.sharesAccepted)} accepted`,
      `  ${chalk.hex(COLORS.muted)('Progress')}   ${progressBar}  ${chalk.white.bold(state.accumulated)}/${chalk.hex(COLORS.muted)(state.needed)} ${chalk.hex(COLORS.dim)(`(${pct}%)`)}`,
      `  ${chalk.hex(COLORS.muted)('Uptime')}     ${chalk.white(state.getUptime())}`,
    ];

    if (state.lastSolveTimeMs > 0) {
      lines.push(`  ${chalk.hex(COLORS.muted)('Last Solve')} ${chalk.white((state.lastSolveTimeMs / 1000).toFixed(2) + 's')}  ${chalk.hex(COLORS.dim)('nonce=' + state.lastNonce)}`);
    }

    const content = lines.join('\n');
    console.log(boxen(content, {
      title: chalk.hex(COLORS.secondary).bold(' ⛏  Mining '),
      titleAlignment: 'left',
      padding: { top: 0, bottom: 0, left: 0, right: 1 },
      margin: { top: 0, bottom: 0, left: 2, right: 2 },
      borderStyle: 'round',
      borderColor: COLORS.secondary,
      dimBorder: true,
    }));
    console.log();
  }

  /**
   * Show multi-wallet status overview
   * @param {import('../models/MinerState.js').MinerState[]} states
   */
  showMultiWalletStatus(states) {
    const table = new Table({
      head: [
        chalk.hex(COLORS.muted)('#'),
        chalk.hex(COLORS.muted)('Wallet'),
        chalk.hex(COLORS.muted)('Status'),
        chalk.hex(COLORS.muted)('Shares'),
        chalk.hex(COLORS.muted)('Progress'),
        chalk.hex(COLORS.muted)('Uptime'),
      ],
      style: { head: [], border: [] },
      colWidths: [4, 14, 16, 10, 22, 10],
    });

    states.forEach((state, i) => {
      const pct = state.getProgressPercent();
      const barW = 10;
      const filled = Math.round(barW * pct / 100);
      const bar = chalk.hex(COLORS.success)('█'.repeat(filled)) + chalk.hex(COLORS.dim)('░'.repeat(barW - filled));

      table.push([
        chalk.hex(COLORS.muted)(i + 1),
        chalk.white.bold(state.getShortWallet()),
        `${this.#statusIcon(state.status)} ${this.#statusText(state.status)}`,
        chalk.white.bold(state.sharesAccepted),
        `${bar} ${pct}%`,
        chalk.white(state.getUptime()),
      ]);
    });

    console.log(boxen(table.toString(), {
      title: chalk.hex(COLORS.secondary).bold(' ⛏  Mining Overview '),
      titleAlignment: 'left',
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      margin: { top: 0, bottom: 0, left: 2, right: 2 },
      borderStyle: 'round',
      borderColor: COLORS.secondary,
      dimBorder: true,
    }));
    console.log();
  }

  /** Separator line */
  showSeparator() {
    console.log(chalk.hex(COLORS.dim)('  ' + '─'.repeat(60)));
  }

  /** Show shutdown message */
  showShutdown(totalShares) {
    console.log();
    console.log(boxen(
      `\n  ${chalk.white.bold('Mining stopped.')}\n  ${chalk.hex(COLORS.muted)('Total shares submitted:')} ${chalk.greenBright.bold(totalShares)}\n`,
      {
        title: chalk.red.bold(' 🛑 Shutdown '),
        titleAlignment: 'left',
        padding: { top: 0, bottom: 0, left: 0, right: 2 },
        margin: { top: 0, bottom: 1, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: 'red',
        dimBorder: true,
      }
    ));
  }

  /** Show an error box */
  showError(title, msg) {
    console.log(boxen(
      `  ${chalk.redBright(msg)}`,
      {
        title: chalk.red.bold(` ✗ ${title} `),
        titleAlignment: 'left',
        padding: { top: 0, bottom: 0, left: 0, right: 2 },
        margin: { top: 0, bottom: 0, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: 'red',
        dimBorder: true,
      }
    ));
    console.log();
  }

  // ── Private helpers ──

  #statusIcon(status) {
    switch (status) {
      case 'solving':     return chalk.hex(COLORS.secondary)('⏳');
      case 'submitting':  return chalk.hex(COLORS.accent)('📤');
      case 'requesting':  return chalk.hex(COLORS.accent)('📡');
      case 'mining':      return chalk.hex(COLORS.success)('🟢');
      case 'payout':      return '🎉';
      case 'error':       return chalk.red('🔴');
      case 'idle':        return chalk.hex(COLORS.muted)('⏸');
      default:            return chalk.hex(COLORS.muted)('·');
    }
  }

  #statusText(status) {
    switch (status) {
      case 'solving':     return chalk.hex(COLORS.secondary)('Solving PoW...');
      case 'submitting':  return chalk.hex(COLORS.accent)('Submitting proof...');
      case 'requesting':  return chalk.hex(COLORS.accent)('Requesting challenge...');
      case 'mining':      return chalk.hex(COLORS.success)('Mining');
      case 'payout':      return chalk.hex(COLORS.payout).bold('PAYOUT!');
      case 'error':       return chalk.red('Error — retrying…');
      case 'idle':        return chalk.hex(COLORS.muted)('Idle');
      default:            return chalk.hex(COLORS.muted)(status);
    }
  }
}
