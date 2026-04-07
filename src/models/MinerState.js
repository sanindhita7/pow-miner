import { EventEmitter } from 'events';

// ─── MinerState Model ──────────────────────────────────────────────
// Tracks per-wallet mining state with event emission for the View.

export class MinerState extends EventEmitter {
  /** @type {string} */
  wallet;

  /** @type {number} */
  sharesFound = 0;

  /** @type {number} */
  sharesAccepted = 0;

  /** @type {number} */
  accumulated = 0;

  /** @type {number} */
  needed = 120;

  /** @type {number} */
  totalPaid = 0;

  /** @type {number} */
  hashesComputed = 0;

  /** @type {number} */
  startTime = Date.now();

  /** @type {string|null} */
  currentChallengeId = null;

  /** @type {number} */
  currentDifficulty = 4;

  /** @type {string} */
  status = 'idle';

  /** @type {number} */
  lastSolveTimeMs = 0;

  /** @type {number|null} */
  lastNonce = null;

  /**
   * @param {string} wallet - Solana wallet address
   */
  constructor(wallet) {
    super();
    this.wallet = wallet;
  }

  /** Record a share submission result */
  recordShare(result) {
    this.sharesFound++;
    if (result.accepted) {
      this.sharesAccepted += result.accepted;
    }
    if (result.accumulated != null) {
      this.accumulated = result.accumulated;
    }
    if (result.need != null) {
      this.needed = result.need;
    }
    this.emit('share', this);
  }

  /** Record a payout */
  recordPayout(amount) {
    this.totalPaid++;
    this.accumulated = 0;
    this.emit('payout', { wallet: this.wallet, amount });
  }

  /** Update status */
  setStatus(status) {
    this.status = status;
    this.emit('status', this);
  }

  /** Get uptime formatted as HH:MM:SS */
  getUptime() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  /** Progress percentage */
  getProgressPercent() {
    if (this.needed <= 0) return 0;
    return Math.min(100, Math.round((this.accumulated / this.needed) * 100));
  }

  /** Truncated wallet for display */
  getShortWallet() {
    if (this.wallet.length <= 12) return this.wallet;
    return `${this.wallet.slice(0, 6)}...${this.wallet.slice(-4)}`;
  }
}
