import { MinerState } from '../models/MinerState.js';
import { NetworkStats } from '../models/NetworkStats.js';
import { MINING } from '../utils/constants.js';

// ─── MiningController ──────────────────────────────────────────────
// Orchestrates the full mining loop: health polling, challenge
// request, PoW solving, proof submission, payout handling.

export class MiningController {
  /** @type {import('../models/Config.js').Config} */
  #config;

  /** @type {import('../services/ApiService.js').ApiService} */
  #api;

  /** @type {import('../services/HashService.js').HashService} */
  #hashService;

  /** @type {import('../views/TerminalView.js').TerminalView} */
  #view;

  /** @type {import('../utils/Logger.js').Logger} */
  #logger;

  /** @type {NetworkStats} */
  #networkStats = new NetworkStats();

  /** @type {Map<string, MinerState>} wallet → state */
  #minerStates = new Map();

  /** @type {boolean} */
  #running = false;

  /** @type {AbortController|null} */
  #abortController = null;

  /** @type {NodeJS.Timeout|null} */
  #healthPoller = null;

  /**
   * @param {object} deps
   * @param {import('../models/Config.js').Config} deps.config
   * @param {import('../services/ApiService.js').ApiService} deps.api
   * @param {import('../services/HashService.js').HashService} deps.hashService
   * @param {import('../views/TerminalView.js').TerminalView} deps.view
   * @param {import('../utils/Logger.js').Logger} deps.logger
   */
  constructor({ config, api, hashService, view, logger }) {
    this.#config      = config;
    this.#api         = api;
    this.#hashService = hashService;
    this.#view        = view;
    this.#logger      = logger;

    // Initialize state for each wallet
    for (const wallet of config.wallets) {
      this.#minerStates.set(wallet, new MinerState(wallet));
    }
  }

  /** Start mining for all wallets */
  async start() {
    this.#running = true;
    this.#abortController = new AbortController();

    // Register graceful shutdown
    const shutdown = () => this.stop();
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Show banner and config
    this.#view.showBanner();
    this.#view.showConfig(this.#config);

    // Initial health check
    await this.#pollHealth();
    this.#view.showNetworkStats(this.#networkStats);

    // Start background health polling
    this.#healthPoller = setInterval(() => this.#pollHealth(), MINING.HEALTH_POLL_INTERVAL_MS);

    // Startup jitter
    const jitter = Math.random() * MINING.STARTUP_JITTER_MAX_MS;
    if (jitter > 500) {
      this.#logger.info(`Startup jitter: ${(jitter / 1000).toFixed(1)}s...`);
      await this.#sleep(jitter);
    }

    this.#view.showSeparator();
    this.#logger.blank();

    // Mine for each wallet concurrently
    const promises = this.#config.wallets.map(wallet => this.#mineLoop(wallet));
    await Promise.allSettled(promises);
  }

  /** Stop mining gracefully */
  stop() {
    if (!this.#running) return;
    this.#running = false;

    if (this.#abortController) {
      this.#abortController.abort();
    }
    if (this.#healthPoller) {
      clearInterval(this.#healthPoller);
      this.#healthPoller = null;
    }

    const totalShares = Array.from(this.#minerStates.values())
      .reduce((sum, s) => sum + s.sharesAccepted, 0);

    this.#logger.blank();
    this.#view.showShutdown(totalShares);
    this.#logger.close();

    process.exit(0);
  }

  // ── Private: mining loop for a single wallet ──

  async #mineLoop(wallet) {
    const state = this.#minerStates.get(wallet);
    state.setStatus('mining');

    while (this.#running) {
      try {
        // 1. Request challenge
        state.setStatus('requesting');
        this.#logger.info(`[${state.getShortWallet()}] Requesting challenge...`);

        const challenge = await this.#api.getChallenge(wallet);
        state.currentChallengeId = challenge.challengeId;
        state.currentDifficulty = challenge.difficulty;

        // 2. Solve PoW
        state.setStatus('solving');
        this.#logger.mining(`[${state.getShortWallet()}] Solving (difficulty ${challenge.difficulty})...`);

        const result = await this.#hashService.solve(
          challenge.challengeId,
          challenge.difficulty,
          this.#abortController.signal,
        );

        state.lastSolveTimeMs = result.timeMs;
        state.lastNonce = result.nonce;
        state.hashesComputed += result.hashesComputed;

        this.#logger.success(
          `[${state.getShortWallet()}] Nonce found: ${result.nonce} (${(result.timeMs / 1000).toFixed(2)}s, ~${Math.round(result.hashesComputed / (result.timeMs / 1000)).toLocaleString()} H/s)`
        );

        // 3. Submit jitter
        await this.#sleep(this.#randomBetween(MINING.SUBMIT_JITTER_MIN_MS, MINING.SUBMIT_JITTER_MAX_MS));

        // 4. Submit proof
        state.setStatus('submitting');
        this.#logger.info(`[${state.getShortWallet()}] Submitting proof...`);

        const submitResult = await this.#api.submitShares(wallet, challenge.challengeId, result.nonce);

        // 5. Update state
        state.recordShare(submitResult);

        if (submitResult.paid) {
          state.setStatus('payout');
          state.recordPayout(submitResult.amount);
          this.#logger.payout(
            `[${state.getShortWallet()}] PAYOUT! ${submitResult.amount || ''} $POW — Session shares: ${state.sharesFound}`
          );
        } else {
          state.setStatus('mining');
          const need = submitResult.need || '?';
          this.#logger.success(
            `[${state.getShortWallet()}] Share #${state.sharesFound} accepted — ${state.accumulated}/${need} shares`
          );
        }

        // Show emission info
        if (submitResult.emission) {
          const e = submitResult.emission;
          this.#logger.info(
            `[${state.getShortWallet()}] Era ${e.era} · ${e.sharesNeeded} shares/payout · ${e.rewardTokens} $POW reward`
          );
        }

        // Show mining status
        this.#logger.blank();
        if (this.#minerStates.size > 1) {
          this.#view.showMultiWalletStatus(Array.from(this.#minerStates.values()));
        } else {
          this.#view.showMiningStatus(state);
        }

        // 6. Round pause
        await this.#sleep(this.#randomBetween(MINING.ROUND_PAUSE_MIN_MS, MINING.ROUND_PAUSE_MAX_MS));

      } catch (err) {
        if (!this.#running) break;

        state.setStatus('error');

        if (err.status === 429) {
          this.#logger.warn(`[${state.getShortWallet()}] Rate limited (429) — backing off...`);
          await this.#sleep(10000 + Math.random() * 5000);
        } else {
          this.#logger.error(`[${state.getShortWallet()}] ${err.message || err}`);
          await this.#sleep(3000);
        }
      }
    }
  }

  // ── Private: health polling ──

  async #pollHealth() {
    try {
      const data = await this.#api.getHealth();
      this.#networkStats.update(data);
    } catch {
      // Silently ignore health poll failures
    }
  }

  // ── Helpers ──

  #sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  #randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }
}
