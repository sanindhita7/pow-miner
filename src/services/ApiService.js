import { API_ENDPOINTS, RETRY } from '../utils/constants.js';

// ─── ApiService ────────────────────────────────────────────────────
// Clean HTTP client for the POW mining API with retry + backoff.

export class ApiService {
  /** @type {string} */
  #baseUrl;

  /**
   * @param {string} baseUrl - The mining server base URL
   */
  constructor(baseUrl) {
    this.#baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Fetch with retry and exponential backoff.
   * @param {string} url
   * @param {RequestInit} opts
   * @param {number} [retries]
   * @returns {Promise<object>}
   */
  async #fetchWithRetry(url, opts = {}, retries = RETRY.MAX_ATTEMPTS) {
    let lastError;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(url, {
          ...opts,
          headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*',
            ...(opts.headers || {}),
          },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const err = new Error(data.error || res.statusText);
          err.status = res.status;
          err.data = data;
          throw err;
        }

        return data;
      } catch (err) {
        lastError = err;

        // Rate limited — use longer backoff
        if (err.status === RETRY.RATE_LIMIT_CODE) {
          const delay = Math.min(
            RETRY.BASE_DELAY_MS * Math.pow(2, attempt + 2) + Math.random() * 2000,
            RETRY.MAX_DELAY_MS
          );
          await this.#sleep(delay);
          continue;
        }

        if (attempt < retries - 1) {
          const delay = RETRY.BASE_DELAY_MS * (attempt + 1);
          await this.#sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * GET /api/health — Network stats
   * @returns {Promise<object>}
   */
  async getHealth() {
    const url = `${this.#baseUrl}${API_ENDPOINTS.HEALTH}`;
    return this.#fetchWithRetry(url);
  }

  /**
   * POST /api/challenge — Request a mining challenge
   * @param {string} wallet
   * @returns {Promise<{ challengeId: string, difficulty: number }>}
   */
  async getChallenge(wallet) {
    const url = `${this.#baseUrl}${API_ENDPOINTS.CHALLENGE}`;
    return this.#fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify({ wallet }),
    });
  }

  /**
   * POST /api/submit-shares — Submit solved proof
   * @param {string} wallet
   * @param {string} challengeId
   * @param {number} nonce
   * @returns {Promise<object>}
   */
  async submitShares(wallet, challengeId, nonce) {
    const url = `${this.#baseUrl}${API_ENDPOINTS.SUBMIT_SHARES}`;
    return this.#fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify({ wallet, challengeId, nonce }),
    });
  }

  /** @param {number} ms */
  #sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
