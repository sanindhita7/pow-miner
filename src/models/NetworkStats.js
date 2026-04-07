// ─── NetworkStats Model ────────────────────────────────────────────
// Holds network-wide statistics from the /api/health endpoint.

export class NetworkStats {
  /** @type {number} */
  activeMiners = 0;

  /** @type {number} */
  difficulty = 4;

  /** @type {number} */
  totalPayouts = 0;

  /** @type {string} */
  totalTokensMined = '0';

  /** @type {number} */
  era = 1;

  /** @type {string} */
  rewardTokens = '0';

  /** @type {number} */
  sharesNeeded = 120;

  /** @type {number} */
  minSecondsBetweenPayouts = 30;

  /** @type {boolean} */
  rewardHalvingEnabled = false;

  /** @type {boolean} */
  doubleSharesEachHalving = false;

  /** @type {number} */
  halvingIntervalPayouts = 15000;

  /** @type {Date|null} */
  lastUpdated = null;

  /**
   * Update from API health response
   * @param {object} data - Response from /api/health
   */
  update(data) {
    if (!data || !data.ok) return;

    this.activeMiners            = data.activeMiners ?? this.activeMiners;
    this.difficulty              = data.difficulty ?? this.difficulty;
    this.totalPayouts            = data.totalPayouts ?? this.totalPayouts;
    this.totalTokensMined        = data.totalTokensMined ?? this.totalTokensMined;
    this.era                     = data.era ?? this.era;
    this.rewardTokens            = data.rewardTokens ?? this.rewardTokens;
    this.sharesNeeded            = data.sharesNeeded ?? this.sharesNeeded;
    this.minSecondsBetweenPayouts = data.minSecondsBetweenPayouts ?? this.minSecondsBetweenPayouts;
    this.rewardHalvingEnabled    = data.rewardHalvingEnabled ?? this.rewardHalvingEnabled;
    this.doubleSharesEachHalving = data.doubleSharesEachHalving ?? this.doubleSharesEachHalving;
    this.halvingIntervalPayouts  = data.halvingIntervalPayouts ?? this.halvingIntervalPayouts;
    this.lastUpdated             = new Date();
  }

  /** Format total tokens mined with commas */
  getFormattedTokensMined() {
    return Number(this.totalTokensMined).toLocaleString();
  }

  /** Format total payouts with commas */
  getFormattedPayouts() {
    return this.totalPayouts.toLocaleString();
  }
}
