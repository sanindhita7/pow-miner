import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';

// ─── HashService ───────────────────────────────────────────────────
// Multi-threaded SHA-256 PoW solver using worker_threads.
// Each worker searches a strided nonce range for maximum efficiency.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKER_PATH = path.join(__dirname, 'hashWorker.js');

export class HashService {
  /** @type {number} */
  #threadCount;

  /**
   * @param {number} threadCount - Number of worker threads
   */
  constructor(threadCount) {
    this.#threadCount = threadCount;
  }

  /**
   * Solve a PoW challenge using multiple threads.
   * Finds a nonce where SHA-256(challengeId + nonce) starts with `difficulty` zeros.
   *
   * @param {string} challengeId - The challenge hash
   * @param {number} difficulty - Number of leading zeros required
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<{ nonce: number, hashesComputed: number, timeMs: number }>}
   */
  solve(challengeId, difficulty, signal) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const workers = [];
      let settled = false;

      // If already aborted
      if (signal?.aborted) {
        reject(new Error('Mining aborted'));
        return;
      }

      // Listen for abort
      const onAbort = () => {
        if (!settled) {
          settled = true;
          workers.forEach(w => w.terminate());
          reject(new Error('Mining aborted'));
        }
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      // Spawn workers with strided nonce ranges
      for (let i = 0; i < this.#threadCount; i++) {
        const worker = new Worker(WORKER_PATH, {
          workerData: {
            challengeId,
            difficulty,
            startNonce: i,
            step: this.#threadCount,
          },
        });

        worker.on('message', (msg) => {
          if (settled) return;
          settled = true;

          // Terminate all other workers
          workers.forEach(w => w.terminate());
          signal?.removeEventListener('abort', onAbort);

          resolve({
            nonce: msg.nonce,
            hashesComputed: msg.hashesComputed,
            timeMs: Date.now() - startTime,
          });
        });

        worker.on('error', (err) => {
          if (!settled) {
            settled = true;
            workers.forEach(w => w.terminate());
            signal?.removeEventListener('abort', onAbort);
            reject(err);
          }
        });

        workers.push(worker);
      }
    });
  }
}
