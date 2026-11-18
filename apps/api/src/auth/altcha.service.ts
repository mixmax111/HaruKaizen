import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes } from 'node:crypto';

export interface AltchaChallenge {
  algorithm: 'SHA-256';
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

@Injectable()
export class AltchaService {
  private readonly hmacKey: string;
  private readonly defaultMaxNumber = 50000;
  // Replay prevention: map of signature -> expiresAt
  private readonly usedSignatures = new Map<string, number>();

  constructor(private readonly config: ConfigService) {
    this.hmacKey =
      this.config.get<string>('ALTCHA_HMAC_KEY') ||
      process.env.ALTCHA_HMAC_KEY ||
      'harukaizen_local_altcha_hmac_secret_key_32_chars_2026';
  }

  /**
   * Generates a new cryptographically signed ALTCHA challenge.
   */
  generateChallenge(maxNumber: number = this.defaultMaxNumber): AltchaChallenge {
    // Salt with expiration timestamp (valid for 5 minutes)
    const expires = Date.now() + 5 * 60 * 1000;
    const randomHex = randomBytes(12).toString('hex');
    const salt = `${randomHex}?expires=${expires}`;

    // Target secret number chosen uniformly in [0, maxNumber]
    const secretNum = Math.floor(Math.random() * (maxNumber + 1));

    // SHA-256 hash of salt + secretNum
    const challenge = createHash('sha256')
      .update(salt + secretNum)
      .digest('hex');

    // HMAC signature over challenge
    const signature = createHmac('sha256', this.hmacKey)
      .update(challenge)
      .digest('hex');

    return {
      algorithm: 'SHA-256',
      challenge,
      maxnumber: maxNumber,
      salt,
      signature,
    };
  }

  /**
   * Verifies the client PoW solution payload.
   * Accepts base64-encoded JSON string or AltchaSolution object.
   */
  verifySolution(payload: string | AltchaSolution): boolean {
    if (!payload) {
      throw new BadRequestException('Payload ALTCHA mancante.');
    }

    let solution: AltchaSolution;
    if (typeof payload === 'string') {
      try {
        const decoded = Buffer.from(payload, 'base64').toString('utf8');
        solution = JSON.parse(decoded);
      } catch {
        try {
          solution = JSON.parse(payload);
        } catch {
          throw new BadRequestException('Formato payload ALTCHA non valido.');
        }
      }
    } else {
      solution = payload;
    }

    const { algorithm, challenge, number, salt, signature } = solution;

    if (algorithm !== 'SHA-256') {
      throw new BadRequestException('Algoritmo ALTCHA non supportato (richiesto SHA-256).');
    }

    if (typeof number !== 'number' || isNaN(number) || number < 0) {
      throw new BadRequestException('Numero nonce ALTCHA non valido.');
    }

    if (!challenge || !salt || !signature) {
      throw new BadRequestException('Parametri di verifica ALTCHA incompleti.');
    }

    // Check expiration timestamp from salt if present
    const expiresMatch = salt.match(/\?expires=(\d+)/);
    if (expiresMatch) {
      const expires = parseInt(expiresMatch[1], 10);
      if (Date.now() > expires) {
        throw new BadRequestException('La sfida ALTCHA è scaduta. Richiedi un nuovo challenge.');
      }
    }

    // 1. Verify HMAC signature to guarantee the challenge was created by this server
    const expectedSignature = createHmac('sha256', this.hmacKey)
      .update(challenge)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Firma crittografica ALTCHA non valida o manomessa.');
    }

    // 2. Prevent replay attacks
    this.cleanExpiredSignatures();
    if (this.usedSignatures.has(signature)) {
      throw new BadRequestException('Questo challenge ALTCHA è già stato utilizzato.');
    }

    // 3. Verify SHA-256(salt + number) === challenge
    const calculatedChallenge = createHash('sha256')
      .update(salt + number)
      .digest('hex');

    if (calculatedChallenge !== challenge) {
      throw new BadRequestException('Risoluzione Proof-of-Work non corretta.');
    }

    // Mark signature as used (expire after 10 minutes)
    this.usedSignatures.set(signature, Date.now() + 10 * 60 * 1000);

    return true;
  }

  private cleanExpiredSignatures(): void {
    const now = Date.now();
    for (const [sig, expiry] of this.usedSignatures.entries()) {
      if (now > expiry) {
        this.usedSignatures.delete(sig);
      }
    }
  }
}

