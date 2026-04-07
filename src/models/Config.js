import os from 'os';
import { DEFAULT_SERVER_URL } from '../utils/constants.js';

// ─── Config Model ──────────────────────────────────────────────────
// Parses CLI args, .env, and validates configuration.

export class Config {
  /** @type {string[]} */
  wallets = [];

  /** @type {string} */
  serverUrl = DEFAULT_SERVER_URL;

  /** @type {number} */
  threads = 0;

  /** @type {string|null} */
  logFile = null;

  /**
   * Build Config from CLI args and environment variables.
   * Priority: CLI args > .env > defaults
   *
   * Usage: node src/index.js --wallet ADDR1,ADDR2 --server URL --threads N --log FILE
   *        node src/index.js ADDR1 ADDR2 ...
   */
  static fromArgs(argv = process.argv.slice(2), env = process.env) {
    const config = new Config();

    // ── Parse named flags ──
    const named = {};
    const positional = [];
    for (let i = 0; i < argv.length; i++) {
      if (argv[i].startsWith('--')) {
        const key = argv[i].slice(2);
        named[key] = argv[i + 1] || '';
        i++;
      } else {
        positional.push(argv[i]);
      }
    }

    // ── Wallets ──
    const walletArg = named.wallet || named.wallets || positional.join(',');
    const walletEnv = env.WALLETS || env.WALLET || '';
    const raw = walletArg || walletEnv;
    config.wallets = raw
      .split(',')
      .map(w => w.trim())
      .filter(w => w.length > 0);

    // ── Server URL ──
    config.serverUrl = (named.server || env.SERVER_URL || DEFAULT_SERVER_URL)
      .replace(/\/+$/, '');

    // ── Threads ──
    const threadVal = named.threads || env.THREADS;
    config.threads = threadVal ? parseInt(threadVal, 10) : Math.min(os.cpus().length, 8);
    if (isNaN(config.threads) || config.threads < 1) {
      config.threads = Math.min(os.cpus().length, 8);
    }

    // ── Log file ──
    config.logFile = named.log || env.LOG_FILE || null;

    return config;
  }

  /** Validate that required fields are set */
  validate() {
    const errors = [];
    if (this.wallets.length === 0) {
      errors.push('No wallet address provided. Use --wallet <ADDRESS> or set WALLETS in .env');
    }
    for (const w of this.wallets) {
      if (w.length < 32 || w.length > 44) {
        errors.push(`Invalid wallet address length (${w.length}): ${w}`);
      }
      if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(w)) {
        errors.push(`Invalid base58 wallet address: ${w}`);
      }
    }
    if (!this.serverUrl.startsWith('http')) {
      errors.push(`Invalid server URL: ${this.serverUrl}`);
    }
    return errors;
  }
}
