/**
 * ALTCHA Proof-of-Work High Performance Solver (Web Client)
 * Pure JavaScript cryptographic SHA-256 implementation with zero external dependencies.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rightRotate(v: number, n: number): number {
  return (v >>> n) | (v << (32 - n));
}

const w = new Uint32Array(64);

export function sha256(ascii: string): string {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = ascii.length;
  const bitLen = len * 8;
  const words: number[] = [];
  for (let i = 0; i < len; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << ((3 - (i % 4)) * 8);
  }
  words[len >> 2] |= 0x80 << ((3 - (len % 4)) * 8);
  const blockCount = (((len + 8) >> 6) + 1) * 16;
  words[blockCount - 1] = bitLen;

  for (let j = 0; j < blockCount; j += 16) {
    for (let i = 0; i < 16; i++) {
      w[i] = words[j + i] || 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + s1 + ch + K[i] + w[i]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const hArr = [h0, h1, h2, h3, h4, h5, h6, h7];
  let res = '';
  for (let i = 0; i < 8; i++) {
    res += (hArr[i] >>> 0).toString(16).padStart(8, '0');
  }
  return res;
}

export function toBase64(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (let i = 0; i < str.length; i += 3) {
    const b0 = str.charCodeAt(i);
    const b1 = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const b2 = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
    const enc1 = b0 >> 2;
    const enc2 = ((b0 & 3) << 4) | (b1 >> 4);
    let enc3 = ((b1 & 15) << 2) | (b2 >> 6);
    let enc4 = b2 & 63;
    if (i + 1 >= str.length) {
      enc3 = 64;
      enc4 = 64;
    } else if (i + 2 >= str.length) {
      enc4 = 64;
    }
    output +=
      chars.charAt(enc1) +
      chars.charAt(enc2) +
      (enc3 === 64 ? '=' : chars.charAt(enc3)) +
      (enc4 === 64 ? '=' : chars.charAt(enc4));
  }
  return output;
}

export interface AltchaChallenge {
  algorithm: string;
  challenge: string;
  maxnumber: number;
  salt: string;
  signature: string;
}

export interface AltchaSolution {
  algorithm: string;
  challenge: string;
  number: number;
  salt: string;
  signature: string;
}

export interface AltchaResult {
  solution: AltchaSolution;
  base64Payload: string;
}

/**
 * Solves an ALTCHA challenge in non-blocking batches.
 */
export async function solveAltcha(
  challenge: AltchaChallenge,
  onProgress?: (progress: number, currentNumber: number) => void
): Promise<AltchaResult> {
  const { maxnumber, salt, challenge: targetHash } = challenge;
  const chunkSize = 2500;

  for (let current = 0; current <= maxnumber; current += chunkSize) {
    const limit = Math.min(current + chunkSize, maxnumber + 1);

    for (let n = current; n < limit; n++) {
      const hash = sha256(salt + n);
      if (hash === targetHash) {
        const solution: AltchaSolution = {
          algorithm: challenge.algorithm,
          challenge: challenge.challenge,
          number: n,
          salt: challenge.salt,
          signature: challenge.signature,
        };
        const base64Payload = toBase64(JSON.stringify(solution));
        if (onProgress) {
          onProgress(100, n);
        }
        return { solution, base64Payload };
      }
    }

    if (onProgress) {
      const pct = Math.min(99, Math.round((limit / maxnumber) * 100));
      onProgress(pct, limit);
    }

    // Yield control to UI thread for smooth rendering
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error('Nessuna soluzione ALTCHA trovata entro il limite di difficoltà.');
}

