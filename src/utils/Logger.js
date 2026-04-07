import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

// ─── Logger ────────────────────────────────────────────────────────
// Structured, timestamped, color-coded logging with optional file output.

export class Logger {
  #logStream = null;
  #logFilePath = null;

  /**
   * @param {object} opts
   * @param {string} [opts.logFile] - Optional path to a log file
   */
  constructor({ logFile } = {}) {
    if (logFile) {
      this.#logFilePath = path.resolve(logFile);
      const dir = path.dirname(this.#logFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      this.#logStream = fs.createWriteStream(this.#logFilePath, { flags: 'a' });
    }
  }

  /** Returns HH:MM:SS timestamp */
  #timestamp() {
    const now = new Date();
    return [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join(':');
  }

  /** Write to log file (stripped of ANSI) */
  #writeFile(level, msg) {
    if (!this.#logStream) return;
    const clean = msg.replace(/\u001b\[[0-9;]*m/g, '');
    this.#logStream.write(`[${this.#timestamp()}] [${level.toUpperCase()}] ${clean}\n`);
  }

  info(msg) {
    const ts = chalk.gray(this.#timestamp());
    const icon = chalk.cyan('ℹ');
    console.log(`  ${ts}  ${icon}  ${chalk.white(msg)}`);
    this.#writeFile('info', msg);
  }

  success(msg) {
    const ts = chalk.gray(this.#timestamp());
    const icon = chalk.green('✓');
    console.log(`  ${ts}  ${icon}  ${chalk.greenBright(msg)}`);
    this.#writeFile('success', msg);
  }

  warn(msg) {
    const ts = chalk.gray(this.#timestamp());
    const icon = chalk.yellow('⚠');
    console.log(`  ${ts}  ${icon}  ${chalk.yellow(msg)}`);
    this.#writeFile('warn', msg);
  }

  error(msg) {
    const ts = chalk.gray(this.#timestamp());
    const icon = chalk.red('✗');
    console.log(`  ${ts}  ${icon}  ${chalk.redBright(msg)}`);
    this.#writeFile('error', msg);
  }

  payout(msg) {
    const ts = chalk.gray(this.#timestamp());
    const icon = '🎉';
    console.log(`  ${ts}  ${icon}  ${chalk.bold.magentaBright(msg)}`);
    this.#writeFile('payout', msg);
  }

  mining(msg) {
    const ts = chalk.gray(this.#timestamp());
    const icon = chalk.hex('#FFA500')('⛏');
    console.log(`  ${ts}  ${icon}  ${chalk.hex('#FFA500')(msg)}`);
    this.#writeFile('mining', msg);
  }

  debug(msg) {
    if (process.env.DEBUG) {
      const ts = chalk.gray(this.#timestamp());
      const icon = chalk.gray('·');
      console.log(`  ${ts}  ${icon}  ${chalk.gray(msg)}`);
      this.#writeFile('debug', msg);
    }
  }

  /** Print a blank line */
  blank() {
    console.log();
  }

  /** Close the log file stream */
  close() {
    if (this.#logStream) {
      this.#logStream.end();
      this.#logStream = null;
    }
  }
}
