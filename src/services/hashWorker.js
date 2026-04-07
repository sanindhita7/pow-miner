import { parentPort, workerData } from 'worker_threads';
import crypto from 'crypto';

// ─── Hash Worker Thread ────────────────────────────────────────────
// Searches for a nonce where SHA-256(challengeId + nonce) has the
// required number of leading zeros. Uses strided iteration for
// parallel search across multiple workers.

const { challengeId, difficulty, startNonce, step } = workerData;
const prefix = '0'.repeat(difficulty);

let nonce = startNonce;
let hashesComputed = 0;

while (true) {
  const input = challengeId + nonce;
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  hashesComputed++;

  if (hash.startsWith(prefix)) {
    parentPort.postMessage({ nonce, hashesComputed });
    break;
  }

  nonce += step;
}
